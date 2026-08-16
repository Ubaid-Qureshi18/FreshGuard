// js/auth.js — Authentication Flow
import { db } from './supabase.js';
import { initApp } from './app.js';

export async function initAuth() {
  // Check for existing session
  const user = db.getUser();
  if (user) {
    showApp(user);
    return;
  }
  showAuthScreen();
}

function showAuthScreen() {
  document.getElementById('auth-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
}

function showApp(user) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  initApp(user);
}

export function setupAuthListeners() {
  const signInTab  = document.getElementById('auth-tab-signin');
  const signUpTab  = document.getElementById('auth-tab-signup');
  const signInForm = document.getElementById('sign-in-form');
  const signUpForm = document.getElementById('sign-up-form');

  signInTab?.addEventListener('click', () => {
    signInTab.classList.add('active');
    signUpTab.classList.remove('active');
    signInForm.classList.remove('hidden');
    signUpForm.classList.add('hidden');
  });

  signUpTab?.addEventListener('click', () => {
    signUpTab.classList.add('active');
    signInTab.classList.remove('active');
    signUpForm.classList.remove('hidden');
    signInForm.classList.add('hidden');
  });

  // Sign In
  signInForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('si-email').value.trim();
    const password = document.getElementById('si-password').value;
    const btn      = document.getElementById('btn-signin');
    const errEl    = document.getElementById('signin-error');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Signing in…';
    errEl.classList.add('hidden');

    try {
      const { user } = await db.signIn(email, password);
      showApp(user || db.getUser());
    } catch (err) {
      errEl.textContent = err.message || 'Sign in failed. Check your credentials.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  });

  // Sign Up
  signUpForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('su-email').value.trim();
    const password = document.getElementById('su-password').value;
    const confirm  = document.getElementById('su-confirm').value;
    const btn      = document.getElementById('btn-signup');
    const errEl    = document.getElementById('signup-error');

    if (password !== confirm) {
      errEl.textContent = 'Passwords do not match.';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 6) {
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner spinner-sm"></span> Creating account…';
    errEl.classList.add('hidden');

    try {
      const result = await db.signUp(email, password);
      if (result.session) {
        showApp(result.user || db.getUser());
      } else {
        // Email confirmation required
        const form = document.getElementById('sign-up-form');
        form.innerHTML = `
          <div class="empty-state" style="padding:var(--space-6)">
            <div class="empty-state-icon">📧</div>
            <div class="empty-state-title">Check your email</div>
            <div class="empty-state-body">We sent a confirmation link to <strong>${email}</strong>. Click it to activate your account, then sign in.</div>
            <button class="btn btn-primary" onclick="location.reload()">Got it — Sign In</button>
          </div>`;
      }
    } catch (err) {
      errEl.textContent = err.message || 'Sign up failed. Please try again.';
      errEl.classList.remove('hidden');
      btn.disabled = false;
      btn.textContent = 'Create Account';
    }
  });
}
