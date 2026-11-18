// Everything the player sees: the forge, the lens, the dark and its teeth,
// the HUD, and every screen. One source of truth for buttons: buttonsFor()
// returns the clickable rects of the current screen, and main.js acts on them.
import { FIELD, FORGE, PLAYER, RELIC_BY_ID, WORKSHOP } from './config.js';

const GOLD = '#ffd34d';
const TEAL = '#7de8d8';
const INK = '#0a0e24';

/** HUD relic icons: one distinct glyph + tint per relic (visual only). */
const RELIC_GLYPH = {
  split: '✦', pierce: '◈', chain: '⚡', twin: '❂', magnet: '◉', glass: '▣',
  overcharge: '✚', echo: '◎', wide: '◐', slowfield: '❄', siphon: '♥', crit: '✹',
  crank: '↻', prismspray: '✳', golden: '☀', aegis: '◆',
};
const RELIC_TINT = {
  split: '#ffd34d', pierce: '#9fd8ff', chain: '#ffe08a', twin: '#e8b4ff',
  magnet: '#ff8ab0', glass: '#7de8d8', overcharge: '#ffb347', echo: '#c9b8ff',
  wide: '#8be0a4', slowfield: '#a8d8ff', siphon: '#ff6b81', crit: '#ff5c5c',
  crank: '#ffd34d', prismspray: '#ff9ff3', golden: '#ffd700', aegis: '#9fd8ff',
};

