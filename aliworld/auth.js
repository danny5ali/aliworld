// aliworld/auth.js
// handles signup/login/logout, T&C acceptance, skips login on existing session

(function() {
  'use strict';

  const supabase = window.aliworldSupabase;
  if (!supabase) { console.error('[aliworld] supabase not initialized'); return; }

  const screens = {
    loading: document.getElementById('loading-screen'),
    auth:    document.getElementById('auth-screen'),
    game:    document.getElementById('game-screen')
  };

  const form = document.getElementById('auth-form');
  const emailInput = document.getElementById('email-input');
  const passwordInput = document.getElementById('password-input');
  const submitBtn = document.getElementById('auth-submit');
  const messageEl = document.getElementById('auth-message');
  const modeTabs = document.querySelectorAll('.mode-tab');
  const logoutBtn = document.getElementById('logout-btn');
  const backLink = document.getElementById('back-link');
  const tcContainer = document.getElementById('tc-container');
  const tcCheckbox = document.getElementById('tc-checkbox');
  const tcLink = document.getElementById('tc-link');

  let currentMode = 'signup';

  function showScreen(name) {
    Object.entries(screens).forEach(([key, el]) => {
      if (!el) return;
      el.classList.toggle('visible', key === name);
    });
    if (backLink) backLink.classList.toggle('visible', name === 'auth');
  }

  function setMessage(text, kind) {
    if (!messageEl) return;
    messageEl.textContent = text || '';
    messageEl.classList.remove('success', 'error');
    if (kind) messageEl.classList.add(kind);
  }

  function clearMessage() { setMessage('', null); }

  function setMode(mode) {
    currentMode = mode;
    modeTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.mode === mode));
    submitBtn.textContent = mode === 'signup' ? 'create account' : 'log in';
    passwordInput.setAttribute('autocomplete', mode === 'signup' ? 'new-password' : 'current-password');
    // show T&C only on signup
    if (tcContainer) tcContainer.style.display = mode === 'signup' ? 'flex' : 'none';
    clearMessage();
  }

  modeTabs.forEach(tab => tab.addEventListener('click', () => setMode(tab.dataset.mode)));

  // T&C modal
  if (tcLink) {
    tcLink.addEventListener('click', (e) => {
      e.preventDefault();
      showTcModal();
    });
  }

  function showTcModal() {
    const existing = document.getElementById('tc-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'tc-modal';
    modal.innerHTML = `
      <div class="tc-modal-bg"></div>
      <div class="tc-modal-box">
        <h3>terms of service</h3>
        <div class="tc-modal-content">
          <p><strong>aliworld is a narrative game by danny ali / six5ive studios.</strong></p>
          <p>by creating an account, you agree:</p>
          <p>• you are at least 13 years old. if under 18, you have a parent's permission.</p>
          <p>• you will not share your password.</p>
          <p>• you will not use bots, scripts, or exploits to interact with the game.</p>
          <p>• your handle and game progress may be visible to other players. your email is private.</p>
          <p>• we may delete accounts that violate these terms.</p>
          <p>• the game contains depictions of conflict and abstract horror imagery. not recommended for users sensitive to such content.</p>
          <p>• aliworld is provided "as is" without warranty. play at your own enjoyment.</p>
          <p>• you can delete your account at any time by emailing support.</p>
          <p>full privacy policy and terms available at dannyali.com/terms.</p>
        </div>
        <button class="tc-modal-close">close</button>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('.tc-modal-close').addEventListener('click', () => modal.remove());
    modal.querySelector('.tc-modal-bg').addEventListener('click', () => modal.remove());
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
      setMessage('email and password required.', 'error');
      return;
    }

    // T&C check on signup
    if (currentMode === 'signup' && tcCheckbox && !tcCheckbox.checked) {
      setMessage('you need to accept the terms to create an account.', 'error');
      return;
    }

    submitBtn.disabled = true;
    setMessage(currentMode === 'signup' ? 'creating account...' : 'logging in...');

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

  async function handleSignedIn(user) {
    const { data: userData } = await supabase
      .from('aw_users')
      .select('handle, email')
      .eq('user_id', user.id)
      .single();

    let handle = (userData && userData.handle) || ('player_' + user.id.substring(0, 8));
    let email = (userData && userData.email) || user.email;

    // update last_played_at best-effort
    supabase.from('aw_users')
      .update({ last_played_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .then(() => {}).catch(() => {});

    showScreen('game');

    setTimeout(() => {
      if (typeof window.aliworldBootGame === 'function') {
        window.aliworldBootGame(user.id, handle, email);
      } else {
        console.error('[aliworld] aliworldBootGame not available');
      }
    }, 50);
  }

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

  function humanError(msg) {
    const m = (msg || '').toLowerCase();
    if (m.includes('invalid login credentials')) return 'wrong email or password.';
    if (m.includes('user already registered')) return 'account exists. try logging in.';
    if (m.includes('email rate limit')) return 'too many attempts. wait a minute.';
    if (m.includes('password should be')) return 'password too short. use 6+ characters.';
    if (m.includes('unable to validate email')) return 'invalid email.';
    return msg || 'something broke.';
  }

  async function init() {
    // start on loading screen, decide where to go after session check
    showScreen('loading');
    const { data } = await supabase.auth.getSession();
    if (data && data.session) {
      // skip login screen, go straight in
      await handleSignedIn(data.session.user);
    } else {
      showScreen('auth');
      setMode('signup');
    }
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      if (typeof window.aliworldShutdownGame === 'function') window.aliworldShutdownGame();
      showScreen('auth');
    } else if (event === 'SIGNED_IN' && session && !(window.aliworldGame && window.aliworldGame.booted)) {
      handleSignedIn(session.user);
    }
  });

  init();
})();
