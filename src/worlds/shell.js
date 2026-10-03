import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { SplitText } from 'gsap/SplitText';
import { MONUMENTS } from '../config.js';
import { reducedMotion, finePointer } from '../motion.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

// Everything a world needs that isn't the world itself: the container, the
// chrome (back / index / progress), smooth scroll, and a teardown that leaves
// nothing behind — no triggers, no tickers, no listeners.
export function createShell({ monument, onBack, onNext, onMenu }) {
  const index = MONUMENTS.indexOf(monument);
  const next = MONUMENTS[(index + 1) % MONUMENTS.length];

  const root = document.createElement('article');
  root.className = `world world--${monument.id}`;
  root.style.setProperty('--accent', `var(--${monument.id})`);
  root.innerHTML = `
    <header class="world__chrome">
      <button class="world__back mono" data-back data-magnetic="0.25"><span aria-hidden="true">←</span> The mountain</button>
      <button class="world__index mono" data-menu-open data-magnetic="0.25" aria-label="Open index">
        <span class="world__index-label"><span>${monument.numeral}</span> / IV · ${monument.name}</span>
        <span class="world__burger" aria-hidden="true"><i></i><i></i></span>
      </button>
    </header>
    <div class="world__progress" aria-hidden="true"><div data-progress></div></div>
    <div class="world__body" data-body></div>
  `;
  const body = root.querySelector('[data-body]');
  document.querySelector('#worlds').append(root);

  root.querySelector('[data-back]').addEventListener('click', onBack);
  root.querySelector('[data-menu-open]').addEventListener('click', () => onMenu?.());

  window.scrollTo(0, 0);
  // Long glide, gentle wheel — the buttery part. Off for reduced motion.
  const lenis = new Lenis({
    lerp: reducedMotion ? 1 : 0.075,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.4,
    smoothWheel: !reducedMotion,
  });
  lenis.on('scroll', ScrollTrigger.update);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // All GSAP work in the world goes through this context so revert() is total.
  const ctx = gsap.context(() => {}, root);
  const cleanups = [];

  function coda({ statement, code }) {
    const el = document.createElement('section');
    el.className = 'coda';
    el.innerHTML = `
      ${code ? `<div class="coda__code"><p class="coda__label mono">In code</p><pre class="mono"><code>${code}</code></pre></div>` : ''}
      <p class="coda__statement">${statement}</p>
      <nav class="coda__nav mono">
        <button data-coda-back data-magnetic="0.2"><span aria-hidden="true">←</span> Return to the mountain</button>
        <button data-coda-next data-magnetic="0.2">Next monument · <span class="coda__next-num">${next.numeral}</span> ${next.name} <span aria-hidden="true">→</span></button>
      </nav>`;
    el.querySelector('[data-coda-back]').addEventListener('click', onBack);
    el.querySelector('[data-coda-next]').addEventListener('click', () => onNext(next));
    body.append(el);

    // Letters hop when the pointer passes over them, neighbours a little less.
    const statementEl = el.querySelector('.coda__statement');
    if (finePointer && !reducedMotion) {
      const chars = SplitText.create(statementEl, { type: 'words,chars', charsClass: 'hop' }).chars;
      chars.forEach((c, i) =>
        c.addEventListener('pointerenter', () => {
          [-2, -1, 0, 1, 2].forEach((o) => {
            const n = chars[i + o];
            if (!n) return;
            gsap.fromTo(n, { y: 0 }, { y: `${-0.16 / (1 + Math.abs(o) * 1.4)}em`, duration: 0.22, ease: 'power2.out', yoyo: true, repeat: 1, overwrite: true });
          });
        })
      );
    }

    // The coda leans with the speed of the scroll, and straightens when you stop.
    if (!reducedMotion) {
      const skew = gsap.quickTo(el, 'skewY', { duration: 0.5, ease: 'power3.out' });
      const lean = () => skew(Math.max(-3.5, Math.min(3.5, lenis.velocity * 0.12)));
      gsap.ticker.add(lean);
      cleanups.push(() => gsap.ticker.remove(lean));
    }

    ctx.add(() => {
      const lines = el.querySelectorAll('pre code > span, .coda__statement, .coda__nav, .coda__label');
      gsap.from(lines, {
        opacity: 0,
        y: 24,
        duration: 1,
        ease: 'power3.out',
        stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 70%' },
      });
    });
    return el;
  }

  ctx.add(() => {
    gsap.to(root.querySelector('[data-progress]'), {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { start: 0, end: 'max', scrub: true },
    });
  });

  return {
    root,
    body,
    lenis,
    ctx,
    next,
    coda,
    onCleanup: (fn) => cleanups.push(fn),
    destroy() {
      cleanups.forEach((fn) => fn());
      ctx.revert();
      gsap.ticker.remove(raf);
      lenis.destroy();
      root.remove();
      window.scrollTo(0, 0);
      ScrollTrigger.refresh();
    },
  };
}
