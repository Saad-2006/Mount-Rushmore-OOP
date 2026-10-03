import gsap from 'gsap';
import { EASE, DUR, reducedMotion } from '../motion.js';

// The mountain being carved: a counter from 000 to 100 that follows the real
// download, never faster than it can be read, never stuck waiting on itself.
export function createPreloader() {
  const el = document.querySelector('[data-preloader]');
  const count = el.querySelector('[data-count]');
  const rule = el.querySelector('[data-rule]');
  const shown = { p: 0 };
  let target = 0;

  const render = () => {
    count.textContent = String(Math.round(shown.p * 100)).padStart(3, '0');
    rule.style.transform = `scaleX(${shown.p})`;
  };
  // Ease the displayed value towards the real one, with a floor on pace so a
  // cached model still gets its moment.
  const MIN_TIME = reducedMotion ? 0.6 : 2.4;
  const start = performance.now();
  const tick = () => {
    const elapsed = (performance.now() - start) / 1000;
    const cap = Math.min(1, elapsed / MIN_TIME);
    const goal = Math.min(target, cap);
    shown.p += (goal - shown.p) * 0.12;
    if (goal - shown.p < 0.002) shown.p = goal;
    render();
  };
  gsap.ticker.add(tick);

  return {
    progress(p) {
      target = Math.max(target, Math.min(1, p));
    },
    // Resolves once the counter has visibly reached 100 and the screen has gone.
    async finish() {
      target = 1;
      await new Promise((resolve) => {
        const check = () => (shown.p >= 1 ? resolve() : requestAnimationFrame(check));
        check();
      });
      gsap.ticker.remove(tick);
      count.innerHTML = [...'100'].map((d) => `<span class="d">${d}</span>`).join('');
      await gsap
        .timeline()
        .to(count.querySelectorAll('.d'), { yPercent: -110, duration: DUR.m, ease: EASE, stagger: 0.06 }, 0.15)
        .to(el.querySelectorAll('.preloader__corner, .preloader__status, .preloader__rule'), { opacity: 0, duration: DUR.s }, 0.15)
        .to(el, { autoAlpha: 0, duration: DUR.m }, 0.6);
      el.remove();
    },
    skip() {
      gsap.ticker.remove(tick);
      el.remove();
    },
  };
}
