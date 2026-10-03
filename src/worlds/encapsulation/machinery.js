// Procedural insides for the vault: gears, wiring, circuit traces, memory.
// Everything is SVG/DOM so it stays sharp inside the CSS 3D cube.

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(NS, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  return el;
};

// Gear outline: trapezoid teeth around a rim, with a hub hole.
export function gearPath(teeth, r, depth = r * 0.16, hole = r * 0.28) {
  const step = (Math.PI * 2) / teeth;
  const ro = r + depth / 2;
  const ri = r - depth / 2;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts = [
      [ri, a],
      [ro, a + step * 0.18],
      [ro, a + step * 0.5],
      [ri, a + step * 0.68],
    ];
    pts.forEach(([rad, ang], k) => {
      d += `${i === 0 && k === 0 ? 'M' : 'L'}${(Math.cos(ang) * rad).toFixed(2)},${(Math.sin(ang) * rad).toFixed(2)}`;
    });
  }
  d += `Z M${hole},0 A${hole},${hole} 0 1 0 ${-hole},0 A${hole},${hole} 0 1 0 ${hole},0Z`;
  return d;
}

// A train of meshing gears. Each gear knows its angular speed ratio so the
// whole train turns together from one driver value.
export function gearTrain(spec, { stroke = 'currentColor', fill = 'none', spokes = true } = {}) {
  const svg = svgEl('svg', { viewBox: '0 0 400 400', class: 'gears' });
  const gears = [];
  let prev = null;
  spec.forEach((g, i) => {
    const r = g.teeth * 2.4;
    let x = g.x;
    let y = g.y;
    let dir = 1;
    let phase = 0;
    if (prev && g.angle !== undefined) {
      // Place tangent to the previous gear at the given angle.
      const dist = prev.r + r + 1.5;
      x = prev.x + Math.cos(g.angle) * dist;
      y = prev.y + Math.sin(g.angle) * dist;
      dir = -prev.dir;
      phase = Math.PI / g.teeth;
    }
    const group = svgEl('g', { transform: `translate(${x} ${y})` });
    const rotor = svgEl('g');
    rotor.append(
      svgEl('path', {
        d: gearPath(g.teeth, r),
        fill: g.fill ?? fill,
        stroke,
        'stroke-width': g.weight ?? 1.2,
        'fill-rule': 'evenodd',
      })
    );
    if (spokes) {
      for (let s = 0; s < 4; s++) {
        const a = (s * Math.PI) / 2;
        rotor.append(
          svgEl('line', {
            x1: (Math.cos(a) * r * 0.3).toFixed(1),
            y1: (Math.sin(a) * r * 0.3).toFixed(1),
            x2: (Math.cos(a) * r * 0.78).toFixed(1),
            y2: (Math.sin(a) * r * 0.78).toFixed(1),
            stroke,
            'stroke-width': 1,
            opacity: 0.55,
          })
        );
      }
      rotor.append(svgEl('circle', { r: (r * 0.82).toFixed(1), fill: 'none', stroke, 'stroke-width': 0.6, opacity: 0.4 }));
    }
    group.append(rotor);
    svg.append(group);
    const gear = { x, y, r, dir, phase, ratio: 1 / g.teeth, rotor };
    gears.push(gear);
    prev = gear;
  });
  return {
    svg,
    // `turn` is total driver rotation in teeth; meshing gears share tooth speed.
    set(turn) {
      for (const g of gears) {
        const deg = ((turn * g.ratio * 360 * g.dir + (g.phase * 180) / Math.PI) % 360).toFixed(2);
        g.rotor.setAttribute('transform', `rotate(${deg})`);
      }
    },
  };
}

// Tangled wiring: long cubic curves that will be drawn on with dashoffset.
export function wiring(count, { colors, seed = 1 } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const svg = svgEl('svg', { viewBox: '0 0 400 400', class: 'wires', preserveAspectRatio: 'none' });
  const paths = [];
  for (let i = 0; i < count; i++) {
    const p = () => `${(rnd() * 400).toFixed(0)},${(rnd() * 400).toFixed(0)}`;
    const start = rnd() < 0.5 ? `${(rnd() * 400).toFixed(0)},${rnd() < 0.5 ? -10 : 410}` : `${rnd() < 0.5 ? -10 : 410},${(rnd() * 400).toFixed(0)}`;
    const path = svgEl('path', {
      d: `M${start} C${p()} ${p()} ${p()} S${p()} ${p()}`,
      fill: 'none',
      stroke: colors[i % colors.length],
      'stroke-width': (0.6 + rnd() * 1.6).toFixed(2),
      'stroke-linecap': 'round',
      pathLength: 1,
      'stroke-dasharray': 1,
      'stroke-dashoffset': 1,
      opacity: (0.45 + rnd() * 0.55).toFixed(2),
    });
    svg.append(path);
    paths.push(path);
  }
  return { svg, paths };
}

// Right-angled PCB traces ending in pads.
export function circuit({ seed = 7, traces = 26, color = 'currentColor' } = {}) {
  let s = seed;
  const rnd = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const svg = svgEl('svg', { viewBox: '0 0 400 400', class: 'circuit' });
  const snap = (v) => Math.round(v / 20) * 20;
  for (let i = 0; i < traces; i++) {
    let x = snap(rnd() * 400);
    let y = snap(rnd() * 400);
    let d = `M${x},${y}`;
    const segs = 2 + ((rnd() * 4) | 0);
    for (let k = 0; k < segs; k++) {
      if (k % 2 === 0) x = snap(Math.max(0, Math.min(400, x + (rnd() - 0.5) * 220)));
      else y = snap(Math.max(0, Math.min(400, y + (rnd() - 0.5) * 220)));
      d += ` L${x},${y}`;
    }
    svg.append(svgEl('path', { d, fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.5 }));
    svg.append(svgEl('circle', { cx: x, cy: y, r: 3, fill: 'none', stroke: color, 'stroke-width': 1 }));
  }
  // A couple of chips.
  for (let c = 0; c < 3; c++) {
    const x = snap(40 + rnd() * 280);
    const y = snap(40 + rnd() * 280);
    svg.append(svgEl('rect', { x, y, width: 60, height: 40, fill: 'rgba(245,166,35,0.06)', stroke: color, 'stroke-width': 1 }));
    for (let p = 0; p < 6; p++) {
      svg.append(svgEl('line', { x1: x + 6 + p * 10, y1: y - 6, x2: x + 6 + p * 10, y2: y, stroke: color, 'stroke-width': 1 }));
      svg.append(svgEl('line', { x1: x + 6 + p * 10, y1: y + 40, x2: x + 6 + p * 10, y2: y + 46, stroke: color, 'stroke-width': 1 }));
    }
  }
  return svg;
}

// A block of memory that keeps changing while anyone is looking.
export function memory(rows, cols) {
  const el = document.createElement('div');
  el.className = 'memory mono';
  const cells = [];
  for (let i = 0; i < rows * cols; i++) {
    const c = document.createElement('span');
    c.textContent = hex();
    el.append(c);
    cells.push(c);
  }
  el.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  return {
    el,
    tick(amount = 0.08) {
      const n = Math.max(1, (cells.length * amount) | 0);
      for (let i = 0; i < n; i++) {
        const c = cells[(Math.random() * cells.length) | 0];
        c.textContent = hex();
        c.classList.toggle('hot', Math.random() < 0.18);
      }
    },
  };
}

function hex() {
  return ((Math.random() * 256) | 0).toString(16).padStart(2, '0').toUpperCase();
}
