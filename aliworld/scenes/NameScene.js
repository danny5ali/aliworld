// aliworld/scenes/NameScene.js
// pick handle after character creation
// can be displayed publicly later

class NameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'NameScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);
    this.cameras.main.fadeIn(600, 0, 0, 0);

    // existing handle from supabase, if any
    const currentHandle = (window.aliworldGame && window.aliworldGame.userHandle) || '';
    this.handle = currentHandle.startsWith('player_') ? '' : currentHandle;

    this.add.text(this.cx, 80, 'WHAT DO THEY CALL YOU.', {
      fontFamily: 'monospace', fontSize: '16px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(this.cx, 108, 'others will see this.', {
      fontFamily: 'monospace', fontSize: '11px', color: '#444455'
    }).setOrigin(0.5);

    // input field (visual representation)
    const inputBg = this.add.rectangle(this.cx, 240, width - 60, 60, 0x111122)
      .setStrokeStyle(2, 0x444455);

    this.inputText = this.add.text(this.cx, 240, this.handle || '_', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ebe2d2'
    }).setOrigin(0.5);

    // help text
    this.add.text(this.cx, 290, 'type. 3-16 characters. letters, numbers, underscore.', {
      fontFamily: 'monospace', fontSize: '10px', color: '#444455'
    }).setOrigin(0.5);

    this.errorText = this.add.text(this.cx, 320, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#cc4444'
    }).setOrigin(0.5);

    // confirm button
    const btnY = height - 80;
    const confirmBg = this.add.rectangle(this.cx, btnY, width - 60, 50, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.cx, btnY, 'CONFIRM', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);
    confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x8a1f15));
    confirmBg.on('pointerout',  () => confirmBg.setFillStyle(0xb32a1f));
    confirmBg.on('pointerup',   () => this.confirm());

    // keyboard input
    this.input.keyboard.on('keydown', (e) => this.handleKey(e));

    // blink cursor
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.refreshDisplay()
    });
    this._cursorBlink = true;
  }

  handleKey(e) {
    if (e.key === 'Enter') {
      this.confirm();
      return;
    }
    if (e.key === 'Backspace') {
      this.handle = this.handle.slice(0, -1);
      this.refreshDisplay();
      return;
    }
    // accept letters, numbers, underscore
    if (e.key.length === 1 && /^[a-zA-Z0-9_]$/.test(e.key) && this.handle.length < 16) {
      this.handle += e.key.toLowerCase();
      this.refreshDisplay();
    }
  }

  refreshDisplay() {
    this._cursorBlink = !this._cursorBlink;
    const cursor = this._cursorBlink ? '_' : ' ';
    this.inputText.setText(this.handle + cursor);
  }

  async confirm() {
    const h = this.handle.trim();
    if (h.length < 3) {
      this.errorText.setText('too short. min 3 characters.');
      return;
    }
    if (h.length > 16) {
      this.errorText.setText('too long. max 16 characters.');
      return;
    }

    // save to supabase
    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        const { error } = await supabase.from('aw_users')
          .update({ handle: h })
          .eq('user_id', userId);
        if (error) {
          this.errorText.setText('that name is taken. try another.');
          return;
        }
      }
      // update in-memory handle
      if (window.aliworldGame) window.aliworldGame.userHandle = h;
    } catch (e) {
      console.warn('[NameScene] save failed:', e);
    }

    this.cameras.main.fadeOut(500, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('AccessoryScene', { returnScene: 'OutroIntroScene', isFirstTime: true });
    });
  }
}

window.NameScene = NameScene;
