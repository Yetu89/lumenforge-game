// Combat: the beam, alignment and the Eclipse, enemy movement and bosses.
// Everything here steps at 60 Hz from main.js; drawing lives in render.js.
import { FIELD, FORGE, PLAYER, STEP, ENEMIES, BOSSES } from './config.js';
import { sfx } from './audio.js';
import { spawnEnemy, spawnBoss, clearWave, loseRun } from './world.js';

/** Derived beam stats after relics and workshop levels. */
export function beamStats(world) {
  const r = world.relics;
  const w = world.meta.levels;
  return {
    damage: PLAYER.beamDamage + (w.damage || 0),
    width: PLAYER.beamWidth * (r.has('wide') ? 1.6 : 1) * (world.eclipse > 0 ? 2.2 : 1),
    interval: PLAYER.fireInterval * (r.has('crank') ? 0.77 : 1),
    split: r.has('split'),
    pierce: r.has('pierce') || world.eclipse > 0,
    chain: r.has('chain') ? 2 : 0,
    twin: r.has('twin'),
    critChance: r.has('crit') ? 0.25 : 0,
    echoEvery: r.has('echo') ? 4 : 0,
  };
}

function haste(world) {
  return 1 + (world.meta.levels.align || 0) * 0.25;
}

/** Distance from a point to the segment a-b. */
function distToSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

/** Fire one beam from (ox,oy) along `angle`. Returns the beam drawn, if any. */
function fireBeam(world, ox, oy, angle, stats) {
  const len = PLAYER.beamLength;
  const ex = ox + Math.cos(angle) * len;
  const ey = oy + Math.sin(angle) * len;
  const beam = { x1: ox, y1: oy, x2: ex, y2: ey, width: stats.width, eclipse: world.eclipse > 0, life: 0.09 };
  world.beams = world.beams || [];
  world.beams.push(beam);
  world.stats.shots++;
  // What does the beam touch? Enemies, boss segments, the boss itself.
  const hits = [];
  // A small aim grace (10px) makes the beam feel fair on a moving target;
  // the drawn beam itself stays its true width.
  const AIM_GRACE = 10;
  const consider = (x, y, radius, ref) => {
    if (distToSeg(x, y, ox, oy, ex, ey) <= stats.width / 2 + radius + AIM_GRACE) hits.push({ ref, d: Math.hypot(x - ox, y - oy) });
  };
  for (const e of world.enemies) {
    if (e.type === 'phantom' && !e.visible) continue;
    consider(e.x, e.y, e.radius, { kind: 'enemy', e });
  }
  if (world.boss) {
    if (world.boss.def.id === 'eclipseel') {
      for (const s of world.bossSegments) {
        if (!s.alive) continue;
        const sx = FORGE.x + Math.cos(s.angle) * 250;
        const sy = FORGE.y + Math.sin(s.angle) * 250;
        consider(sx, sy, s.radius, { kind: 'segment', s });
      }
    } else {
      consider(world.boss.x, world.boss.y, world.boss.radius, { kind: 'boss', b: world.boss });
    }
  }
  hits.sort((a, b) => a.d - b.d);
  const struck = stats.pierce ? hits : hits.slice(0, 1);
  // Visual only: where the beam first made contact, so the renderer can
  // burst particles there. No gameplay rule reads these fields.
  if (struck.length > 0) {
    const h0 = struck[0].ref;
    const hp = h0.kind === 'enemy' ? h0.e
      : h0.kind === 'segment' ? { x: FORGE.x + Math.cos(h0.s.angle) * 250, y: FORGE.y + Math.sin(h0.s.angle) * 250 }
      : h0.b;
    beam.hitX = hp.x;
    beam.hitY = hp.y;
  }
  for (const h of struck) damageTarget(world, h.ref, stats);
  if (struck.length > 0) {
    world.stats.hits++;
    // Chain Star: the hit leaps to nearby enemies for half damage.
    if (stats.chain > 0) {
      for (const h of struck.slice(0, 1)) {
        const from = h.ref.kind === 'enemy' ? h.ref.e : world.boss || { x: FORGE.x, y: FORGE.y };
        let chained = 0;
        for (const e of world.enemies) {
          if (chained >= stats.chain) break;
          if (h.ref.kind === 'enemy' && e === h.ref.e) continue;
          if (Math.hypot(e.x - from.x, e.y - from.y) < 170) {
            damageTarget(world, { kind: 'enemy', e }, stats, 0.5);
            chained++;
          }
        }
      }
    }
    // Prism Spray: sparks seek nearby enemies.
    if (world.relics.has('prismspray')) {
      for (let i = 0; i < 3; i++) {
        const h0 = struck[0];
        const p0 = h0.ref.kind === 'enemy' ? h0.ref.e : world.boss || { x: FORGE.x, y: FORGE.y };
        world.sparks.push({ x: p0.x, y: p0.y, tx: null, life: 1.2, damage: Math.max(1, Math.round(stats.damage / 2)) });
      }
    }
  }
  return beam;
}

