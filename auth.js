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

// ─── Render overlay HTML ───────────────────────────────
function renderAuthOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Sign in to SIGNOVA.AI');

    overlay.innerHTML = `
        <!-- ── Welcome Screen ─────────────────── -->
        <div class="auth-screen auth-screen--active" data-screen="welcome">
            <div class="auth-card">
                <div class="auth-logo">
                    <div class="auth-logo__icon">🤟</div>
                    <h1 class="auth-logo__name">SIGNOVA.AI</h1>
                    <p class="auth-logo__tagline">
                        Connecting with Signs<br>
                        <span>Every gesture. Every word. Every connection.</span>
                    </p>
                </div>

                <div class="auth-actions">
                    <button class="auth-btn auth-btn--primary" id="welcomeLoginBtn">
                        Log In
                    </button>
                    <button class="auth-btn auth-btn--outline" id="welcomeGuestBtn">
                        Explore as Guest
                    </button>
                </div>

                <p class="auth-legal">
                    By continuing, you agree to our
                    <a href="#" tabindex="0">Terms of Service</a> and
                    <a href="#" tabindex="0">Privacy Policy</a>
                </p>
            </div>
        </div>

        <!-- ── Login Screen ───────────────────── -->
        <div class="auth-screen" data-screen="login">
            <div class="auth-card">
                <button class="auth-back" id="loginBackBtn" aria-label="Back to welcome">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" stroke-width="2.5"
                         stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 12H5M12 5l-7 7 7 7"/>
                    </svg>
                </button>

                <div class="auth-welcome-text">
                    <h2>Welcome back! 👋</h2>
                    <p>Sign in with Google to continue</p>
                </div>

                <div class="auth-error" role="alert" style="display:none"></div>

                <!-- Google Sign-In button rendered by GSI -->
                <div id="g_id_signin_btn" class="auth-google-btn-wrap"></div>

                <!-- Fallback / One Tap container -->
                <div id="g_id_onload"
                     data-client_id="${GOOGLE_CLIENT_ID}"
                     data-callback="handleGoogleCredential"
                     data-auto_prompt="false">
                </div>

                <div class="auth-divider"><span>or</span></div>

                <button class="auth-btn auth-btn--outline auth-btn--google"
                        id="googleSignInBtn">
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                </button>

                <button class="auth-btn auth-btn--ghost" id="loginGuestBtn">
                    Continue as Guest
                </button>

                <p class="auth-legal">
                    Don't have an account?
                    <a href="#" tabindex="0">Create one free</a>
                </p>
            </div>
        </div>
    `;

    document.body.prepend(overlay);
    bindAuthEvents();
    initGoogleGSI();
}
