import { material } from './materials.js';

// A monument word: one word, uppercase, condensed, sized so it spans its
// container edge to edge, filled with a material. Two stacked layers of the
// same text — `base` (dormant, tonal) and `wake` (lit) — so a world can bring
// the word to life by animating only the wake layer's opacity or clip.
const FONT = '"Big Shoulders Display"';
const fontsReady = document.fonts?.load
  ? Promise.all([700, 800, 900].map((w) => document.fonts.load(`${w} 100px ${FONT}`))).catch(() => {})
  : Promise.resolve();

export function monumentWord(text, { material: mat, className = '', fill = 1, weight = 800 } = {}) {
  const el = document.createElement('div');
  el.className = `mword ${className}`;
  el.setAttribute('aria-hidden', 'true');
  el.style.setProperty('--mw-weight', weight);
  el.innerHTML = `<span class="mword__base">${text}</span><span class="mword__wake">${text}</span>`;
  const base = el.firstElementChild;
  const wake = el.lastElementChild;

  if (mat) material(mat).then((url) => el.style.setProperty('--mw-tex', `url(${url})`));

  // Fit to the content box: measure at the rendered size and correct, twice,
  // so kerning and the em-based padding settle. The container's width never
  // depends on the word (contain: inline-size), so this can't feed back.
  let raf = 0;
  const fit = (pass = 0) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const cs = getComputedStyle(el);
      const w = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const actual = base.getBoundingClientRect().width;
      if (!w || !actual) return;
      const current = parseFloat(getComputedStyle(base).fontSize);
      const size = (current * w * fill) / actual;
      el.style.setProperty('--mw-size', `${size.toFixed(2)}px`);
      if (pass < 1 && Math.abs(size - current) > 0.5) fit(pass + 1);
    });
  };
  fontsReady.then(() => fit());
  const ro = new ResizeObserver(() => fit());
  ro.observe(el);

  return { el, base, wake, fit, destroy: () => ro.disconnect() };
}
