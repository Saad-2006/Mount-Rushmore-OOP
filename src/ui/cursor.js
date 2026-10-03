import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { EASE, DUR, finePointer, reducedMotion } from '../motion.js';

gsap.registerPlugin(MorphSVGPlugin);

// The Cursor — the fifth monument, the one you hold. Same pointer, different
// behaviour in every world: polymorphism running through the whole site.
//   hub            a ring that trails you; over a face it takes the colour and says Enter
//   encapsulation  a black box with the real pointer hidden inside it
//   abstraction    a cobalt dot. Nothing else.
//   inheritance    a parent dot followed by a chain of children
//   polymorphism   never the same shape twice, until the world resolves

const SHAPES = {
  circle: 'M12,2 A10,10 0 1 1 11.99,2 Z',
  square: 'M3,3 L21,3 L21,21 L3,21 Z',
  triangle: 'M12,2 L22,21 L2,21 Z',
  diamond: 'M12,1 L23,12 L12,23 L1,12 Z',
};
const POLY_ORDER = ['circle', 'square', 'triangle', 'diamond'];

function createCursor() {
  const el = document.createElement('div');
  el.className = 'cursor';
  el.dataset.mode = 'hub';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `
    <div class="cursor__ring" data-c="ring"></div>
    <div class="cursor__box" data-c="box"></div>
    <div class="cursor__chain" data-c="chain">${'<span></span>'.repeat(3)}</div>
    <svg class="cursor__shape" data-c="shape" viewBox="0 0 24 24"><path d="${SHAPES.circle}"/></svg>
    <div class="cursor__dot" data-c="dot"></div>
    <div class="cursor__label mono" data-c="label"></div>
  `;
  document.body.append(el);
  document.documentElement.classList.add('has-cursor');

  const part = (k) => el.querySelector(`[data-c="${k}"]`);
  const ring = part('ring');
  const box = part('box');
  const dot = part('dot');
  const label = part('label');
  const shapeSvg = part('shape');
  const shape = shapeSvg.querySelector('path');
  const links = [...part('chain').children];

  // Positions: the mouse, and lagging followers that ease towards it.
  const mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  const ringP = { ...mouse };
  const boxP = { ...mouse };
  const chainP = links.map(() => ({ ...mouse }));
  let seen = false;
  let mode = 'hub';
  let hovering = false;
  let calm = false;

  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!seen) {
      seen = true;
      Object.assign(ringP, mouse);
      Object.assign(boxP, mouse);
      chainP.forEach((p) => Object.assign(p, mouse));
      gsap.to(el, { opacity: 1, duration: DUR.s });
    }
  });
  document.addEventListener('pointerleave', () => gsap.to(el, { opacity: 0, duration: DUR.s }));
  document.addEventListener('pointerenter', () => seen && gsap.to(el, { opacity: 1, duration: DUR.s }));
  addEventListener('pointerdown', () => gsap.to(el, { '--press': 0.82, duration: DUR.xs }));
  addEventListener('pointerup', () => gsap.to(el, { '--press': 1, duration: DUR.s }));

  const place = (node, p) => (node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`);
  const follow = (p, target, k, dt) => {
    const a = reducedMotion ? 1 : 1 - Math.exp(-k * dt);
    p.x += (target.x - p.x) * a;
    p.y += (target.y - p.y) * a;
  };

  gsap.ticker.add((time, deltaMs) => {
    if (!seen) return;
    const dt = Math.min(deltaMs / 1000, 0.05);
    place(dot, mouse);
    place(label, mouse);

    follow(ringP, mouse, 14, dt);
    place(ring, ringP);
    place(shapeSvg, ringP);

    // Encapsulation: the box trails, and the real pointer is clamped inside it.
    follow(boxP, mouse, 9, dt);
    place(box, boxP);
    if (mode === 'encapsulation') {
      const lim = 7;
      const x = boxP.x + Math.max(-lim, Math.min(lim, mouse.x - boxP.x));
      const y = boxP.y + Math.max(-lim, Math.min(lim, mouse.y - boxP.y));
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }

    // Inheritance: each child follows its parent, not the mouse.
    let parent = mouse;
    chainP.forEach((p, i) => {
      follow(p, parent, 16 - i * 3.5, dt);
      place(links[i], p);
      parent = p;
    });
  });

  // Polymorphism: an identity crisis on a timer, unless the world has resolved.
  let polyIndex = 0;
  const polyTick = gsap.delayedCall(0.85, function shift() {
    if (mode === 'polymorphism' && !calm) {
      polyIndex = (polyIndex + 1) % POLY_ORDER.length;
      gsap.to(shape, { morphSVG: SHAPES[POLY_ORDER[polyIndex]], duration: 0.7, ease: 'elastic.out(1, 0.4)' });
      gsap.to(shapeSvg, { '--hue': `${(Math.random() * 70 - 35).toFixed(0)}deg`, duration: 0.5 });
    }
    polyTick.restart(true);
  });

  function setMode(next) {
    if (next === mode) return;
    mode = next;
    el.dataset.mode = next;
    calm = false;
    if (next === 'polymorphism') {
      polyIndex = 0;
      gsap.set(shape, { morphSVG: SHAPES.circle });
    }
    unhover();
  }

  // Over something you can act on: grow, optionally take a colour and a word.
  function hover({ label: text = '', color = '' } = {}) {
    hovering = true;
    el.classList.add('is-hover');
    if (color) el.style.setProperty('--tint', color);
    else el.style.removeProperty('--tint');
    label.textContent = text;
    el.classList.toggle('has-label', !!text);
  }

  function unhover() {
    if (!hovering) return;
    hovering = false;
    el.classList.remove('is-hover', 'has-label');
    el.style.removeProperty('--tint');
  }

  // Anything clickable gets the hover state automatically.
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest?.('a, button, [data-cursor]');
    if (t) hover({ label: t.dataset.cursor || '' });
  });
  document.addEventListener('pointerout', (e) => {
    const t = e.target.closest?.('a, button, [data-cursor]');
    if (t && !t.contains(e.relatedTarget)) unhover();
  });

  return {
    setMode,
    hover,
    unhover,
    setCalm(v) {
      if (v === calm) return;
      calm = v;
      if (v && mode === 'polymorphism') {
        gsap.to(shape, { morphSVG: SHAPES.circle, duration: DUR.m, ease: EASE });
        gsap.to(shapeSvg, { '--hue': '0deg', duration: DUR.m });
      }
    },
    hide: () => gsap.to(el, { autoAlpha: 0, duration: DUR.s }),
    show: () => seen && gsap.to(el, { autoAlpha: 1, duration: DUR.m }),
  };
}

// Touch screens keep their own behaviour — there is no pointer to replace.
const noop = () => {};
export const cursor = finePointer
  ? createCursor()
  : { setMode: noop, hover: noop, unhover: noop, setCalm: noop, hide: noop, show: noop };
