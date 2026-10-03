import * as THREE from 'three';
import gsap from 'gsap';
import { reducedMotion } from '../motion.js';

// Camera rig. The camera never moves directly — tweens drive `state`, and the
// tick blends it with framing (which depends on aspect) and pointer parallax.
const FIT_W = 38; // world units that must fit horizontally on wide screens
const FIT_H = 27;
const BASE_TARGET = new THREE.Vector3(0, 5.6, 0);

export function createRig(stage) {
  const { camera } = stage;
  const pointer = new THREE.Vector2();
  const smooth = new THREE.Vector2();

  // approach: 0 = far out in the dark, 1 = framed on the mountain
  // focus: 0 = whole mountain, 1 = pushed in on `focusPoint`
  // dive: 0 = in front of the face, 1 = through it (the warp)
  const state = { approach: 0, focus: 0, dive: 0, panX: 0, fov: 32 };
  const focusPoint = new THREE.Vector3();
  let portrait = false;

  const framed = new THREE.Vector3();
  const target = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function frameDistance() {
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const tanH = Math.tan(vfov / 2);
    const fitW = portrait ? 13 : FIT_W;
    return Math.max(fitW / 2 / (tanH * camera.aspect), FIT_H / 2 / tanH);
  }

  stage.onResize((w, h) => {
    portrait = w / h < 0.9;
  });

  addEventListener('pointermove', (e) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  });

  stage.onTick((t, dt) => {
    smooth.lerp(pointer, 1 - Math.exp(-dt * 2.5));
    if (camera.fov !== state.fov) {
      camera.fov = state.fov;
      camera.updateProjectionMatrix();
    }
    const d = frameDistance();

    target.copy(BASE_TARGET);
    target.x += state.panX;
    framed.set(target.x, target.y + 3.2, d);

    // Far away, slightly high, in the fog.
    tmp.set(target.x, target.y + 16, d + 120);
    camera.position.lerpVectors(tmp, framed, state.approach);

    // Push in on a face.
    if (state.focus > 0) {
      const standoff = THREE.MathUtils.lerp(portrait ? 17 : 9, -6, state.dive);
      tmp.copy(focusPoint).add(new THREE.Vector3(0, 0.6 * (1 - state.dive), standoff));
      camera.position.lerp(tmp, state.focus);
      target.lerp(focusPoint, state.focus);
      target.z -= state.dive * 20;
    }

    const sway = reducedMotion ? 0 : 1 - state.focus * 0.8;
    camera.position.x += (smooth.x * 1.6 + Math.sin(t * 0.13) * 0.25) * sway;
    camera.position.y += (smooth.y * 0.8 + Math.sin(t * 0.17) * 0.15) * sway;
    camera.lookAt(target);
  });

  return {
    state,
    get portrait() { return portrait; },
    focusPoint,
    // Jump straight to the framed mountain (deep links skip the approach).
    snap() {
      state.approach = 1;
    },
    approach(duration = 4.2) {
      return gsap.to(state, { approach: 1, duration, ease: 'power3.inOut' });
    },
    pan(x, duration = 1.4) {
      return gsap.to(state, { panX: portrait ? x : 0, duration, ease: 'power3.inOut' });
    },
    focusOn(point, duration = 1.6) {
      if (point) focusPoint.set(...point);
      return gsap.to(state, { focus: 1, duration, ease: 'power3.inOut' });
    },
    release(duration = 1.4) {
      return gsap.to(state, { focus: 0, duration, ease: 'power3.inOut' });
    },
  };
}
