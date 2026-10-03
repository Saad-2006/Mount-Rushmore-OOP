import gsap from 'gsap';
import { MONUMENTS, CREDIT } from '../config.js';
import { DUR } from '../motion.js';

// The four corners. Same positions on every screen; only the words change.
//   top-left      where you are from (the mountain)
//   top-right     the index
//   bottom-left   context: the scan credit on the mountain, the line you're on in a world
//   bottom-right  sound (its own module)
export function createFrame({ onBrand, onIndex }) {
  const el = document.querySelector('[data-frame]');
  const brandLabel = el.querySelector('[data-frame-brand-label]');
  const indexLabel = el.querySelector('[data-frame-index-label]');
  const meta = el.querySelector('[data-frame-meta]');
  let world = null;

  el.querySelector('[data-frame-brand]').addEventListener('click', () => onBrand(world));
  el.querySelector('[data-frame-index]').addEventListener('click', () => onIndex(world));

  return {
    show() {
      gsap.set(el, { visibility: 'visible' });
      gsap.to(el, { opacity: 1, duration: DUR.l });
    },
    hub() {
      world = null;
      brandLabel.textContent = 'Mount Rushmore of OOP';
      indexLabel.innerHTML = 'Index';
      meta.innerHTML = `<a href="${CREDIT.url}" target="_blank" rel="noopener"><span class="dim">Scan</span> ${CREDIT.text.replace('Mount Rushmore scan by ', '')} · ${CREDIT.license}</a>`;
    },
    world(id) {
      world = id;
      const m = MONUMENTS.find((x) => x.id === id);
      brandLabel.textContent = 'The Mountain';
      indexLabel.innerHTML = `<span class="dim">${m.numeral} / IV</span><span class="hide-sm"> · ${m.name}</span>`;
      this.line(0);
    },
    line(n) {
      if (!world) return;
      const m = MONUMENTS.find((x) => x.id === world);
      meta.innerHTML = `${m.numeral} <span class="dim">— line</span> ${String(n).padStart(3, '0')}`;
    },
  };
}
