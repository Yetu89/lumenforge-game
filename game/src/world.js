// The world: one state object, built fresh per run, stepped at 60 Hz.
// Screens: title, playing, relic, victory, defeat, paused. Boss fights are
// waves 5, 10 and 15; a relic is offered after waves 1, 3, 5, 7, 9, 11, 13, 15.
import { FIELD, FORGE, PLAYER, DIFFICULTIES, ENEMIES, BOSSES, RELICS, RELIC_BY_ID, waveComp, WORKSHOP } from './config.js';
import { mulberry32, pick, range } from './random.js';

export const RELIC_OFFER_WAVES = [1, 3, 5, 7, 9, 11, 13, 15];
const META_KEY = 'lumenforge-workshop-v1';

export function loadMeta() {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return { stardust: 0, levels: {} };
    const m = JSON.parse(raw);
    return { stardust: m.stardust | 0, levels: m.levels || {} };
  } catch {
    return { stardust: 0, levels: {} };
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // Progress that cannot be saved is still a finished run.
  }
}

/** A fresh run. `seed` replays exactly; `difficultyId` picks the tuning. */
export function createWorld(seed, difficultyId) {
  const diff = DIFFICULTIES.find((d) => d.id === difficultyId) || DIFFICULTIES[1];
  const meta = loadMeta();
  const rng = mulberry32(seed);
  const maxHull = Math.min(PLAYER.maxHull, diff.hull + (meta.levels.hull || 0));
  const world = {
    seed, rng, diff, meta,
    screen: 'title',
    time: 0,
    night: 1,
    wave: 0,
    waveState: 'idle', // idle | spawning | fighting | clear | boss
    spawnQueue: [],
    spawnTimer: 0,
    spawnInterval: 1.2,
    enemies: [],
    orbs: [],
    motes: [],
    sparks: [],
    particles: [],
    floaters: [],
    boss: null,
    bossSegments: [],
    aimX: FIELD.width / 2,
    aimY: 140,
    lensAngle: -Math.PI / 2,
    fireTimer: 0,
    shotCount: 0,
    hull: maxHull,
    maxHull,
    score: 0,
    stardust: 0,
    kills: 0,
    killsSinceHeal: 0,
    alignment: 0,
    eclipse: 0, // seconds of Eclipse Beam left
    relics: new Set(),
    relicChoices: [],
    aegisUsedThisWave: false,
    shieldHits: 0,
    bossPhase: 1,
    endless: false,
    endlessWave: 0,
    shake: 0,
    beamFlash: 0,
    stats: { shots: 0, hits: 0, motesCaught: 0, relicsTaken: 0, bossesDown: 0 },
    message: '',
    messageTimer: 0,
  };
  if (meta.levels.startrelic) {
    const first = pick(rng, RELICS);
    world.relics.add(first.id);
    applyRelicInstant(world, first.id);
  }
  seedStars(world);
  return world;
}

/** The background starfield, fixed per run. */
function seedStars(world) {
  world.stars = [];
  for (let i = 0; i < 130; i++) {
    world.stars.push({
      x: world.rng() * FIELD.width,
      y: world.rng() * FIELD.height,
      r: 0.6 + world.rng() * 1.6,
      tw: world.rng() * Math.PI * 2,
    });
  }
}

/** Start a run from the title screen. */
export function startRun(world) {
  world.screen = 'playing';
  world.time = 0;
  world.night = 1;
  world.wave = 0;
  world.endless = false;
  world.endlessWave = 0;
  world.score = 0;
  world.stardust = 0;
  world.kills = 0;
  world.killsSinceHeal = 0;
  world.alignment = 0;
  world.eclipse = 0;
  world.relics = new Set();
  world.enemies = [];
  world.orbs = [];
  world.motes = [];
  world.sparks = [];
  world.particles = [];
  world.floaters = [];
  world.beams = [];
  world.boss = null;
  world.bossSegments = [];
  world.bossPending = false;
  world.waveState = 'idle';
  world.stats = { shots: 0, hits: 0, motesCaught: 0, relicsTaken: 0, bossesDown: 0 };
  if (world.meta.levels.startrelic) {
    const first = pick(world.rng, RELICS);
    world.relics.add(first.id);
    applyRelicInstant(world, first.id);
  }
  world.hull = world.maxHull;
  nextWave(world);
}

