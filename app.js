import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ==========================================
// 1. THREE.JS 3D AVATAR SYSTEM ENVIRONMENT
// ==========================================
let scene, camera, renderer, avatar;
const container = document.getElementById('canvas-3d-container');

function init3DSpace() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 1.4, 2.5); // Pointed at model torso

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const loader = new GLTFLoader();
    
    // Model requires Meshopt decoder for compressed assets
    if (typeof MeshoptDecoder !== 'undefined') {
        loader.setMeshoptDecoder(MeshoptDecoder);
    } else {
        console.warn("MeshoptDecoder not found. Model loading might fail if compressed.");
    }

    loader.load('./assets/avatar.glb', (gltf) => {
        avatar = gltf.scene;
        scene.add(avatar);
        
        // Debugging Hook: Ready for mapping out joint bone trees
        debugModelStructure(avatar);
        console.log("Avatar loaded successfully. Ready for bone extraction transformation rules.");
        animate();
    }, undefined, (error) => console.error("Error loading model asset:", error));
}

/**
 * Traverses the 3D model hierarchy and logs the names of all Bone objects.
 * Useful for identifying rig joint names for animation mapping.
 */
function debugModelStructure(obj) {
    console.log("--- START AVATAR BONE HIERARCHY ---");
    obj.traverse((node) => {
        if (node.isBone) {
            console.log("Bone Node Found:", node.name);
        }
    });
    console.log("--- END AVATAR BONE HIERARCHY ---");
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Attach 3D loader initialization to boot cycle
window.addEventListener('DOMContentLoaded', init3DSpace);

// ==========================================
// 2. BACKEND COMPATIBLE MATH NORMALIZATION
// ==========================================
function normalizeHandCoordinates(coords) {
    let arr = [];
    for (let i = 0; i < coords.length; i += 3) {
        arr.push([coords[i], coords[i+1], coords[i+2]]);
    }
    let wrist = arr[0];
    arr = arr.map(p => [
        p[0] - wrist[0],
        p[1] - wrist[1],
        p[2] - wrist[2] 
    ]);
    arr = arr.map(p => [p[0], p[1], p[2] * 0.5]);
    let maxVal = Math.max(...arr.flat().map(v => Math.abs(v)));
    if (maxVal !== 0) {
        arr = arr.map(p => [
            p[0] / maxVal,
            p[1] / maxVal,
            p[2] / maxVal 
        ]);
    }
    return arr.flat();
}
