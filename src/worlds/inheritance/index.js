import gsap from 'gsap';
import './inheritance.css';
import { reducedMotion } from '../../motion.js';


// The family. Positions are in the tree's 1000×560 viewBox.
const NODES = {
  animal: { name: 'Animal', x: 500, y: 6, own: ['breathe()', 'eat()'] },
  mammal: { name: 'Mammal', x: 270, y: 196, parent: 'animal', own: ['fur', 'nurse()'] },
  bird: { name: 'Bird', x: 730, y: 196, parent: 'animal', own: ['feathers', 'fly()'] },
  dog: { name: 'Dog', x: 140, y: 404, parent: 'mammal', own: ['bark()'] },
  cat: { name: 'Cat', x: 390, y: 404, parent: 'mammal', own: ['purr()'] },
  eagle: { name: 'Eagle', x: 610, y: 404, parent: 'bird', own: ['soar()'] },
  penguin: { name: 'Penguin', x: 860, y: 404, parent: 'bird', own: ['swim()'], overrides: ['fly()'] },
};
const ROWS = [['animal'], ['mammal', 'bird'], ['dog', 'cat', 'eagle', 'penguin']];

const ancestors = (id) => {
  const out = [];
  for (let p = NODES[id].parent; p; p = NODES[p].parent) out.push(p);
  return out;
};

