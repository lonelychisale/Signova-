/* =====================================================
   SIGNOVA.AI — auth.js
   Google OAuth via GSI (One Tap + Button sign-in)
   ===================================================== */

// ─── CONFIG — replace with your actual Client ID ──────
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// ─── State ─────────────────────────────────────────────
window.signovaAuth = { user: null, isGuest: false };

// ─── Helpers ───────────────────────────────────────────

/** Decode a JWT payload without verification (client-side only) */
function decodeJwt(token) {
    try {
        const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
    } catch {
        return null;
    }
}

/** Persist user to sessionStorage */
function persistSession(user) {
    sessionStorage.setItem('signova_user', JSON.stringify(user));
}

/** Load existing session */
function loadSession() {
    try {
        const raw = sessionStorage.getItem('signova_user');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

/** Clear session */
function clearSession() {
    sessionStorage.removeItem('signova_user');
    window.signovaAuth.user = null;
    window.signovaAuth.isGuest = false;
}
