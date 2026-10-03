import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ΣΩλ∆◊§¥';

// Splits are tracked per element so a new reveal can cleanly undo the last one.
const splits = new WeakMap();
function split(el, type) {
  revertSplits(el);
  const s = SplitText.create(el, { type, charsClass: 'char' });
  splits.set(el, s);
  return s;
}
export function revertSplits(el) {
  splits.get(el)?.revert();
  splits.delete(el);
}

// Each principle reveals its own name the way its world behaves.
// All return a timeline; `el.textContent` is set before calling.
export const reveals = {
  // Mechanical, precise: characters drop into place one by one.
  encapsulation(el) {
    const { chars } = split(el, 'chars');
    return gsap.timeline().from(chars, {
      yPercent: -110,
      opacity: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.035,
    });
  },

  // Sudden clarity: blur to sharp, letter by letter, slow.
  abstraction(el) {
    const { chars } = split(el, 'chars');
    return gsap.timeline().from(chars, {
      opacity: 0,
      filter: 'blur(14px)',
      scale: 1.08,
      duration: 1.2,
      ease: 'expo.out',
      stagger: 0.05,
    });
  },

  // A signature being written: wipe left to right.
  inheritance(el) {
    return gsap.timeline().fromTo(
      el,
      { clipPath: 'inset(-20% 100% -20% 0%)' },
      { clipPath: 'inset(-20% 0% -20% 0%)', duration: 1.4, ease: 'power1.inOut' }
    );
  },

  // Cannot decide what it is until context arrives.
  polymorphism(el) {
    const final = el.textContent;
    const { chars } = split(el, 'chars');
    const tl = gsap.timeline();
    chars.forEach((c, i) => {
      const target = final[i];
      const state = { p: 0 };
      tl.to(
        state,
        {
          p: 1,
          duration: 0.5 + i * 0.045,
          ease: 'none',
          onUpdate() {
            c.textContent = state.p < 1 ? GLYPHS[(Math.random() * GLYPHS.length) | 0] : target;
          },
          onComplete() {
            c.textContent = target;
            gsap.fromTo(c, { scale: 1.25 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
          },
        },
        0
      );
    });
    return tl;
  },
};

// Typewriter for the prologue line — constant rate, no personality.
export function typeIn(el, { speed = 0.045 } = {}) {
  const { chars } = split(el, 'words,chars');
  return gsap.timeline().to(chars, {
    opacity: 1,
    duration: 0.01,
    ease: 'none',
    stagger: { each: speed },
  });
}