function damageTarget(world, ref, stats, mul = 1) {
  const crit = Math.random() < stats.critChance;
  let dmg = stats.damage * (world.eclipse > 0 ? PLAYER.eclipseMultiplier : 1) * mul;
  if (crit) dmg *= 2;
  dmg = Math.max(1, Math.round(dmg));
  if (ref.kind === 'enemy') {
    const e = ref.e;
    e.hp -= dmg;
    e.flash = 0.12;
    addFloater(world, e.x, e.y - e.radius, String(dmg), crit ? '#ffd34d' : '#fff');
    sfx.hit();
    if (e.hp <= 0) killEnemy(world, e);
  } else if (ref.kind === 'segment') {
    const s = ref.s;
    s.hp -= dmg;
    s.flash = 0.12;
    addFloater(world, FORGE.x + Math.cos(s.angle) * 250, FORGE.y + Math.sin(s.angle) * 250 - 30, String(dmg), '#c9b8ff');
    if (s.hp <= 0 && s.alive) {
      s.alive = false;
      burst(world, FORGE.x + Math.cos(s.angle) * 250, FORGE.y + Math.sin(s.angle) * 250, '#8a7bff', 22);
      damageBoss(world, 44);
    }
  } else if (ref.kind === 'boss') {
    const b = ref.b;
    if (b.def.id === 'unraveler' && !b.vulnerable) dmg = Math.max(1, Math.round(dmg * 0.25));
    b.hp -= dmg;
    b.flash = 0.12;
    // A diving Moth Queen can be broken off: 6 damage mid-dive stops her.
    if (b.dive) b.diveDamage = (b.diveDamage || 0) + dmg;
    addFloater(world, b.x, b.y - b.radius, String(dmg), crit ? '#ffd34d' : '#fff');
    sfx.hit();
    if (b.hp <= 0) killBoss(world, b);
  }
}

function damageBoss(world, amount) {
  const b = world.boss;
  if (!b) return;
  b.hp -= amount;
  if (b.hp <= 0) killBoss(world, b);
}

export function killEnemy(world, e) {
  world.enemies = world.enemies.filter((x) => x !== e);
  world.kills++;
  world.killsSinceHeal++;
  world.score += e.score;
  const dust = world.relics.has('golden') ? 2 : 1;
  world.stardust += dust;
  burst(world, e.x, e.y, e.def.color, 10);
  sfx.kill();
  if (e.type === 'splitter') {
    for (let i = 0; i < 2; i++) {
      spawnEnemy(world, 'wisp');
      const w = world.enemies[world.enemies.length - 1];
      // Start a fresh route from the death spot (t stays 0).
      w.x = e.x + (i === 0 ? -18 : 18);
      w.y = e.y;
    }
  }
  if (world.relics.has('siphon') && world.killsSinceHeal >= 12) {
    world.killsSinceHeal = 0;
    world.hull = Math.min(world.maxHull, world.hull + 1);
    addFloater(world, FORGE.x, FORGE.y - 70, '+1 hull', '#8be0a4');
  }
}

function killBoss(world, b) {
  burst(world, b.x, b.y, b.def.color, 40);
  world.shake = 0.5;
  world.score += b.def.score;
  world.stardust += 20;
  world.stats.bossesDown++;
  sfx.win();
  world.boss = null;
  world.bossSegments = [];
  world.waveState = 'clear';
  clearWave(world);
}

export function hurtForge(world, amount) {
  if (world.relics.has('aegis') && !world.aegisUsedThisWave) {
    world.aegisUsedThisWave = true;
    addFloater(world, FORGE.x, FORGE.y - 70, 'Aegis!', '#9fd8ff');
    return;
  }
  world.hull -= amount;
  world.shake = 0.4;
  sfx.hurt();
  burst(world, FORGE.x, FORGE.y, '#ff6b6b', 16);
  if (world.hull <= 0) {
    world.hull = 0;
    loseRun(world);
  }
}

