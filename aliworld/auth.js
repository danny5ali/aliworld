/* ============================================
   ALIWORLD — auth flow (updated for step 7)
   handles signup, login, logout
   on signed-in: boots the Phaser game
   ============================================ */

(function() {
  'use strict';

  const supabase = window.aliworldSupabase;
  if (!supabase) {
    console.error('[aliworld] aliworldSupabase not initialized; aborting auth.');
    return;
  }

  // ============ ELEMENTS ============
  const screens = {
    loading: document.getElementById('loading-screen'),
    auth: document.getElementById('auth-screen'),
    game: document.getElementById('game-screen')
  };

  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = document.getElementById('auth-submit');
  const messageEl = document.getElementById('auth-message');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const logoutBtn = document.getElementById('logout-btn');
  const backLink = document.getElementById('back-link');

  // ============ STATE ============
  let currentMode = 'signup';

  // ============ SCREEN MANAGEMENT ============
  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('visible', key === name);
    });
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

  // ============ MODE TOGGLE ============
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

      if (result.data && result.data.session) {
        await handleSignedIn(result.data.user);
      } else {
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
    // fetch the aw_users row
    const { data: userData, error } = await supabase
      .from('aw_users')
      .select('handle, email')
      .eq('user_id', user.id)
      .single();

    let handle = (userData && userData.handle) || ('player_' + user.id.substring(0, 8));
    let email = (userData && userData.email) || user.email;

    if (error) {
      console.warn('[aliworld] could not fetch aw_users row:', error.message);
    }

    // update last_played_at (best-effort)
    supabase
      .from('aw_users')
      .update({ last_played_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .then(() => {})
      .catch(() => {});

    // show game screen
    showScreen('game');

    // small delay so the screen is visible before phaser instantiates
    // (phaser sizes to its container; the container must be visible first)
    setTimeout(() => {
      if (typeof window.aliworldBootGame === 'function') {
        window.aliworldBootGame(user.id, handle, email);
      } else {
        console.error('[aliworld] aliworldBootGame not available; check script load order');
      }
    }, 50);
  }

  // ============ LOGOUT ============
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (typeof window.aliworldShutdownGame === 'function') {
        window.aliworldShutdownGame();
      }
      await supabase.auth.signOut();
      showScreen('auth');
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

  // listen for auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      if (typeof window.aliworldShutdownGame === 'function') {
        window.aliworldShutdownGame();
      }
      showScreen('auth');
    } else if (event === 'SIGNED_IN' && session && !window.aliworldGame?.booted) {
      handleSignedIn(session.user);
    }
  });

  init();
})();
