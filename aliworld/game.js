// aliworld/game.js
//
// phaser game bootstrapper. registers all scenes and starts at BootScene.

const gameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 600,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [
    BootScene,
    HomeScene,
    OverworldScene,
    CombatScene
  ]
};

window.game = new Phaser.Game(gameConfig);
