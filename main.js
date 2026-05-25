 import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader'; import { OrbitControls } from 'OrbitControls';
const scene = new THREE.Scene(); scene.background = new THREE.Color(0x222222);
const camera = new THREE.PerspectiveCamera( 45,
window.innerWidth / window.innerHeight, 0.1,
1000
);
camera.position.set(0, 1.5, 3);
const renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#bg'), antialias: true
});
renderer.setSize(window.innerWidth, window.innerHeight);
const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(2, 5, 5);
scene.add(light);
const ambient = new THREE.AmbientLight(0xffffff, 1); scene.add(ambient);
const controls = new OrbitControls(camera, renderer.domElement); let avatar;
const loader = new GLTFLoader();
loader.load(
'./assets/avatar.glb', function (gltf) {
avatar = gltf.scene; avatar.position.set(0, 0, 0);

 scene.add(avatar); console.log("Avatar Loaded!");
// TASK 1.3
// LOG ALL BONES / JOINTS
avatar.traverse((child) => {
if (child.isBone) { console.log("Bone:", child.name);
} });
},
undefined,
function (error) { console.error(error);
} );
// TASK 1.4
// SIGN LANGUAGE DICTIONARY
function makeLetterA() {
if (!avatar) return; avatar.traverse((child) => {
// RIGHT HAND
if (child.name.includes("RightHand")) { child.rotation.x = 0.5;
}

 // LEFT HAND
if (child.name.includes("LeftHand")) { child.rotation.x = 0.5;
}
// RIGHT INDEX FINGER
if (child.name.includes("RightIndex")) { child.rotation.z = 1.5;
}
// LEFT INDEX FINGER
if (child.name.includes("LeftIndex")) { child.rotation.z = -1.5;
} });
console.log("Letter A Pose Activated"); }
// TEST LETTER A AFTER 3 SECONDS
setTimeout(() => { makeLetterA();
}, 3000);
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera);
} animate();

 window.addEventListener('resize', () => {
camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});