/** Clickable buttons of the current screen: {x, y, w, h, id, label}. */
export function buttonsFor(world) {
  if (world.screen === 'title') {
    const btns = [];
    world.diffChoices = ['apprentice', 'keeper', 'master'];
    world.diffChoices.forEach((id, i) => {
      btns.push({ x: 380 + i * 180, y: 318, w: 160, h: 44, id: `diff:${id}`, label: id });
    });
    WORKSHOP.forEach((item, i) => {
      btns.push({ x: 250 + i * 200, y: 428, w: 180, h: 64, id: `buy:${item.id}`, label: item.id });
    });
    btns.push({ x: 490, y: 548, w: 300, h: 56, id: 'start', label: 'BEGIN THE FIRST NIGHT' });
    return btns;
  }
  if (world.screen === 'relic') {
    const btns = world.relicChoices.map((r, i) => ({ x: 190 + i * 300, y: 210, w: 280, h: 250, id: `relic:${i}`, label: r.id }));
    btns.push({ x: 540, y: 500, w: 200, h: 44, id: 'skip', label: 'Skip (+25 stardust)' });
    return btns;
  }
  if (world.screen === 'victory') {
    return [
      { x: 340, y: 500, w: 220, h: 52, id: 'endless', label: 'ENDLESS MODE' },
      { x: 600, y: 500, w: 220, h: 52, id: 'again', label: 'PLAY AGAIN' },
      { x: 490, y: 570, w: 300, h: 44, id: 'title', label: 'Back to title' },
    ];
  }
  if (world.screen === 'defeat') {
    return [
      { x: 430, y: 500, w: 220, h: 52, id: 'again', label: 'TRY AGAIN' },
      { x: 670, y: 500, w: 220, h: 52, id: 'title', label: 'TITLE' },
    ];
  }
  if (world.screen === 'paused') {
    return [
      { x: 430, y: 400, w: 220, h: 52, id: 'resume', label: 'RESUME' },
      { x: 670, y: 400, w: 220, h: 52, id: 'title', label: 'TITLE' },
    ];
  }
  return [];
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx, x, y, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.2, y, x - s * 0.6, y - s, x, y - s * 0.3);
  ctx.bezierCurveTo(x + s * 0.6, y - s, x + s * 1.2, y, x, y + s * 0.9);
  ctx.fill();
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    const s = world.shake * 14;
    ctx.translate((Math.random() - 0.5) * s, (Math.random() - 0.5) * s);
  }
  drawBackground(ctx, world);
  if (world.screen === 'title') { drawTitle(ctx, world); ctx.restore(); return; }
  drawMotes(ctx, world);
  drawEnemies(ctx, world);
  drawBoss(ctx, world);
  drawOrbs(ctx, world);
  drawSparks(ctx, world);
  drawForge(ctx, world);
  drawBeams(ctx, world);
  drawParticles(ctx, world);
  drawFloaters(ctx, world);
  drawHUD(ctx, world);
  if (world.screen === 'relic') drawRelicScreen(ctx, world);
  if (world.screen === 'victory') drawEndScreen(ctx, world, true);
  if (world.screen === 'defeat') drawEndScreen(ctx, world, false);
  if (world.screen === 'paused') drawPaused(ctx, world);
  ctx.restore();
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, 720);
  g.addColorStop(0, '#0a0e24');
  g.addColorStop(0.6, '#101736');
  g.addColorStop(1, '#0a0e24');
  ctx.fillStyle = g;
  ctx.fillRect(-20, -20, 1320, 760);
  // Nebula blobs.
  ctx.globalAlpha = 0.10;
  ctx.fillStyle = '#3b2a6b';
  ctx.beginPath(); ctx.ellipse(240, 180, 260, 130, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#123a4a';
  ctx.beginPath(); ctx.ellipse(1060, 540, 280, 140, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  // Stars, twinkling.
  for (const s of world.stars || []) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(world.time * 1.5 + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe4ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Faint orbit rings around the forge: the star-chart.
  ctx.strokeStyle = 'rgba(160,180,255,0.10)';
  ctx.lineWidth = 1;
  for (const r of [120, 190, 260, 330]) {
    ctx.beginPath();
    ctx.arc(FORGE.x, FORGE.y, r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawForge(ctx, world) {
  const pulse = 1 + Math.sin(world.time * 2.2) * 0.06;
  // Glow.
  const glow = ctx.createRadialGradient(FORGE.x, FORGE.y, 10, FORGE.x, FORGE.y, 150);
  glow.addColorStop(0, world.eclipse > 0 ? 'rgba(255,211,77,0.55)' : 'rgba(255,211,77,0.28)');
  glow.addColorStop(1, 'rgba(255,211,77,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, 150, 0, Math.PI * 2);
  ctx.fill();
  // The lens-heart: concentric rings and a bright core.
  ctx.strokeStyle = '#e8c15a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, FORGE.radius * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(232,193,90,0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, FORGE.radius * 0.72 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  const core = ctx.createRadialGradient(FORGE.x, FORGE.y, 2, FORGE.x, FORGE.y, 26);
  core.addColorStop(0, '#fff7d6');
  core.addColorStop(0.6, GOLD);
  core.addColorStop(1, 'rgba(255,160,40,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(FORGE.x, FORGE.y, 26, 0, Math.PI * 2);
  ctx.fill();
  // Hull pips around the forge.
  for (let i = 0; i < world.maxHull; i++) {
    const a = -Math.PI / 2 + (i / world.maxHull) * Math.PI * 2;
    const x = FORGE.x + Math.cos(a) * (FORGE.radius + 16);
    const y = FORGE.y + Math.sin(a) * (FORGE.radius + 16);
    heart(ctx, x, y, 6, i < world.hull ? '#ff6b81' : 'rgba(255,107,129,0.18)');
  }
}

function drawMotes(ctx, world) {
  for (const m of world.motes) {
    const tw = 0.6 + 0.4 * Math.sin(m.tw);
    ctx.globalAlpha = tw;
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = tw * 0.35;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r + 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawEnemies(ctx, world) {
  for (const e of world.enemies) {
    if (e.type === 'phantom' && !e.visible) {
      ctx.globalAlpha = 0.25;
    }
    const c = e.def.color;
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.globalAlpha = 0.85;
    // Glow so no enemy reads as a flat circle on the dark field.
    ctx.shadowColor = c;
    ctx.shadowBlur = 12;
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    if (e.type === 'moteeater') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'wisp') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath(); ctx.arc(0, 0, e.radius + 5, world.time * 2, world.time * 2 + 4); ctx.stroke();
    } else if (e.type === 'crawler') {
      rr(ctx, -e.radius, -e.radius * 0.7, e.radius * 2, e.radius * 1.4, 6);
      ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.fillRect(-e.radius * 0.5, -3, e.radius, 6);
    } else if (e.type === 'spitter') {
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 + world.time;
        const px = Math.cos(a) * e.radius;
        const py = Math.sin(a) * e.radius;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    } else if (e.type === 'brute') {
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#0a0e24'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.6, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-e.radius, 0); ctx.lineTo(e.radius, 0); ctx.stroke();
    } else if (e.type === 'splitter') {
      ctx.beginPath(); ctx.arc(-6, -4, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(7, 5, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'darter') {
      ctx.beginPath();
      ctx.moveTo(e.radius + 8, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.7);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, e.radius * 0.7);
      ctx.closePath(); ctx.fill();
    } else if (e.type === 'phantom') {
      ctx.globalAlpha = e.visible ? 0.95 : 0.3;
      ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a0e24';
      ctx.beginPath(); ctx.arc(-4, -3, 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(4, -3, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Thin halo ring: a second read on each shape at a glance.
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, e.radius + 3, 0, Math.PI * 2); ctx.stroke();
    // HP pips for tough enemies.
    if (e.maxHp >= 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      const w = e.radius * 2;
      ctx.fillRect(-w / 2, -e.radius - 10, w * (e.hp / e.maxHp), 3);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawBoss(ctx, world) {
  const b = world.boss;
  if (!b) return;
  ctx.save();
  if (b.def.id === 'eclipseel') {
    // Five glowing hearts circling the forge.
    for (const s of world.bossSegments) {
      if (!s.alive) continue;
      const x = FORGE.x + Math.cos(s.angle) * 250;
      const y = FORGE.y + Math.sin(s.angle) * 250;
      // Serrated segment: an 8-point star, not a plain disc.
      ctx.fillStyle = s.flash > 0 ? '#fff' : '#8a7bff';
      ctx.shadowColor = '#8a7bff';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + s.angle;
        const pr = i % 2 === 0 ? s.radius : s.radius * 0.68;
        const px = x + Math.cos(a) * pr;
        const py = y + Math.sin(a) * pr;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#c9b8ff';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, s.radius + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x, y, s.radius * 0.35, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    return;
  }
  ctx.translate(b.x, b.y);
  if (b.flash > 0) ctx.globalAlpha = 0.85;
  if (b.def.id === 'mothqueen') {
    // Big moth: two wings and a body, with a glowing outline and wing veins.
    ctx.shadowColor = '#e8b4ff';
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#e8b4ff';
    ctx.beginPath(); ctx.ellipse(-34, -8, 34, 22, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(34, -8, 34, 22, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Wing veins: inner ellipse strokes + eye-spots, so the wings read as wings.
    ctx.strokeStyle = '#7a4a8f';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(-34, -8, 22, 13, -0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(34, -8, 22, 13, 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(-44, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, -14, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a8f';
    ctx.beginPath(); ctx.arc(-44, -14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(44, -14, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4a8f';
    ctx.beginPath(); ctx.ellipse(0, 0, 16, 34, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath(); ctx.arc(-8, -14, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(8, -14, 4, 0, Math.PI * 2); ctx.fill();
  } else {
    // The Unraveler: a torn ring with a burning core; shield arcs when guarded.
    // Pulsing dark aura: a breathing halo that never touches the hitbox.
    const pulse = 0.5 + 0.5 * Math.sin(world.time * 2.4);
    const aura = ctx.createRadialGradient(0, 0, b.radius, 0, 0, b.radius + 46 + pulse * 14);
    aura.addColorStop(0, 'rgba(120,20,60,0.35)');
    aura.addColorStop(1, 'rgba(120,20,60,0)');
    ctx.fillStyle = aura;
    ctx.beginPath(); ctx.arc(0, 0, b.radius + 46 + pulse * 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = b.vulnerable ? '#ffd34d' : '#ff6b6b';
    ctx.shadowColor = b.vulnerable ? '#ffd34d' : '#ff6b6b';
    ctx.shadowBlur = 20;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(0, 0, b.radius, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,107,107,0.4)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, b.radius + 12, b.angle, b.angle + 2.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, b.radius + 12, b.angle + Math.PI, b.angle + Math.PI + 2.2); ctx.stroke();
    ctx.fillStyle = '#ff8a5c';
    ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a0e24';
    ctx.beginPath(); ctx.arc(0, 0, b.radius * 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawOrbs(ctx, world) {
  for (const o of world.orbs) {
    ctx.fillStyle = '#ff8ab0';
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35;
    ctx.beginPath(); ctx.arc(o.x, o.y, o.r + 5, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawSparks(ctx, world) {
  for (const s of world.sparks) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBeams(ctx, world) {
  for (const b of world.beams || []) {
    const a = Math.min(1, b.life / 0.09);
    // One small burst at the contact point, the first frame the beam is seen.
    // Visual only: the particles are culled by the normal update loop.
    if (b.hitX !== undefined && !b.burstDone) {
      b.burstDone = true;
      for (let i = 0; i < 10; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 200;
        (world.particles = world.particles || []).push({
          x: b.hitX, y: b.hitY,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0.25 + Math.random() * 0.3,
          color: i % 3 === 0 ? '#ffffff' : (b.eclipse ? GOLD : '#cfe9ff'),
          r: 1.5 + Math.random() * 2.5,
        });
      }
    }
    const hot = b.eclipse;
    const glowCol = hot ? '255,160,40' : '120,180,255';
    const midCol = hot ? GOLD : '#cfe9ff';
    ctx.save();
    ctx.globalAlpha = a;
    ctx.lineCap = 'round';
    // Layer 1: wide translucent outer glow.
    ctx.strokeStyle = `rgba(${glowCol},0.30)`;
    ctx.lineWidth = b.width * 2.6;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    // Layer 2: bright mid beam.
    ctx.strokeStyle = midCol;
    ctx.lineWidth = b.width;
    ctx.shadowColor = midCol;
    ctx.shadowBlur = hot ? 26 : 12;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    // Layer 3: thin white-hot core, width jittering every frame.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(2, b.width * (0.22 + Math.random() * 0.14));
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(b.x1, b.y1);
    ctx.lineTo(b.x2, b.y2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawParticles(ctx, world) {
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life * 2);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, world) {
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = Math.min(1, f.life * 1.5);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function drawHUD(ctx, world) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Top-left: hull, score, stardust.
  ctx.fillStyle = 'rgba(10,14,36,0.55)';
  rr(ctx, 16, 12, 240, 86, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText('HULL', 30, 34);
  for (let i = 0; i < world.maxHull; i++) {
    heart(ctx, 84 + i * 24, 28, 7, i < world.hull ? '#ff6b81' : 'rgba(255,107,129,0.2)');
  }
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`SCORE  ${world.score}`, 30, 66);
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillStyle = GOLD;
  ctx.fillText(`✦ ${world.stardust} stardust`, 30, 88);
  // Top-center: night and wave.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 18px system-ui, sans-serif';
  const waveInNight = world.endless ? world.wave : ((world.wave - 1) % 5) + 1;
  ctx.fillText(world.endless ? `ENDLESS — WAVE ${world.wave}` : `NIGHT ${world.night}  •  WAVE ${waveInNight} / 5`, 640, 34);
  // Boss bar.
  if (world.boss) {
    const b = world.boss;
    ctx.fillStyle = 'rgba(10,14,36,0.6)';
    rr(ctx, 440, 44, 400, 26, 8);
    ctx.fill();
    ctx.fillStyle = b.def.color;
    rr(ctx, 446, 50, 388 * Math.max(0, b.hp / b.maxHp), 14, 6);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(b.def.name, 640, 62);
  }
  // Relic icons, bottom-left.
  let rx = 24;
  ctx.textAlign = 'left';
  for (const id of world.relics) {
    const relic = RELIC_BY_ID[id];
    ctx.fillStyle = 'rgba(10,14,36,0.6)';
    rr(ctx, rx, 668, 34, 34, 8);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 1.5;
    rr(ctx, rx, 668, 34, 34, 8);
    ctx.stroke();
    ctx.fillStyle = RELIC_TINT[id] || GOLD;
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(RELIC_GLYPH[id] || relic.name[0], rx + 17, 691);
    ctx.textAlign = 'left';
    rx += 42;
  }
  // Alignment bar, bottom-center.
  const bw = 420;
  const bx = 640 - bw / 2;
  ctx.fillStyle = 'rgba(10,14,36,0.6)';
  rr(ctx, bx - 6, 662, bw + 12, 30, 10);
  ctx.fill();
  if (world.eclipse > 0) {
    ctx.fillStyle = GOLD;
    rr(ctx, bx, 668, bw * (world.eclipse / PLAYER.eclipseDuration), 18, 8);
    ctx.fill();
    // White text with a dark outline: readable on the gold bar AND where it
    // spills past the bar's shrinking edge onto the dark panel.
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,14,36,0.9)';
    ctx.strokeText(`ECLIPSE BEAM  ${world.eclipse.toFixed(1)}s`, 640, 681);
    ctx.fillStyle = '#fff';
    ctx.fillText(`ECLIPSE BEAM  ${world.eclipse.toFixed(1)}s`, 640, 681);
  } else {
    ctx.fillStyle = '#e8c15a';
    rr(ctx, bx, 668, bw * (world.alignment / 100), 18, 8);
    ctx.fill();
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(10,14,36,0.9)';
    ctx.strokeText(`ALIGNMENT  ${Math.floor(world.alignment)}% — sweep the aim over golden motes`, 640, 681);
    ctx.fillStyle = '#fff';
    ctx.fillText(`ALIGNMENT  ${Math.floor(world.alignment)}% — sweep the aim over golden motes`, 640, 681);
  }
  // Message banner.
  if (world.messageTimer > 0 && world.message) {
    ctx.globalAlpha = Math.min(1, world.messageTimer);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(world.message, 640, 120);
    ctx.globalAlpha = 1;
  }
  // Controls hint, top-right.
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Mouse aim • Hold to fire • P pause • M mute', 1264, 30);
}

function drawTitle(ctx, world) {
  ctx.textAlign = 'center';
  // Title.
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.fillText('LUMENFORGE', 640, 128);
  ctx.fillStyle = '#cfe4ff';
  ctx.font = 'italic 24px Georgia, serif';
  ctx.fillText('Keeper of the Last Light', 640, 168);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The dark sends its teeth along the star-charts. Turn the great lens, sweep golden', 640, 212);
  ctx.fillText('motes into alignment, and burn the dark with the Eclipse Beam. Three nights. Three bosses.', 640, 236);
  // Difficulty buttons.
  ctx.font = 'bold 15px system-ui, sans-serif';
  const diffs = [
    { id: 'apprentice', name: 'Apprentice' },
    { id: 'keeper', name: 'Keeper' },
    { id: 'master', name: 'Master' },
  ];
  diffs.forEach((d, i) => {
    const x = 380 + i * 180;
    const sel = world.diff.id === d.id;
    ctx.fillStyle = sel ? GOLD : 'rgba(10,14,36,0.7)';
    rr(ctx, x, 318, 160, 44, 10);
    ctx.fill();
    ctx.strokeStyle = sel ? GOLD : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    rr(ctx, x, 318, 160, 44, 10);
    ctx.stroke();
    ctx.fillStyle = sel ? '#0a0e24' : '#fff';
    ctx.fillText(d.name, x + 80, 346);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('Difficulty — click to choose', 640, 300);
  // Workshop.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`WORKSHOP  •  ${world.meta.stardust} stardust banked`, 640, 412);
  WORKSHOP.forEach((item, i) => {
    const x = 250 + i * 200;
    const level = world.meta.levels[item.id] || 0;
    const maxed = level >= item.max;
    const afford = world.meta.stardust >= item.cost;
    ctx.fillStyle = maxed ? 'rgba(255,211,77,0.25)' : 'rgba(10,14,36,0.7)';
    rr(ctx, x, 428, 180, 64, 10);
    ctx.fill();
    ctx.strokeStyle = maxed ? GOLD : afford ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(item.name, x + 90, 452);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(item.text, x + 90, 470);
    ctx.fillStyle = maxed ? GOLD : afford ? GOLD : 'rgba(255,255,255,0.5)';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText(maxed ? 'MAXED' : `✦ ${item.cost}  •  Lv ${level}/${item.max}`, x + 90, 486);
  });
  // Start button.
  ctx.fillStyle = GOLD;
  rr(ctx, 490, 548, 300, 56, 12);
  ctx.fill();
  ctx.fillStyle = '#0a0e24';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('BEGIN THE FIRST NIGHT', 640, 583);
  // Best score.
  const best = bestScore();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '14px system-ui, sans-serif';
  if (best > 0) ctx.fillText(`Best score on this machine: ${best}`, 640, 632);
  ctx.fillText('Mouse aim • Hold click or Space to fire • 1/2/3 pick a relic • P pause • R restart', 640, 660);
}

export function bestScore() {
  try {
    return parseInt(localStorage.getItem('lumenforge-best') || '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    if (score > bestScore()) localStorage.setItem('lumenforge-best', String(score));
  } catch {
    // A best score that cannot be saved is still a finished run.
  }
}

function drawRelicScreen(ctx, world) {
  ctx.fillStyle = 'rgba(5,8,20,0.72)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 40px Georgia, serif';
  ctx.fillText('Choose a relic', 640, 150);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The forge offers three. Take one — or skip for 25 stardust.', 640, 182);
  world.relicChoices.forEach((r, i) => {
    const x = 190 + i * 300;
    ctx.fillStyle = 'rgba(16,23,54,0.95)';
    rr(ctx, x, 210, 280, 250, 14);
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    rr(ctx, x, 210, 280, 250, 14);
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.font = 'bold 22px Georgia, serif';
    ctx.fillText(r.name, x + 140, 258);
    ctx.fillStyle = '#fff';
    ctx.font = '15px system-ui, sans-serif';
    wrapText(ctx, r.text, x + 140, 296, 240, 21);
    ctx.fillStyle = TEAL;
    ctx.font = 'italic 14px Georgia, serif';
    wrapText(ctx, r.synergy, x + 140, 380, 240, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(`Press ${i + 1} or click`, x + 140, 440);
  });
  ctx.fillStyle = 'rgba(10,14,36,0.9)';
  rr(ctx, 540, 500, 200, 44, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  rr(ctx, 540, 500, 200, 44, 10);
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText('Skip  (+25 ✦)', 640, 527);
}

function wrapText(ctx, text, cx, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, cx, yy);
      line = w;
      yy += lh;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, cx, yy);
}

function drawEndScreen(ctx, world, won) {
  ctx.fillStyle = 'rgba(5,8,20,0.78)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? GOLD : '#ff6b81';
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(won ? 'THE LIGHT HOLDS' : 'THE DARK TAKES THE FORGE', 640, 190);
  ctx.fillStyle = '#fff';
  ctx.font = '18px Georgia, serif';
  ctx.fillText(
    won ? 'Three nights survived. The forge burns on — and the dark keeps coming.'
      : `The forge fell on Night ${world.night}, Wave ${((world.wave - 1) % 5) + 1}. The Keeper rises again.`,
    640, 232,
  );
  const rows = [
    ['Score', world.score],
    ['Nights survived', won ? 3 : world.night - 1],
    ['Kills', world.kills],
    ['Bosses down', world.stats.bossesDown],
    ['Relics taken', world.stats.relicsTaken],
    ['Motes caught', world.stats.motesCaught],
    ['Stardust earned', world.stardust],
  ];
  ctx.font = '17px system-ui, sans-serif';
  rows.forEach(([label, value], i) => {
    const y = 290 + i * 28;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.textAlign = 'right';
    ctx.fillText(label, 620, y);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(String(value), 660, y);
  });
  const btns = buttonsFor(world);
  for (const b of btns) {
    const primary = b.id === 'again' || b.id === 'endless';
    ctx.fillStyle = primary ? GOLD : 'rgba(10,14,36,0.9)';
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.strokeStyle = primary ? GOLD : 'rgba(255,255,255,0.4)';
    ctx.stroke();
    ctx.fillStyle = primary ? '#0a0e24' : '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  }
}

function drawPaused(ctx, world) {
  ctx.fillStyle = 'rgba(5,8,20,0.7)';
  ctx.fillRect(0, 0, 1280, 720);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px Georgia, serif';
  ctx.fillText('PAUSED', 640, 320);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('The forge waits. The dark does not.', 640, 356);
  for (const b of buttonsFor(world)) {
    ctx.fillStyle = b.id === 'resume' ? GOLD : 'rgba(10,14,36,0.9)';
    rr(ctx, b.x, b.y, b.w, b.h, 10);
    ctx.fill();
    ctx.fillStyle = b.id === 'resume' ? '#0a0e24' : '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  }
}
