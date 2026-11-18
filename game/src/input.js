// Keyboard and mouse, read by the world once a step. The canvas listens;
// the game never needs the page to have focus beyond the canvas.
export const input = {
  mouseX: 640,
  mouseY: 200,
  firing: false,
  keys: new Set(),
  pressed: new Set(), // keys pressed since the last step (edge-triggered)
  clicks: [], // mouse clicks since the last frame, in logical coordinates
};

export function bindInput(canvas) {
  const toLocal = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = 1280 / r.width;
    const sy = 720 / r.height;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy };
  };
  canvas.addEventListener('mousemove', (e) => {
    const p = toLocal(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toLocal(e);
    input.mouseX = p.x;
    input.mouseY = p.y;
    input.clicks.push({ x: p.x, y: p.y });
    if (e.button === 0) input.firing = true;
  });
  window.addEventListener('mouseup', () => { input.firing = false; });
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    input.pressed.add(e.code);
    if (e.code === 'Space') e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { input.keys.delete(e.code); });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.firing = false;
  });
}

/** True once for the step after the key went down, then cleared. */
export function wasPressed(code) {
  return input.pressed.has(code);
}
export function clearPressed() {
  input.pressed.clear();
}
