import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { gearTrain, wiring, circuit, memory } from './machinery.js';
import { audio } from '../../audio/engine.js';
import './encapsulation.css';
import { reducedMotion } from '../../motion.js';

gsap.registerPlugin(SplitText);

const AMBER = '#F5A623';
const WHITE = '#F0F0F0';

// I · Encapsulation — a perfect black box. Scroll opens it: inside, chaos.
// The outside stays beautiful while the inside does all the work. Then it closes.
export default function mount(shell) {
  const { body, ctx } = shell;

  const stage = document.createElement('section');
  stage.className = 'enc';
  stage.innerHTML = `
    <div class="enc__scene">
      <div class="enc__glow" data-glow></div>
      <div class="enc__spill" data-spill></div>
      <div class="enc__pivot" data-pivot>
        <div class="enc__cube" data-cube>
          <div class="face out back"></div>
          <div class="face out left"></div>
          <div class="face out right"></div>
          <div class="face out top"></div>
          <div class="face out bottom"></div>

          <div class="face in back" data-in-back></div>
          <div class="face in left" data-in-left></div>
          <div class="face in right" data-in-right></div>
          <div class="face in top"></div>
          <div class="face in bottom" data-in-floor></div>

          <div class="enc__float" data-float></div>

          <div class="enc__hinge">
            <div class="enc__door" data-door>
              <div class="door out">
                <ul class="door__api mono" aria-hidden="true">
                  <li>open()</li><li>close()</li><li>status()</li>
                </ul>
              </div>
              <div class="door in" data-door-in></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="enc__meta mono" data-meta>Monument I · The black box</p>
    <h1 class="enc__title" data-title>Encapsulation</h1>
    <p class="enc__line mono" data-line>The complexity is real.<br />You just don’t have to see it.</p>
    <p class="enc__hint mono" data-hint>Scroll to open</p>
  `;
  body.append(stage);
  const $ = (s) => stage.querySelector(s);

  // ── Fill the inside ──────────────────────────────────────
  const backGears = gearTrain(
    [
      { x: 170, y: 190, teeth: 24, fill: 'rgba(245,166,35,0.08)' },
      { angle: -0.5, teeth: 13 },
      { angle: 0.7, teeth: 17, fill: 'rgba(245,166,35,0.05)' },
      { angle: 2.1, teeth: 9 },
      { angle: 2.9, teeth: 19 },
      { angle: -2.2, teeth: 11, fill: 'rgba(240,240,240,0.05)' },
    ],
    { stroke: AMBER }
  );
  const backWires = wiring(14, { colors: [AMBER, WHITE, '#7a5418'], seed: 11 });
  $('[data-in-back]').append(backGears.svg, backWires.svg);

  const sideCircuit = circuit({ seed: 5, color: AMBER });
  const sideWires = wiring(8, { colors: [WHITE, AMBER], seed: 29 });
  $('[data-in-left]').append(sideCircuit, sideWires.svg);
  $('[data-in-right]').append(circuit({ seed: 13, color: '#8a6420' }));

  const floorMem = memory(14, 14);
  $('[data-in-floor]').append(floorMem.el);

  const doorIn = circuit({ seed: 21, traces: 18, color: '#6d4d16' });
  $('[data-door-in]').append(doorIn);

  // Floating private state, hovering at different depths inside the box.
  const floatGears = gearTrain([{ x: 200, y: 200, teeth: 14 }, { angle: 0.8, teeth: 8 }], { stroke: WHITE });
  floatGears.svg.classList.add('enc__float-gears');
  const privates = ['#state', '#cache', '#retries', '#mutex', '#buffer', '#tick()', '#secret', '#queue'];
  const floatEl = $('[data-float]');
  floatEl.append(floatGears.svg);
  const labels = privates.map((txt, i) => {
    const l = document.createElement('span');
    l.className = 'enc__private mono';
    l.textContent = txt;
    const a = (i / privates.length) * Math.PI * 2;
    l.style.setProperty('--x', (Math.cos(a) * 0.3).toFixed(3));
    l.style.setProperty('--y', (Math.sin(a) * 0.3).toFixed(3));
    l.style.setProperty('--z', `${(-0.35 + (i % 4) * 0.18).toFixed(2)}`);
    floatEl.append(l);
    return l;
  });

  const wirePaths = [...backWires.paths, ...sideWires.paths];

  // ── Machinery runs on the ticker ─────────────────────────
  // `drive.speed` is scrubbed by the scroll timeline; velocity adds a kick.
  const drive = { speed: 0.4, turn: 0, inside: 0 };
  let memClock = 0;
  const tick = (time, dt) => {
    const kick = Math.min(Math.abs(shell.lenis.velocity) * 0.04, 3);
    drive.turn += (dt / 1000) * 60 * (drive.speed + kick * drive.inside) * 1.4;
    // The gears you hear turn at the speed of the gears you see.
    audio.set('speed', drive.speed + kick * drive.inside);
    backGears.set(drive.turn);
    floatGears.set(drive.turn * 0.7);
    memClock += dt;
    if (drive.inside > 0.05 && memClock > 70) {
      memClock = 0;
      floorMem.tick(0.06 + drive.inside * 0.1);
    }
  };
  gsap.ticker.add(tick);
  shell.onCleanup(() => gsap.ticker.remove(tick));

  // ── The scroll story ─────────────────────────────────────
  let titleChars;
  ctx.add(() => {
    titleChars = SplitText.create($('[data-title]'), { type: 'chars', charsClass: 'char' }).chars;
    const cube = $('[data-cube]');
    const pivot = $('[data-pivot]');
    const door = $('[data-door]');

    gsap.set(stage, { '--leak': 0.2, '--inside': 0 });
    gsap.set(cube, { rotateX: -10, rotateY: -36 });
    gsap.set(door, { transformOrigin: '0% 50%' });
    gsap.set(titleChars, { yPercent: -120, opacity: 0 });
    gsap.set($('[data-line]'), { opacity: 0, y: 16 });
    gsap.set(labels, { opacity: 0 });

    const tl = gsap.timeline({
      defaults: { ease: 'power3.out' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: reducedMotion ? '+=150%' : '+=520%',
        pin: true,
        scrub: 1,
      },
    });

    tl.to($('[data-hint]'), { opacity: 0, y: -10, duration: 0.4 }, 0)
      // Settle into a three-quarter view. Something inside wants out.
      .to(cube, { rotateY: -24, rotateX: -14, duration: 1.4, ease: 'power2.inOut' }, 0)
      .to(stage, { '--leak': 1, duration: 1.2 }, 0.2)
      .to(door, { rotateY: -1.6, duration: 0.12, ease: 'power1.inOut', yoyo: true, repeat: 5 }, 1.0)

      // Open.
      .to(door, { rotateY: -104, duration: 2.4 }, 1.7)
      .to(stage, { '--inside': 1, '--leak': 0, duration: 2.0 }, 1.7)
      .to(drive, { inside: 1, speed: 2.2, duration: 2.0 }, 1.7)
      .to($('[data-glow]'), { opacity: 1, scale: 1, duration: 2.2 }, 1.8)
      .to($('[data-spill]'), { opacity: 1, scaleX: 1, duration: 2.2 }, 1.9)
      .to(wirePaths, { attr: { 'stroke-dashoffset': 0 }, duration: 2.2, stagger: 0.06, ease: 'power2.inOut' }, 2.0)
      .to(titleChars, { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 2.2)

      // Lean in. Look at it all.
      .to(pivot, { scale: 1.2, y: '-4%', duration: 2.2, ease: 'power2.inOut' }, 3.9)
      .to(cube, { rotateY: -14, rotateX: -18, duration: 2.2, ease: 'power2.inOut' }, 3.9)
      .to(labels, { opacity: 1, duration: 0.8, stagger: 0.12 }, 4.1)
      .to(drive, { speed: 3.4, duration: 1.6 }, 4.2)

      // Close. The outside never changed.
      .to(labels, { opacity: 0, duration: 0.6, stagger: 0.04 }, 6.6)
      .to(door, { rotateY: 0, duration: 2.0, ease: 'power3.inOut' }, 6.7)
      .to(stage, { '--inside': 0, '--leak': 0.35, duration: 1.8, ease: 'power2.in' }, 6.8)
      .to(drive, { inside: 0, speed: 0.4, duration: 1.8 }, 6.8)
      .to($('[data-glow]'), { opacity: 0, scale: 0.8, duration: 1.8, ease: 'power2.in' }, 6.8)
      .to($('[data-spill]'), { opacity: 0, scaleX: 0.6, duration: 1.8, ease: 'power2.in' }, 6.8)
      .to(pivot, { scale: 1, y: '0%', duration: 2.2, ease: 'power2.inOut' }, 6.9)

      // Square up. Symmetrical. Clean.
      .to(cube, { rotateY: 0, rotateX: -6, duration: 1.8, ease: 'power2.inOut' }, 8.6)
      .to($('[data-line]'), { opacity: 1, y: 0, duration: 1.0 }, 9.4)
      .to({}, { duration: 0.6 });
  });

  shell.coda({
    statement: 'Hide the how.<br />Expose the what.',
    code: [
      `<span><b class="k">class</b> <b class="pub">Vault</b> {</span>`,
      `<span>  <b class="p">#gears</b> = [];          <b class="c">// private</b></span>`,
      `<span>  <b class="p">#wiring</b> = new Map();</span>`,
      `<span>  <b class="p">#tick</b>() { <b class="c">/* the chaos */</b> }</span>`,
      `<span> </span>`,
      `<span>  <b class="pub">open</b>()   { this.<b class="p">#tick</b>(); }   <b class="c">// public</b></span>`,
      `<span>  <b class="pub">status</b>() { return 'fine'; }</span>`,
      `<span>}</span>`,
    ].join(''),
  });

  return {
    enter() {
      const tl = gsap.timeline();
      tl.from($('[data-pivot]'), { opacity: 0, scale: 0.86, duration: 1.6, ease: 'power3.out' })
        .from([$('[data-meta]'), $('[data-hint]')], { opacity: 0, y: 12, duration: 1, stagger: 0.12 }, 0.5);
      return tl;
    },
  };
}
