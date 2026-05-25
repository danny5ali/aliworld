// aliworld/game.js
// portrait orientation, mobile-first

let _phaserGame = null;

window.aliworldBootGame = function(userId, handle, email) {
  window.aliworldGame = { booted: true, userId, userHandle: handle || 'unknown', userEmail: email || '' };

  if (_phaserGame) { _phaserGame.destroy(true); _phaserGame = null; }

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 540,
    height: 960,
    backgroundColor: '#07070f',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
      BootScene,
      IntroScene,
      CharacterCreationScene,
      NameScene,
      AccessoryScene,
      OutroIntroScene,
      HomeScene,
      OverworldScene,
      CombatScene,
      E1Scene
    ]
  };

  _phaserGame = new Phaser.Game(config);
  window.game = _phaserGame;
};

window.aliworldShutdownGame = function() {
  if (_phaserGame) { _phaserGame.destroy(true); _phaserGame = null; }
  window.game = null;
  if (window.aliworldGame) window.aliworldGame.booted = false;
};
