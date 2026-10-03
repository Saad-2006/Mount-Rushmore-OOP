import gsap from 'gsap';
import { MONUMENTS } from '../config.js';
import { EASE, DUR, STAGGER } from '../motion.js';
import { magnetize } from './magnetic.js';

// Full-screen index, reachable from any world: opens as a circle from the
// corner it was summoned from. Jump between monuments without the mountain.
export function createMenu({ onGo, onOpen, onClose }) {
  const el = document.createElement('div');
  el.className = 'menu';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Index');
  el.innerHTML = `
    <button class="menu__close label" data-menu-close data-magnetic><span data-magnetic-inner>Close</span></button>
    <p class="menu__kicker label">Index</p>
    <ol class="menu__list">
      <li><button class="menu__item" data-go="" style="--c: var(--bone)">
        <span class="menu__num mono">0</span><span class="menu__name">The Mountain</span><span class="menu__face label">All four</span>
      </button></li>
      ${MONUMENTS.map(
        (m) => `<li><button class="menu__item" data-go="${m.id}" style="--c: var(--${m.id})">
          <span class="menu__num mono">${m.numeral}</span><span class="menu__name">${m.name}</span><span class="menu__face label">${m.face}</span>
        </button></li>`
      ).join('')}
    </ol>
    <p class="menu__foot label">Esc to close</p>
  `;
  document.body.append(el);
  magnetize(el);

  const items = [...el.querySelectorAll('.menu__item')];
  let open = false;
  let current = null;

  function show(currentId) {
    if (open) return;
    open = true;
    current = currentId;
    items.forEach((b) => b.toggleAttribute('aria-current', b.dataset.go === (currentId || '')));
    el.classList.add('is-open');
    document.documentElement.classList.add('menu-open');
    onOpen?.();
    gsap.fromTo(
      el.querySelectorAll('.menu__item, .menu__kicker, .menu__foot, .menu__close'),
      { yPercent: 60, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: DUR.l, ease: EASE, stagger: STAGGER, delay: 0.15 }
    );
    el.querySelector('[data-menu-close]').focus({ preventScroll: true });
  }

  function hide() {
    if (!open) return Promise.resolve();
    open = false;
    el.classList.remove('is-open');
    document.documentElement.classList.remove('menu-open');
    onClose?.();
    return new Promise((r) => setTimeout(r, 650));
  }

  el.querySelector('[data-menu-close]').addEventListener('click', hide);
  items.forEach((b) =>
    b.addEventListener('click', async () => {
      const id = b.dataset.go || null;
      await hide();
      if (id !== current) onGo(id);
    })
  );
  addEventListener('keydown', (e) => e.key === 'Escape' && open && hide());

  return { show, hide, get open() { return open; } };
}
