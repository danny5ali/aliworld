/* ============================================
   ALIWORLD — auth flow
   handles signup, login, logout, and screen routing
   ============================================ */

(function() {
  'use strict';

  // grab supabase client from supabase-client.js
  const supabase = window.aliworldSupabase;
  if (!supabase) {
    console.error('[aliworld] aliworldSupabase not initialized; aborting auth.');
    return;
  }

  // ============ ELEMENTS ============
  const screens = {
    loading: document.getElementById('loading-screen'),
    auth: document.getElementById('auth-screen'),
    home: document.getElementById('home-screen')
  };

  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = document.getElementById('auth-submit');
  const messageEl = document.getElementById('auth-message');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const logoutBtn = document.getElementById('logout-btn');
  const userHandleEl = document.getElementById('user-handle');
  const userEmailEl = document.getElementById('user-email');
  const backLink = document.getElementById('back-link');

  // ============ STATE ============
  let currentMode = 'signup';  // 'signup' or 'login'

  // ============ SCREEN MANAGEMENT ============
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('visible', key === name);
    });
    // show back link only on auth screen
    if (backLink) {
      backLink.classList.toggle('visible', name === 'auth');
    }
  }

  // ============ MESSAGE HELPERS ============
  function setMessage(text, kind) {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.classList.remove('success', 'error');
    if (kind) messageEl.classList.add(kind);
  }

  function clearMessage() {
    setMessage('', null);
  }

  // ============ MODE TOGGLE (signup vs login) ============
  function setMode(mode) {
    currentMode = mode;
    modeTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });
    submitBtn.textContent = mode === 'signup' ? 'create account' : 'log in';
    passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    clearMessage();
  }

  modeTabs.forEach(tab => {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  });

  // ============ FORM SUBMIT ============
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage('email and password required.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setMessage(currentMode === 'signup' ? 'creating account…' : 'logging in…');

    try {
      let result;
      if (currentMode === 'signup') {
        result = await supabase.auth.signUp({ email, password });
      } else {
        result = await supabase.auth.signInWithPassword({ email, password });
      }

      if (result.error) {
        setMessage(humanError(result.error.message), 'error');
        submitBtn.disabled = false;
        return;
      }

      // signup with email confirmation OFF means we get a session immediately
      if (result.data && result.data.session) {
        await handleSignedIn(result.data.user);
      } else {
        // edge case: signup happened but no session (would happen with email confirm ON)
        setMessage('check your email to confirm your account.', 'success');
        submitBtn.disabled = false;
      }
    } catch (err) {
      console.error('[aliworld] auth error:', err);
      setMessage('something broke. try again.', 'error');
      submitBtn.disabled = false;
    }
  });

  // ============ SIGNED-IN STATE ============
  async function handleSignedIn(user) {
    // fetch the aw_users row (created automatically by the supabase trigger)
    const { data: userData, error } = await supabase
      .from('aw_users')
      .select('handle, email')
      .eq('user_id', user.id)
      .single();

    let handle = (userData && userData.handle) || ('player_' + user.id.substring(0, 8));
    let email = (userData && userData.email) || user.email;

    if (error) {
      console.warn('[aliworld] could not fetch aw_users row (may not be ready yet):', error.message);
    }

    if (userHandleEl) userHandleEl.textContent = handle;
    if (userEmailEl) userEmailEl.textContent = email;

    // update last_played_at silently (best-effort, ignore errors)
    supabase
      .from('aw_users')
      .update({ last_played_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .then(() => {})
      .catch(() => {});

    showScreen('home');
  }

  // ============ LOGOUT ============
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await supabase.auth.signOut();
      showScreen('auth');
      // clear form
      emailInput.value = '';
      passwordInput.value = '';
      clearMessage();
    });
  }

  // ============ HUMAN ERROR MESSAGES ============
  function humanError(supaMessage) {
    const m = (supaMessage || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'wrong email or password.';
    if (m.includes('user already registered')) return 'an account with this email exists. try logging in.';
    if (m.includes('email rate limit')) return 'too many attempts. try again in a minute.';
    if (m.includes('password should be')) return 'password too short. use at least 6 characters.';
    if (m.includes('unable to validate email')) return 'invalid email address.';
    return supaMessage || 'something broke.';
  }

  // ============ INITIAL SESSION CHECK ============
  async function init() {
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      await handleSignedIn(data.session.user);
    } else {
      showScreen('auth');
    }
  }

  // listen for auth state changes (e.g., signed in from another tab)
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      showScreen('auth');
    } else if (event === 'SIGNED_IN' && session) {
      handleSignedIn(session.user);
    }
  });

  init();
})();
