import gsap from 'gsap';
import { SplitText } from 'gsap/SplitText';
import * as car from './car.js';
import './abstraction.css';
import { reducedMotion } from '../../motion.js';

gsap.registerPlugin(SplitText);


const STAGES = [
  { svg: car.detailed, n: '01', name: 'The machine', note: '30,000 parts. You see a car.' },
  { svg: car.wireframe, n: '02', name: 'The structure', note: 'Lines, loads, measurements.' },
  { svg: car.diagram, n: '03', name: 'The system', note: 'Engine. Gearbox. Wheels.' },
  { svg: car.steering, n: '04', name: 'The interface', note: 'Steer. Go. Stop.' },
  { svg: car.circle, n: '05', name: 'The idea', note: 'Turn it, and you turn.' },
];

// II · Abstraction — the only light world. A car sheds detail, layer by layer,
// until only the part you actually use is left. Then not even that.
export default function mount(shell) {
  const { body, ctx } = shell;

  const stage = document.createElement('section');
  stage.className = 'abs';
  stage.innerHTML = `
    <p class="abs__meta mono">Monument II · Designed simplicity</p>
    <div class="abs__caption mono" aria-live="polite">
      <span class="abs__n" data-n>01</span>
      <span class="abs__name" data-name>The machine</span>
      <span class="abs__note" data-note>30,000 parts. You see a car.</span>
    </div>
    <ol class="abs__ticks mono" aria-hidden="true">
      ${STAGES.map((s, i) => `<li data-tick="${i}">${s.n}</li>`).join('')}
    </ol>
    <div class="abs__frame">
      ${STAGES.map((s, i) => `<div class="abs__layer" data-layer="${i}">${s.svg}</div>`).join('')}
      <div class="abs__scan" data-scan aria-hidden="true"></div>
    </div>
    <h1 class="abs__title" data-title>Abstraction</h1>
    <p class="abs__line mono" data-line>You don’t need to know how the engine works to drive.</p>
    <p class="abs__hint mono" data-hint>Scroll to simplify</p>
  `;
  body.append(stage);
  const $ = (s) => stage.querySelector(s);
  const layers = [...stage.querySelectorAll('[data-layer]')];
  const ticks = [...stage.querySelectorAll('[data-tick]')];

  let current = 0;
  function setCaption(i) {
    if (i === current) return;
    current = i;
    const s = STAGES[i];
    ticks.forEach((t, j) => t.classList.toggle('on', j <= i));
    const parts = [$('[data-n]'), $('[data-name]'), $('[data-note]')];
    gsap.timeline()
      .to(parts, { opacity: 0, y: -8, duration: 0.2, ease: 'power2.in', stagger: 0.03 })
      .call(() => {
        parts[0].textContent = s.n;
        parts[1].textContent = s.name;
        parts[2].textContent = s.note;
      })
      .fromTo(parts, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', stagger: 0.05 });
  }

  ctx.add(() => {
    const titleChars = SplitText.create($('[data-title]'), { type: 'chars', charsClass: 'char' }).chars;
    const lineWords = SplitText.create($('[data-line]'), { type: 'words', wordsClass: 'word' }).words;
    const scan = $('[data-scan]');
    const frame = $('.abs__frame');
    // Each wipe: a cobalt scan line crosses the frame; left of it, the next,
    // simpler layer; right of it, the old one.
    const WIPES = [1.0, 3.2, 5.4, 7.6];

    ticks[0].classList.add('on');
    gsap.set(layers.slice(1), { clipPath: 'inset(0% 100% 0% 0%)' });
    gsap.set(scan, { x: 0, opacity: 0 });
    gsap.set(titleChars, { opacity: 0, filter: 'blur(16px)', scale: 1.1 });
    gsap.set(lineWords, { opacity: 0, y: 10 });

    const tl = gsap.timeline({
      defaults: { ease: 'expo.out' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: reducedMotion ? '+=200%' : '+=640%',
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Caption follows whichever layer currently owns most of the frame.
          // From the scroll position, not the smoothed playhead — which lags fast scrolls.
          const t = self.progress * self.animation.duration();
          const i = WIPES.reduce((acc, w, k) => (t >= w + 0.6 ? k + 1 : acc), 0);
          setCaption(i);
        },
      },
    });

    tl.to($('[data-hint]'), { opacity: 0, duration: 0.4 }, 0);
    WIPES.forEach((at, k) => {
      const from = layers[k];
      const to = layers[k + 1];
      tl.set(scan, { opacity: 1, x: 0 }, at)
        .to(scan, { x: () => frame.offsetWidth, duration: 1.4, ease: 'expo.inOut' }, at)
        .to(from, { clipPath: 'inset(0% 0% 0% 100%)', duration: 1.4, ease: 'expo.inOut' }, at)
        .to(to, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'expo.inOut' }, at)
        .set(scan, { opacity: 0 }, at + 1.4);
    });

    // The idea: the circle settles; understanding clicks.
    tl.fromTo(layers[4].querySelector('circle'), { scale: 1.15, transformOrigin: '50% 50%' }, { scale: 1, duration: 1.2 }, 8.6)
      .to(titleChars, { opacity: 1, filter: 'blur(0px)', scale: 1, duration: 1.4, stagger: 0.12 }, 9.0)
      .to(lineWords, { opacity: 1, y: 0, duration: 0.8, stagger: 0.18 }, 10.6)
      .to({}, { duration: 0.8 });
  });

  shell.coda({
    statement: 'Not ignorance.<br />Designed simplicity.',
    code: [
      `<span><b class="k">interface</b> <b class="pub">Drivable</b> {</span>`,
      `<span>  <b class="pub">steer</b>(angle);</span>`,
      `<span>  <b class="pub">accelerate</b>();</span>`,
      `<span>  <b class="pub">brake</b>();</span>`,
      `<span>}</span>`,
      `<span> </span>`,
      `<span><b class="c">// Engine, gearbox, 30,000 parts —</b></span>`,
      `<span><b class="c">// behind the interface. Not your problem.</b></span>`,
    ].join(''),
  });

  return {
    enter() {
      return gsap
        .timeline()
        .from(layers[0], { opacity: 0, x: 40, duration: 1.6, ease: 'expo.out' })
        .from(stage.querySelectorAll('.abs__meta, .abs__caption, .abs__ticks, [data-hint]'), {
          opacity: 0,
          y: 10,
          duration: 1,
          stagger: 0.08,
        }, 0.4);
    },
  };
}
