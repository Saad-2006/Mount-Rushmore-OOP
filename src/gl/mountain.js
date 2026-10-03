import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import gsap from 'gsap';
import { MONUMENTS, MODEL_URL } from '../config.js';

const GAP = 0.22; // resting distance between slices, either side of each cut

// Shader patch shared by every slice:
//  - desaturates and cools the baked daylight texture so the rock reads as night
//  - hover lights the face with a coloured key + fresnel rim, computed here so
//    it never spills onto the neighbouring slices the way a real light would
//  - inside faces (the walls the cuts expose) glow like molten rock
//  - uDim pushes the unchosen faces back; the base dissolves into the ground
const shared = { uKeyDir: { value: new THREE.Vector3() } };

function patchMaterial(material, u) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u, shared);
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying float vWorldY;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        '#include <project_vertex>\n  vWorldY = (modelMatrix * vec4(transformed, 1.0)).y;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        'void main() {',
        /* glsl */ `
        uniform vec3 uGlow; uniform float uGlowAmt; uniform float uDim; uniform float uReveal; uniform float uSeamAmt;
        uniform vec3 uKeyDir;
        varying float vWorldY;
        void main() {`
      )
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
        #include <map_fragment>
        float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
        vec3 rock = diffuseColor.rgb;
        diffuseColor.rgb = mix(vec3(lum) * vec3(0.86, 0.9, 1.0), diffuseColor.rgb, 0.2) * 0.78;`
      )
      .replace(
        '#include <dithering_fragment>',
        /* glsl */ `
        float key = max(dot(normal, uKeyDir), 0.0);
        float fres = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.5);
        gl_FragColor.rgb += uGlowAmt * uGlow * (rock * (0.15 + 1.25 * key) + fres * 0.55);
        if (!gl_FrontFacing) gl_FragColor.rgb = uGlow * uSeamAmt * (0.25 + 1.4 * lum * lum);
        gl_FragColor.rgb *= mix(1.0, 0.16, uDim) * uReveal * smoothstep(0.2, 4.5, vWorldY);
        #include <dithering_fragment>`
      );
  };
  material.customProgramCacheKey = () => 'rushmore-slice';
}

