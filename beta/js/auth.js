// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const adminDashboard = document.getElementById('admin-dashboard');
    const authForm = document.getElementById('login-form'); // Renamed for clarity as it handles both
    const logoutButton = document.getElementById('logout-button');
    const authError = document.getElementById('auth-error');
    const userEmailDisplay = document.getElementById('user-email-display');

    const loginButton = document.getElementById('login-button');
    const signupButton = document.getElementById('signup-button');
    const authPanelTitle = document.getElementById('auth-panel-title');
    const showSignupLink = document.getElementById('show-signup-link');
    const showLoginLink = document.getElementById('show-login-link');
    const googleLoginButton = document.getElementById('google-login-button');

    let isLoginMode = true;

    function toggleAuthMode(toLogin) {
        isLoginMode = toLogin;
        if (isLoginMode) {
            authPanelTitle.textContent = "Login";
            loginButton.style.display = 'inline-block';
            signupButton.style.display = 'none';
            showSignupLink.style.display = 'inline';
            showLoginLink.style.display = 'none';
        } else {
            authPanelTitle.textContent = "Sign Up";
            loginButton.style.display = 'none';
            signupButton.style.display = 'inline-block';
            showSignupLink.style.display = 'none';
            showLoginLink.style.display = 'inline';
        }
        authError.textContent = '';
        if (authForm) authForm.reset();
    }

    // Initial setup for login mode
    toggleAuthMode(true);

    if (showSignupLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode(false);
        });
    }
    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            toggleAuthMode(true);
        });
    }

    // Firebase Auth Listener
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in
            loginSection.classList.add('hidden');
            adminDashboard.classList.remove('hidden');
            if(userEmailDisplay) userEmailDisplay.textContent = user.email;
            if (typeof loadAdminData === 'function') { // Check if admin.js's function is available
                loadAdminData(); // Load configurations and sponsorships
            }
        } else {
            // User is signed out
            loginSection.classList.remove('hidden');
            adminDashboard.classList.add('hidden');
            if(userEmailDisplay) userEmailDisplay.textContent = '';
            toggleAuthMode(true); // Default to login mode when signed out
        }
    });

    // Auth Form Submission (handles both login and signup)
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = authForm['auth-email'].value;
            const password = authForm['auth-password'].value;
            authError.textContent = '';

            try {
                if (isLoginMode) {
                    await auth.signInWithEmailAndPassword(email, password);
                } else {
                    await auth.createUserWithEmailAndPassword(email, password);
                }
                // Auth state change will handle UI update & redirect
            } catch (error) {
                console.error(isLoginMode ? "Login failed:" : "Sign up failed:", error);
                authError.textContent = error.message;
            }
        });
    }

    // Google Login Button
    if (googleLoginButton) {
        googleLoginButton.addEventListener('click', async () => {
            authError.textContent = '';
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await auth.signInWithPopup(provider);
                // Auth state change will handle UI update & redirect
            } catch (error) {
                console.error("Google login failed:", error);
                authError.textContent = `Google login error: ${error.message}`;
            }
        });
    }

    // Logout Button
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            await auth.signOut();
        });
    }
});