export function burst(world, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 40 + Math.random() * 160;
    world.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5 + Math.random() * 0.4, color, r: 2 + Math.random() * 3 });
  }
}

export function addFloater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color, life: 0.9 });
}

/** Step the whole combat simulation by one fixed step. */
export function stepCombat(world, firing) {
  const dt = STEP;
  world.time += dt;
  const stats = beamStats(world);

  // Aim: the lens sits on the ring between the forge and the mouse.
  const aimAngle = Math.atan2(world.aimY - FORGE.y, world.aimX - FORGE.x);
  world.lensAngle = aimAngle;
  const lx = FORGE.x + Math.cos(aimAngle) * PLAYER.lensRadius;
  const ly = FORGE.y + Math.sin(aimAngle) * PLAYER.lensRadius;

  // Eclipse timer.
  if (world.eclipse > 0) world.eclipse -= dt;

  // Firing.
  world.fireTimer -= dt;
  if (firing && world.fireTimer <= 0) {
    world.fireTimer = stats.interval;
    world.shotCount++;
    const shots = stats.echoEvery > 0 && world.shotCount % stats.echoEvery === 0 ? 2 : 1;
    for (let s = 0; s < shots; s++) {
      const off = stats.split ? (s === 0 ? -14 : 14) : 0;
      const px = -Math.sin(aimAngle) * off;
      const py = Math.cos(aimAngle) * off;
      fireBeam(world, lx + px, ly + py, aimAngle, stats);
      if (stats.twin) {
        const tx = FORGE.x - Math.cos(aimAngle) * PLAYER.lensRadius;
        const ty = FORGE.y - Math.sin(aimAngle) * PLAYER.lensRadius;
        fireBeam(world, tx, ty, aimAngle, stats);
      }
    }
    sfx.shoot();
  }

  // Beams fade.
  world.beams = (world.beams || []).filter((b) => (b.life -= dt) > 0);

  // Star-motes drift; sweeping the aim line across one catches it.
  for (const m of world.motes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.tw += dt * 3;
    if (world.relics.has('magnet')) {
      const d = Math.hypot(FORGE.x - m.x, FORGE.y - m.y);
      if (d < 420) {
        m.x += ((FORGE.x - m.x) / d) * 60 * dt;
        m.y += ((FORGE.y - m.y) / d) * 60 * dt;
      }
    }
    if (!m.caught) {
      const ex = lx + Math.cos(aimAngle) * PLAYER.beamLength;
      const ey = ly + Math.sin(aimAngle) * PLAYER.beamLength;
      if (distToSeg(m.x, m.y, lx, ly, ex, ey) <= 30) {
        m.caught = true;
        world.stats.motesCaught++;
        const gain = PLAYER.alignPerMote * (world.relics.has('overcharge') ? 1.5 : 1) * haste(world);
        world.alignment = Math.min(100, world.alignment + gain);
        world.score += 5;
        sfx.mote();
        burst(world, m.x, m.y, '#ffd34d', 5);
        if (world.alignment >= 100 && world.eclipse <= 0) {
          world.eclipse = PLAYER.eclipseDuration;
          world.alignment = 0;
          sfx.eclipse();
          addFloater(world, FORGE.x, FORGE.y - 90, 'ECLIPSE BEAM!', '#ffd34d');
        }
      }
    }
  }
  world.motes = world.motes.filter((m) => !m.caught && m.x > -40 && m.x < 1320 && m.y > -40 && m.y < 760);
  if (world.motes.length < 3 && Math.random() < 0.01) {
    const edge = Math.floor(Math.random() * 4);
    const m = { x: 0, y: 0, vx: 20, vy: 0, r: 7, caught: false, tw: 0 };
    if (edge === 0) { m.x = -20; m.y = 60 + Math.random() * 600; m.vx = 24; }
    else if (edge === 1) { m.x = 1300; m.y = 60 + Math.random() * 600; m.vx = -24; }
    else if (edge === 2) { m.x = 60 + Math.random() * 1160; m.y = -20; m.vy = 24; }
    else { m.x = 60 + Math.random() * 1160; m.y = 740; m.vy = -24; }
    world.motes.push(m);
  }

  // Sparks home to the nearest enemy.
  for (const s of world.sparks) {
    s.life -= dt;
    let best = null;
    let bestD = 260;
    for (const e of world.enemies) {
      const d = Math.hypot(e.x - s.x, e.y - s.y);
      if (d < bestD) { bestD = d; best = e; }
    }
    if (best) {
      const a = Math.atan2(best.y - s.y, best.x - s.x);
      s.x += Math.cos(a) * 320 * dt;
      s.y += Math.sin(a) * 320 * dt;
      if (bestD < best.radius + 6) {
        s.life = 0;
        best.hp -= s.damage;
        best.flash = 0.1;
        if (best.hp <= 0) killEnemy(world, best);
      }
    }
  }
  world.sparks = world.sparks.filter((s) => s.life > 0);

  // Spawning.
  if (world.waveState === 'spawning') {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0 && world.spawnQueue.length > 0) {
      world.spawnTimer = world.spawnInterval;
      spawnEnemy(world, world.spawnQueue.shift());
    }
    if (world.spawnQueue.length === 0 && world.enemies.length === 0) {
      if (world.bossPending) {
        world.bossPending = false;
        spawnBoss(world);
        sfx.boss();
      } else {
        world.waveState = 'fighting';
      }
    }
  } else if (world.waveState === 'fighting' && world.enemies.length === 0 && !world.boss) {
    clearWave(world);
  }

  // Enemies: follow their route, then act by kind.
  for (const e of [...world.enemies]) {
    e.flash = Math.max(0, e.flash - dt);
    const slow = world.relics.has('slowfield') && Math.hypot(e.x - FORGE.x, e.y - FORGE.y) < 220 ? 0.7 : 1;
    if (e.state === 'route') {
      e.t += (e.speed * slow * dt) / 900;
      if (e.t >= 1) {
        e.t = 1;
        e.state = 'arrive';
      }
      const u = 1 - e.t;
      // Quadratic bezier from spawn (sx,sy) via (cx,cy) to the forge.
      // sx/sy are stored on the first step, when the enemy still sits at spawn.
      if (e.sx === undefined) { e.sx = e.x; e.sy = e.y; }
      e.x = u * u * e.sx + 2 * u * e.t * e.cx + e.t * e.t * FORGE.x;
      e.y = u * u * e.sy + 2 * u * e.t * e.cy + e.t * e.t * FORGE.y;
    } else {
      // Arrived: bite the forge.
      hurtForge(world, 1);
      world.enemies = world.enemies.filter((x) => x !== e);
      continue;
    }
    // Kind behaviours while on the route.
    if (e.type === 'wisp') {
      e.y += Math.sin(world.time * 3 + e.t * 9) * 22 * dt;
    } else if (e.type === 'spitter') {
      e.stateT += dt;
      const d = Math.hypot(FORGE.x - e.x, FORGE.y - e.y);
      if (d < 320 && e.stateT > 2.2) {
        e.stateT = 0;
        world.orbs.push({ x: e.x, y: e.y, vx: (FORGE.x - e.x) / d * 130, vy: (FORGE.y - e.y) / d * 130, r: 8, life: 6 });
      }
    } else if (e.type === 'darter') {
      e.stateT += dt;
      if (e.stateT > 1.6) {
        e.stateT = 0;
        e.t = Math.min(1, e.t + 0.12); // sudden dash along the route
      }
    } else if (e.type === 'phantom') {
      e.visible = Math.sin(world.time * 2.4 + e.t * 12) > -0.2;
    }
  }

  // Spitter orbs drift to the forge.
  for (const o of [...world.orbs]) {
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.life -= dt;
    if (Math.hypot(o.x - FORGE.x, o.y - FORGE.y) < FORGE.radius + o.r) {
      world.orbs = world.orbs.filter((x) => x !== o);
      hurtForge(world, 1);
    }
  }
  world.orbs = world.orbs.filter((o) => o.life > 0);

  // Bosses.
  if (world.boss) stepBoss(world, dt);

  // Particles and floaters.
  for (const p of world.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.98;
    p.vy *= 0.98;
    p.life -= dt;
  }
  world.particles = world.particles.filter((p) => p.life > 0);
  for (const f of world.floaters) {
    f.y -= 34 * dt;
    f.life -= dt;
  }
  world.floaters = world.floaters.filter((f) => f.life > 0);
  world.shake = Math.max(0, world.shake - dt);
  world.beamFlash = Math.max(0, world.beamFlash - dt);
  if (world.messageTimer > 0) world.messageTimer -= dt;
}

