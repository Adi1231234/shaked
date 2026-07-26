// three.js scene, camera and model loading for the head viewer.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = 'https://unpkg.com/three@0.169.0/examples/jsm/libs/draco/';

export function createScene(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  // A phone GPU gains nothing from 3x here and loses frames.
  renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 861 ? 1.75 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasHost.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x080b12);

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
  scene.add(new THREE.HemisphereLight(0xe8eeff, 0x20222c, 1.25));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4);
  key.position.set(0.45, 0.55, 1.0);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fc5e8, 0.75);
  rim.position.set(-0.8, 0.25, -0.55);
  scene.add(rim);

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
