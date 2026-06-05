import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ==========================================
// 1. THREE.JS 3D AVATAR SYSTEM ENVIRONMENT
// ==========================================
let scene, camera, renderer, avatar;
const container = document.getElementById('canvas-3d-container');

// Bone target rotations for smooth interpolation
const boneTargets = {};
const LERP_FACTOR = 0.1;
let isAnimatingString = false;

const REST_POSE = {
    'RightForeArm': { x: 0, y: 0, z: 0 },
    'RightHandIndex1': { x: 0, y: 0, z: 0 },
    'RightHandMiddle1': { x: 0, y: 0, z: 0 },
    'RightHandRing1': { x: 0, y: 0, z: 0 },
    'RightHandPinky1': { x: 0, y: 0, z: 0 },
    'RightHandThumb2': { x: 0, y: 0, z: 0 }
};

const signLanguageMap = {
    'A': {
        'RightForeArm': { x: -1.2, y: 0.2, z: 0 },
        'RightHandIndex1': { x: 1.5, y: 0, z: 0 },
        'RightHandMiddle1': { x: 1.5, y: 0, z: 0 },
        'RightHandRing1': { x: 1.5, y: 0, z: 0 },
        'RightHandPinky1': { x: 1.5, y: 0, z: 0 },
        'RightHandThumb2': { x: 0, y: 0, z: 0.5 }
    },
    'B': {
        'RightForeArm': { x: -1.2, y: 0.2, z: 0 },
        'RightHandIndex1': { x: 0, y: 0, z: 0 },
        'RightHandMiddle1': { x: 0, y: 0, z: 0 },
        'RightHandRing1': { x: 0, y: 0, z: 0 },
        'RightHandPinky1': { x: 0, y: 0, z: 0 },
        'RightHandThumb2': { x: 0, y: 0, z: 1.2 }
    },
    'C': {
        'RightForeArm': { x: -1.2, y: 0.2, z: 0 },
        'RightHandIndex1': { x: 0.8, y: 0, z: 0 },
        'RightHandMiddle1': { x: 0.8, y: 0, z: 0 },
        'RightHandRing1': { x: 0.8, y: 0, z: 0 },
        'RightHandPinky1': { x: 0.8, y: 0, z: 0 },
        'RightHandThumb2': { x: 0.5, y: 0, z: 0.8 }
    }
    // Additional letters (D-Z) can be mapped here using the same structure
};

/**
 * Applies a specific pose to the bone target matrix.
 * @param {Object} pose - Dictionary of bone names and rotation values.
 */
function applyPose(pose) {
    for (const [boneName, rotation] of Object.entries(pose)) {
        boneTargets[boneName] = rotation;
    }
}

/**
 * Maps a single character to avatar joint rotations.
 * @param {string} letter - The character to animate.
 */
function animateCharacterToLetter(letter) {
    const char = letter.toUpperCase();
    if (char === ' ') {
        applyPose(REST_POSE);
        return;
    }

    if (!signLanguageMap[char]) {
        console.warn(`No mapping found for letter: ${char}`);
        return;
    }

    applyPose(signLanguageMap[char]);
}

/**
 * Parses a string and sequentially animates the avatar.
 * @param {string} text - The input string to translate to sign.
 */
async function playSignSequence(text) {
    if (isAnimatingString) return;
    isAnimatingString = true;

    // Clean and normalize input
    const sequence = text.toUpperCase().replace(/[^A-Z ]/g, '');
    
    for (const char of sequence) {
        animateCharacterToLetter(char);
        // Async pause between poses (Milestone 3: 1000ms delay)
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Reset to resting pose after sequence completion
    applyPose(REST_POSE);
    isAnimatingString = false;
}

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

    // Apply smooth interpolation for bone rotations
    if (avatar) {
        for (const [boneName, target] of Object.entries(boneTargets)) {
            const bone = avatar.getObjectByName(boneName);
            if (bone) {
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, target.x, LERP_FACTOR);
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, target.y, LERP_FACTOR);
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, target.z, LERP_FACTOR);
            }
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

// Attach 3D loader initialization to boot cycle
window.addEventListener('DOMContentLoaded', () => {
    init3DSpace();

    // Hook up Text-to-Sign UI controls
    const animateBtn = document.getElementById('animateBtn');
    const textToSignInput = document.getElementById('textToSignInput');

    if (animateBtn && textToSignInput) {
        animateBtn.addEventListener('click', () => {
            const text = textToSignInput.value.trim();
            if (text.length > 0) {
                playSignSequence(text);
            }
        });
    }
});

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

// ==========================================
// 3. MEDIAPIPE & LIVE DATASTREAM INTEGRATION
// ==========================================
let sentence = "";
let currentPrediction = "";
let lastLetter = "";
let predictionStart = null;
const STABLE_TIME = 1200;
let lastHandSeen = Date.now();
const NO_HAND_TIMEOUT = 2000;

const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const hands = new Hands({
    locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.7
});

hands.onResults(async (results) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let now = Date.now();
    
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        lastHandSeen = now;
        let landmarks = results.multiHandLandmarks[0];
        
        // Render canvas bones visually
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS);
        drawLandmarks(ctx, landmarks);
        
        let coords = [];
        landmarks.forEach(p => coords.push(p.x, p.y, p.z));
        let normalized = normalizeHandCoordinates(coords);
        
        try {
            let res = await fetch("https://signova-ai-cvsw.onrender.com/api/auth/predict-sign/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates: normalized })
            });
            let data = await res.json();
            let prediction = data.prediction || "";
            document.getElementById("letter").innerText = prediction;
            
            // Stabilization Processing Buffer
            if (prediction !== currentPrediction) {
                currentPrediction = prediction;
                predictionStart = now;
            } else {
                if (predictionStart && (now - predictionStart >= STABLE_TIME)) {
                    if (prediction && prediction !== lastLetter) {
                        sentence += prediction;
                        lastLetter = prediction;
                        document.getElementById("sentence").innerText = sentence;
                        predictionStart = now;
                    }
                }
            }
        } catch (e) { console.error("Sign prediction API fault:", e); }
    } else {
        // Space injection when hands disappear
        if (now - lastHandSeen > NO_HAND_TIMEOUT) {
            if (!sentence.endsWith(" ") && sentence.length > 0) {
                sentence += " ";
                lastLetter = "";
                document.getElementById("sentence").innerText = sentence;
            }
            lastHandSeen = now;
        }
    }
});

window.startCamera = function() {
    const cam = new Camera(video, {
        onFrame: async () => await hands.send({ image: video }),
        width: 400,
        height: 300
    });
    cam.start();
};

window.clearSentence = function() {
    sentence = "";
    lastLetter = "";
    document.getElementById("sentence").innerText = "";
};

// ==========================================
// 4. SPEECH AUDIO RECORDING & AUTH SYSTEMS
// ==========================================
let recorder, chunks = [];

window.startRecording = async function() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();
};

window.stopRecording = function() {
    if (!recorder) return;
    recorder.stop();
    recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        let form = new FormData();
        form.append("audio", blob);
        
        let res = await fetch("https://signova-ai-cvsw.onrender.com/api/auth/speech-to-text/", {
            method: "POST",
            body: form
        });
        let data = await res.json();
        document.getElementById("speechResult").innerText = data.text || "";
    };
};

window.handleGoogleLogin = function(response) {
    const token = response.credential;
    fetch("https://signova-ai-cvsw.onrender.com/api/auth/google/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
    });
};