export function createMountain(stage, { onProgress } = {}) {
  const root = new THREE.Group();
  stage.scene.add(root);

  // ── Light ────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight('#2a3352', '#080605', 0);
  const moon = new THREE.DirectionalLight('#c9d4ff', 0);
  moon.position.set(-38, 22, 16);
  moon.target.position.set(0, 8, 0);
  root.add(hemi, moon, moon.target);

  const slices = [];
  const proxies = [];
  const leakReveal = { value: 0 };
  let hovered = -1;

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);

  const ready = new Promise((resolve, reject) => {
    loader.load(
      MODEL_URL,
      (gltf) => {
        MONUMENTS.forEach((m, i) => {
          const node = gltf.scene.getObjectByName(m.id);
          const mesh = node.isMesh ? node : node.getObjectByProperty('isMesh', true);
          const u = {
            uGlow: { value: new THREE.Color(m.color) },
            uGlowAmt: { value: 0 },
            uDim: { value: 0 },
            uReveal: { value: 0 },
            uSeamAmt: { value: 0.12 },
          };
          const material = new THREE.MeshStandardMaterial({
            map: mesh.material.map,
            roughness: 1,
            metalness: 0,
            side: THREE.DoubleSide,
          });
          material.map.anisotropy = stage.renderer.capabilities.getMaxAnisotropy();
          patchMaterial(material, u);
          mesh.material = material;

          const group = new THREE.Group();
          group.add(mesh);
          root.add(group);

          // Cheap invisible box for picking (raycasting 225k tris per move is not).
          // Measured from the transformed mesh: meshopt quantises positions and
          // stores the dequantising scale on the node, so the raw geometry box lies.
          mesh.updateWorldMatrix(true, false);
          const bb = new THREE.Box3().setFromObject(mesh);
          const size = bb.getSize(new THREE.Vector3());
          const proxy = new THREE.Mesh(
            new THREE.BoxGeometry(size.x, size.y, size.z),
            new THREE.MeshBasicMaterial({ visible: false })
          );
          bb.getCenter(proxy.position);
          proxy.userData.index = i;
          group.add(proxy);
          proxies.push(proxy);

          group.position.x = (i - 1.5) * GAP * 2;
          slices.push({ monument: m, group, mesh, u });
        });

        // Light leaking through the three cuts.
        const cuts = [-7.674, -1.974, 2.626];
        cuts.forEach((x, i) => {
          const leak = new THREE.Mesh(
            new THREE.PlaneGeometry(1.2, 13),
            new THREE.ShaderMaterial({
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              uniforms: { uReveal: leakReveal, uTime: { value: 0 }, uSeed: { value: i * 3.1 } },
              vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
              fragmentShader: /* glsl */ `
                uniform float uReveal; uniform float uTime; uniform float uSeed; varying vec2 vUv;
                void main(){
                  float core = exp(-pow((vUv.x - 0.5) * 12.0, 2.0));
                  float fall = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
                  float flick = 0.85 + 0.15 * sin(uTime * 1.3 + uSeed + vUv.y * 6.0);
                  vec3 c = vec3(1.0, 0.86, 0.66) * core * fall * flick * 0.6;
                  gl_FragColor = vec4(c * uReveal, 1.0);
                }`,
            })
          );
          leak.position.set(x, 6.8, -3.5);
          leak.userData.leak = true;
          root.add(leak);
          stage.onTick((t) => (leak.material.uniforms.uTime.value = t));
        });

        resolve();
      },
      (e) => e.total && onProgress?.(e.loaded / e.total),
      reject
    );
  });

  // Key light for hovered faces: low, front, slightly right — like a museum
  // uplight. Stored in view space because that is where `normal` lives.
  const keyWorld = new THREE.Vector3(0.35, -0.25, 1).normalize();
  stage.onTick(() => {
    shared.uKeyDir.value.copy(keyWorld).transformDirection(stage.camera.matrixWorldInverse);
  });

  // Polymorphism refuses a fixed colour.
  stage.onTick((t) => {
    const poly = slices[3];
    if (!poly) return;
    const h = 0.76 + 0.1 * Math.sin(t * 0.7) + 0.05 * Math.sin(t * 1.9);
    poly.u.uGlow.value.setHSL(h, 0.85, 0.58);
  });

  function setHover(index) {
    if (index === hovered) return;
    hovered = index;
    slices.forEach((s, i) => {
      const on = i === index;
      const any = index !== -1;
      gsap.to(s.u.uGlowAmt, { value: on ? 1 : 0, duration: 0.9, ease: 'power3.out' });
      gsap.to(s.u.uSeamAmt, { value: on ? 1.3 : 0.12, duration: 0.9, ease: 'power3.out' });
      gsap.to(s.u.uDim, { value: any && !on ? 1 : 0, duration: 1.1, ease: 'power3.out' });
      gsap.to(s.group.position, {
        z: on ? 1.1 : any ? -0.4 : 0,
        x: (i - 1.5) * GAP * 2 + (any ? Math.sign(i - index) * 0.25 : 0),
        duration: 1.3,
        ease: 'power3.out',
      });
    });
  }

  function reveal({ duration = 3.2 } = {}) {
    const tl = gsap.timeline();
    slices.forEach((s, i) =>
      tl.to(s.u.uReveal, { value: 1, duration, ease: 'power2.inOut' }, i * 0.18)
    );
    tl.to(leakReveal, { value: 1, duration, ease: 'power2.inOut' }, 0.3);
    tl.to(moon, { intensity: 2.2, duration: duration * 1.2, ease: 'power2.inOut' }, 0);
    tl.to(hemi, { intensity: 0.34, duration: duration * 1.2, ease: 'power2.inOut' }, 0);
    return tl;
  }

  // A monument's focus point in world space (slices move when hovered).
  function focusOf(i) {
    const s = slices[i];
    return new THREE.Vector3(...s.monument.focus).add(s.group.position).toArray();
  }

  return { root, slices, proxies, leakReveal, ready, setHover, reveal, focusOf, get hovered() { return hovered; } };
}
