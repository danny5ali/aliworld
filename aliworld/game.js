/* ============================================
   game.js
   main Phaser config; waits for auth to confirm
   signed-in state before booting the engine.
   ============================================ */

(function() {
  'use strict';

  // global game state holder — accessible to all scenes
  window.aliworldGame = {
    instance: null,
    userId: null,
    userHandle: null,
    userEmail: null,
    booted: false
  };

  /**
   * boot the Phaser game instance.
   * called by auth.js once the user is signed in and we have their profile data.
   */
  window.aliworldBootGame = function(userId, handle, email) {
    if (window.aliworldGame.booted) {
      console.log('[aliworld] game already booted; skipping re-boot');
      return;
    }

    window.aliworldGame.userId = userId;
    window.aliworldGame.userHandle = handle;
    window.aliworldGame.userEmail = email;

    // size the canvas to fit the container, capped for desktop readability
    const container = document.getElementById('game-container');
    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    const maxWidth = 900;
    const maxHeight = 700;
    const targetW = Math.min(containerW, maxWidth);
    const targetH = Math.min(containerH, maxHeight);

    const config = {
      type: Phaser.AUTO,
      parent: 'game-container',
      width: targetW,
      height: targetH,
      backgroundColor: '#0a0a0a',
      pixelArt: true,
      antialias: false,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scene: [BootScene, HomeScene, OverworldScene]
    };

    window.aliworldGame.instance = new Phaser.Game(config);
    window.aliworldGame.booted = true;

    console.log('[aliworld] game booted for', handle);
  };

  /**
   * destroy the game instance (called on sign-out).
   */
  window.aliworldShutdownGame = function() {
    if (window.aliworldGame.instance) {
      window.aliworldGame.instance.destroy(true);
      window.aliworldGame.instance = null;
    }
    window.aliworldGame.booted = false;
    window.aliworldGame.userId = null;
    window.aliworldGame.userHandle = null;
    window.aliworldGame.userEmail = null;
  };
})();
