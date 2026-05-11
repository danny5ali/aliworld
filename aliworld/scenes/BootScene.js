/* ============================================
   BootScene
   first Phaser scene; preloads minimum needed
   and routes forward to HomeScene
   ============================================ */

class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // path-relative to the HTML page
    this.load.image('mdnght_placeholder', 'assets/sprites/mdnght_placeholder.png');
  }

  create() {
    // brief moment of stillness before routing
    this.time.delayedCall(300, () => {
      this.scene.start('HomeScene');
    });

    // ambient text during boot
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, '— loading —', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#8c8478'
    }).setOrigin(0.5).setAlpha(0.6);
  }
}
