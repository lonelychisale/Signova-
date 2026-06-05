import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
    SCENE_CONFIG,
    CAMERA_CONFIG,
    LIGHTS_CONFIG,
    MODEL_CONFIG,
    LERP_FACTOR,
    REST_POSE,
    signLanguageMap,
    MEDIAPIPE_CONFIG,
    API_ENDPOINTS
} from './config.js';

// ==========================================
// STATE & CORE VARIABLES
// ==========================================
let scene, camera, renderer, avatar;
const container = document.getElementById('canvas-3d-container');
let isAnimatingString = false;
let webcam = null; // Reference for MediaPipe Camera

// boneTargets drives the LERP — always write to this, never directly to bone.rotation
const boneTargets = JSON.parse(JSON.stringify(REST_POSE));

// ==========================================
// POSE APPLICATION & ANIMATION
// ==========================================
function applyPose(pose) {
    for (const [boneName, rotation] of Object.entries(pose)) {
        if (!boneTargets[boneName]) boneTargets[boneName] = { x: 0, y: 0, z: 0 };
        boneTargets[boneName] = { ...rotation };
    }
}

function animateCharacterToLetter(letter) {
    const char = letter.toUpperCase();
    if (char === ' ') { applyPose(REST_POSE); return; }
    if (!signLanguageMap[char]) {
        console.warn(`No mapping for letter: ${char}`);
        return;
    }
    // Always start from rest arm position then override with sign-specific values
    applyPose({ ...REST_POSE, ...signLanguageMap[char] });
}

async function playSignSequence(text) {
    if (isAnimatingString) return;
    isAnimatingString = true;
    const sequence = text.toUpperCase().replace(/[^A-Z ]/g, '');
    const delay = parseInt(document.getElementById('speedSlider')?.value || 1000);

    for (const char of sequence) {
        if (!isAnimatingString) break; // allow stop
        animateCharacterToLetter(char);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    applyPose(REST_POSE);
    isAnimatingString = false;
}

function stopAnimation() {
    isAnimatingString = false;
    applyPose(REST_POSE);
}

// ==========================================
// THREE.JS SCENE SETUP
// ==========================================
function init3DSpace() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);

    camera = new THREE.PerspectiveCamera(
        CAMERA_CONFIG.fov,
        container.clientWidth / container.clientHeight,
        CAMERA_CONFIG.near,
        CAMERA_CONFIG.far
    );
    camera.position.set(CAMERA_CONFIG.position.x, CAMERA_CONFIG.position.y, CAMERA_CONFIG.position.z);

    const dirLight = new THREE.DirectionalLight(LIGHTS_CONFIG.directional.color, LIGHTS_CONFIG.directional.intensity);
    dirLight.position.set(
        LIGHTS_CONFIG.directional.position.x,
        LIGHTS_CONFIG.directional.position.y,
        LIGHTS_CONFIG.directional.position.z
    );
    scene.add(dirLight);
    scene.add(new THREE.AmbientLight(LIGHTS_CONFIG.ambient.color, LIGHTS_CONFIG.ambient.intensity));

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const loader = new GLTFLoader();
    if (typeof MeshoptDecoder !== 'undefined') loader.setMeshoptDecoder(MeshoptDecoder);

    loader.load(MODEL_CONFIG.path, (gltf) => {
        avatar = gltf.scene;
        scene.add(avatar);
        debugModelStructure(avatar);
        // Apply rest pose immediately so arms don't T-pose on load
        applyPose(REST_POSE);
        animate();
        console.log('Avatar loaded. REST_POSE applied.');
    }, undefined, (err) => console.error('Avatar load error:', err));
}

/**
 * Traverses the 3D model hierarchy and logs the names of all Bone objects.
 * Useful for identifying rig joint names for animation mapping.
 */
function debugModelStructure(obj) {
    console.log('--- BONE HIERARCHY ---');
    obj.traverse((node) => {
        if (node.isBone) console.log('Bone:', node.name);
    });
    console.log('--- END ---');
}

