// aliworld/game.js

let _phaserGame = null;

window.aliworldBootGame = function(userId, handle, email) {
  window.aliworldGame = { booted: true, userId, userHandle: handle || 'unknown', userEmail: email || '' };

  if (_phaserGame) { _phaserGame.destroy(true); _phaserGame = null; }

  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 960,
    height: 600,
    backgroundColor: '#000000',
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [
      BootScene,
      CharacterCreationScene,
      HomeScene,
      OverworldScene,
      AccessoryScene,
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
