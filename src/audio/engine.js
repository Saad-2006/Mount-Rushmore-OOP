// Sound, synthesised in the browser. No files: oscillators, filtered noise and
// a generated reverb. Muted by default; the context only exists after a user
// gesture, and it is suspended (zero CPU) whenever sound is off.
//
//   scene(name)   crossfade the ambient layer: hub, or one of the worlds
//   approach(d)   the drone builds while the camera flies in
//   drop()        the chord when the moonlight hits the mountain
//   whoosh(d)     the warp; arrive() the landing
//   blip(i)       hovering a face
//   set(k, v)     world parameters: gear speed, polymorphism's resolution

const PREF = 'rushmore:sound';

function readPref() {
  try {
    return localStorage.getItem(PREF) === 'on';
  } catch {
    return false;
  }
}

export function createAudio() {
  let ctx = null;
  let master, wet, dry, noiseBuf;
  let enabled = false;
  let current = null; // { name, stop(t), set(k, v) }
  let pendingScene = 'hub';
  let collecting = null; // LFOs created while a layer is being built
  const listeners = new Set();

  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(comp).connect(ctx.destination);

    dry = ctx.createGain();
    dry.connect(master);

    // Reverb: a generated impulse — three seconds of decaying stereo noise.
    const len = ctx.sampleRate * 3.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const verb = ctx.createConvolver();
    verb.buffer = ir;
    wet = ctx.createGain();
    wet.gain.value = 0.55;
    wet.connect(verb).connect(master);

    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const n = noiseBuf.getChannelData(0);
    for (let i = 0; i < n.length; i++) n[i] = Math.random() * 2 - 1;
  }

  // ── Building blocks ─────────────────────────────────────────────────────
  const now = () => ctx.currentTime;
  const out = (node, send = 0.3) => {
    node.connect(dry);
    if (send) {
      const s = ctx.createGain();
      s.gain.value = send;
      node.connect(s).connect(wet);
    }
    return node;
  };
  const osc = (type, freq, detune = 0) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.detune.value = detune;
    return o;
  };
  const gain = (v = 0) => {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  };
  const filter = (type, freq, q = 0.7) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  };
  const noise = () => {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    s.loop = true;
    return s;
  };
  const lfo = (rate, depth, param) => {
    const o = osc('sine', rate);
    const g = gain(depth);
    o.connect(g).connect(param);
    o.start();
    collecting?.push(o);
    return o;
  };
  const fadeIn = (g, v, t = 2) => {
    g.gain.cancelScheduledValues(now());
    g.gain.setValueAtTime(g.gain.value, now());
    g.gain.linearRampToValueAtTime(v, now() + t);
  };

  // A layer owns its nodes and knows how to fade them out and stop them.
  function layer(name, setup) {
    const bus = gain(0);
    out(bus, 0.35);
    const sources = [];
    const timers = [];
    const lfos = (collecting = []);
    const api = setup({ bus, sources, timers });
    collecting = null;
    return {
      name,
      set: api?.set || (() => {}),
      start: (level, t) => {
        sources.forEach((s) => s.start());
        fadeIn(bus, level, t);
      },
      stop(t = 1.5) {
        fadeIn(bus, 0, t);
        timers.forEach(clearInterval);
        setTimeout(() => {
          [...sources, ...lfos].forEach((s) => {
            try {
              s.stop();
            } catch {
              /* already stopped */
            }
          });
          bus.disconnect();
        }, t * 1000 + 100);
      },
      bus,
    };
  }

  // ── Ambient scenes ──────────────────────────────────────────────────────
  const SCENES = {
    // Night at the mountain: a low open fifth under wind. Opens up on approach.
    hub: () =>
      layer('hub', ({ bus, sources }) => {
        const lp = filter('lowpass', 220, 1.2);
        lp.connect(bus);
        [55, 82.41].forEach((f, i) => {
          [-7, 7].forEach((d) => {
            const o = osc('sawtooth', f, d + i * 3);
            const g = gain(0.07);
            o.connect(g).connect(lp);
            sources.push(o);
          });
        });
        const sub = osc('sine', 27.5);
        const sg = gain(0.18);
        sub.connect(sg).connect(bus);
        sources.push(sub);
        lfo(0.06, 70, lp.frequency);
        const wind = noise();
        const bp = filter('bandpass', 500, 0.6);
        const wg = gain(0.05);
        wind.connect(bp).connect(wg).connect(bus);
        lfo(0.09, 260, bp.frequency);
        sources.push(wind);
        return {
          set(k, v) {
            if (k === 'open') {
              lp.frequency.cancelScheduledValues(now());
              lp.frequency.setValueAtTime(lp.frequency.value, now());
              lp.frequency.exponentialRampToValueAtTime(v.to, now() + v.time);
            }
          },
        };
      }),

    // Mechanical hum and distant gears. Speed follows the vault's machinery.
    encapsulation: () =>
      layer('encapsulation', ({ bus, sources, timers }) => {
        const lp = filter('lowpass', 420);
        lp.connect(bus);
        [[60, 0.09], [120, 0.04], [180, 0.015]].forEach(([f, v]) => {
          const o = osc(f === 180 ? 'square' : 'sine', f);
          const g = gain(v);
          o.connect(g).connect(lp);
          sources.push(o);
        });
        const trem = gain(1);
        bus.disconnect();
        bus.connect(trem);
        out(trem, 0.25);
        lfo(5.5, 0.12, trem.gain);
        let speed = 0.4;
        let last = 0;
        const tick = () => {
          if (performance.now() - last < 260 / Math.max(0.3, speed)) return;
          last = performance.now();
          const t = now();
          const s = ctx.createBufferSource();
          s.buffer = noiseBuf;
          const hp = filter('highpass', 2600 + Math.random() * 1800, 2);
          const g = gain(0);
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(0.09, t + 0.004);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          s.connect(hp).connect(g).connect(bus);
          s.start(t, Math.random());
          s.stop(t + 0.06);
        };
        timers.push(setInterval(tick, 30));
        return { set: (k, v) => k === 'speed' && (speed = v) };
      }),

    // Almost uncomfortably quiet: one pure tone, barely there.
    abstraction: () =>
      layer('abstraction', ({ bus, sources }) => {
        [[880, 0.012], [1318.5, 0.006]].forEach(([f, v]) => {
          const o = osc('sine', f);
          const g = gain(v);
          o.connect(g).connect(bus);
          lfo(0.11, v * 0.8, g.gain);
          sources.push(o);
        });
      }),

    // A low drone, like deep roots, swelling slowly.
    inheritance: () =>
      layer('inheritance', ({ bus, sources }) => {
        [[41.2, 0.16], [61.74, 0.08], [82.41, 0.05], [123.47, 0.02]].forEach(([f, v], i) => {
          const o = osc(i ? 'triangle' : 'sine', f, i * 4);
          const g = gain(v);
          o.connect(g).connect(bus);
          lfo(0.04 + i * 0.013, v * 0.5, g.gain);
          sources.push(o);
        });
        const wind = noise();
        const lp = filter('lowpass', 320);
        const wg = gain(0.025);
        wind.connect(lp).connect(wg).connect(bus);
        sources.push(wind);
      }),

    // Static that cannot decide what it is — resolving into a tone.
    polymorphism: () =>
      layer('polymorphism', ({ bus, sources, timers }) => {
        const stat = noise();
        const bp = filter('bandpass', 1800, 3);
        const sg = gain(0.07);
        stat.connect(bp).connect(sg).connect(bus);
        sources.push(stat);
        timers.push(
          setInterval(() => {
            bp.frequency.setTargetAtTime(300 + Math.random() * 5200, now(), 0.02);
          }, 90)
        );
        const tone = gain(0);
        tone.connect(bus);
        [220, 277.18, 329.63, 440, 554.37].forEach((f, i) => {
          const o = osc(i % 2 ? 'triangle' : 'sine', f, (Math.random() - 0.5) * 6);
          const g = gain(0.035);
          o.connect(g).connect(tone);
          sources.push(o);
        });
        return {
          set(k, v) {
            if (k !== 'resolve') return;
            sg.gain.setTargetAtTime(0.07 * (1 - v), now(), 0.1);
            tone.gain.setTargetAtTime(v, now(), 0.15);
          },
        };
      }),
  };

  const LEVEL = { hub: 0.5, encapsulation: 0.5, abstraction: 0.7, inheritance: 0.55, polymorphism: 0.5 };

  function startScene(name) {
    current?.stop(1.6);
    current = null;
    if (!name || !SCENES[name]) return;
    current = SCENES[name]();
    current.start(LEVEL[name], 2.2);
  }

  // ── One-shots ────────────────────────────────────────────────────────────
  function drop() {
    if (!live()) return;
    const t = now();
    // The chord: A minor 9, bright on top, long tail.
    [110, 164.81, 261.63, 392, 493.88, 659.25].forEach((f, i) => {
      ['triangle', 'sine'].forEach((type, k) => {
        const o = osc(type, f, k ? 5 : -5);
        const g = gain(0);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.08 / (1 + i * 0.25), t + 0.03 + i * 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 6.5);
        out(o.connect(g), 0.8);
        o.start(t);
        o.stop(t + 6.6);
      });
    });
    // The boom underneath.
    const sub = osc('sine', 92);
    sub.frequency.setValueAtTime(92, t);
    sub.frequency.exponentialRampToValueAtTime(34, t + 0.9);
    const sg = gain(0);
    sg.gain.setValueAtTime(0.0001, t);
    sg.gain.exponentialRampToValueAtTime(0.7, t + 0.01);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 2.8);
    out(sub.connect(sg), 0.1);
    sub.start(t);
    sub.stop(t + 3);
    // And air.
    const s = noise();
    const bp = filter('bandpass', 1400, 0.8);
    const ng = gain(0);
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    out(s.connect(bp).connect(ng), 0.9);
    s.start(t);
    s.stop(t + 1.3);
  }

  function whoosh(duration = 2.4, { reverse = false } = {}) {
    if (!live()) return;
    const t = now();
    const [f0, f1] = reverse ? [5200, 180] : [180, 5200];
    const s = noise();
    const bp = filter('bandpass', f0, 1.4);
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + duration);
    const g = gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + duration * (reverse ? 0.15 : 0.85));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration * 1.05);
    out(s.connect(bp).connect(g), 0.5);
    s.start(t);
    s.stop(t + duration * 1.1);
    const o = osc('sawtooth', reverse ? 520 : 55);
    o.frequency.exponentialRampToValueAtTime(reverse ? 50 : 620, t + duration);
    const lp = filter('lowpass', 900);
    const og = gain(0);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.exponentialRampToValueAtTime(0.06, t + duration * 0.7);
    og.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    out(o.connect(lp).connect(og), 0.4);
    o.start(t);
    o.stop(t + duration * 1.05);
  }

  function arrive() {
    if (!live()) return;
    const t = now();
    const o = osc('sine', 130);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.5);
    const g = gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    out(o.connect(g), 0.7);
    o.start(t);
    o.stop(t + 1.5);
  }

  // Hovering a face: a soft bell, pitched per monument.
  const BLIP = [392, 440, 493.88, 587.33];
  function blip(i) {
    if (!live()) return;
    const t = now();
    const o = osc('sine', BLIP[i] || 440);
    const o2 = osc('sine', (BLIP[i] || 440) * 2.01);
    const g = gain(0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    const g2 = gain(0.25);
    o.connect(g);
    o2.connect(g2).connect(g);
    out(g, 0.6);
    o.start(t);
    o2.start(t);
    o.stop(t + 1);
    o2.stop(t + 1);
  }

  const live = () => ctx && enabled && ctx.state === 'running';

  async function setEnabled(on) {
    enabled = on;
    try {
      localStorage.setItem(PREF, on ? 'on' : 'off');
    } catch {
      /* storage unavailable */
    }
    if (on) {
      if (!ctx) build();
      await ctx.resume();
      if (!current) startScene(pendingScene);
      fadeIn(master, 0.9, 1.2);
    } else if (ctx) {
      fadeIn(master, 0, 0.6);
      setTimeout(() => !enabled && ctx.suspend(), 700);
    }
    listeners.forEach((fn) => fn(enabled));
  }

  return {
    get enabled() {
      return enabled;
    },
    // Remembered from last visit — but a browser only lets audio start inside
    // a user gesture, so this is applied on the first click/tap/key.
    preferred: readPref(),
    setEnabled,
    toggle: () => setEnabled(!enabled),
    onChange: (fn) => (listeners.add(fn), () => listeners.delete(fn)),
    scene(name) {
      pendingScene = name;
      if (live()) startScene(name);
    },
    set: (k, v) => live() && current?.set(k, v),
    approach(time = 4) {
      if (live() && current?.name === 'hub') current.set('open', { to: 900, time });
    },
    drop,
    whoosh,
    arrive,
    blip,
  };
}

export const audio = createAudio();
