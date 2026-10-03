import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// One renderer, one scene, alive for the whole visit — the warp needs the
// canvas to survive route changes.
export function createStage(canvas) {
  const lowPower =
    matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency || 8) <= 4;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !lowPower,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05060a');
  scene.fog = new THREE.FogExp2('#05060a', 0.008);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 600);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.9);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const tickers = new Set();
  const resizers = new Set();
  const timer = new THREE.Timer();
  timer.connect(document);

  function resize() {
    const w = innerWidth;
    const h = innerHeight;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.resolution.set(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    resizers.forEach((fn) => fn(w, h));
  }
  addEventListener('resize', resize);
  resize();

  // Paused while a world is on screen — no GPU work behind the DOM.
  let active = true;
  renderer.setAnimationLoop((now) => {
    timer.update(now);
    if (!active) return;
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    tickers.forEach((fn) => fn(t, dt));
    composer.render();
  });

  return {
    renderer,
    scene,
    camera,
    bloom,
    lowPower,
    setActive(on) {
      active = on;
      canvas.style.visibility = on ? 'visible' : 'hidden';
    },
    onTick: (fn) => (tickers.add(fn), () => tickers.delete(fn)),
    onResize: (fn) => (resizers.add(fn), fn(innerWidth, innerHeight), () => resizers.delete(fn)),
  };
}
