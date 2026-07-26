// three.js scene, camera and model loading for the head viewer.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = 'https://unpkg.com/three@0.169.0/examples/jsm/libs/draco/';

// Her face is drawn in a second pass over a cleared depth buffer, so it always
// covers the anatomy instead of fighting it. It has to: Z-Anatomy's head is a
// generic adult's, and once it is scaled to her the teeth, the eyeballs and
// orbicularis oris all sit a few millimetres proud of her much thinner lips
// and lids. Depth testing them against each other showed a mouthful of
// stranger's teeth straight through her mouth. Layer 1 is that second pass.
export const SKIN_LAYER = 1;
const BASE_LAYER = 0;
const BACKGROUND = 0x080b12;

export function createScene(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  // A phone GPU gains nothing from 3x here and loses frames.
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 861 ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  // Both clears are ours to make, one per pass. Leaving them automatic lets
  // the second pass wipe the first one's depth and colour.
  renderer.autoClear = false;
  renderer.setClearColor(BACKGROUND, 1);
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.01, 20);
  camera.position.set(0.06, 0.02, 0.6);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.08;
  controls.maxDistance = 1.2;
  controls.enablePan = false;          // panning on a phone is an accident
  controls.rotateSpeed = 0.85;
  controls.zoomSpeed = 0.9;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE };

  // Three lights: a soft fill so nothing reads as a black silhouette, a warm
  // key from the front right, and a cool rim so the skull separates from the
  // near-black background.
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(0.45, 0.55, 1.0);
  const rim = new THREE.DirectionalLight(0x8fc5e8, 0.75);
  rim.position.set(-0.8, 0.25, -0.55);
  for (const light of [new THREE.HemisphereLight(0xe8eeff, 0x20222c, 1.25), key, rim]) {
    // A light is only gathered for a pass whose layer it shares, and the skin
    // pass is on its own layer, so it would otherwise render pitch black.
    light.layers.enableAll();
    scene.add(light);
  }

  const onResize = () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    scene.userData.onResize?.();
  };
  addEventListener('resize', onResize);
  addEventListener('orientationchange', () => setTimeout(onResize, 120));

  (function tick() {
    requestAnimationFrame(tick);
    controls.update();
    renderer.clear();
    camera.layers.set(BASE_LAYER);
    renderer.render(scene, camera);
    // Wiping only the depth keeps the anatomy on screen but stops it from
    // occluding her face. The skin still self-occludes correctly, because the
    // second pass depth-tests against nothing but itself.
    renderer.clearDepth();
    camera.layers.set(SKIN_LAYER);
    renderer.render(scene, camera);
  })();

  return { renderer, scene, camera, controls };
}

export function loadHead(url, onProgress) {
  const draco = new DRACOLoader().setDecoderPath(DRACO_PATH);
  const loader = new GLTFLoader().setDRACOLoader(draco);
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => {
      const meshes = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        // Each mesh gets its own material instance so one structure can be
        // highlighted without lighting up everything sharing its layer colour.
        o.material = o.material.clone();
        o.userData.baseColor = o.material.color.clone();
        if (o.userData.layer === 'skin') {
          o.layers.set(SKIN_LAYER);
          // Blender exports it double-sided, and the pass below cannot depth
          // test against the anatomy, so from behind the head the inside of
          // her face would paint straight over the occiput. Cull it instead.
          o.material.side = THREE.FrontSide;
        }
        meshes.push(o);
      });
      resolve({ root: gltf.scene, meshes });
    }, onProgress, reject);
  });
}

/**
 * Frame an object (or the whole model) in view.
 *
 * The distance has to respect both fields of view. A phone in portrait has a
 * far narrower horizontal fov than a desktop window, so a single factor tuned
 * on a wide screen crops the head badly on a tall one.
 */
export function focusOn(object, camera, controls, padding = 1.25) {
  const box = Array.isArray(object)
    ? object.reduce((acc, o) => acc.union(new THREE.Box3().setFromObject(o)),
                    new THREE.Box3())
    : new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
  const fitHeight = (size.y / 2) / Math.tan(vFov / 2);
  const fitWidth = (Math.max(size.x, size.z) / 2) / Math.tan(hFov / 2);
  const distance = Math.max(fitHeight, fitWidth, 0.05) * padding;

  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(centre);
  camera.position.copy(centre).addScaledVector(direction, distance);
  controls.maxDistance = Math.max(controls.maxDistance, distance * 2.5);
  controls.update();
}
