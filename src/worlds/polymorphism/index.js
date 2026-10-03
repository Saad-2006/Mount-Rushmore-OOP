import gsap from 'gsap';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { cursor } from '../../ui/cursor.js';
import { audio } from '../../audio/engine.js';
import './polymorphism.css';
import { reducedMotion } from '../../motion.js';

gsap.registerPlugin(MorphSVGPlugin);

const GLYPHS = '!<>-_\\/[]{}—=+*^?#01ΣΩλ∆◊§¥@%&';
const ELASTIC = 'elastic.out(1, 0.3)';

const SHAPES = {
  circle: 'M290,200 A90,90 0 0 1 200,290 A90,90 0 0 1 110,200 A90,90 0 0 1 200,110 A90,90 0 0 1 290,200 Z',
  speaker: 'M112,168 L160,168 L226,112 L226,288 L160,232 L112,232 Z',
  pin: 'M200,318 C172,272 124,236 124,186 A76,76 0 0 1 276,186 C276,236 228,272 200,318 Z',
};

const pad = (n) => String(n).padStart(2, '0');
const now = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

const CONTEXTS = [
  { key: 'sound', label: 'Sound', side: 'left', shape: 'speaker', out: () => '→ ♪  playing' },
  { key: 'time', label: 'Time', side: 'right', shape: 'circle', out: () => `→ ${now()}` },
  { key: 'location', label: 'Location', side: 'left', shape: 'pin', out: () => '→ 43.8791° N, 103.4591° W' },
];