/** Begin the next wave (or the next night's boss). */
export function nextWave(world) {
  world.wave++;
  if (world.wave > 15 && !world.endless) {
    winRun(world);
    return;
  }
  if (world.wave > 15) world.endlessWave = world.wave - 15;
  world.night = Math.min(3, Math.ceil(world.wave / 5));
  world.aegisUsedThisWave = false;
  world.waveState = 'spawning';
  world.spawnTimer = 0.6;
  const isBossWave = world.wave % 5 === 0;
  const comp = waveComp(world.wave, world.rng);
  world.spawnQueue = comp.queue;
  world.spawnInterval = comp.interval;
  world.bossPending = isBossWave;
  world.message = isBossWave
    ? `Night ${world.night} — something stirs in the dark…`
    : `Night ${world.night} — Wave ${world.wave - (world.night - 1) * 5} of 5`;
  world.messageTimer = 2.4;
  // A few star-motes drift in with every wave: alignment fuel.
  for (let i = 0; i < 5; i++) spawnMote(world);
}

function spawnMote(world) {
  const edge = Math.floor(world.rng() * 4);
  let x, y, vx, vy;
  if (edge === 0) { x = -20; y = range(world.rng, 60, 660); vx = range(world.rng, 18, 34); vy = range(world.rng, -8, 8); }
  else if (edge === 1) { x = 1300; y = range(world.rng, 60, 660); vx = -range(world.rng, 18, 34); vy = range(world.rng, -8, 8); }
  else if (edge === 2) { x = range(world.rng, 60, 1220); y = -20; vx = range(world.rng, -8, 8); vy = range(world.rng, 18, 34); }
  else { x = range(world.rng, 60, 1220); y = 740; vx = range(world.rng, -8, 8); vy = -range(world.rng, 18, 34); }
  world.motes.push({ x, y, vx, vy, r: 7, caught: false, tw: world.rng() * 6 });
}

/** Spawn one enemy on a curved star-chart route toward the forge. */
export function spawnEnemy(world, type) {
  const def = ENEMIES[type];
  const angle = world.rng() * Math.PI * 2;
  const dist = 560 + world.rng() * 120;
  const sx = FORGE.x + Math.cos(angle) * dist;
  const sy = FORGE.y + Math.sin(angle) * dist;
  // A control point off to the side bends the route into a curve.
  const mid = Math.atan2(FORGE.y - sy, FORGE.x - sx) + (world.rng() < 0.5 ? 1 : -1) * range(world.rng, 0.5, 1.1);
  const cx = (sx + FORGE.x) / 2 + Math.cos(mid) * 220;
  const cy = (sy + FORGE.y) / 2 + Math.sin(mid) * 220;
  const hpMul = world.diff.hpMul * (1 + (world.wave - 1) * 0.06) * (world.endless ? 1 + world.endlessWave * 0.08 : 1);
  world.enemies.push({
    id: Math.random().toString(36).slice(2, 8),
    type, def,
    x: sx, y: sy,
    cx, cy,
    t: 0,
    hp: Math.max(1, Math.round(def.hp * hpMul)),
    maxHp: Math.max(1, Math.round(def.hp * hpMul)),
    speed: def.speed * world.diff.speedMul * (1 + (world.wave - 1) * 0.012),
    radius: def.radius,
    score: def.score,
    state: 'route',
    stateT: 0,
    visible: true,
    flash: 0,
  });
}

