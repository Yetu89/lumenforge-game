// LUMENFORGE — every tuning number and content table in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };
export const FORGE = { x: 640, y: 360, radius: 46 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Three nights, five waves a night, a boss at the end of each night. */
export const WAVES_PER_NIGHT = 5;
export const NIGHTS = 3;
export const FINAL_WAVE = NIGHTS * WAVES_PER_NIGHT; // 15

export const PLAYER = {
  lensRadius: 190, // the lens ring's orbit around the forge
  lensSize: 22,
  fireInterval: 0.22,
  beamLength: 560,
  beamWidth: 14,
  beamDamage: 1,
  beamSpeed: 0, // the beam is instant: it is a line from the lens
  alignPerMote: 14, // alignment gained by sweeping the aim over a star-mote
  eclipseDuration: 6, // seconds the Eclipse Beam stays lit at 100% alignment
  eclipseMultiplier: 4,
  hull: 3,
  maxHull: 5,
};

/** Difficulties: Apprentice / Keeper / Master, plus Endless after the win. */
export const DIFFICULTIES = [
  { id: 'apprentice', name: 'Apprentice', hpMul: 0.8, speedMul: 0.9, hull: 4, label: 'gentle light' },
  { id: 'keeper', name: 'Keeper', hpMul: 1.0, speedMul: 1.0, hull: 3, label: 'the intended trial' },
  { id: 'master', name: 'Master', hpMul: 1.35, speedMul: 1.12, hull: 2, label: 'the dark bites hard' },
];

/** The eight things that crawl out of the dark. hp / speed / score / radius. */
export const ENEMIES = {
  moteeater: { name: 'Mote-Eater', hp: 1, speed: 95, score: 10, radius: 13, color: '#8be0a4', kind: 'chaser' },
  wisp: { name: 'Wisp', hp: 1, speed: 70, score: 15, radius: 12, color: '#9fd8ff', kind: 'weaver' },
  crawler: { name: 'Crawler', hp: 3, speed: 42, score: 20, radius: 17, color: '#c9a86a', kind: 'chaser' },
  spitter: { name: 'Spitter', hp: 2, speed: 55, score: 25, radius: 14, color: '#e08bb0', kind: 'shooter' },
  brute: { name: 'Brute', hp: 8, speed: 34, score: 40, radius: 26, color: '#d97b4f', kind: 'chaser' },
  splitter: { name: 'Splitter', hp: 2, speed: 62, score: 30, radius: 15, color: '#b79cff', kind: 'splitter' },
  darter: { name: 'Darter', hp: 1, speed: 60, score: 30, radius: 12, color: '#ffe08a', kind: 'darter' },
  phantom: { name: 'Phantom', hp: 2, speed: 78, score: 35, radius: 14, color: '#7de8d8', kind: 'phantom' },
};
export const ENEMY_ORDER = ['moteeater', 'wisp', 'crawler', 'spitter', 'brute', 'splitter', 'darter', 'phantom'];

/** The three bosses, one per night. */
export const BOSSES = [
  {
    id: 'mothqueen', name: 'MOTH QUEEN', hp: 120, radius: 54, score: 500,
    color: '#e8b4ff', blurb: 'She eats the light one mote at a time.',
  },
  {
    id: 'eclipseel', name: 'ECLIPSE EEL', hp: 220, radius: 40, score: 900,
    color: '#8a7bff', blurb: 'Five glowing hearts, one coiling dark.',
  },
  {
    id: 'unraveler', name: 'THE UNRAVELER', hp: 340, radius: 60, score: 1500,
    color: '#ff6b6b', blurb: 'It unmakes the night, thread by thread.',
  },
];

/**
 * The sixteen relics. id / name / short line for the choice screen.
 * apply() lives in combat.js; each relic changes exactly one rule, and the
 * choice screen names the synergy it opens.
 */
export const RELICS = [
  { id: 'split', name: 'Split Prism', text: 'The beam splits into two parallel beams.', synergy: 'Pairs with Pierce: a crowd melts.' },
  { id: 'pierce', name: 'Piercing Lens', text: 'The beam passes through every enemy it touches.', synergy: 'Pairs with Split: two lanes, no waste.' },
  { id: 'chain', name: 'Chain Star', text: 'Hits chain to 2 nearby enemies for half damage.', synergy: 'Pairs with Crit: chains can crit.' },
  { id: 'twin', name: 'Twin Lens', text: 'A second lens orbits opposite yours and fires too.', synergy: 'Pairs with Rapid Crank: twice the fire.' },
  { id: 'magnet', name: 'Magnet Coil', text: 'Motes and stardust drift toward the forge.', synergy: 'Pairs with Overcharge: alignment floods in.' },
  { id: 'glass', name: 'Thick Glass', text: '+1 max hull and repair 1 hull now.', synergy: 'Pairs with Aegis: a long, safe run.' },
  { id: 'overcharge', name: 'Overcharge', text: 'Alignment builds 50% faster.', synergy: 'Pairs with Magnet Coil: eclipse on demand.' },
  { id: 'echo', name: 'Echo Chamber', text: 'Every 4th shot fires twice.', synergy: 'Pairs with Split Prism: four beams at once.' },
  { id: 'wide', name: 'Wide Arc', text: 'The beam is 60% wider.', synergy: 'Pairs with Pierce: a broad cutting lane.' },
  { id: 'slowfield', name: 'Slow Field', text: 'Enemies within 220 of the forge move 30% slower.', synergy: 'Pairs with Spitter hordes: they never arrive.' },
  { id: 'siphon', name: 'Siphon', text: 'Every 12 kills repairs 1 hull, up to max.', synergy: 'Pairs with Chain Star: kills come fast.' },
  { id: 'crit', name: 'Crit Lens', text: '25% of hits strike for double damage.', synergy: 'Pairs with Chain Star: chains can crit.' },
  { id: 'crank', name: 'Rapid Crank', text: 'Fire 30% faster.', synergy: 'Pairs with Twin Lens: twice the fire.' },
  { id: 'prismspray', name: 'Prism Spray', text: 'Hits burst into 3 sparks that seek nearby enemies.', synergy: 'Pairs with Crit Lens: sparks can crit.' },
  { id: 'golden', name: 'Golden Mote', text: '+50% stardust from every source.', synergy: 'Pairs with the Workshop: upgrades come sooner.' },
  { id: 'aegis', name: 'Aegis', text: 'The forge ignores one hit each wave.', synergy: 'Pairs with Thick Glass: a long, safe run.' },
];
export const RELIC_BY_ID = Object.fromEntries(RELICS.map((r) => [r.id, r]));

/** Wave composition: which enemies, how many, how fast they arrive. */
export function waveComp(wave, rng) {
  // wave 1..15; unlock kinds gradually, counts grow, bosses are separate.
  const pool = [];
  const push = (id, n) => { for (let i = 0; i < n; i++) pool.push(id); };
  push('moteeater', 3 + wave);
  push('wisp', wave >= 2 ? 2 + Math.floor(wave / 2) : 0);
  push('crawler', wave >= 3 ? 1 + Math.floor(wave / 3) : 0);
  push('spitter', wave >= 4 ? Math.floor(wave / 3) : 0);
  push('brute', wave >= 5 ? Math.floor((wave - 2) / 3) : 0);
  push('splitter', wave >= 6 ? Math.floor((wave - 3) / 2) : 0);
  push('darter', wave >= 7 ? Math.floor((wave - 4) / 2) : 0);
  push('phantom', wave >= 9 ? Math.floor((wave - 6) / 2) : 0);
  // Shuffle the spawn order so the wave never arrives in kind order.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const interval = Math.max(0.6, 1.6 - wave * 0.06); // spawn gap shrinks
  return { queue: pool, interval };
}

/** Workshop: permanent upgrades between runs, bought with stardust. */
export const WORKSHOP = [
  { id: 'hull', name: 'Reinforced Glass', cost: 40, max: 2, text: '+1 max hull, forever.' },
  { id: 'damage', name: 'Polished Lens', cost: 50, max: 3, text: '+1 beam damage, forever.' },
  { id: 'align', name: 'Quick Silver', cost: 40, max: 2, text: 'Alignment +25% faster.' },
  { id: 'startrelic', name: "Keeper's Charm", cost: 60, max: 1, text: 'Begin with a random relic.' },
];
