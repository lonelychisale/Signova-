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

// ─── UI State Machine ──────────────────────────────────
// Screens: 'welcome' | 'login'
let currentScreen = 'welcome';

function showScreen(name) {
    currentScreen = name;
    document.querySelectorAll('.auth-screen').forEach(el => {
        el.classList.toggle('auth-screen--active', el.dataset.screen === name);
    });
}

// ─── Entry: show workspace, hide overlay ───────────────
function enterApp(user, isGuest = false) {
    window.signovaAuth.user = user;
    window.signovaAuth.isGuest = isGuest;
    if (!isGuest && user) persistSession(user);

    const overlay = document.getElementById('auth-overlay');
    if (overlay) {
        overlay.classList.add('auth-overlay--exit');
        setTimeout(() => overlay.remove(), 380);
    }

    const workspace = document.getElementById('workspace');
    if (workspace) {
        workspace.style.opacity = '0';
        workspace.style.display = 'flex';
        requestAnimationFrame(() => {
            workspace.style.transition = 'opacity .35s ease';
            workspace.style.opacity = '1';
        });
    }

    updateUserChip(user, isGuest);
}

/** Inject a small user chip into the panel header after login */
function updateUserChip(user, isGuest) {
    const brandEl = document.querySelector('#left-panel > h2');
    if (!brandEl) return;

    const existing = document.getElementById('user-chip');
    if (existing) existing.remove();

    const chip = document.createElement('div');
    chip.id = 'user-chip';
    chip.className = 'user-chip';

    if (isGuest) {
        chip.innerHTML = `
            <span class="user-chip__avatar user-chip__avatar--guest">👤</span>
            <span class="user-chip__name">Guest</span>
            <button class="user-chip__signout" onclick="signovaSignOut()">Sign in</button>
        `;
    } else {
        const initials = user.name
            ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            : '?';
        chip.innerHTML = `
            <span class="user-chip__avatar" title="${user.name || ''}">${
                user.picture
                    ? `<img src="${user.picture}" alt="${initials}">`
                    : initials
            }</span>
            <span class="user-chip__name">${user.given_name || user.name || 'User'}</span>
            <button class="user-chip__signout" onclick="signovaSignOut()">Sign out</button>
        `;
    }

    brandEl.insertAdjacentElement('afterend', chip);
}

// ─── Sign out ──────────────────────────────────────────
window.signovaSignOut = function () {
    clearSession();
    // Revoke Google session if available
    if (window.google?.accounts?.id) {
        google.accounts.id.disableAutoSelect();
    }
    location.reload();
};

// ─── Google credential callback ────────────────────────
window.handleGoogleCredential = function (response) {
    const payload = decodeJwt(response.credential);
    if (!payload) {
        showAuthError('login', 'Could not verify Google sign-in. Please try again.');
        return;
    }
    enterApp(payload);
};

// ─── Error display ─────────────────────────────────────
function showAuthError(screen, message) {
    const el = document.querySelector(`[data-screen="${screen}"] .auth-error`);
    if (!el) return;
    el.textContent = message;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 5000);
}
