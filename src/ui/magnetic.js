import gsap from 'gsap';
import { finePointer, reducedMotion } from '../motion.js';

// Buttons lean towards the pointer, and their label leans further — then
// spring back when you leave. Opt in with [data-magnetic]; an optional
// [data-magnetic-inner] child gets the extra pull.
export function magnetize(root = document) {
  if (!finePointer || reducedMotion) return;
  root.querySelectorAll('[data-magnetic]').forEach((el) => {
    if (el.dataset.magnetized) return;
    el.dataset.magnetized = '1';
    const inner = el.querySelector('[data-magnetic-inner]');
    const strength = parseFloat(el.dataset.magnetic) || 0.3;
    const x = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'power3.out' });
    const y = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'power3.out' });
    const ix = inner && gsap.quickTo(inner, 'x', { duration: 0.6, ease: 'power3.out' });
    const iy = inner && gsap.quickTo(inner, 'y', { duration: 0.6, ease: 'power3.out' });

    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      x(dx * strength);
      y(dy * strength);
      ix?.(dx * strength * 0.6);
      iy?.(dy * strength * 0.6);
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(inner ? [el, inner] : el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1, 0.4)', overwrite: true });
    });
  });
}