/** Bring the night's boss in. */
export function spawnBoss(world) {
  const bossDef = BOSSES[world.night - 1];
  const hpMul = world.diff.hpMul * (world.endless ? 1 + world.endlessWave * 0.1 : 1);
  const boss = {
    id: bossDef.id,
    def: bossDef,
    x: FORGE.x,
    y: 130,
    hp: Math.round(bossDef.hp * hpMul),
    maxHp: Math.round(bossDef.hp * hpMul),
    radius: bossDef.radius,
    angle: 0,
    attackTimer: 2.5,
    spawnTimer: 4,
    phase: 1,
    vulnerable: true,
    vulnTimer: 0,
    flash: 0,
  };
  world.boss = boss;
  world.bossSegments = [];
  if (bossDef.id === 'eclipseel') {
    for (let i = 0; i < 5; i++) {
      world.bossSegments.push({
        seg: i, angle: (i / 5) * Math.PI * 2,
        hp: Math.round(44 * hpMul), maxHp: Math.round(44 * hpMul),
        radius: 26, flash: 0, alive: true,
      });
    }
  }
  world.waveState = 'boss';
  world.message = `${bossDef.name} — ${bossDef.blurb}`;
  world.messageTimer = 3;
}

/** The wave is over: bonus, then a relic offer on offer waves. */
export function clearWave(world) {
  const bonus = 50 * world.wave;
  world.score += bonus;
  world.stardust += 5;
  world.boss = null;
  world.bossSegments = [];
  world.waveState = 'clear';
  if (RELIC_OFFER_WAVES.includes(world.wave) || world.wave % 2 === 1) {
    offerRelics(world);
  } else {
    world.clearTimer = 1.6;
  }
}

/** Offer three relics the run does not own yet. */
export function offerRelics(world) {
  const owned = world.relics;
  const pool = RELICS.filter((r) => !owned.has(r.id));
  const choices = [];
  while (choices.length < 3 && pool.length > 0) {
    const i = Math.floor(world.rng() * pool.length);
    choices.push(pool.splice(i, 1)[0]);
  }
  if (choices.length === 0) {
    world.clearTimer = 1.2;
    return;
  }
  world.relicChoices = choices;
  world.screen = 'relic';
}

export function takeRelic(world, index) {
  const relic = world.relicChoices[index];
  if (!relic) return;
  world.relics.add(relic.id);
  world.stats.relicsTaken++;
  applyRelicInstant(world, relic.id);
  world.relicChoices = [];
  world.screen = 'playing';
  world.clearTimer = 1.0;
}

export function skipRelic(world) {
  world.stardust += 25;
  world.relicChoices = [];
  world.screen = 'playing';
  world.clearTimer = 1.0;
}

/** Relics whose effect applies once, on pickup. */
export function applyRelicInstant(world, id) {
  if (id === 'glass') {
    world.maxHull = Math.min(PLAYER.maxHull, world.maxHull + 1);
    world.hull = Math.min(world.maxHull, world.hull + 1);
  }
}

function winRun(world) {
  world.screen = 'victory';
  world.meta.stardust += world.stardust;
  saveMeta(world.meta);
}

export function loseRun(world) {
  world.screen = 'defeat';
  world.meta.stardust += Math.floor(world.stardust / 2);
  saveMeta(world.meta);
}

/** Buy a workshop upgrade on the title screen. Returns true when bought. */
export function buyWorkshop(world, id) {
  const item = WORKSHOP.find((w) => w.id === id);
  if (!item) return false;
  const level = world.meta.levels[id] || 0;
  if (level >= item.max) return false;
  if (world.meta.stardust < item.cost) return false;
  world.meta.stardust -= item.cost;
  world.meta.levels[id] = level + 1;
  saveMeta(world.meta);
  // Rebuild this run's derived stats so the title shows the new numbers.
  const maxHull = Math.min(PLAYER.maxHull, world.diff.hull + (world.meta.levels.hull || 0));
  world.maxHull = maxHull;
  world.hull = maxHull;
  return true;
}
