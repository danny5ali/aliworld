/* ============================================
   OverworldScene
   placeholder episode 1 — the field
   player avatar walks around with arrow keys / on-screen controls
   ============================================ */

class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OverworldScene' });
    this.player = null;
    this.cursors = null;
    this.touchControls = { left: false, right: false, up: false, down: false };
  }

  create() {
    const { width, height } = this.scale;

    // ============ BACKGROUND (placeholder) ============
    // golden-hour field tones — using v1.1 art spec e1 palette
    this.cameras.main.setBackgroundColor('#2a2516');

    // ambient gradient (programmatic, just a few overlapping rectangles for now)
    const gradient = this.add.graphics();
    gradient.fillGradientStyle(0x3a3220, 0x3a3220, 0x1a1610, 0x1a1610, 1);
    gradient.fillRect(0, 0, width, height);

    // some subtle "grass" texture — small dots scattered
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const color = [0x4a3f24, 0x5a4f30, 0x382e1a][Math.floor(Math.random() * 3)];
      this.add.circle(x, y, 1.5, color, 0.6);
    }

    // a horizon line
    const horizonY = height * 0.35;
    this.add.line(width / 2, horizonY, 0, 0, width, 0, 0x5a4530, 0.4).setLineWidth(1);

    // ============ SCENE LABEL ============
    this.add.text(width / 2, 20, 'episode 1 — the field', {
      fontFamily: '"Courier New", monospace',
      fontSize: '13px',
      color: '#c9a040',
      fontStyle: 'italic'
    }).setOrigin(0.5, 0).setAlpha(0.7);

    this.add.text(width / 2, 38, '— placeholder · use arrow keys or buttons —', {
      fontFamily: '"Courier New", monospace',
      fontSize: '10px',
      color: '#8c8478'
    }).setOrigin(0.5, 0).setAlpha(0.5);

    // ============ THE PLAYER ============
    // create the player sprite with physics so it can move
    this.player = this.physics.add.image(width / 2, height / 2 + 40, 'mdnght_placeholder');
    this.player.setCollideWorldBounds(true);

    // scale down to a reasonable game size
    const targetHeight = 96;
    const scale = targetHeight / this.player.height;
    this.player.setScale(scale);

    // tighten the hitbox to the actual avatar (the sprite has lots of transparent margin)
    this.player.body.setSize(this.player.width * 0.4, this.player.height * 0.6);
    this.player.body.setOffset(this.player.width * 0.3, this.player.height * 0.35);

    // ============ INPUT ============
    // keyboard arrows
    this.cursors = this.input.keyboard.createCursorKeys();

    // touch controls (on-screen d-pad for mobile)
    this.createTouchControls();

    // ============ HOME BUTTON (return to HomeScene) ============
    this.createHomeButton();
  }

  createTouchControls() {
    const { width, height } = this.scale;

    // only show touch controls on touch devices
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    if (!isTouch) return;

    const padX = 90;
    const padY = height - 90;
    const btnSize = 40;
    const btnSpacing = 50;

    const makeBtn = (x, y, label, dir) => {
      const btn = this.add.circle(x, y, btnSize / 2, 0x14110f, 0.7);
      btn.setStrokeStyle(1, 0xebe2d2, 0.3);
      btn.setInteractive({ useHandCursor: false });
      btn.setScrollFactor(0);

      const text = this.add.text(x, y, label, {
        fontFamily: '"Courier New", monospace',
        fontSize: '20px',
        color: '#ebe2d2'
      });
      text.setOrigin(0.5, 0.5);
      text.setScrollFactor(0);

      btn.on('pointerdown', () => { this.touchControls[dir] = true; });
      btn.on('pointerup', () => { this.touchControls[dir] = false; });
      btn.on('pointerout', () => { this.touchControls[dir] = false; });
    };

    // d-pad layout
    makeBtn(padX, padY - btnSpacing, '↑', 'up');
    makeBtn(padX, padY + btnSpacing, '↓', 'down');
    makeBtn(padX - btnSpacing, padY, '←', 'left');
    makeBtn(padX + btnSpacing, padY, '→', 'right');
  }

  createHomeButton() {
    const { width } = this.scale;
    const homeX = width - 50;
    const homeY = 50;

    const btn = this.add.circle(homeX, homeY, 18, 0x14110f, 0.8);
    btn.setStrokeStyle(1, 0xebe2d2, 0.3);
    btn.setInteractive({ useHandCursor: true });
    btn.setScrollFactor(0);

    const text = this.add.text(homeX, homeY, '↩', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      color: '#ebe2d2'
    });
    text.setOrigin(0.5, 0.5);
    text.setScrollFactor(0);

    btn.on('pointerover', () => btn.setStrokeStyle(1, 0xb32a1f, 0.6));
    btn.on('pointerout', () => btn.setStrokeStyle(1, 0xebe2d2, 0.3));
    btn.on('pointerup', () => {
      this.scene.start('HomeScene');
    });
  }

  update() {
    if (!this.player) return;
    const speed = 160;

    // reset velocity each frame
    this.player.setVelocity(0);

    // keyboard input
    if (this.cursors.left.isDown || this.touchControls.left) {
      this.player.setVelocityX(-speed);
    } else if (this.cursors.right.isDown || this.touchControls.right) {
      this.player.setVelocityX(speed);
    }

    if (this.cursors.up.isDown || this.touchControls.up) {
      this.player.setVelocityY(-speed);
    } else if (this.cursors.down.isDown || this.touchControls.down) {
      this.player.setVelocityY(speed);
    }
  }
}
