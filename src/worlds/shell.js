import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { SplitText } from 'gsap/SplitText';
import { MONUMENTS } from '../config.js';
import { reducedMotion, finePointer } from '../motion.js';
import { monumentWord } from '../ui/monument-word.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const RULER_TICKS = 400; // the gutter runs 000 → 400 over a world

// Everything a world needs that isn't the world itself: the container, the
// ruler, smooth scroll, the coda, and a teardown that leaves nothing behind —
// no triggers, no tickers, no listeners. The corners belong to the frame.
export function createShell({ monument, onBack, onNext, onLine }) {
  const index = MONUMENTS.indexOf(monument);
  const next = MONUMENTS[(index + 1) % MONUMENTS.length];

  const root = document.createElement('article');
  root.className = `world world--${monument.id}`;
  root.style.setProperty('--accent', `var(--${monument.id})`);
  root.innerHTML = `
    <div class="ruler" aria-hidden="true"><div class="ruler__track" data-ruler>${Array.from(
      { length: RULER_TICKS + 1 },
      (_, i) => (i % 10 ? '<i class="ruler__tick"></i>' : `<i class="ruler__tick major"><span>${String(i).padStart(3, '0')}</span></i>`)
    ).join('')}</div></div>
    <div class="world__body" data-body></div>
  `;
  const body = root.querySelector('[data-body]');
  const track = root.querySelector('[data-ruler]');
  document.querySelector('#worlds').append(root);

  window.scrollTo(0, 0);
  // Long glide, gentle wheel — the buttery part. Off for reduced motion.
  const lenis = new Lenis({
    lerp: reducedMotion ? 1 : 0.075,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.4,
    smoothWheel: !reducedMotion,
  });
  lenis.on('scroll', ScrollTrigger.update);

  // The ruler slides under the frame as you scroll; the corner reads the line.
  let lastLine = -1;
  const moveRuler = () => {
    const p = lenis.limit ? Math.min(1, Math.max(0, lenis.animatedScroll / lenis.limit)) : 0;
    const travel = Math.max(0, track.scrollWidth - innerWidth * 0.5);
    track.style.transform = `translate3d(${(-p * travel).toFixed(1)}px, 0, 0)`;
    const line = Math.round(p * RULER_TICKS);
    if (line !== lastLine) {
      lastLine = line;
      onLine?.(line);
    }
  };
  lenis.on('scroll', moveRuler);
  requestAnimationFrame(moveRuler);
  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  // All GSAP work in the world goes through this context so revert() is total.
  const ctx = gsap.context(() => {}, root);
  const cleanups = [];

  // The coda arrives on an angled panel, carrying the principle's keyword
  // from the language itself: PRIVATE, INTERFACE, EXTENDS, OVERRIDE.
  function coda({ statement, code, keyword, material }) {
    const el = document.createElement('section');
    el.className = 'coda';
    el.innerHTML = `
      <div class="coda__inner">
        <div class="coda__head">
          <p class="coda__label label">${monument.numeral} — the keyword</p>
          <div data-coda-word></div>
        </div>
        <div class="coda__grid">
          <p class="coda__statement">${statement}</p>
          ${code ? `<div class="coda__code"><p class="coda__label label">In code</p><pre class="mono"><code>${code}</code></pre></div>` : ''}
        </div>
        <nav class="coda__nav label">
          <button data-coda-back data-magnetic="0.2"><span aria-hidden="true">←</span> Return to the mountain</button>
          <button data-coda-next data-magnetic="0.2">Next · <span class="coda__next-num">${next.numeral}</span> ${next.name} <span aria-hidden="true">→</span></button>
        </nav>
      </div>`;
    const word = monumentWord(keyword, { material, className: 'coda__word' });
    el.querySelector('[data-coda-word]').replaceWith(word.el);
    cleanups.push(word.destroy);
    el.querySelector('[data-coda-back]').addEventListener('click', onBack);
    el.querySelector('[data-coda-next]').addEventListener('click', () => onNext(next));
    body.append(el);

    // The angled edge flattens as the panel reaches the top.
    ctx.add(() => {
      gsap.fromTo(
        el,
        { '--slant': reducedMotion ? 0 : 1 },
        { '--slant': 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 15%', scrub: true } }
      );
      gsap.fromTo(
        word.el,
        { yPercent: 40 },
        { yPercent: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true } }
      );
    });

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
      const skew = gsap.quickTo(el.querySelector('.coda__inner'), 'skewY', { duration: 0.5, ease: 'power3.out' });
      const lean = () => skew(Math.max(-3.5, Math.min(3.5, lenis.velocity * 0.12)));
      gsap.ticker.add(lean);
      cleanups.push(() => gsap.ticker.remove(lean));
    }

    ctx.add(() => {
      const lines = el.querySelectorAll('pre code > span, .coda__statement, .coda__nav, .coda__grid .coda__label');
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