function animate() {
    requestAnimationFrame(animate);
    if (avatar) {
        for (const [boneName, target] of Object.entries(boneTargets)) {
            const bone = avatar.getObjectByName(boneName)
                      || avatar.getObjectByName(boneName.replace('Arm', 'UpperArm'))
                      || avatar.getObjectByName('Armature|' + boneName)
                      || avatar.getObjectByName('mixamorig' + boneName);
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

// ==========================================
// COORDINATE NORMALIZATION (matches Python backend)
// ==========================================
function normalizeHandCoordinates(coords) {
    let arr = [];
    for (let i = 0; i < coords.length; i += 3) arr.push([coords[i], coords[i+1], coords[i+2]]);
    let wrist = arr[0];
    arr = arr.map(p => [p[0]-wrist[0], p[1]-wrist[1], p[2]-wrist[2]]);
    arr = arr.map(p => [p[0], p[1], p[2] * 0.5]);
    let maxVal = Math.max(...arr.flat().map(v => Math.abs(v)));
    if (maxVal !== 0) arr = arr.map(p => [p[0]/maxVal, p[1]/maxVal, p[2]/maxVal]);
    return arr.flat();
}

// ==========================================
// MEDIAPIPE SIGN-TO-TEXT & LIVE DATASTREAM INTEGRATION
// ==========================================
let sentence = "", currentPrediction = "", lastLetter = "", predictionStart = null;
let lastHandSeen = Date.now();

const video  = document.getElementById("video");
const canvas = document.getElementById("canvas");
const ctx    = canvas.getContext("2d");

const hands = new Hands({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}` });
hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    refineLandmarks: true,
    minDetectionConfidence: MEDIAPIPE_CONFIG.minDetectionConfidence,
    minTrackingConfidence: MEDIAPIPE_CONFIG.minTrackingConfidence
});

hands.onResults(async (results) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = Date.now();
    
    // Draw skeletal wireframe if hand is detected
    if (results.multiHandLandmarks?.length > 0) {
        lastHandSeen = now;
        const landmarks = results.multiHandLandmarks[0];
        
        // Use drawing_utils.js globals
        if (typeof drawConnectors !== 'undefined') {
            drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: '#4f46e5', lineWidth: 4 });
            drawLandmarks(ctx, landmarks, { color: '#ffffff', lineWidth: 2 });
        }

        // Normalize 63 tracking array coordinates
        const coords = [];
        landmarks.forEach(p => coords.push(p.x, p.y, p.z));
        const normalized = normalizeHandCoordinates(coords);

        // Securely POST data matrix to live API endpoint
        try {
            const res = await fetch(API_ENDPOINTS.predictSign, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ coordinates: normalized })
            });
            const data = await res.json();
            const prediction = data.prediction || "";
            document.getElementById("letter").innerText = prediction;

            // Handle UI stabilization timeout buffer (1200ms)
            if (prediction !== currentPrediction) {
                currentPrediction = prediction; predictionStart = now;
            } else if (predictionStart && (now - predictionStart >= MEDIAPIPE_CONFIG.stableTime)) {
                if (prediction && prediction !== lastLetter) {
                    sentence += prediction; lastLetter = prediction;
                    document.getElementById("sentence").innerText = sentence;
                    predictionStart = now;
                }
            }
        } catch (e) { console.error("Sign prediction API fault:", e); }
    } else {
        // Handle no-hand timeout to add spaces
        if (now - lastHandSeen > MEDIAPIPE_CONFIG.noHandTimeout) {
            if (!sentence.endsWith(" ") && sentence.length > 0) {
                sentence += " "; lastLetter = ""; 
                document.getElementById("sentence").innerText = sentence;
            }
            lastHandSeen = now;
        }
    }
});

// Initialize webcam tracking
function startTracking() {
    if (webcam) return; // Already active

    console.log('Initializing webcam tracking...');
    webcam = new Camera(video, { 
        onFrame: async () => {
            await hands.send({ image: video });
        }, 
        width: 400, 
        height: 300 
    });
    webcam.start();
    
    document.getElementById('startTrackingBtn').disabled = true;
    document.getElementById('startTrackingBtn').innerText = 'Active';
}

// Stop webcam tracking at will
function stopTracking() {
    if (!webcam) return;

    console.log('Stopping webcam tracking...');
    webcam.stop();
    webcam = null;

    // Explicitly stop all media tracks to release hardware (turns off the green light)
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }

    // Reset UI
    document.getElementById('startTrackingBtn').disabled = false;
    document.getElementById('startTrackingBtn').innerText = 'Start Tracking';
    document.getElementById('letter').innerText = '-';
    
    // Clear the tracking canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.clearSentence = function() { 
    sentence = ""; lastLetter = ""; 
    document.getElementById("sentence").innerText = "Waiting..."; 
    document.getElementById("letter").innerText = "-";
};

// ==========================================
// AUDIO RECORDING & SPEECH-TO-TEXT
// ==========================================
let recorder, chunks = [];

window.startRecording = async function() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream); chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.start();
};

window.stopRecording = function() {
    if (!recorder) return;
    recorder.stop();
    recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/wav" });
        const form = new FormData(); form.append("audio", blob);
        const res = await fetch(API_ENDPOINTS.speechToText, { method: "POST", body: form });
        const data = await res.json();
        document.getElementById("speechResult").innerText = data.text || "";
    };
};

// ==========================================
// BOOT & EVENT LISTENERS
// ==========================================
window.addEventListener('DOMContentLoaded', () => {
    init3DSpace();

    // Tracking Controls
    document.getElementById('startTrackingBtn')?.addEventListener('click', startTracking);
    document.getElementById('stopTrackingBtn')?.addEventListener('click', stopTracking);

    // Animation Controls
    document.getElementById('animateBtn')?.addEventListener('click', () => {
        const text = document.getElementById('textToSignInput').value.trim();
        if (text) playSignSequence(text);
    });

    document.getElementById('stopBtn')?.addEventListener('click', stopAnimation);
});