// IV · Polymorphism — one shape, one method, and it refuses to be one thing.
export default function mount(shell) {
  const { body, ctx } = shell;

  const stage = document.createElement('section');
  stage.className = 'poly';
  stage.innerHTML = `
    <div class="poly__bg" aria-hidden="true">
      <div class="poly__wash poly__wash--violet"></div>
      <div class="poly__wash poly__wash--purple" data-wash="0"></div>
      <div class="poly__wash poly__wash--magenta" data-wash="1"></div>
      <div class="poly__wash poly__wash--black" data-wash="2"></div>
    </div>
    <p class="poly__meta mono">Monument IV · The shapeshifter</p>

    <div class="poly__stage" data-jitter>
      <svg class="poly__svg" viewBox="0 0 400 400" aria-hidden="true">
        <ellipse data-deco="shadow" class="poly__shadow" cx="200" cy="330" rx="54" ry="9" />
        <g data-deco="sound" class="poly__deco">
          ${[0, 1, 2].map((i) => `<path data-wave d="M${250 + i * 26},${150 - i * 18} Q${290 + i * 34},200 ${250 + i * 26},${250 + i * 18}" />`).join('')}
        </g>
        <g data-body>
          <path class="poly__ghost poly__ghost--a" d="${SHAPES.circle}" data-ghost />
          <path class="poly__ghost poly__ghost--b" d="${SHAPES.circle}" data-ghost />
          <path class="poly__shape" d="${SHAPES.circle}" data-shape />
          <circle data-deco="location" class="poly__deco poly__hole" cx="200" cy="186" r="26" />
        </g>
        <g data-deco="time" class="poly__deco poly__clock">
          ${Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r1 = i % 3 === 0 ? 64 : 72;
            return `<line data-tick x1="${200 + Math.cos(a) * r1}" y1="${200 + Math.sin(a) * r1}" x2="${200 + Math.cos(a) * 80}" y2="${200 + Math.sin(a) * 80}" />`;
          }).join('')}
          <line data-hand="h" x1="200" y1="200" x2="200" y2="152" class="poly__hand poly__hand--h" />
          <line data-hand="m" x1="200" y1="200" x2="200" y2="136" class="poly__hand" />
          <line data-hand="s" x1="200" y1="210" x2="200" y2="130" class="poly__hand poly__hand--s" />
          <circle cx="200" cy="200" r="4" class="poly__pivot" />
        </g>
      </svg>
      <p class="poly__call mono"><span class="poly__obj">shape</span>.render()</p>
      <p class="poly__out mono" data-out>→ ○</p>
    </div>

    ${CONTEXTS.map(
      (c, i) => `
      <aside class="poly__card poly__card--${c.side}" data-card="${i}">
        <p class="poly__card-k mono">context</p>
        <p class="poly__card-v">${c.label}</p>
      </aside>`
    ).join('')}

    <h1 class="poly__title" data-title aria-label="Polymorphism"></h1>
    <p class="poly__line mono" data-line>Same name. Different worlds.</p>
    <p class="poly__hint mono" data-hint>Scroll to change context</p>
  `;
  body.append(stage);
  const $ = (s) => stage.querySelector(s);
  const $$ = (s) => [...stage.querySelectorAll(s)];

  const shape = $('[data-shape]');
  const ghosts = $$('[data-ghost]');
  const out = $('[data-out]');
  const cards = $$('[data-card]');
  const deco = {
    sound: $('[data-deco="sound"]'),
    time: $('[data-deco="time"]'),
    location: $('[data-deco="location"]'),
    shadow: $('[data-deco="shadow"]'),
  };

  // Title: one span per letter, each undecided until the scroll decides it.
  const word = 'Polymorphism';
  const title = $('[data-title]');
  title.innerHTML = [...word].map(() => `<span class="char" aria-hidden="true"></span>`).join('');
  const chars = [...title.children];
  const resolved = chars.map(() => false);

  // ── Context switching (triggered, not scrubbed: elastic needs real time) ──
  let active = -1;
  let outTimer = 0;
  const waves = [];

  function setContext(i) {
    if (i === active) return;
    const prev = active;
    active = i;
    const c = CONTEXTS[i];
    const target = c ? SHAPES[c.shape] : SHAPES.circle;

    gsap.to([shape, ...ghosts], { morphSVG: target, duration: 1.3, ease: ELASTIC, overwrite: 'auto' });

    cards.forEach((card, k) => {
      const fromLeft = CONTEXTS[k].side === 'left';
      if (k === i) {
        gsap.fromTo(card, { xPercent: fromLeft ? -140 : 140, opacity: 0, rotate: fromLeft ? -6 : 6 }, { xPercent: 0, opacity: 1, rotate: 0, duration: 1.4, ease: ELASTIC, overwrite: true });
      } else if (k === prev) {
        gsap.to(card, { xPercent: fromLeft ? -140 : 140, opacity: 0, duration: 0.5, ease: 'power2.in', overwrite: true });
      }
    });

    // Decorations belong to one context each.
    waves.forEach((w) => w.kill());
    waves.length = 0;
    gsap.to(deco.sound, { opacity: c?.key === 'sound' ? 1 : 0, duration: 0.3 });
    gsap.to(deco.time, { opacity: c?.key === 'time' ? 1 : 0, duration: 0.3 });
    gsap.to(deco.location, { opacity: c?.key === 'location' ? 1 : 0, duration: 0.3 });
    gsap.to(deco.shadow, { opacity: c?.key === 'location' ? 0.5 : 0, duration: 0.4 });

    if (c?.key === 'sound') {
      $$('[data-wave]').forEach((w, k) => {
        waves.push(
          gsap.fromTo(w, { opacity: 0, x: -10 }, { opacity: 1, x: 6, duration: 0.9, ease: 'power1.out', repeat: -1, delay: k * 0.22 })
        );
      });
    }
    if (c?.key === 'time') {
      gsap.fromTo($$('[data-tick]'), { scale: 0, transformOrigin: '200px 200px' }, { scale: 1, duration: 1, ease: ELASTIC, stagger: 0.04 });
    }
    if (c?.key === 'location') {
      gsap.fromTo($('[data-body]'), { y: -70 }, { y: 0, duration: 1.4, ease: 'bounce.out' });
      gsap.fromTo(deco.shadow, { scaleX: 0.3, transformOrigin: '200px 330px' }, { scaleX: 1, duration: 1.4, ease: 'bounce.out' });
    } else {
      gsap.to($('[data-body]'), { y: 0, duration: 0.6, ease: 'power2.out' });
    }

    // Same call, different answer.
    clearInterval(outTimer);
    const write = () => (out.textContent = c ? c.out() : '→ ○');
    gsap.fromTo(out, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    write();
    if (c?.key === 'time') outTimer = setInterval(write, 1000);
  }
  shell.onCleanup(() => clearInterval(outTimer));

  // ── Ticker: clock hands, glitch jitter, the undecided title ──────────────
  const glitch = { amount: 0.25, resolve: 0 };
  const jitterEl = $('[data-jitter]');
  const hands = { h: $('[data-hand="h"]'), m: $('[data-hand="m"]'), s: $('[data-hand="s"]') };
  let glyphClock = 0;
  const tick = (time, dt) => {
    // The pointer stops shapeshifting once the world has made up its mind.
    cursor.setCalm(glitch.resolve > 0.95);
    audio.set('resolve', Math.min(1, glitch.resolve));
    const d = new Date();
    const s = d.getSeconds() + d.getMilliseconds() / 1000;
    const m = d.getMinutes() + s / 60;
    const h = (d.getHours() % 12) + m / 60;
    hands.s.setAttribute('transform', `rotate(${s * 6} 200 200)`);
    hands.m.setAttribute('transform', `rotate(${m * 6} 200 200)`);
    hands.h.setAttribute('transform', `rotate(${h * 30} 200 200)`);

    const a = reducedMotion ? 0 : glitch.amount;
    const jx = (Math.random() - 0.5) * 6 * a;
    const jy = (Math.random() - 0.5) * 6 * a;
    jitterEl.style.transform = `translate(-50%, -50%) translate(${jx.toFixed(2)}px, ${jy.toFixed(2)}px)`;
    ghosts[0].style.transform = `translate(${(-4 - Math.random() * 6) * a}px, ${(Math.random() - 0.5) * 3 * a}px)`;
    ghosts[1].style.transform = `translate(${(4 + Math.random() * 6) * a}px, ${(Math.random() - 0.5) * 3 * a}px)`;

    glyphClock += dt;
    const step = glyphClock > 55;
    if (step) glyphClock = 0;
    chars.forEach((c, i) => {
      const done = glitch.resolve > i / chars.length;
      if (done && !resolved[i]) {
        resolved[i] = true;
        c.textContent = word[i];
        c.classList.add('on');
        gsap.fromTo(c, { scale: 1.4 }, { scale: 1, duration: 0.8, ease: ELASTIC });
      } else if (!done) {
        if (resolved[i]) {
          resolved[i] = false;
          c.classList.remove('on');
        }
        if (step) c.textContent = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
    });
  };
  gsap.ticker.add(tick);
  shell.onCleanup(() => gsap.ticker.remove(tick));

  // ── Scroll: background identity crisis, chaos level, resolution ──────────
  const SWITCHES = [1.2, 3.4, 5.6, 7.8]; // sound, time, location, resolve
  ctx.add(() => {
    gsap.set(cards, { xPercent: (k) => (CONTEXTS[k].side === 'left' ? -140 : 140), opacity: 0 });
    gsap.set([deco.sound, deco.time, deco.location, deco.shadow], { opacity: 0 });
    gsap.set($('[data-line]'), { opacity: 0, y: 14 });

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: reducedMotion ? '+=200%' : '+=620%',
        pin: true,
        scrub: 1,
        onUpdate: (self) => {
          // From the scroll position, not the smoothed playhead — which lags fast scrolls.
          const t = self.progress * self.animation.duration();
          const i = SWITCHES.reduce((acc, at, k) => (t >= at ? k : acc), -1);
          setContext(i >= CONTEXTS.length ? -1 : i);
        },
      },
    });

    tl.to($('[data-hint]'), { opacity: 0, duration: 0.4 }, 0)
      .to('[data-wash="0"]', { opacity: 1, duration: 2.2 }, 0.8)
      .to('[data-wash="1"]', { opacity: 1, duration: 2.2 }, 3.2)
      .to(glitch, { amount: 1, duration: 4.5, ease: 'power1.in' }, 1.0)
      .to('[data-wash="2"]', { opacity: 1, duration: 2.2, ease: 'power2.inOut' }, 6.6)
      .to(glitch, { amount: 0, duration: 1.6, ease: 'power2.out' }, 7.6)
      .to(glitch, { resolve: 1.001, duration: 1.8 }, 7.9)
      .to($('[data-line]'), { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, 9.6)
      .to({}, { duration: 0.8 });
  });

  shell.coda({
    statement: 'Same call.<br />Different answer.',
    code: [
      `<span><b class="k">const</b> things = [<b class="k">new</b> <b class="pub">Speaker</b>(), <b class="k">new</b> <b class="pub">Clock</b>(), <b class="k">new</b> <b class="pub">Pin</b>()];</span>`,
      `<span> </span>`,
      `<span><b class="k">for</b> (<b class="k">const</b> t <b class="k">of</b> things) t.<b class="p">render</b>();   <b class="c">// same call</b></span>`,
      `<span> </span>`,
      `<span><b class="c">// → ♪   → 10:42   → 43.88° N</b></span>`,
    ].join(''),
  });

  return {
    enter() {
      return gsap
        .timeline()
        .from(shape, { scale: 0, transformOrigin: '50% 50%', duration: 1.6, ease: ELASTIC })
        .from(stage.querySelectorAll('.poly__meta, .poly__call, .poly__out, [data-hint]'), { opacity: 0, y: 10, duration: 1, stagger: 0.08 }, 0.3);
    },
  };
}
