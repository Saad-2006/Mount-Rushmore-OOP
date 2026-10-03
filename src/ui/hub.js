import * as THREE from 'three';
import gsap from 'gsap';
import { MONUMENTS, CREDIT } from '../config.js';
import { cursor } from './cursor.js';
import { audio } from '../audio/engine.js';
import { reveals, typeIn, revertSplits } from './text-fx.js';
import { reducedMotion } from '../motion.js';


export function createHub({ stage, mountain, rig, sky, onEnter }) {
  const root = document.querySelector('#hub');
  const $ = (s) => root.querySelector(s);
  const line = $('[data-intro-line]');
  const cue = $('[data-intro-cue]');
  const label = $('[data-label]');
  const labelMeta = $('[data-label-meta]');
  const labelName = $('[data-label-name]');
  const labelLine = $('[data-label-line]');
  const nav = $('[data-nav]');
  const list = $('[data-nav-list]');
  const credit = $('[data-credit]');

  const touch = matchMedia('(pointer: coarse)').matches;

  credit.href = CREDIT.url;
  credit.textContent = `${CREDIT.text} · ${CREDIT.license}`;

  const items = MONUMENTS.map((m, i) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.className = 'monuments__item';
    btn.style.setProperty('--c', `var(--${m.id})`);
    btn.innerHTML = `<span class="num">${m.numeral}</span><span>${m.name}</span>`;
    btn.addEventListener('pointerenter', (e) => e.pointerType === 'mouse' && select(i));
    // Keyboard focus only — a tap also focuses, and must not count as a selection.
    btn.addEventListener('focus', () => btn.matches(':focus-visible') && select(i));
    // On touch, the first tap selects; the second enters.
    btn.addEventListener('click', () => (touch && active !== i ? select(i) : enter(i)));
    li.append(btn);
    list.append(li);
    return btn;
  });

  let state = 'intro';
  let active = -1;
  let labelTl;
  const setState = (s) => {
    state = s;
    root.dataset.state = s;
  };

  // ── Prologue ─────────────────────────────────────────────
  function playIntro() {
    const tl = gsap.timeline({ delay: 0.3 });
    if (reducedMotion) {
      tl.add(typeIn(line, { speed: 0 })).to(cue, { opacity: 1, duration: 0.6 });
    } else {
      tl.add(typeIn(line)).fromTo(cue, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 1.2 }, '+=0.4');
    }
    return tl;
  }

  // The visitor has to commit. "Enter with sound" (or the Enter key) brings
  // the audio; "in silence", a scroll or a swipe does not. Audio has to be
  // switched on inside the gesture itself, so it happens right here.
  function waitForCommit() {
    return new Promise((resolve) => {
      const buttons = [...root.querySelectorAll('[data-enter]')];
      const done = (sound) => {
        ['wheel', 'touchmove', 'keydown'].forEach((ev) => removeEventListener(ev, onPassive));
        buttons.forEach((b) => b.removeEventListener('click', onClick));
        if (sound) audio.setEnabled(true);
        else if (audio.enabled) audio.setEnabled(false);
        resolve({ sound });
      };
      const onClick = (e) => done(e.currentTarget.dataset.enter === 'sound');
      const onPassive = (e) => {
        if (e.type === 'keydown') {
          if (e.key === 'Enter' || e.key === ' ') {
            if (e.target.closest?.('[data-enter]')) return; // the button's own click handles it
            return done(true);
          }
          if (e.key !== 'ArrowDown' && e.key !== 'PageDown') return;
        }
        done(false);
      };
      buttons.forEach((b) => b.addEventListener('click', onClick));
      ['wheel', 'touchmove', 'keydown'].forEach((ev) => addEventListener(ev, onPassive, { passive: true }));
    });
  }

  async function approach() {
    if (state !== 'intro') return;
    setState('approaching');
    const chars = line.querySelectorAll('.char');
    const tl = gsap.timeline();
    tl.to(cue, { autoAlpha: 0, duration: 0.5 }, 0)
      .to(chars, {
        opacity: 0,
        yPercent: -40,
        filter: 'blur(8px)',
        duration: 0.9,
        ease: 'power2.in',
        stagger: { each: 0.012, from: 'random' },
      }, 0)
      .call(() => audio.approach(3.2), null, 0)
      // The drop lands as the moonlight hits the faces.
      .call(() => audio.drop(), null, reducedMotion ? 0.6 : 2.6)
      .add(rig.approach(reducedMotion ? 1.2 : 4.6), 0.3)
      .add(mountain.reveal({ duration: reducedMotion ? 1 : 3.4 }), 0.6)
      .to(sky.uniforms.uReveal, { value: 1, duration: 4, ease: 'power2.inOut' }, 0.2)
      .to(stage.scene.fog, { density: 0.0035, duration: 4.5, ease: 'power2.inOut' }, 0.2)
      .set(nav, { visibility: 'visible' }, '-=1.2')
      .to(nav, { opacity: 1, duration: 1.2, ease: 'power2.out' }, '<')
      .to(credit, { opacity: 1, duration: 1.2 }, '<');
    await tl;
    if (state === 'approaching') setState('hub');
  }

  // ── Selection ────────────────────────────────────────────
  function select(i) {
    if (state !== 'hub' || i === active) return;
    active = i;
    mountain.setHover(i);
    items.forEach((b, j) => b.setAttribute('aria-current', String(j === i)));
    if (i === -1) return hideLabel();
    audio.blip(i);
    const m = MONUMENTS[i];
    rig.pan(m.focus[0]);
    showLabel(m);
  }

  function showLabel(m) {
    labelTl?.kill();
    // Undo the previous split first — otherwise SplitText's own auto-revert
    // restores the old name over the new one.
    revertSplits(labelName);
    document.documentElement.style.setProperty('--accent', `var(--${m.id})`);
    labelName.textContent = m.name;
    labelName.style.clipPath = '';
    labelMeta.textContent = `Monument ${m.numeral} · ${m.face}`;
    labelLine.textContent = m.line;
    gsap.set(label, { opacity: 1 });
    labelTl = gsap
      .timeline()
      .fromTo(labelMeta, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 0)
      .add(reveals[m.id](labelName), 0.05)
      .fromTo(labelLine, { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.5);
  }

  function hideLabel() {
    labelTl?.kill();
    labelTl = gsap.to(label, { opacity: 0, duration: 0.5, ease: 'power2.out' });
  }

  // ── Picking ──────────────────────────────────────────────
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function pick(e) {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, stage.camera);
    const hit = ray.intersectObjects(mountain.proxies, false)[0];
    return hit ? hit.object.userData.index : -1;
  }

  stage.renderer.domElement.addEventListener('pointermove', (e) => {
    if (state !== 'hub' || touch) return;
    const i = pick(e);
    stage.renderer.domElement.style.cursor = i === -1 ? '' : 'pointer';
    if (i === -1) cursor.unhover();
    else cursor.hover({ label: 'Enter', color: MONUMENTS[i].color });
    select(i);
  });

  stage.renderer.domElement.addEventListener('click', (e) => {
    if (state !== 'hub') return;
    const i = pick(e);
    if (i === -1) return touch && select(-1);
    // On touch, the first tap selects; the second enters.
    if (touch && i !== active) return select(i);
    enter(i);
  });

  addEventListener('keydown', (e) => {
    if (state !== 'hub') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (Math.max(active, 0) + dir + MONUMENTS.length) % MONUMENTS.length;
      items[next].focus();
    } else if (e.key === 'Escape') {
      select(-1);
      document.activeElement?.blur();
    }
  });

  // ── Enter / leave / return ───────────────────────────────
  // The hub only asks; the director decides (it owns routing and the warp).
  function enter(i) {
    if (state !== 'hub') return;
    onEnter(MONUMENTS[i], i);
  }

  function leave(i) {
    if (state === 'hub') select(i);
    // Leaving mid-intro (history, deep links): the prologue is over either way.
    if (state === 'intro' || state === 'approaching') skipIntro();
    setState('away');
    stage.renderer.domElement.style.cursor = '';
    cursor.unhover();
    gsap.to([nav, label, credit], { opacity: 0, duration: 0.6 });
  }

  function restore(i = active) {
    gsap.to([nav, credit], { opacity: 1, duration: 1 });
    setState('hub');
    active = -1;
    if (i !== -1) select(i);
  }

  // Deep link straight into a world: the mountain is waiting when they come back.
  function skipIntro() {
    gsap.killTweensOf(root.querySelectorAll('.intro, .intro *'));
    gsap.set(root.querySelector('.intro'), { display: 'none' });
    gsap.set(nav, { visibility: 'visible' });
    setState('away');
  }

  return { playIntro, waitForCommit, approach, leave, restore, skipIntro, get state() { return state; } };
}