/** Boss movement and attacks, one per boss id. */
function stepBoss(world, dt) {
  const b = world.boss;
  b.flash = Math.max(0, b.flash - dt);
  b.attackTimer -= dt;
  if (b.def.id === 'mothqueen') {
    // Sweeps side to side above the forge, then dives.
    b.angle += dt * 0.9;
    b.x = FORGE.x + Math.cos(b.angle) * 330;
    b.y = 170 + Math.sin(b.angle * 2) * 60;
    b.spawnTimer -= dt;
    if (b.spawnTimer <= 0) {
      b.spawnTimer = 5;
      for (let i = 0; i < 3; i++) spawnEnemy(world, 'wisp');
    }
    if (b.attackTimer <= 0) {
      b.attackTimer = 6;
      // Dive, telegraphed: she swoops at the forge, slow enough to break off.
      b.dive = true;
      b.diveT = 0;
      b.diveDamage = 0;
      addFloater(world, b.x, b.y - b.radius - 12, 'MOTH QUEEN DIVES!', '#e8b4ff');
    }
    if (b.dive) {
      b.diveT += dt;
      // Six damage mid-dive breaks the dive off.
      if ((b.diveDamage || 0) >= 6) {
        b.dive = false;
        b.attackTimer = 6;
        addFloater(world, b.x, b.y - b.radius - 12, 'DIVE BROKEN!', '#ffd34d');
      } else {
        b.x += (FORGE.x - b.x) * 0.02;
        b.y += (FORGE.y - b.y) * 0.02;
        if (Math.hypot(b.x - FORGE.x, b.y - FORGE.y) < b.radius + FORGE.radius - 10) {
          b.dive = false;
          hurtForge(world, 1);
          b.x = FORGE.x + 330;
          b.y = 170;
        }
      }
    }
  } else if (b.def.id === 'eclipseel') {
    // Five glowing segments circle the forge; each is a target.
    for (const s of world.bossSegments) {
      if (!s.alive) continue;
      s.angle += dt * 0.55;
      s.flash = Math.max(0, s.flash - dt);
    }
    b.x = FORGE.x;
    b.y = FORGE.y;
    if (world.bossSegments.every((s) => !s.alive)) {
      // All hearts broken: the eel itself is exposed.
      killBoss(world, b);
    }
    b.spawnTimer -= dt;
    if (b.spawnTimer <= 0) {
      b.spawnTimer = 7;
      spawnEnemy(world, 'darter');
      spawnEnemy(world, 'moteeater');
    }
  } else if (b.def.id === 'unraveler') {
    // Rotating shield ring; vulnerable in windows. Three phases by HP.
    const frac = b.hp / b.maxHp;
    b.phase = frac > 0.66 ? 1 : frac > 0.33 ? 2 : 3;
    b.angle += dt * (0.5 + b.phase * 0.25);
    b.x = FORGE.x + Math.cos(world.time * 0.4) * 120;
    b.y = 200 + Math.sin(world.time * 0.6) * 50;
    b.vulnTimer -= dt;
    if (b.vulnTimer <= -5) {
      b.vulnTimer = 3; // shield drops for 3 seconds
      b.vulnerable = true;
      addFloater(world, b.x, b.y - b.radius - 10, 'SHIELD DOWN!', '#ffd34d');
    } else if (b.vulnTimer <= 0) {
      b.vulnerable = false;
    }
    b.spawnTimer -= dt;
    if (b.spawnTimer <= 0) {
      b.spawnTimer = Math.max(2.5, 6 - b.phase);
      const kinds = ['moteeater', 'wisp', 'crawler', 'spitter'];
      spawnEnemy(world, kinds[Math.floor(Math.random() * kinds.length)]);
    }
    if (b.attackTimer <= 0) {
      b.attackTimer = 4;
      // A ring of orbs bursts outward from the boss.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        world.orbs.push({ x: b.x, y: b.y, vx: Math.cos(a) * 150, vy: Math.sin(a) * 150, r: 8, life: 6 });
      }
    }
  }
  // Boss contact with the forge hurts it (and ends any dive).
  if (b.def.id !== 'eclipseel' && Math.hypot(b.x - FORGE.x, b.y - FORGE.y) < b.radius + FORGE.radius - 10) {
    b.dive = false;
    hurtForge(world, 1);
    b.x = FORGE.x + 330;
    b.y = 170;
  }
}
