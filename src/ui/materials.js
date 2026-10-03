// Surface materials for the monument words, generated once on a canvas and
// cached as blob URLs. Mostly grayscale: each world tints them in CSS with a
// blend mode, so one steel texture can be cold charcoal or lit amber.

const cache = new Map();

function make(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  return new Promise((resolve) => c.toBlob((b) => resolve(URL.createObjectURL(b)), 'image/png'));
}

// Deterministic noise so the textures look the same on every visit.
function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

// Smooth 2D value noise, tileable over `period` cells.
function valueNoise(rand, period) {
  const g = Array.from({ length: period * period }, rand);
  const at = (x, y) => g[(((y % period) + period) % period) * period + (((x % period) + period) % period)];
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = fade(x - xi), yf = fade(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

const RECIPES = {
  // Brushed steel: long horizontal grain, a faint machined sheen, rivets on a grid.
  steel: (ctx, S) => {
    const r = rng(7);
    ctx.fillStyle = '#7d7d7d';
    ctx.fillRect(0, 0, S, S);
    for (let y = 0; y < S; y++) {
      const v = 110 + r() * 40;
      ctx.fillStyle = `rgba(${v},${v},${v},0.55)`;
      ctx.fillRect(0, y, S, 1);
      for (let k = 0; k < 6; k++) {
        const w = 20 + r() * 220;
        const l = r() > 0.5 ? 255 : 0;
        ctx.fillStyle = `rgba(${l},${l},${l},${0.04 + r() * 0.08})`;
        const x = r() * S;
        ctx.fillRect(x, y, w, 1);
        ctx.fillRect(x - S, y, w, 1); // wrap
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, S, S);
    sheen.addColorStop(0, 'rgba(255,255,255,0.10)');
    sheen.addColorStop(0.5, 'rgba(0,0,0,0.10)');
    sheen.addColorStop(1, 'rgba(255,255,255,0.10)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, S, S);
    const step = S / 4;
    for (let gy = step / 2; gy < S; gy += step) {
      for (let gx = step / 2; gx < S; gx += step) {
        const g = ctx.createRadialGradient(gx - 2, gy - 2, 0.5, gx, gy, 6);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.45, 'rgba(160,160,160,0.9)');
        g.addColorStop(1, 'rgba(30,30,30,0.9)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  // Blueprint paper: warm fibres, a hairline drafting grid in cobalt.
  paper: (ctx, S) => {
    const r = rng(3);
    const n = valueNoise(r, 32);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const f = n((x / S) * 32, (y / S) * 32) * 0.6 + r() * 0.4;
        const v = 236 + f * 16;
        const i = (y * S + x) * 4;
        img.data[i] = v; img.data[i + 1] = v - 1; img.data[i + 2] = v - 4; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    for (let k = 0; k < 900; k++) {
      ctx.strokeStyle = `rgba(120,110,95,${0.04 + r() * 0.06})`;
      ctx.lineWidth = 0.5;
      const x = r() * S, y = r() * S, a = r() * Math.PI;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * (4 + r() * 10), y + Math.sin(a) * (4 + r() * 10));
      ctx.stroke();
    }
    const cell = S / 16;
    for (let i = 0; i <= 16; i++) {
      ctx.fillStyle = i % 4 === 0 ? 'rgba(26,86,219,0.22)' : 'rgba(26,86,219,0.09)';
      ctx.fillRect(Math.round(i * cell), 0, 1, S);
      ctx.fillRect(0, Math.round(i * cell), S, 1);
    }
  },

  // Tree rings: concentric, slightly wandering, with radial checks in the grain.
  wood: (ctx, S) => {
    const r = rng(11);
    const n = valueNoise(r, 8);
    const img = ctx.createImageData(S, S);
    const cx = S * 0.5, cy = S * 1.35;
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const dx = x - cx, dy = y - cy;
        const d = Math.sqrt(dx * dx + dy * dy * 0.9) + n((x / S) * 8, (y / S) * 8) * 34;
        const ring = 0.5 + 0.5 * Math.sin(d * 0.22);
        const late = Math.pow(ring, 6);
        const v = 120 + ring * 40 - late * 70 + (r() - 0.5) * 14;
        const i = (y * S + x) * 4;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  },

  // Halftone: dot sizes follow a slow noise field, like newsprint of a cloud.
  halftone: (ctx, S) => {
    const r = rng(5);
    const n = valueNoise(r, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    const step = 9;
    ctx.fillStyle = '#fff';
    for (let y = 0; y < S; y += step) {
      for (let x = 0; x < S; x += step) {
        const ox = (y / step) % 2 ? step / 2 : 0;
        const v = n(((x + ox) / S) * 6, (y / S) * 6);
        const rad = 0.6 + v * v * step * 0.62;
        ctx.beginPath();
        ctx.arc(x + ox, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  },

  // Granite for the mountain's sky word: fine speckle, nothing else.
  granite: (ctx, S) => {
    const r = rng(9);
    const n = valueNoise(r, 16);
    const img = ctx.createImageData(S, S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const v = 128 + (n((x / S) * 16, (y / S) * 16) - 0.5) * 70 + (r() - 0.5) * 60;
        const i = (y * S + x) * 4;
        img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  },
};

export function material(name) {
  if (!cache.has(name)) cache.set(name, make(512, RECIPES[name]));
  return cache.get(name);
}

// Draw a material straight into an existing canvas context (for WebGL textures).
export function paintMaterial(ctx, name, size) {
  RECIPES[name](ctx, size);
}
