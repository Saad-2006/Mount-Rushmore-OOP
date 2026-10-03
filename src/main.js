import gsap from 'gsap';
import './motion.js';
import { cursor } from './ui/cursor.js';
import { audio } from './audio/engine.js';
import { createPreloader } from './ui/preloader.js';
import { createSoundToggle } from './ui/sound-toggle.js';
import { createMenu } from './ui/menu.js';
import { magnetize } from './ui/magnetic.js';
import { createStage } from './gl/stage.js';
import { createSky } from './gl/sky.js';
import { createMountain } from './gl/mountain.js';
import { createRig } from './gl/rig.js';
import { createWarp } from './gl/warp.js';
import { createHub } from './ui/hub.js';
import { createRouter } from './router.js';
import { createShell } from './worlds/shell.js';
import { worlds } from './worlds/index.js';
import { MONUMENTS } from './config.js';
import './styles/world.css';

const stage = createStage(document.querySelector('#gl'));
const sky = createSky(stage);
const rig = createRig(stage);

const preloader = createPreloader();
const sound = createSoundToggle();
const mountain = createMountain(stage, { onProgress: (p) => preloader.progress(p) });
const warp = createWarp({ stage, rig, mountain });

const router = createRouter((id) => navigate(id));
const hub = createHub({
  stage,
  mountain,
  rig,
  sky,
  onEnter: (m) => router.go(m.id),
});

const menu = createMenu({
  onGo: (id) => router.go(id),
  onOpen: () => current?.shell.lenis.stop(),
  onClose: () => current?.shell.lenis.start(),
});
magnetize(document);

const baseTitle = document.title;
const indexOf = (id) => MONUMENTS.findIndex((m) => m.id === id);

// ── Director ─────────────────────────────────────────────────
// One transition at a time; if the route changes mid-flight, we finish the
// current one and then go wherever the URL says.
let current = null; // { id, shell, world }
let busy = false;

async function navigate() {
  if (busy) return;
  busy = true;
  try {
    let target;
    while ((target = router.current()) !== (current?.id ?? null)) {
      if (!current) await toWorldFromHub(target);
      else if (!target) await toHub();
      else await toWorldFromWorld(target);
    }
  } finally {
    busy = false;
  }
}

async function mountWorld(id) {
  const monument = MONUMENTS[indexOf(id)];
  const { default: mount } = await worlds[id]();
  const shell = createShell({
    monument,
    onBack: () => router.go(null),
    onNext: (next) => router.go(next.id),
    onMenu: () => menu.show(id),
  });
  const world = mount(shell, monument);
  magnetize(shell.root);
  document.documentElement.classList.add('in-world');
  cursor.setMode(id);
  audio.scene(id);
  document.documentElement.dataset.world = id;
  document.title = `${monument.name} — ${baseTitle}`;
  current = { id, shell, world };
  return world;
}

function unmountWorld() {
  current.world.destroy?.();
  current.shell.destroy();
  document.documentElement.classList.remove('in-world');
  cursor.setMode('hub');
  audio.scene('hub');
  delete document.documentElement.dataset.world;
  document.title = baseTitle;
  current = null;
}

async function toWorldFromHub(id) {
  const i = indexOf(id);
  hub.leave(i);
  cursor.hide();
  const load = worlds[id](); // start fetching the world while we fly
  await mountain.ready;
  audio.whoosh(2.6);
  await warp.out(i);
  await load;
  stage.setActive(false);
  const world = await mountWorld(id);
  audio.arrive();
  warp.uncover(1.1);
  world.enter?.();
  cursor.show();
}

async function toWorldFromWorld(id) {
  cursor.hide();
  audio.whoosh(0.9);
  await warp.cover(indexOf(id));
  unmountWorld();
  const world = await mountWorld(id);
  audio.arrive();
  warp.uncover(1.1);
  world.enter?.();
  cursor.show();
}

async function toHub() {
  const i = indexOf(current.id);
  await mountain.ready;
  if (rig.state.approach < 1) settleHub();
  cursor.hide();
  await warp.cover(i);
  unmountWorld();
  stage.setActive(true);
  audio.whoosh(2.2, { reverse: true });
  await warp.back(i);
  hub.restore(i);
  cursor.show();
}

// The mountain as it looks after the approach, without playing it.
function settleHub() {
  rig.snap();
  sky.uniforms.uReveal.value = 1;
  stage.scene.fog.density = 0.0035;
  mountain.reveal().progress(1);
}

// ── Boot ─────────────────────────────────────────────────────
(async () => {
  if (router.current()) {
    // Deep link: straight into the world. The mountain loads behind it.
    preloader.skip();
    hub.skipIntro();
    stage.setActive(false);
    busy = true;
    const world = await mountWorld(router.current());
    busy = false;
    world.enter?.();
    sound.show();
    mountain.ready.then(settleHub);
    return;
  }

  audio.scene('hub');
  await mountain.ready;
  await preloader.finish();
  await hub.playIntro();
  await hub.waitForCommit();
  sound.decide();
  sound.show();
  await hub.approach();
})();
