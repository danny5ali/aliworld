// aliworld/scenes/E1Scene.js
// episode 1 — the field / the cafe
// now uses real backgrounds + archetype sprites

class E1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'E1Scene' });
  }

  init(data) {
    this.combatResult  = data && data.combatResult;
    this.defeatedEnemy = data && data.enemyKey;
  }

  create() {
    if (this.combatResult === 'lose') {
      const p = this.registry.get('playerState');
      if (p) { p.hp = p.maxHp; this.registry.set('playerState', p); }
    }

    if (this.combatResult === 'win') {
      const current = this.registry.get('e1Progress');
      if (current === 'skeptic_fight') this.registry.set('e1Progress', 'walker_beat');
      if (current === 'walker_fight')  this.registry.set('e1Progress', 'cafe_beat');
      if (current === 'mark_fight')    this.registry.set('e1Progress', 'obsidian_beat');
    }

    const progress = this.registry.get('e1Progress') || 'intro';

    switch (progress) {
      case 'intro':         return this.startIntro();
      case 'skeptic_fight': return this.startSkepticFight();
      case 'walker_beat':   return this.startWalkerBeat();
      case 'walker_fight':  return this.startWalkerFight();
      case 'cafe_beat':     return this.startCafeBeat();
      case 'mark_fight':    return this.startMarkFight();
      case 'obsidian_beat': return this.startObsidianBeat();
      default:              return this.startIntro();
    }
  }

  // ─── BACKGROUNDS ─────────────────────────────────────────────────────────

  drawBg(key) {
    const { width, height } = this.scale;
    if (this.textures.exists(key)) {
      this.add.image(width / 2, height / 2, key).setDisplaySize(width, height);
    } else {
      // fallback color per scene
      const colors = {
        bg_field:    0x2a4a2a,
        bg_cafe:     0x2a1f0f,
        bg_obsidian: 0x1a2030,
        bg_steps:    0x2a3a2a,
      };
      this.add.rectangle(0, 0, width, height, colors[key] || 0x0a0a0f).setOrigin(0, 0);
    }
  }

  // ─── PLAYER SPRITE ───────────────────────────────────────────────────────

  addPlayerSprite(x, y) {
    const config = this.registry.get('avatarConfig') || {};
    const archetype = config.archetype || 'atk';
    const state     = config.outerwear_state || 'pre_e1';
    const skin      = config.skin_tone || 'medium';
    const hair      = config.hair_color || 'black';

    const sourceKey = `${archetype}_${state}_idle_0`;
    const targetKey = `${archetype}_${state}_idle_0_${skin}_${hair}`;

    let textureKey;
    if (this.textures.exists(sourceKey)) {
      textureKey = window.PaletteSwap
        ? PaletteSwap.swapPalette(this, sourceKey, targetKey, skin, hair)
        : sourceKey;
    }

    if (textureKey && this.textures.exists(textureKey)) {
      return this.add.image(x, y, textureKey).setDisplaySize(64, 96).setOrigin(0.5, 1);
    } else {
      return this.add.rectangle(x, y, 32, 48, 0x4444cc)
        .setStrokeStyle(2, 0xffffff).setOrigin(0.5, 1);
    }
  }

  addNPC(x, y, color, label) {
    const npc = this.add.rectangle(x, y, 36, 54, color)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5, 1);
    if (label) {
      this.add.text(x, y - 60, label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa'
      }).setOrigin(0.5);
    }
    return npc;
  }

  // ─── DIALOGUE ────────────────────────────────────────────────────────────

  showDialogue(lines, onComplete) {
    const { width, height } = this.scale;
    const boxH = 110;
    const boxY = height - boxH - 10;

    const box = this.add.rectangle(width / 2, boxY + boxH / 2, width - 40, boxH, 0x07070f, 0.94)
      .setStrokeStyle(1, 0x333355);
    const speakerText = this.add.text(40, boxY + 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888899'
    });
    const lineText = this.add.text(40, boxY + 30, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ebe2d2',
      wordWrap: { width: width - 100 }
    });
    const promptText = this.add.text(width - 50, boxY + boxH - 20, '▶', {
      fontFamily: 'monospace', fontSize: '13px', color: '#444466'
    }).setOrigin(0.5);
    this.tweens.add({
      targets: promptText, alpha: { from: 1, to: 0.2 },
      duration: 600, yoyo: true, repeat: -1
    });

    let index = 0;
    const showLine = () => {
      if (index >= lines.length) {
        box.destroy(); speakerText.destroy();
        lineText.destroy(); promptText.destroy();
        return onComplete && onComplete();
      }
      const { speaker, text } = lines[index];
      const isNarration = !speaker;
      speakerText.setText(speaker ? speaker.toUpperCase() : '');
      lineText.setColor(isNarration ? '#8a8070' : '#ebe2d2');
      lineText.setText('');

      let charIdx = 0;
      const ticker = this.time.addEvent({
        delay: isNarration ? 22 : 28,
        repeat: text.length - 1,
        callback: () => { lineText.setText(text.slice(0, ++charIdx)); }
      });

      const advance = () => {
        if (charIdx < text.length) {
          ticker.remove(); lineText.setText(text); charIdx = text.length;
        } else { index++; showLine(); }
      };

      this.input.once('pointerdown', advance);
      this.input.keyboard.once('keydown-SPACE', advance);
      this.input.keyboard.once('keydown-ENTER', advance);
    };
    showLine();
  }

  fadeIn(duration, cb) {
    this.cameras.main.fadeIn(duration || 600, 0, 0, 0);
    if (cb) this.time.delayedCall(duration || 600, cb);
  }

  fadeOut(duration, cb) {
    this.cameras.main.fadeOut(duration || 600, 0, 0, 0);
    if (cb) this.cameras.main.once('camerafadeoutcomplete', cb);
  }

  launchCombat(enemyKey, progressKey) {
    this.registry.set('e1Progress', progressKey);
    const playerState = this.registry.get('playerState');
    this.fadeOut(400, () => {
      this.scene.start('CombatScene', {
        enemy: E1_ENEMIES[enemyKey],
        playerState,
        returnScene: 'E1Scene'
      });
    });
  }

  // ─── BEATS ───────────────────────────────────────────────────────────────

  startIntro() {
    this.fadeIn(1000);
    this.drawBg('bg_field');
    const { width, height } = this.scale;
    const groundY = height * 0.78;
    const player = this.addPlayerSprite(width * 0.12, groundY);

    this.showDialogue([
      { speaker: null,  text: 'where am i.' },
      { speaker: null,  text: 'what is this place.' },
      { speaker: null,  text: 'it feels like something already happened here.' },
      { speaker: null,  text: 'like everyone is playing a part they don\'t know they memorized.' },
      { speaker: null,  text: 'i\'ve been here before. i don\'t remember arriving.' },
    ], () => {
      this.tweens.add({
        targets: player, x: width * 0.38, duration: 1400, ease: 'Linear',
        onComplete: () => this.triggerSkeptic(player)
      });
    });
  }

  triggerSkeptic(player) {
    const { width, height } = this.scale;
    const groundY = height * 0.78;
    const skeptic = this.addNPC(width * 0.75, groundY, 0xaa7744, 'stranger');
    this.tweens.add({
      targets: skeptic, x: width * 0.58, duration: 900, ease: 'Linear',
      onComplete: () => {
        this.showDialogue([
          { speaker: 'stranger', text: 'hey.' },
          { speaker: 'stranger', text: 'hey — i\'m talking to you.' },
          { speaker: null,       text: 'he asked you a question. you didn\'t answer. now he\'s angry.' },
        ], () => this.launchCombat('skeptic', 'skeptic_fight'));
      }
    });
  }

  startSkepticFight() {
    this.fadeIn(400);
    this.drawBg('bg_field');
    const { width, height } = this.scale;
    const groundY = height * 0.78;
    this.addPlayerSprite(width * 0.38, groundY);
    this.addNPC(width * 0.58, groundY, 0xaa7744, 'stranger');
    this.showDialogue([
      { speaker: null, text: 'he\'s still in your way.' }
    ], () => this.launchCombat('skeptic', 'skeptic_fight'));
  }

  startWalkerBeat() {
    this.fadeIn(600);
    this.drawBg('bg_field');
    const { width, height } = this.scale;
    const groundY = height * 0.78;
    this.addPlayerSprite(width * 0.2, groundY);
    this.addNPC(width * 0.6, groundY, 0x778899, 'walker');

    this.showDialogue([
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: null,     text: 'he doesn\'t see you. he\'s somewhere else entirely.' },
      { speaker: null,     text: 'you step into his path.' },
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: 'walker', text: 'that new joint is —' },
      { speaker: 'walker', text: '... you.' },
    ], () => this.launchCombat('walker', 'walker_fight'));
  }

  startWalkerFight() {
    this.fadeIn(400);
    this.drawBg('bg_field');
    const { width, height } = this.scale;
    const groundY = height * 0.78;
    this.addPlayerSprite(width * 0.2, groundY);
    this.addNPC(width * 0.6, groundY, 0x778899, 'walker');
    this.showDialogue([
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: null,     text: 'he loops back.' }
    ], () => this.launchCombat('walker', 'walker_fight'));
  }

  startCafeBeat() {
    this.fadeIn(800);
    this.drawBg('bg_cafe');
    const { width, height } = this.scale;
    const groundY = height * 0.82;
    const player = this.addPlayerSprite(width * 0.12, groundY);
    this.addNPC(width * 0.52, groundY, 0x888866, null);
    const mark = this.addNPC(width * 0.62, groundY, 0xcc9966, 'mark');

    this.showDialogue([
      { speaker: null,   text: 'the cafe is warm. everyone is talking.' },
      { speaker: null,   text: 'nobody looks up. except one.' },
      { speaker: 'mark', text: 'hey —' },
      { speaker: 'mark', text: 'you been around here long?' },
    ], () => {
      this.tweens.add({
        targets: mark, x: width * 0.42, duration: 800, ease: 'Linear',
        onComplete: () => {
          this.showDialogue([
            { speaker: 'mark', text: 'i feel like i\'ve seen you before.' },
            { speaker: null,   text: 'his face is friendly. his eyes don\'t match.' },
            { speaker: 'mark', text: 'what\'d you say your name was?' },
            { speaker: null,   text: 'you don\'t answer.' },
            { speaker: 'mark', text: 'you should sit down.' },
            { speaker: null,   text: 'the conversation wasn\'t an invitation. it was a hold.' },
          ], () => this.launchCombat('mark', 'mark_fight'));
        }
      });
    });
  }

  startMarkFight() {
    this.fadeIn(400);
    this.drawBg('bg_cafe');
    const { width, height } = this.scale;
    const groundY = height * 0.82;
    this.addPlayerSprite(width * 0.12, groundY);
    this.addNPC(width * 0.42, groundY, 0xcc9966, 'mark');
    this.showDialogue([
      { speaker: 'mark', text: 'you should sit down.' },
      { speaker: null,   text: 'he says it again. like it\'s the first time.' }
    ], () => this.launchCombat('mark', 'mark_fight'));
  }

  startObsidianBeat() {
    this.equipRedJacket();
    this.fadeIn(1000);
    this.drawBg('bg_obsidian');
    const { width, height } = this.scale;
    const groundY = height * 0.82;

    // player with post_e1 sprite
    const config = this.registry.get('avatarConfig') || {};
    const arch  = config.archetype || 'atk';
    const skin  = config.skin_tone || 'medium';
    const hair  = config.hair_color || 'black';
    const srcKey = `${arch}_post_e1_idle_0`;
    const tgtKey = `${arch}_post_e1_idle_0_${skin}_${hair}`;
    let playerSprite;

    if (this.textures.exists(srcKey)) {
      const usedKey = window.PaletteSwap
        ? PaletteSwap.swapPalette(this, srcKey, tgtKey, skin, hair)
        : srcKey;
      playerSprite = this.add.image(width * 0.45, groundY, usedKey)
        .setDisplaySize(64, 96).setOrigin(0.5, 1);
    } else {
      playerSprite = this.add.rectangle(width * 0.45, groundY, 32, 48, 0xb32a1f)
        .setStrokeStyle(2, 0xff6644).setOrigin(0.5, 1);
    }

    // cult.18 triangle flash
    this.showTriangleFlash(() => {
      this.showDialogue([
        { speaker: null, text: 'the conversation kept going.' },
        { speaker: null, text: 'it just wasn\'t with him anymore.' },
        { speaker: null, text: 'you walk out.' },
        { speaker: null, text: 'the jacket is on. you don\'t remember putting it on.' },
        { speaker: null, text: 'someone across the street looks up.' },
        { speaker: null, text: 'that\'s the first sighting.' },
      ], () => {
        this.fadeOut(1200, () => {
          this.registry.set('e1Progress', 'complete');
          this.scene.start('OverworldScene', { e1Complete: true });
        });
      });
    });
  }

  showTriangleFlash(onComplete) {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.lineStyle(3, 0xb32a1f, 0);
    const cx = width / 2, cy = height / 2, s = 60;
    g.beginPath();
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s * 0.866, cy + s * 0.5);
    g.lineTo(cx - s * 0.866, cy + s * 0.5);
    g.closePath();
    g.strokePath();
    g.lineBetween(cx - s * 0.4, cy + s * 0.5, cx + s * 0.4, cy + s * 0.5);

    this.tweens.add({
      targets: g,
      alpha: { from: 0, to: 1 },
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => { g.destroy(); onComplete && onComplete(); }
    });
  }

  equipRedJacket() {
    const config = this.registry.get('avatarConfig') || {};
    if (!config.outerwear_starter) {
      config.outerwear_starter = config.outerwear_state || 'pre_e1';
    }
    config.outerwear_state = 'post_e1';
    this.registry.set('avatarConfig', config);

    const playerState = this.registry.get('playerState') || {};
    playerState.outerwear_state = 'post_e1';
    this.registry.set('playerState', playerState);

    // persist to supabase
    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        supabase.from('aw_users')
          .update({ outerwear_state: 'post_e1' })
          .eq('user_id', userId)
          .then(() => {})
          .catch(() => {});
      }
    } catch (e) {}
  }
}

