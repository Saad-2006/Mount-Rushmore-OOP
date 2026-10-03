import * as THREE from 'three';

// Night sky: a slow fbm nebula on a far dome plus a twinkling star field.
// `uReveal` fades the whole sky in during the intro.
export function createSky(stage) {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 }, uReveal: { value: 0 }, uTint: { value: new THREE.Color('#141a30') } };

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(400, 48, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uReveal; uniform vec3 uTint;
        varying vec3 vDir;
        float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
        float noise(vec3 x){
          vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }
        float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
        void main() {
          vec3 d = normalize(vDir);
          float n = fbm(d * 3.2 + vec3(0.0, 0.0, uTime * 0.012));
          float band = smoothstep(0.15, 0.85, 1.0 - abs(d.y - 0.18 - 0.25 * d.x));
          float neb = pow(n, 2.6) * band;
          float horizon = smoothstep(0.35, -0.05, d.y);
          vec3 col = uTint * neb * 1.4 + vec3(0.03, 0.035, 0.06) * horizon;
          gl_FragColor = vec4(col * uReveal, 1.0);
        }`,
    })
  );
  dome.renderOrder = -10;
  group.add(dome);

  const count = stage.lowPower ? 1400 : 3200;
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    // Upper hemisphere, biased towards the horizon behind the mountain.
    const u = Math.random() * Math.PI * 2;
    const v = Math.acos(1 - Math.random() * 0.95);
    const r = 300;
    pos[i * 3] = r * Math.sin(v) * Math.cos(u);
    pos[i * 3 + 1] = r * Math.cos(v) * 0.9 + 10;
    pos[i * 3 + 2] = r * Math.sin(v) * Math.sin(u) - 60;
    seed[i] = Math.random();
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const stars = new THREE.Points(
    starGeo,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
      uniforms: { ...uniforms, uPx: { value: stage.renderer.getPixelRatio() } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uPx;
        varying float vA;
        void main() {
          vA = (0.35 + 0.65 * aSeed) * (0.6 + 0.4 * sin(uTime * (0.6 + aSeed * 2.2) + aSeed * 40.0));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (aSeed > 0.985 ? 3.2 : 1.4 + aSeed) * uPx;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uReveal; varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d) * vA * uReveal;
          gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
        }`,
    })
  );
  stars.renderOrder = -9;
  group.add(stars);

  stage.scene.add(group);
  stage.onTick((t) => (uniforms.uTime.value = t));

  return { group, uniforms };
}
