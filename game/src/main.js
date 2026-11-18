// LUMENFORGE — boot, the fixed-step loop, screens, clicks and shot mode.
// Shot mode (?shot=start|play|boss|win&seed=N) builds one deterministic scene
// and sets window.__shotReady when it is drawn, for real screenshots.
import { FIELD, STEP, DIFFICULTIES, ENEMIES } from './config.js';
import { createWorld, startRun, nextWave, takeRelic, skipRelic, buyWorkshop, spawnEnemy, spawnBoss } from './world.js';
import { stepCombat } from './combat.js';
import { render, buttonsFor, saveBest } from './render.js';
import { input, bindInput, wasPressed, clearPressed } from './input.js';
import { setMuted, isMuted } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
bindInput(canvas);

// A read-only handle for play-testing (smoke tests, screenshots).
Object.defineProperty(window, '__lumenforge', { get: () => world });

const params = new URLSearchParams(location.search);
const shotScene = params.get('shot');
const seed = parseInt(params.get('seed') || '7', 10) || 7;

let world = createWorld(seed, 'keeper');
let prevScreen = world.screen;

function freshRun() {
  const s = (Date.now() % 2147483646) + 1;
  world = createWorld(s, world.diff.id);
  prevScreen = world.screen;
  startRun(world);
}

function handleClick(c) {
  for (const b of buttonsFor(world)) {
    if (c.x >= b.x && c.x <= b.x + b.w && c.y >= b.y && c.y <= b.y + b.h) {
      const [kind, arg] = b.id.split(':');
      if (kind === 'diff') {
        world.diff = DIFFICULTIES.find((d) => d.id === arg) || world.diff;
        const maxHull = Math.min(5, world.diff.hull + (world.meta.levels.hull || 0));
        world.maxHull = maxHull;
        world.hull = maxHull;
      } else if (kind === 'buy') {
        buyWorkshop(world, arg);
      } else if (kind === 'start') {
        startRun(world);
      } else if (kind === 'relic') {
        takeRelic(world, parseInt(arg, 10));
      } else if (kind === 'skip') {
        skipRelic(world);
      } else if (kind === 'again') {
        freshRun();
      } else if (kind === 'endless') {
        world.endless = true;
        world.wave = 15;
        world.hull = world.maxHull;
        world.screen = 'playing';
        nextWave(world);
      } else if (kind === 'title') {
        world = createWorld((Date.now() % 2147483646) + 1, world.diff.id);
        prevScreen = world.screen;
      } else if (kind === 'resume') {
        world.screen = 'playing';
      }
      return;
    }
  }
}

function handleKeys() {
  if (wasPressed('KeyM')) setMuted(!isMuted());
  if (world.screen === 'playing') {
    if (wasPressed('KeyP') || wasPressed('Escape')) world.screen = 'paused';
    else if (wasPressed('KeyR')) freshRun();
  } else if (world.screen === 'paused') {
    if (wasPressed('KeyP') || wasPressed('Escape')) world.screen = 'playing';
    else if (wasPressed('KeyR')) freshRun();
  } else if (world.screen === 'title') {
    if (wasPressed('Enter')) startRun(world);
  } else if (world.screen === 'relic') {
    if (wasPressed('Digit1')) takeRelic(world, 0);
    else if (wasPressed('Digit2')) takeRelic(world, 1);
    else if (wasPressed('Digit3')) takeRelic(world, 2);
    else if (wasPressed('Digit0') || wasPressed('KeyS')) skipRelic(world);
  } else if (world.screen === 'victory' || world.screen === 'defeat') {
    if (wasPressed('Enter') || wasPressed('KeyR')) freshRun();
  }
  clearPressed();
}

/** One fixed step of the live game. */
function step() {
  world.aimX = input.mouseX;
  world.aimY = input.mouseY;
  const firing = input.firing || input.keys.has('Space');
  stepCombat(world, firing);
  if (world.screen === 'playing' && world.waveState === 'clear') {
    world.clearTimer = (world.clearTimer ?? 1.2) - STEP;
    if (world.clearTimer <= 0) nextWave(world);
  }
  if (world.screen !== prevScreen) {
    if (world.screen === 'victory' || world.screen === 'defeat') saveBest(world.score);
    prevScreen = world.screen;
  }
}

/** Build one staged scene for a screenshot. */
function buildShot(scene) {
  if (scene === 'start') {
    world.screen = 'title';
    return;
  }
  if (scene === 'win') {
    world.screen = 'victory';
    world.score = 12480;
    world.kills = 214;
    world.night = 3;
    world.wave = 15;
    world.stardust = 186;
    world.stats = { shots: 1820, hits: 1311, motesCaught: 96, relicsTaken: 8, bossesDown: 3 };
    world.relics = new Set(['split', 'pierce', 'chain', 'overcharge', 'glass', 'crank', 'siphon', 'aegis']);
    return;
  }
  if (scene === 'end') {
    world.screen = 'defeat';
    world.score = 3420;
    world.kills = 88;
    world.night = 2;
    world.wave = 9;
    world.stardust = 74;
    world.stats = { shots: 940, hits: 612, motesCaught: 41, relicsTaken: 4, bossesDown: 1 };
    world.relics = new Set(['twin', 'magnet', 'crit', 'wide']);
    return;
  }
  // 'play' and 'boss': a live mid-fight scene, stepped deterministically.
  startRun(world);
  const kinds = ['moteeater', 'wisp', 'crawler', 'spitter', 'brute', 'splitter', 'darter', 'phantom'];
  if (scene === 'play') {
    world.wave = 7;
    world.night = 2;
    world.waveState = 'fighting';
    world.score = 4860;
    world.stardust = 64;
    world.hull = 3;
    world.alignment = 62;
    world.relics = new Set(['split', 'overcharge', 'magnet']);
    for (let i = 0; i < 9; i++) {
      spawnEnemy(world, kinds[i % kinds.length]);
    }
  } else {
    // boss
    world.wave = 5;
    world.night = 1;
    world.score = 2120;
    world.stardust = 38;
    world.hull = 3;
    world.alignment = 41;
    world.relics = new Set(['pierce', 'crank']);
    spawnBoss(world);
  }
  // Step the fight with a sweeping aim so the scene is alive and firing.
  const steps = scene === 'play' ? 150 : 90;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2 * 1.5;
    world.aimX = 640 + Math.cos(a) * 320;
    world.aimY = 360 + Math.sin(a) * 220;
    stepCombat(world, true);
  }
  // Top the field back up: fresh enemies join so the frame stays busy.
  if (scene === 'play') {
    for (let i = 0; i < 5; i++) spawnEnemy(world, kinds[(i * 3 + 1) % kinds.length]);
  }
  // One last shot so a beam is in the frame.
  world.fireTimer = 0;
  stepCombat(world, true);
}

if (shotScene) {
  buildShot(shotScene);
  // Shots are staged synchronously where possible; the boss/play paths use
  // dynamic imports above, so give the event loop one turn, then draw.
  setTimeout(() => {
    render(ctx, world);
    window.__shotReady = true;
  }, 50);
} else {
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    window.__rafCount = (window.__rafCount || 0) + 1;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    for (const c of input.clicks) handleClick(c);
    input.clicks.length = 0;
    handleKeys();
    if (world.screen === 'playing') {
      acc += dt;
      while (acc >= STEP) {
        step();
        acc -= STEP;
        if (world.screen !== 'playing') { acc = 0; break; }
      }
    }
    render(ctx, world);
  }
  requestAnimationFrame(frame);
}
