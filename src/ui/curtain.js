import gsap from 'gsap';
import { MONUMENTS } from '../config.js';
import { reducedMotion } from '../motion.js';
import { monumentWord } from './monument-word.js';

// Between worlds: an angled panel in the next world's colour sweeps up over
// the screen carrying that world's name, holds while the swap happens behind
// it, then carries on up and away.
// Each world's surface, shared with the coda's Next button so the hover
// previews exactly the slab the curtain will be.
export const SURFACE = {
  encapsulation: { bg: '#0d0d0d', fg: '#f0f0f0', accent: '#f5a623', wake: 'rgba(245, 166, 35, 0.62)', mat: 'steel' },
  abstraction: { bg: '#f4f4f2', fg: '#0a0a0a', accent: '#1a56db', wake: 'rgba(26, 86, 219, 0.82)', mat: 'paper' },
  inheritance: { bg: '#050a05', fg: '#e8e0d0', accent: '#7fbf6e', wake: 'rgba(232, 224, 208, 0.55)', mat: 'wood' },
  polymorphism: { bg: '#1a0a2e', fg: '#f7f0ff', accent: '#e879f9', wake: 'rgba(217, 70, 239, 0.7)', mat: 'halftone' },
};

export function createCurtain() {
  const el = document.createElement('div');
  el.className = 'curtain';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  gsap.set(el, { yPercent: 110 });
  let word = null;

  return {
    async cover(id) {
      const s = SURFACE[id];
      const m = MONUMENTS.find((x) => x.id === id);
      word?.destroy();
      el.innerHTML = '<div class="curtain__word"></div>';
      word = monumentWord(m.name, { material: s.mat });
      word.el.style.setProperty('--mw-alpha', '0.14');
      word.el.style.setProperty('--mw-wake-tint', s.wake);
      el.firstElementChild.append(word.el);
      el.style.setProperty('--curtain', s.bg);
      if (reducedMotion) {
        gsap.set(el, { yPercent: 0, opacity: 0, visibility: 'visible' });
        await gsap.to(el, { opacity: 1, duration: 0.4 });
        gsap.set(word.wake, { opacity: 1 });
        return;
      }
      gsap.set(el, { opacity: 1, visibility: 'visible' });
      await gsap
        .timeline()
        .fromTo(el, { yPercent: 110 }, { yPercent: 0, duration: 0.95, ease: 'power3.inOut' })
        .fromTo(word.el, { yPercent: 70 }, { yPercent: 0, duration: 1.1, ease: 'power3.out' }, 0.15)
        .to(word.wake, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.6);
    },
    async uncover() {
      if (reducedMotion) {
        await gsap.to(el, { opacity: 0, duration: 0.5 });
        gsap.set(el, { yPercent: 110, visibility: 'hidden' });
        return;
      }
      await gsap
        .timeline()
        .to(word.el, { yPercent: -60, duration: 0.9, ease: 'power3.in' }, 0)
        .to(el, { yPercent: -112, duration: 1.0, ease: 'power3.inOut' }, 0.1);
      gsap.set(el, { yPercent: 110, visibility: 'hidden' });
    },
  };
}