// III · Inheritance — a lineage grows downward. Traits flow along the
// branches like sap, and every child carries everything above it.
export default function mount(shell) {
  const { body, ctx } = shell;
  const ids = Object.keys(NODES);
  const edges = ids.filter((id) => NODES[id].parent).map((id) => ({ from: NODES[id].parent, to: id }));

  const edgePath = ({ from, to }) => {
    const a = NODES[from];
    const b = NODES[to];
    // Branches leave from beneath the parent's card, not through it.
    const lines = a.own.length + ancestors(from).length + (a.overrides || []).length;
    const y1 = a.y + 64 + lines * 18;
    const y2 = b.y - 8;
    const mid = (y1 + y2) / 2;
    return `M${a.x},${y1} C${a.x},${mid + 30} ${b.x},${mid - 30} ${b.x},${y2}`;
  };

  const card = (id) => {
    const n = NODES[id];
    const lineage = ancestors(id)
      .map((a) => {
        const traits = NODES[a].own.filter((t) => !(n.overrides || []).includes(t));
        return `<li class="inh__inherited" data-from="${a}"><span class="inh__from">${NODES[a].name}</span> ${traits.join(' · ')}</li>`;
      })
      .join('');
    const overrides = (n.overrides || [])
      .map((t) => `<li class="inh__override" data-override><s>${t}</s> <span>overridden</span></li>`)
      .join('');
    return `
      <div class="inh__node" data-node="${id}" style="--x:${n.x / 10}%; --y:${(n.y / 560) * 100}%">
        <span class="inh__pulse" aria-hidden="true"></span>
        <span class="inh__dot" aria-hidden="true"></span>
        <h3 class="inh__name">${n.name}</h3>
        <ul class="inh__traits mono">
          ${n.own.map((t) => `<li class="inh__own">${t}</li>`).join('')}
          ${overrides}
          ${lineage}
        </ul>
      </div>`;
  };

  const stage = document.createElement('section');
  stage.className = 'inh';
  stage.innerHTML = `
    <svg class="inh__rings" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      ${Array.from({ length: 14 }, (_, i) => `<ellipse cx="500" cy="-80" rx="${120 + i * 70 + (i % 3) * 9}" ry="${100 + i * 64}" />`).join('')}
    </svg>
    <p class="inh__meta mono">Monument III · The lineage</p>
    <div class="inh__tree">
      <svg class="inh__svg" viewBox="0 0 1000 560" aria-hidden="true">
        <g class="inh__edges">
          ${edges.map((e, i) => `<path data-edge="${i}" d="${edgePath(e)}" pathLength="1" />`).join('')}
        </g>
        <g class="inh__sap" data-sap></g>
      </svg>
      ${ids.map(card).join('')}
    </div>
    <h1 class="inh__title" data-title>Inheritance</h1>
    <p class="inh__line mono" data-line>You don’t start from nothing.<br />You stand on what came before.</p>
    <p class="inh__hint mono" data-hint>Scroll to grow</p>
  `;
  body.append(stage);
  const $ = (s) => stage.querySelector(s);
  const node = (id) => stage.querySelector(`[data-node="${id}"]`);
  const edgeEls = [...stage.querySelectorAll('[data-edge]')];

  // ── Sap: particles that flow parent → child once a branch exists ─────────
  const NS = 'http://www.w3.org/2000/svg';
  const sap = $('[data-sap]');
  const SAMPLES = 160;
  const tracks = edgeEls.map((el) => {
    const len = el.getTotalLength();
    return Array.from({ length: SAMPLES + 1 }, (_, k) => el.getPointAtLength((k / SAMPLES) * len));
  });
  const grown = edges.map(() => ({ value: 0 })); // how much of each branch is drawn
  const drops = [];
  edges.forEach((e, i) => {
    const count = 10;
    for (let k = 0; k < count; k++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('r', (1.4 + Math.random() * 2).toFixed(1));
      sap.append(c);
      drops.push({ el: c, edge: i, t: k / count + Math.random() * 0.05, speed: 0.12 + Math.random() * 0.1 });
    }
    // One drop on each branch carries a trait name down with it.
    const label = document.createElementNS(NS, 'text');
    label.textContent = NODES[e.from].own[0];
    label.setAttribute('class', 'inh__rider');
    sap.append(label);
    drops.push({ el: label, edge: i, t: Math.random(), speed: 0.09, label: true });
  });

  const flow = (time, dt) => {
    for (const d of drops) {
      const g = grown[d.edge].value;
      if (g < 0.98) {
        d.el.style.opacity = 0;
        continue;
      }
      d.t = (d.t + (dt / 1000) * d.speed) % 1;
      // Ease along the branch so drops gather speed as they fall.
      const p = d.t * d.t * (3 - 2 * d.t);
      const pt = tracks[d.edge][Math.round(p * SAMPLES)];
      const fade = Math.min(1, d.t * 6, (1 - d.t) * 6);
      if (d.label) {
        d.el.setAttribute('x', (pt.x + 10).toFixed(1));
        d.el.setAttribute('y', (pt.y + 4).toFixed(1));
      } else {
        d.el.setAttribute('cx', pt.x.toFixed(1));
        d.el.setAttribute('cy', pt.y.toFixed(1));
      }
      d.el.style.opacity = (fade * (d.label ? 0.9 : 0.8)).toFixed(2);
    }
  };
  gsap.ticker.add(flow);
  shell.onCleanup(() => gsap.ticker.remove(flow));

  // ── The scroll story ─────────────────────────────────────
  ctx.add(() => {
    // The root is already there when you arrive — a seed. Everything else grows.
    const nodes = ids.filter((id) => id !== 'animal').map(node);
    gsap.set(nodes, { opacity: 0, scale: 0.7 });
    gsap.set(stage.querySelectorAll('.inh__inherited, .inh__override'), { opacity: 0, x: -6 });
    gsap.set(edgeEls, { attr: { 'stroke-dashoffset': 1 } });
    gsap.set($('[data-title]'), { clipPath: 'inset(-20% 100% -20% 0%)' });
    gsap.set($('[data-line]'), { opacity: 0, y: 14 });

    const tl = gsap.timeline({
      defaults: { ease: 'power1.inOut' },
      scrollTrigger: {
        trigger: stage,
        start: 'top top',
        end: reducedMotion ? '+=150%' : '+=560%',
        pin: true,
        scrub: 1,
      },
    });

    const appear = (id, at) => {
      const el = node(id);
      tl.to(el, { opacity: 1, scale: 1, duration: 0.6 }, at).fromTo(
        el.querySelector('.inh__pulse'),
        { scale: 0.4, opacity: 0.9 },
        { scale: 2.6, opacity: 0, duration: 0.9, ease: 'power1.out' },
        at + 0.1
      );
    };
    const grow = (edgeIdx, at) => {
      tl.to(edgeEls[edgeIdx], { attr: { 'stroke-dashoffset': 0 }, duration: 1.1 }, at).to(
        grown[edgeIdx],
        { value: 1, duration: 1.1 },
        at
      );
    };
    const inherit = (id, at) => {
      tl.to(node(id).querySelectorAll('.inh__inherited, .inh__override'), { opacity: 1, x: 0, duration: 0.5, stagger: 0.2 }, at);
    };

    tl.to($('[data-hint]'), { opacity: 0, duration: 0.4 }, 0);

    let at = 1.1;
    ROWS.slice(1).forEach((row) => {
      row.forEach((id, k) => {
        const e = edges.findIndex((ed) => ed.to === id);
        grow(e, at + k * 0.15);
        appear(id, at + 1.0 + k * 0.15);
        inherit(id, at + 1.5 + k * 0.15);
      });
      at += 2.0;
    });

    tl.to($('[data-title]'), { clipPath: 'inset(-20% 0% -20% 0%)', duration: 1.6 }, at + 0.4)
      .to($('[data-line]'), { opacity: 1, y: 0, duration: 0.8 }, at + 1.8)
      .to({}, { duration: 0.8 });
  });

  shell.coda({
    statement: 'Inherit the past.<br />Override what you must.',
    code: [
      `<span><b class="k">class</b> <b class="pub">Animal</b> { <b class="pub">breathe</b>() {} }</span>`,
      `<span><b class="k">class</b> <b class="pub">Bird</b> <b class="p">extends</b> Animal { <b class="pub">fly</b>() {} }</span>`,
      `<span> </span>`,
      `<span><b class="k">class</b> <b class="pub">Penguin</b> <b class="p">extends</b> Bird {</span>`,
      `<span>  <b class="pub">fly</b>()  { return 'no'; }     <b class="c">// override</b></span>`,
      `<span>  <b class="pub">swim</b>() {}</span>`,
      `<span>}</span>`,
      `<span> </span>`,
      `<span>new Penguin().<b class="p">breathe</b>();  <b class="c">// inherited, for free</b></span>`,
    ].join(''),
  });

  return {
    enter() {
      const root = node('animal');
      return gsap
        .timeline()
        .from(stage.querySelectorAll('.inh__meta, [data-hint], .inh__rings'), { opacity: 0, duration: 1.4, ease: 'power1.inOut', stagger: 0.1 })
        .from(root, { opacity: 0, scale: 0.7, duration: 1.2, ease: 'power1.inOut' }, 0.4)
        .fromTo(root.querySelector('.inh__pulse'), { scale: 0.4, opacity: 0.9 }, { scale: 2.6, opacity: 0, duration: 1.6, ease: 'power1.out', repeat: 2, repeatDelay: 0.6 }, 0.8);
    },
  };
}
