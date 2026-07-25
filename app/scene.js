// three.js scene, camera and model loading for the head viewer.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const DRACO_PATH = 'https://unpkg.com/three@0.169.0/examples/jsm/libs/draco/';

export function createScene(canvasHost) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

  // Three lights: a soft fill so nothing reads as a black silhouette, a warm
  // key from the front right, and a cool rim so the skull separates from the
  // near-black background.
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1f2e, 1.5));
  const key = new THREE.DirectionalLight(0xfff2e0, 2.1);
  key.position.set(0.5, 0.65, 0.9);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7fc9e8, 1.1);
  rim.position.set(-0.7, 0.15, -0.7);
  scene.add(rim);

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

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

/** Frame an object (or the whole model) in view. */
export function focusOn(object, camera, controls, padding = 2.6) {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const centre = box.getCenter(new THREE.Vector3());
  const radius = Math.max(box.getSize(new THREE.Vector3()).length() / 2, 0.01);
  const distance = radius * padding;

  const direction = camera.position.clone().sub(controls.target).normalize();
  controls.target.copy(centre);
  camera.position.copy(centre).addScaledVector(direction, distance);
  controls.update();
}
