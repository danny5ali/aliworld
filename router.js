/* ============================================
   ALIWORLD splash chooser - router
   remembers last-played choice for one-click return
   ============================================ */

(function() {
  'use strict';

  const STORAGE_KEY = 'aliworld_last_game';

  // remember which game was last clicked
  function rememberChoice(game) {
    try {
      localStorage.setItem(STORAGE_KEY, game);
      localStorage.setItem(STORAGE_KEY + '_at', Date.now().toString());
    } catch (e) {
      // localStorage may be disabled (private mode); fail silently
    }
  }

  // hook up card click handlers
  document.querySelectorAll('.card[data-game]').forEach(card => {
    card.addEventListener('click', function() {
      const game = this.dataset.game;
      rememberChoice(game);
      // let the default <a> navigation happen
    });
  });

  // if the user lands on the splash but recently played a game,
  // show a subtle "continue where you left off" hint on the relevant card
  function highlightLastChoice() {
    try {
      const last = localStorage.getItem(STORAGE_KEY);
      const at = parseInt(localStorage.getItem(STORAGE_KEY + '_at') || '0', 10);
      const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;

      if (last && (Date.now() - at) < fourteenDaysMs) {
        const card = document.querySelector(`.card[data-game="${last}"]`);
        if (card) {
          const cta = card.querySelector('.card-cta');
          if (cta) cta.textContent = 'continue →';
        }
      }
    } catch (e) {
      // localStorage disabled; fail silently
    }
  }

  highlightLastChoice();
})();
