import * as THREE from 'three';
import gsap from 'gsap';
import { reducedMotion } from '../motion.js';

// The warp: a face breaks into debris, the camera dives through it, the stars
// stretch into light-speed streaks, and a flash in the monument's colour hands
// over to the DOM world. `out()` leaves the mountain; `in()` comes back.
export function createWarp({ stage, rig, mountain }) {
  const { camera, scene } = stage;
  scene.add(camera); // streaks ride on the camera

  const flash = document.createElement('div');
  flash.className = 'warp-flash';
  flash.setAttribute('aria-hidden', 'true');
  document.body.append(flash);

  // ── Streaks ──────────────────────────────────────────────
  const STREAKS = stage.lowPower ? 700 : 1600;
  const LENGTH = 180;
  const streakU = {
    uTravel: { value: 0 },
    uSpeed: { value: 0 },
    uIntensity: { value: 0 },
    uColor: { value: new THREE.Color() },
  };
  {
    const start = new Float32Array(STREAKS * 2 * 3);
    const end = new Float32Array(STREAKS * 2);
    for (let i = 0; i < STREAKS; i++) {
      // Hollow cylinder around the view axis, so nothing streaks through the centre.
      const a = Math.random() * Math.PI * 2;
      const r = 2.2 + Math.pow(Math.random(), 0.6) * 16;
      const z = Math.random() * LENGTH;
      for (let k = 0; k < 2; k++) {
        start.set([Math.cos(a) * r, Math.sin(a) * r, z], (i * 2 + k) * 3);
        end[i * 2 + k] = k;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(start, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    const streaks = new THREE.LineSegments(
      geo,
      new THREE.ShaderMaterial({
        uniforms: streakU,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          attribute float aEnd;
          uniform float uTravel; uniform float uSpeed;
          varying float vA;
          void main() {
            float z = -${LENGTH.toFixed(1)} + mod(position.z + uTravel, ${LENGTH.toFixed(1)});
            z -= aEnd * (0.2 + uSpeed * uSpeed * 34.0);
            vec3 p = vec3(position.xy, z);
            float fade = smoothstep(-${LENGTH.toFixed(1)}, -${(LENGTH * 0.6).toFixed(1)}, z) * smoothstep(0.0, -6.0, z);
            vA = fade * mix(1.0, 0.0, aEnd);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor; uniform float uIntensity;
          varying float vA;
          void main() {
            vec3 c = mix(uColor, vec3(1.0), vA * 0.6);
            gl_FragColor = vec4(c * vA * uIntensity * 1.8, 1.0);
          }`,
      })
    );
    streaks.frustumCulled = false;
    streaks.renderOrder = 10;
    camera.add(streaks);
  }

  let lastSpeed = 0;
  stage.onTick((t, dt) => {
    // Integrate travel so speed changes never make the streaks jump.
    lastSpeed = streakU.uSpeed.value;
    streakU.uTravel.value += dt * (4 + lastSpeed * 260);
    debrisU.uTime.value = t;
  });

  // ── Debris ───────────────────────────────────────────────
  const debrisU = {
    uProgress: { value: 0 },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color() },
    uFocus: { value: new THREE.Vector3() },
    uPx: { value: stage.renderer.getPixelRatio() },
  };
  const debrisMaterial = new THREE.ShaderMaterial({
    uniforms: debrisU,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aRand; attribute float aSeed;
      uniform float uProgress; uniform float uTime; uniform vec3 uFocus; uniform float uPx;
      varying float vA; varying float vSeed;
      void main() {
        // Staggered: the face lets go from the centre outwards.
        float dist = length(position.xy - uFocus.xy);
        float t = clamp(uProgress * 1.6 - aSeed * 0.3 - dist * 0.03, 0.0, 1.0);
        vec3 away = normalize(position - uFocus + aRand * 3.0);
        vec3 p = position
          + away * t * t * (4.0 + aSeed * 16.0)
          + vec3(0.0, 0.0, 1.0) * t * t * (8.0 + aSeed * 30.0)
          + aRand * sin(uTime * 2.0 + aSeed * 30.0) * t * 0.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.2 + aSeed * 2.4) * uPx * (22.0 / -mv.z);
        vA = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(0.75, 1.0, t));
        vSeed = aSeed;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; varying float vA; varying float vSeed;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.1, d) * vA;
        vec3 c = mix(vec3(0.92, 0.88, 0.82), uColor, 0.35 + vSeed * 0.65);
        gl_FragColor = vec4(c * a, a);
      }`,
  });

  const debrisCache = new Map();
  function debrisFor(slice) {
    if (debrisCache.has(slice)) return debrisCache.get(slice);
    const { mesh, group } = slice;
    const src = mesh.geometry.attributes.position;
    const count = Math.min(stage.lowPower ? 12000 : 32000, src.count);
    const pos = new Float32Array(count * 3);
    const rand = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    const v = new THREE.Vector3();
    mesh.updateMatrix();
    for (let i = 0; i < count; i++) {
      // getX/Y/Z de-quantise; mesh.matrix carries the meshopt scale.
      const j = (Math.random() * src.count) | 0;
      v.fromBufferAttribute(src, j).applyMatrix4(mesh.matrix);
      pos.set([v.x, v.y, v.z], i * 3);
      rand.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1], i * 3);
      seed[i] = Math.random();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const points = new THREE.Points(geo, debrisMaterial);
    points.frustumCulled = false;
    points.visible = false;
    group.add(points);
    debrisCache.set(slice, points);
    return points;
  }

  function prepare(i) {
    const slice = mountain.slices[i];
    const debris = debrisFor(slice);
    debris.visible = true;
    debrisU.uColor.value.copy(slice.u.uGlow.value);
    debrisU.uFocus.value.set(...slice.monument.focus);
    streakU.uColor.value.copy(slice.u.uGlow.value);
    flash.style.setProperty('--c', `#${slice.u.uGlow.value.getHexString()}`);
    rig.focusPoint.set(...mountain.focusOf(i));
    return slice;
  }

  const others = (i) => mountain.slices.filter((_, j) => j !== i).map((s) => s.u.uReveal);

  // Leave the mountain. Resolves when the flash fully covers the screen.
  function out(i) {
    const slice = prepare(i);
    // Reduced motion: no dive, no streaks — the face lights, the screen fades.
    if (reducedMotion) {
      return gsap
        .timeline()
        .to(others(i), { value: 0.3, duration: 0.6 }, 0)
        .to(flash, { opacity: 1, duration: 0.6, ease: 'power1.inOut' }, 0.3)
        .call(() => others(i).forEach((u) => (u.value = 1)))
        .then();
    }
    return gsap
      .timeline()
      .to(rig.state, { focus: 1, duration: 1.3, ease: 'power2.inOut' }, 0)
      .to(others(i), { value: 0, duration: 1.0, ease: 'power2.inOut' }, 0.3)
      .to(mountain.leakReveal, { value: 0, duration: 0.8 }, 0.3)
      .to(debrisU.uProgress, { value: 1, duration: 2.0, ease: 'power1.in' }, 0.55)
      .to(slice.u.uReveal, { value: 0, duration: 0.6, ease: 'power2.in' }, 0.7)
      .to(rig.state, { dive: 1, duration: 1.6, ease: 'power2.in' }, 1.0)
      .to(rig.state, { fov: 84, duration: 1.6, ease: 'power2.in' }, 1.0)
      .to(streakU.uIntensity, { value: 1, duration: 0.8, ease: 'power1.out' }, 1.0)
      .to(streakU.uSpeed, { value: 1, duration: 1.6, ease: 'power2.in' }, 1.0)
      .to(flash, { opacity: 1, duration: 0.4, ease: 'power2.in' }, 2.3)
      .then();
  }

  // Cover the screen before leaving a world.
  function cover(i) {
    prepare(i);
    return gsap.to(flash, { opacity: 1, duration: 0.45, ease: 'power2.in' }).then();
  }

  function uncover(duration = 0.9) {
    return gsap.to(flash, { opacity: 0, duration, ease: 'power2.out' }).then();
  }

  // Return to the mountain from behind the flash: decelerate out of the face.
  function back(i) {
    const slice = prepare(i);
    if (reducedMotion) {
      Object.assign(rig.state, { focus: 0, dive: 0, fov: 32 });
      mountain.slices.forEach((s) => (s.u.uReveal.value = 1));
      mountain.leakReveal.value = 1;
      return gsap.to(flash, { opacity: 0, duration: 0.6, ease: 'power1.inOut' }).then();
    }
    Object.assign(rig.state, { focus: 1, dive: 1, fov: 84 });
    streakU.uSpeed.value = 1;
    streakU.uIntensity.value = 1;
    debrisU.uProgress.value = 1;
    mountain.slices.forEach((s) => (s.u.uReveal.value = 0));
    mountain.leakReveal.value = 0;
    return gsap
      .timeline()
      .to(flash, { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0)
      .to(streakU.uSpeed, { value: 0, duration: 1.8, ease: 'power2.out' }, 0)
      .to(streakU.uIntensity, { value: 0, duration: 1.2, ease: 'power1.in' }, 0.6)
      .to(rig.state, { dive: 0, duration: 1.8, ease: 'power3.out' }, 0)
      .to(rig.state, { fov: 32, duration: 2.0, ease: 'power3.out' }, 0)
      .to(debrisU.uProgress, { value: 0, duration: 1.8, ease: 'power2.out' }, 0.2)
      .to(slice.u.uReveal, { value: 1, duration: 0.7, ease: 'power2.out' }, 1.35)
      .to(others(i), { value: 1, duration: 1.2, ease: 'power2.inOut' }, 1.1)
      .to(mountain.leakReveal, { value: 1, duration: 1.2 }, 1.3)
      .to(rig.state, { focus: 0, duration: 1.5, ease: 'power3.inOut' }, 1.8)
      .call(() => (debrisFor(slice).visible = false))
      .then();
  }

  return { out, cover, uncover, back };
}