const E1_ENEMIES = {
  skeptic: {
    key: 'skeptic', name: 'The Skeptic',
    hp: 22, maxHp: 22, atk: 6, def: 2, spd: 4, lck: 2,
    moves: ['STRIKE', 'STRIKE', 'SLIP'],
    telegraph: { STRIKE: 'winding up', SLIP: 'stepping in close' }
  },
  walker: {
    key: 'walker', name: 'The Walker',
    hp: 28, maxHp: 28, atk: 5, def: 4, spd: 8, lck: 2,
    moves: ['STRIKE', 'SLIP'],
    telegraph: { STRIKE: 'that new joint is crazy', SLIP: 'that new joint is crazy' },
    ai: 'repeat'
  },
  mark: {
    key: 'mark', name: 'Mark',
    hp: 45, maxHp: 45, atk: 5, def: 5, spd: 5, lck: 4,
    moves: ['WHISPER', 'STRIKE', 'HOLD', 'WHISPER', 'LOOP'],
    telegraph: {
      WHISPER: 'what\'d you say your name was?',
      STRIKE:  'i feel like i\'ve seen you before —',
      HOLD:    'you should sit down',
      LOOP:    'you been around here long?'
    },
    isBoss: true
  }
};

window.E1Scene    = E1Scene;
window.E1_ENEMIES = E1_ENEMIES;
