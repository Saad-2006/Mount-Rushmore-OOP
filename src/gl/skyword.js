import * as THREE from 'three';
import gsap from 'gsap';
import { paintMaterial } from '../ui/materials.js';
import { DUR, EASE } from '../motion.js';

// RUSHMORE, carved into the night behind the mountain. A real plane in the
// scene, so the heads overlap the letters and the camera's parallax moves it.
// Drawn once to a canvas in the monument face, filled with granite speckle.
const W = 4096;
const H = 1024;
const TONE = new THREE.Color('#1f2539');

export async function createSkyWord(stage, sky) {
  await document.fonts.load('800 400px "Big Shoulders Display"').catch(() => {});

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Granite, tiled, as the fill.
  const tile = document.createElement('canvas');
  tile.width = tile.height = 512;
  paintMaterial(tile.getContext('2d'), 'granite', 512);
  const pattern = ctx.createPattern(tile, 'repeat');
  pattern.setTransform(new DOMMatrix().scale(0.3)); // fine grain, not blocks

  ctx.font = '800 100px "Big Shoulders Display", "Arial Narrow", sans-serif';
  const natural = ctx.measureText('RUSHMORE').width;
  const size = (100 * W * 0.98) / natural;
  ctx.font = `800 ${size}px "Big Shoulders Display", "Arial Narrow", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const baseline = H * 0.5 + size * 0.36;
  ctx.fillStyle = pattern;
  ctx.fillText('RUSHMORE', W / 2, baseline);
  // A carved edge: light from above on the top lip of every letter.
  ctx.globalCompositeOperation = 'source-atop';
  const lip = ctx.createLinearGradient(0, baseline - size * 0.72, 0, baseline);
  lip.addColorStop(0, 'rgba(255,255,255,0.35)');
  lip.addColorStop(0.08, 'rgba(255,255,255,0)');
  lip.addColorStop(0.85, 'rgba(0,0,0,0)');
  lip.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = lip;
  ctx.fillRect(0, 0, W, H);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = stage.renderer.capabilities.getMaxAnisotropy();

  const material = new THREE.MeshBasicMaterial({
    map: tex,
    color: TONE.clone(),
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: true,
  });
  const width = 84; // the whole word reads, edge to edge, behind the heads
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, (width * H) / W), material);
  mesh.position.set(0, 17.5, -46);
  mesh.renderOrder = -5;
  stage.scene.add(mesh);

  // Follows the sky's reveal so it emerges with the stars.
  stage.onTick(() => {
    material.opacity = sky.uniforms.uReveal.value * 0.95;
  });

  return {
    mesh,
    // A hovered monument warms the stone faintly with its colour.
    tint(color) {
      const target = color ? TONE.clone().lerp(new THREE.Color(color), 0.12) : TONE;
      gsap.to(material.color, { r: target.r, g: target.g, b: target.b, duration: DUR.l, ease: EASE });
    },
  };
}
