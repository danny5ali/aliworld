// aliworld/scenes/HomeScene.js
// landing scene for returning players. shows current archetype + jacket state.
// options: continue, new game (reset progress), loadout

class HomeScene extends Phaser.Scene {
  constructor() { super({ key: 'HomeScene' }); }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    this.cameras.main.fadeIn(800, 0, 0, 0);

    // dark background with subtle sigil
    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);
    this.drawBackgroundSigil();

    // logo / wordmark
    this.add.text(this.cx, 70, 'ALIWORLD', {
      fontFamily: 'monospace', fontSize: '32px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    // handle display
    const handle = (window.aliworldGame && window.aliworldGame.userHandle) || 'unknown';
    this.add.text(this.cx, 108, handle, {
      fontFamily: 'monospace', fontSize: '11px', color: '#555566'
    }).setOrigin(0.5);

    // player sprite preview (with palette swap applied)
    this.drawPlayerPreview();

    // buttons
    this.buildButtons();
  }

  drawBackgroundSigil() {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.lineStyle(2, 0xb32a1f, 0.08);
    const cx = width / 2, cy = height / 2;
    const s = 140;
    g.beginPath();
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s * 0.866, cy + s * 0.5);
    g.lineTo(cx - s * 0.866, cy + s * 0.5);
    g.closePath();
    g.strokePath();
    g.lineBetween(cx - s * 0.4, cy + s * 0.5, cx + s * 0.4, cy + s * 0.5);
    this.tweens.add({
      targets: g, alpha: { from: 0.5, to: 1 },
      duration: 3500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });
  }

  drawPlayerPreview() {
    const config = this.registry.get('avatarConfig') || {};
    const archetype = config.archetype || 'atk';
    const state = config.outerwear_state || 'pre_e1';
    const skin = config.skin_tone || 'medium';
    const hair = config.hair_color || 'black';
    const srcKey = `${archetype}_${state}_idle_0`;

    if (this.textures.exists(srcKey) && window.PaletteSwap) {
      const targetKey = `${srcKey}_${skin}_${hair}`;
      const finalKey = PaletteSwap.swapPalette(this, srcKey, targetKey, skin, hair);
      const img = this.add.image(this.cx, this.scale.height / 2 - 40, finalKey).setOrigin(0.5, 0.5);
      const targetH = 320;
      const sourceH = img.height;
      const scale = Math.min(1, targetH / sourceH);
      img.setScale(scale);
      // gentle bob
      this.tweens.add({
        targets: img, y: img.y + 4,
        duration: 2400, yoyo: true, repeat: -1, ease:'Sine.easeInOut'
      });
    } else {
      this.add.text(this.cx, this.scale.height / 2 - 40, '(loading character...)', {
        fontFamily: 'monospace', fontSize: '12px', color: '#444455'
      }).setOrigin(0.5);
    }
  }

  buildButtons() {
    const { width, height } = this.scale;
    const e1Progress = this.registry.get('e1Progress');
    const config = this.registry.get('avatarConfig') || {};
    const hasProgress = e1Progress && e1Progress !== 'intro';

    const btnX = this.cx;
    const startY = height - 280;
    const gap = 14;
    const btnH = 50;
    const btnW = width - 60;

    // continue / begin button
    const continueLabel = hasProgress ? 'CONTINUE' : 'BEGIN EPISODE 1';
    const cBg = this.add.rectangle(btnX, startY, btnW, btnH, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    this.add.text(btnX, startY, continueLabel, {
      fontFamily:'monospace', fontSize:'14px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5);
    cBg.on('pointerover', () => cBg.setFillStyle(0x8a1f15));
    cBg.on('pointerout',  () => cBg.setFillStyle(0xb32a1f));
    cBg.on('pointerup',   () => {
      if (!hasProgress) this.registry.set('e1Progress', 'intro');
      this.scene.start('E1Scene');
    });

    // loadout button
    const lY = startY + btnH + gap;
    const lBg = this.add.rectangle(btnX, lY, btnW, btnH, 0x1a1a2a)
      .setStrokeStyle(1, 0x444455).setInteractive({ useHandCursor: true });
    this.add.text(btnX, lY, 'LOADOUT', {
      fontFamily:'monospace', fontSize:'13px', color:'#888899'
    }).setOrigin(0.5);
    lBg.on('pointerup', () => this.scene.start('AccessoryScene', { returnScene: 'HomeScene' }));

    // new game (reset) button
    const nY = lY + btnH + gap;
    const nBg = this.add.rectangle(btnX, nY, btnW, btnH, 0x1a1a2a)
      .setStrokeStyle(1, 0x333344).setInteractive({ useHandCursor: true });
    this.add.text(btnX, nY, 'NEW GAME', {
      fontFamily:'monospace', fontSize:'13px', color:'#666677'
    }).setOrigin(0.5);
    nBg.on('pointerup', () => this.confirmNewGame());
  }

  confirmNewGame() {
    const { width, height } = this.scale;

    // dark overlay
    const overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.85)
      .setOrigin(0, 0).setDepth(500).setInteractive();

    const box = this.add.rectangle(this.cx, height/2, width - 60, 220, 0x1a1a2a)
      .setStrokeStyle(2, 0xb32a1f).setDepth(501);

    const q = this.add.text(this.cx, height/2 - 50, 'start over?', {
      fontFamily:'monospace', fontSize:'16px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(502);

    const detail = this.add.text(this.cx, height/2 - 20, 'all progress will be erased.\nyou will pick a new character.', {
      fontFamily:'monospace', fontSize:'11px', color:'#888899', align:'center'
    }).setOrigin(0.5).setDepth(502);

    const yes = this.add.rectangle(this.cx - 80, height/2 + 50, 130, 40, 0xb32a1f)
      .setInteractive({ useHandCursor: true }).setDepth(502);
    this.add.text(this.cx - 80, height/2 + 50, 'YES, RESET', {
      fontFamily:'monospace', fontSize:'12px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(503);

    const no = this.add.rectangle(this.cx + 80, height/2 + 50, 130, 40, 0x1a1a2a)
      .setStrokeStyle(1, 0x444455).setInteractive({ useHandCursor: true }).setDepth(502);
    this.add.text(this.cx + 80, height/2 + 50, 'CANCEL', {
      fontFamily:'monospace', fontSize:'12px', color:'#888899'
    }).setOrigin(0.5).setDepth(503);

    yes.on('pointerup', () => this.resetProgress());
    no.on('pointerup', () => {
      overlay.destroy(); box.destroy(); q.destroy(); detail.destroy();
      yes.destroy(); no.destroy();
      // clean up text - in phaser, destroying parent doesn't always clean text
      this.children.list.filter(c => c.depth >= 502).forEach(c => c.destroy());
    });
  }

  async resetProgress() {
    // wipe registry
    this.registry.set('e1Progress', null);
    this.registry.set('avatarConfig', null);
    this.registry.set('playerState', null);

    // wipe supabase row
    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        await supabase.from('aw_users').update({
          archetype: null,
          skin_tone: 'medium',
          hair_color: 'black',
          outerwear_state: 'pre_e1'
        }).eq('user_id', userId);
      }
    } catch (e) { console.warn('[HomeScene] reset failed:', e); }

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('IntroScene');
    });
  }
}

window.HomeScene = HomeScene;
