# SIGNOVA.AI - Frontend Web Client

SIGNOVA is an interactive web application that bridges the gap between sign language and spoken/written communication. It features a high-fidelity 3D avatar for Text-to-Sign translation, real-time hand tracking for Sign-to-Text conversion, and voice-to-text integration.

## 🚀 Key Features

- **Text-to-Sign:** Enter text to see a 3D avatar perform the corresponding American Sign Language (ASL) alphabet.
- **Sign-to-Text:** Real-time hand skeletal tracking using **Google MediaPipe** and a custom AI backend.
- **Speech-to-Text:** Voice recording and transcription integration via the **Whisper API**.
- **Responsive Design:** Full mobile parity with a vertical-stack layout for touch devices.
- **Secure Auth:** Integrated Google OAuth 2.0 via Google Identity Services (GSI).

---

## 🛠 Tech Stack

- **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3.
- **3D Graphics:** [Three.js](https://threejs.org/) with [GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader).
- **Computer Vision:** [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html).
- **Authentication:** Google Identity Services (GSI).
- **Assets:** Ready Player Me (.glb) avatars.

---

## ⚙️ Setup & Configuration

### 1. Google OAuth Setup (Required for Login)
To enable the authentication system, follow these steps:
1. Go to the [Google Cloud Console](https://console.cloud.google.com).
2. Create a new project or select an existing one.
3. Navigate to **APIs & Services > Credentials**.
4. Create an **OAuth 2.0 Client ID** (Application type: Web application).
5. Add your development domain to **Authorised JavaScript origins** (e.g., `http://localhost:5500` for local development).
6. Copy the **Client ID** and replace the placeholder in `auth.js`:
   ```javascript
   const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
   ```

### 2. Running Locally
Simply serve the root directory using any local web server. 
- Using VS Code: Install **Live Server** and click "Go Live".
- Using Python: `python3 -m http.server 5500`

---

## 📡 API Integration Reference

The frontend communicates with the backend hosted at: `https://signova-ai-cvsw.onrender.com`

### 1. Sign-to-Text Prediction
- **Endpoint:** `POST /api/auth/predict-sign/`
- **Payload:** `{"coordinates": [63 normalized numbers]}`
- **Response:** `{"prediction": "A"}`

### 2. Speech-to-Text
- **Endpoint:** `POST /api/auth/speech-to-text/`
- **Payload:** `multipart/form-data` containing an `audio` field with a `.wav` file.
- **Response:** `{"text": "Transcribed text here"}`

---

## 📐 Coordination Normalization Rules
To ensure the AI backend receives data consistent with its training pipeline, the frontend applies these rules to the 21 hand landmarks (x, y, z):

1. **Center Data:** Subtract the wrist coordinate (`index 0`) from all other points.
2. **Scale Z:** Multiply the Z-coordinate by `0.5`.
3. **Normalize:** Divide all coordinates by the maximum absolute value in the matrix to keep fields between `-1` and `1`.
4. **Flatten:** Provide a flat array of 63 numbers (`[x1, y1, z1, x2, y2, z2, ...]`).

---

## 📂 Project Structure

- `index.html`: Main application entry point.
- `app.js`: Core application logic, Three.js initialization, and MediaPipe integration.
- `auth.js`: Google OAuth overlay and session management.
- `config.js`: Global configuration, API endpoints, and sign language bone mappings.
- `style.css`: Figma-matched styles and responsive mobile layout.
- `assets/`: 3D models (`avatar.glb`) and static images.

---

## 🤝 Team Coordination

- **Backend Team:** Please ensure the CORS policy allows requests from the frontend's production and staging domains.
- **3D Asset Team:** .glb models must be tracked via **Git LFS**. Do not commit raw binaries directly to the repository.

---
*© 2026 SIGNOVA.AI — Connecting with Signs.*
