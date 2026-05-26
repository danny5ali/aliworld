// aliworld/scenes/E1Scene.js
//
// episode 1 — the field / the cafe
// flow: field intro → skeptic fight → walker fight → cafe → mark boss → obsidian end scene
//
// combat returns here (returnScene: 'E1Scene').
// progress tracked in registry so the right beat resumes after each fight.

class E1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'E1Scene' });
  }

  init(data) {
    this.combatResult  = data && data.combatResult;
    this.defeatedEnemy = data && data.enemyKey;
  }

  create() {
    // on a loss, restore hp and retry the same beat
    if (this.combatResult === 'lose') {
      const p = this.registry.get('playerState');
      if (p) { p.hp = p.maxHp; this.registry.set('playerState', p); }
    }

    // advance progress only on a win
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

  // ─── SHARED UTILITIES ────────────────────────────────────────────────────

  drawFieldBg() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height * 0.65, 0x87ceeb).setOrigin(0, 0);
    this.add.rectangle(0, height * 0.65, width, height * 0.35, 0x4a7c3f).setOrigin(0, 0);
    [0.15, 0.45, 0.75].forEach(x => {
      this.add.ellipse(width * x, height * 0.15, 120, 40, 0xffffff, 0.7);
    });
    this.add.rectangle(0, height * 0.72, width, 4, 0x2d5a1b).setOrigin(0, 0);
  }

  drawCafeBg() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x2a1f0f).setOrigin(0, 0);
    this.add.rectangle(40, 30, width - 80, height - 60, 0xd4956a).setOrigin(0, 0);
    this.add.rectangle(0, height * 0.7, width, height * 0.3, 0x8b5e3c).setOrigin(0, 0);
    this.add.rectangle(width * 0.3, 40, width * 0.4, height * 0.4, 0xfff8e7, 0.6).setOrigin(0, 0);
    [[0.2, 0.65], [0.5, 0.65], [0.8, 0.65]].forEach(([x, y]) => {
      this.add.rectangle(width * x, height * y, 60, 8, 0x5a3a1a).setOrigin(0.5);
      this.add.rectangle(width * x, height * y + 30, 6, 40, 0x5a3a1a).setOrigin(0.5, 0);
    });
  }

  drawObsidianBg() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1a2030).setOrigin(0, 0);
    this.add.rectangle(0, height * 0.5, width, height * 0.5, 0x0a0f18).setOrigin(0, 0);
    this.add.rectangle(width * 0.1, height * 0.15, width * 0.8, height * 0.5, 0x2a3040).setOrigin(0, 0);
    this.add.text(width / 2, height * 0.32, 'OBSIDIAN', {
      fontFamily: 'monospace', fontSize: '32px', color: '#6688cc', fontStyle: 'bold'
    }).setOrigin(0.5);
    for (let i = 0; i < 6; i++) {
      this.add.circle(width * 0.1 + (width * 0.8 / 5) * i, height * 0.18, 4, 0xffee88);
    }
  }

  // dialogue system
  // speaker: null = narration (dimmer color), string = character name
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
      fontFamily: 'monospace', fontSize: '15px',
      color: '#ebe2d2', // default: character dialogue
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
      // narration = muted warm gray, dialogue = cream
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
        } else {
          index++; showLine();
        }
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

  addNPC(x, y, color, label) {
    const npc = this.add.rectangle(x, y, 36, 54, color).setStrokeStyle(2, 0xffffff);
    if (label) {
      this.add.text(x, y - 36, label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#aaaaaa'
      }).setOrigin(0.5);
    }
    return npc;
  }

  addPlayer(x, y) {
    return this.add.rectangle(x, y, 32, 48, 0x4444cc).setStrokeStyle(2, 0xffffff);
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

  // ─── BEAT 1: INTRO ───────────────────────────────────────────────────────

  startIntro() {
    this.fadeIn(1000);
    this.drawFieldBg();
    const { width, height } = this.scale;
    const player = this.addPlayer(80, height * 0.68);

    const lines = [
      { speaker: null,  text: 'where am i.' },
      { speaker: null,  text: 'what is this place.' },
      { speaker: null,  text: 'it feels like something already happened here.' },
      { speaker: null,  text: 'like everyone is playing a part they don\'t know they memorized.' },
      { speaker: null,  text: 'i\'ve been here before. i don\'t remember arriving.' },
    ];

    this.showDialogue(lines, () => {
      this.tweens.add({
        targets: player, x: width * 0.35, duration: 1200, ease: 'Linear',
        onComplete: () => this.triggerSkeptic(player)
      });
    });
  }

  triggerSkeptic(player) {
    const { width, height } = this.scale;
    const skeptic = this.addNPC(width - 80, height * 0.68, 0xaa7744, 'stranger');
    this.tweens.add({
      targets: skeptic, x: width * 0.65, duration: 900, ease: 'Linear',
      onComplete: () => {
        this.showDialogue([
          { speaker: 'stranger', text: 'hey.' },
          { speaker: 'stranger', text: 'hey — i\'m talking to you.' },
          { speaker: null,       text: 'he asked you a question. you didn\'t answer. now he\'s angry.' },
        ], () => this.launchCombat('skeptic', 'skeptic_fight'));
      }
    });
  }

  // resume point if player lost to skeptic and reloaded
  startSkepticFight() {
    this.fadeIn(400);
    this.drawFieldBg();
    const { width, height } = this.scale;
    this.addPlayer(width * 0.35, height * 0.68);
    this.addNPC(width * 0.65, height * 0.68, 0xaa7744, 'stranger');
    this.showDialogue([
      { speaker: null, text: 'he\'s still in your way.' }
    ], () => this.launchCombat('skeptic', 'skeptic_fight'));
  }

  // ─── BEAT 2: WALKER ──────────────────────────────────────────────────────

  startWalkerBeat() {
    this.fadeIn(600);
    this.drawFieldBg();
    const { width, height } = this.scale;
    this.addPlayer(width * 0.2, height * 0.68);
    this.addNPC(width * 0.6, height * 0.68, 0x778899, 'walker');

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
    this.drawFieldBg();
    const { width, height } = this.scale;
    this.addPlayer(width * 0.2, height * 0.68);
    this.addNPC(width * 0.6, height * 0.68, 0x778899, 'walker');
    this.showDialogue([
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: null,     text: 'he loops back.' }
    ], () => this.launchCombat('walker', 'walker_fight'));
  }

  // ─── BEAT 3: CAFE + MARK ─────────────────────────────────────────────────

  startCafeBeat() {
    this.fadeIn(800);
    this.drawCafeBg();
    const { width, height } = this.scale;
    const player = this.addPlayer(width * 0.15, height * 0.65);
    this.addNPC(width * 0.52, height * 0.6, 0x888866, null);
    const mark = this.addNPC(width * 0.62, height * 0.6, 0xcc9966, 'mark');

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
    this.drawCafeBg();
    const { width, height } = this.scale;
    this.addPlayer(width * 0.15, height * 0.65);
    this.addNPC(width * 0.42, height * 0.6, 0xcc9966, 'mark');
    this.showDialogue([
      { speaker: 'mark', text: 'you should sit down.' },
      { speaker: null,   text: 'he says it again. like it\'s the first time.' }
    ], () => this.launchCombat('mark', 'mark_fight'));
  }

  // ─── BEAT 4: OBSIDIAN ────────────────────────────────────────────────────

  startObsidianBeat() {
    this.equipRedJacket();
    this.fadeIn(1000);
    this.drawObsidianBg();
    const { width, height } = this.scale;

    // player in red jacket
    const player = this.addPlayer(width * 0.45, height * 0.68);
    player.setFillStyle(0xb32a1f);
    player.setStrokeStyle(2, 0xff6644);

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
  }

  equipRedJacket() {
    const config = this.registry.get('avatarConfig') || {};
    if (!config.outerwear_starter) {
      config.outerwear_starter = config.outerwear || 'blacktrench';
    }
    config.outerwear = 'redjacket';
    this.registry.set('avatarConfig', config);
    const playerState = this.registry.get('playerState') || {};
    playerState.outerwear = 'redjacket';
    this.registry.set('playerState', playerState);
  }
}

// ─── ENEMY DEFINITIONS ───────────────────────────────────────────────────────

const E1_ENEMIES = {
  skeptic: {
    key: 'skeptic',
    name: 'The Skeptic',
    hp: 22, maxHp: 22,
    atk: 6, def: 2, spd: 4, lck: 2,
    moves: ['STRIKE', 'STRIKE', 'SLIP'],
    telegraph: { STRIKE: 'winding up', SLIP: 'stepping in close' }
  },
  walker: {
    key: 'walker',
    name: 'The Walker',
    hp: 28, maxHp: 28,
    atk: 5, def: 4, spd: 8, lck: 2,
    moves: ['STRIKE', 'SLIP'],
    telegraph: { STRIKE: 'that new joint is crazy', SLIP: 'that new joint is crazy' },
    ai: 'repeat'
  },
  mark: {
    key: 'mark',
    name: 'Mark',
    hp: 45, maxHp: 45,
    atk: 5, def: 5, spd: 5, lck: 4,
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

window.E1Scene  = E1Scene;
window.E1_ENEMIES = E1_ENEMIES;
