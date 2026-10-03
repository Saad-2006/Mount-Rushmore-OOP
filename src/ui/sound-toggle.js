import gsap from 'gsap';
import { audio } from '../audio/engine.js';
import { DUR } from '../motion.js';

// Bottom-right, everywhere after the gate. Remembers the visitor's choice; a
// browser only allows audio after a gesture, so a returning "sound on" visitor
// hears it from their first click, tap or key.
export function createSoundToggle() {
  const btn = document.querySelector('[data-sound]');
  const label = btn.querySelector('[data-sound-label]');

  const render = (on) => {
    btn.setAttribute('aria-pressed', String(on));
    label.textContent = on ? 'Sound on' : 'Sound off';
  };
  audio.onChange(render);
  render(false);
  btn.addEventListener('click', () => audio.toggle());

  let decided = false;
  if (audio.preferred) {
    const wake = (e) => {
      ['pointerdown', 'keydown'].forEach((t) => removeEventListener(t, wake, true));
      // The gate buttons and the toggle make their own choice.
      if (e.target.closest?.('[data-enter], [data-sound]')) return;
      if (!decided && !audio.enabled) audio.setEnabled(true);
    };
    ['pointerdown', 'keydown'].forEach((e) => addEventListener(e, wake, true));
  }

  return {
    // The gate made an explicit choice; it outranks the remembered one.
    decide() {
      decided = true;
    },
    show() {
      gsap.set(btn, { visibility: 'visible' });
      gsap.to(btn, { opacity: 1, duration: DUR.l });
    },
  };
}
