// aliworld/scenes/HomeScene.js

class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'HomeScene' });
  }

  create() {
    const { width, height } = this.scale;

    // ============ AMBIENT BACKGROUND ============
    this.cameras.main.setBackgroundColor('#0a0a0a');

    // subtle cult.18 sigil pulse in the background
    const sigil = this.add.graphics();
    sigil.lineStyle(2, 0xb32a1f, 0.15);
    const cx = width / 2;
    const cy = height / 2 - 30;
    const sigilSize = 40;
    sigil.beginPath();
    sigil.moveTo(cx, cy - sigilSize);
    sigil.lineTo(cx + sigilSize * 0.866, cy + sigilSize * 0.5);
    sigil.lineTo(cx - sigilSize * 0.866, cy + sigilSize * 0.5);
    sigil.closePath();
    sigil.strokePath();
    sigil.lineBetween(cx - sigilSize * 0.4, cy + sigilSize * 0.5, cx + sigilSize * 0.4, cy + sigilSize * 0.5);
    sigil.setAlpha(0.4);

    this.tweens.add({
      targets: sigil,
      alpha: { from: 0.2, to: 0.5 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ============ MDNGHT AVATAR ============
    const avatar = this.add.image(width / 2, height / 2 + 20, 'mdnght_placeholder');
    avatar.setOrigin(0.5, 0.5);

    const maxAvatarHeight = Math.min(height * 0.5, 280);
    const scale = Math.min(1, maxAvatarHeight / avatar.height);
    avatar.setScale(scale);

    this.tweens.add({
      targets: avatar,
      y: avatar.y + 4,
      duration: 2400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // ============ HANDLE / WELCOME TEXT ============
    // safe fallback — aliworldGame may not be ready yet on first load
    const handle = (window.aliworldGame && window.aliworldGame.userHandle) || 'unknown';
    const welcomeText = this.add.text(width / 2, 60, handle, {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#8c8478'
    });
    welcomeText.setOrigin(0.5, 0.5);

    // ============ BEGIN BUTTON ============
    const btnY = height - 80;
    const btn = this.add.rectangle(width / 2, btnY, 220, 48, 0xb32a1f);
    btn.setOrigin(0.5, 0.5);
    btn.setInteractive({ useHandCursor: true });

    const btnText = this.add.text(width / 2, btnY, 'BEGIN YOUR RUN', {
      fontFamily: '"Courier New", monospace',
      fontSize: '14px',
      color: '#ebe2d2',
      fontStyle: 'bold'
    });
    btnText.setOrigin(0.5, 0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x6a1612));
    btn.on('pointerout', () => btn.setFillStyle(0xb32a1f));
    btn.on('pointerdown', () => btn.setScale(0.97));
    btn.on('pointerup', () => {
      btn.setScale(1);
      this.scene.start('OverworldScene');
    });

    this.add.text(width / 2, btnY + 36, '— episode 1 placeholder —', {
      fontFamily: '"Courier New", monospace',
      fontSize: '11px',
      color: '#5a544a'
    }).setOrigin(0.5, 0.5);
  }
}

window.HomeScene = HomeScene;
