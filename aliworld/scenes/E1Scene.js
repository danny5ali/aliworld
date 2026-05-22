// aliworld/scenes/E1Scene.js
//
// episode 1 — the field / the cafe
// flow: field intro → skeptic fight → walker fight → cafe → mark boss → obsidian end scene
//
// backgrounds load from cloudinary when art is ready.
// until then, all backgrounds are drawn in code.
// NPC sprites are colored rectangles until artist delivers.

class E1Scene extends Phaser.Scene {
  constructor() {
    super({ key: 'E1Scene' });
  }

  init(data) {
    this.combatResult = data && data.combatResult;
    this.defeatedEnemy = data && data.enemyKey;
    // track episode progress in registry so it survives scene transitions
    if (!this.registry.has('e1Progress')) {
      this.registry.set('e1Progress', 'intro');
    }
  }

  create() {
    const progress = this.registry.get('e1Progress');
    // route to the right beat based on where we are
    switch (progress) {
      case 'intro':           return this.startIntro();
      case 'post_skeptic':    return this.startWalkerBeat();
      case 'post_walker':     return this.startCafeBeat();
      case 'post_mark':       return this.startObsidianBeat();
      default:                return this.startIntro();
    }
  }

  // ─── SHARED UTILITIES ────────────────────────────────────────────────────

  drawFieldBg() {
    // placeholder field until e1.png is wired as asset
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height * 0.65, 0x87ceeb).setOrigin(0, 0); // sky
    this.add.rectangle(0, height * 0.65, width, height * 0.35, 0x4a7c3f).setOrigin(0, 0); // grass
    // clouds
    [0.15, 0.45, 0.75].forEach(x => {
      this.add.ellipse(width * x, height * 0.15, 120, 40, 0xffffff, 0.7);
    });
    // ground line
    this.add.rectangle(0, height * 0.72, width, 4, 0x2d5a1b).setOrigin(0, 0);
  }

  drawCafeBg() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x2a1f0f).setOrigin(0, 0); // dark outer
    this.add.rectangle(40, 30, width - 80, height - 60, 0xd4956a).setOrigin(0, 0); // warm walls
    // floor
    this.add.rectangle(0, height * 0.7, width, height * 0.3, 0x8b5e3c).setOrigin(0, 0);
    // window
    this.add.rectangle(width * 0.3, 40, width * 0.4, height * 0.4, 0xfff8e7, 0.6).setOrigin(0, 0);
    // tables
    [[0.2, 0.65], [0.5, 0.65], [0.8, 0.65]].forEach(([x, y]) => {
      this.add.rectangle(width * x, height * y, 60, 8, 0x5a3a1a).setOrigin(0.5);
      this.add.rectangle(width * x, height * y + 30, 6, 40, 0x5a3a1a).setOrigin(0.5, 0);
    });
  }

  drawObsidianBg() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x1a2030).setOrigin(0, 0); // night
    this.add.rectangle(0, height * 0.5, width, height * 0.5, 0x0a0f18).setOrigin(0, 0); // ground
    // building facade
    this.add.rectangle(width * 0.1, height * 0.15, width * 0.8, height * 0.5, 0x2a3040).setOrigin(0, 0);
    // sign
    const signText = this.add.text(width / 2, height * 0.32, 'OBSIDIAN', {
      fontFamily: 'monospace', fontSize: '32px', color: '#6688cc', fontStyle: 'bold'
    }).setOrigin(0.5);
    // string lights
    for (let i = 0; i < 6; i++) {
      const lx = width * 0.1 + (width * 0.8 / 5) * i;
      this.add.circle(lx, height * 0.18, 4, 0xffee88);
    }
  }

  // dialogue box at bottom of screen
  // lines: array of { speaker, text } objects
  // onComplete: called when all lines are done
  showDialogue(lines, onComplete) {
    const { width, height } = this.scale;
    const boxH = 110;
    const boxY = height - boxH - 10;

    const box = this.add.rectangle(width / 2, boxY + boxH / 2, width - 40, boxH, 0x0a0a12, 0.92)
      .setStrokeStyle(1, 0x444466);
    const speakerText = this.add.text(40, boxY + 12, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888899'
    });
    const lineText = this.add.text(40, boxY + 30, '', {
      fontFamily: 'monospace', fontSize: '15px', color: '#ebe2d2',
      wordWrap: { width: width - 100 }
    });
    const promptText = this.add.text(width - 50, boxY + boxH - 20, '▶', {
      fontFamily: 'monospace', fontSize: '13px', color: '#666677'
    }).setOrigin(0.5);

    // blink the prompt
    this.tweens.add({
      targets: promptText, alpha: { from: 1, to: 0.2 },
      duration: 600, yoyo: true, repeat: -1
    });

    let index = 0;
    const showLine = () => {
      if (index >= lines.length) {
        box.destroy(); speakerText.destroy(); lineText.destroy(); promptText.destroy();
        return onComplete && onComplete();
      }
      const { speaker, text } = lines[index];
      speakerText.setText(speaker ? speaker.toUpperCase() : '');
      lineText.setText('');
      // typewriter
      let charIdx = 0;
      const ticker = this.time.addEvent({
        delay: 28,
        repeat: text.length - 1,
        callback: () => {
          lineText.setText(text.slice(0, ++charIdx));
        }
      });
      // advance on click or space
      const advance = () => {
        if (charIdx < text.length) {
          ticker.remove();
          lineText.setText(text);
          charIdx = text.length;
        } else {
          index++;
          showLine();
        }
      };
      this.input.once('pointerdown', advance);
      this.input.keyboard.once('keydown-SPACE', advance);
      this.input.keyboard.once('keydown-ENTER', advance);
    };
    showLine();
  }

  // fade in/out helpers
  fadeIn(duration, cb) {
    this.cameras.main.fadeIn(duration || 600, 0, 0, 0);
    if (cb) this.time.delayedCall(duration || 600, cb);
  }

  fadeOut(duration, cb) {
    this.cameras.main.fadeOut(duration || 600, 0, 0, 0);
    if (cb) this.cameras.main.once('camerafadeoutcomplete', cb);
  }

  // placeholder NPC rectangle sprite
  addNPC(x, y, color, label) {
    const { height } = this.scale;
    const npc = this.add.rectangle(x, y, 36, 54, color).setStrokeStyle(2, 0xffffff);
    if (label) {
      this.add.text(x, y - 36, label, {
        fontFamily: 'monospace', fontSize: '11px', color: '#cccccc'
      }).setOrigin(0.5);
    }
    return npc;
  }

  // player placeholder
  addPlayer(x, y) {
    const player = this.add.rectangle(x, y, 32, 48, 0x4444cc).setStrokeStyle(2, 0xffffff);
    return player;
  }

  // ─── BEAT 1: FIELD INTRO ─────────────────────────────────────────────────

  startIntro() {
    this.fadeIn(800);
    this.drawFieldBg();
    const { width, height } = this.scale;

    // player enters from left
    const player = this.addPlayer(80, height * 0.68);

    // internal monologue sequence — MDNGHT questioning the world
    const introLines = [
      { speaker: '',         text: 'where am i.' },
      { speaker: '',         text: 'what is this place.' },
      { speaker: '',         text: 'it feels like something already happened here.' },
      { speaker: '',         text: 'like everyone is playing a part they don\'t know they memorized.' },
      { speaker: '',         text: 'i\'ve been here before. i don\'t remember arriving.' },
    ];

    this.showDialogue(introLines, () => {
      // walk player toward center
      this.tweens.add({
        targets: player, x: width * 0.35, duration: 1200, ease: 'Linear',
        onComplete: () => this.startSkepticEncounter(player)
      });
    });
  }

  startSkepticEncounter(player) {
    const { width, height } = this.scale;

    // skeptic walks in from the right
    const skeptic = this.addNPC(width - 80, height * 0.68, 0xaa7744, 'stranger');
    this.tweens.add({
      targets: skeptic, x: width * 0.65, duration: 900, ease: 'Linear',
      onComplete: () => {
        const preLines = [
          { speaker: 'stranger', text: 'hey.' },
          { speaker: 'stranger', text: 'hey — i\'m talking to you.' },
          { speaker: '',         text: 'he asked you a question. you didn\'t answer. now he\'s angry.' },
        ];
        this.showDialogue(preLines, () => {
          this.fadeOut(400, () => {
            this.registry.set('e1Progress', 'post_skeptic');
            const playerState = this.registry.get('playerState');
            this.scene.start('CombatScene', {
              enemy: ENEMIES.skeptic,
              playerState,
              returnScene: 'E1Scene'
            });
          });
        });
      }
    });
  }

  // ─── BEAT 2: WALKER ──────────────────────────────────────────────────────

  startWalkerBeat() {
    this.fadeIn(600);
    this.drawFieldBg();
    const { width, height } = this.scale;

    const player = this.addPlayer(width * 0.2, height * 0.68);
    // walker crosses screen pushing invisible cart, looping
    const walker = this.addNPC(width * 0.6, height * 0.68, 0x778899, 'walker');

    const walkerLines = [
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: '',       text: 'he doesn\'t see you. he\'s somewhere else entirely.' },
      { speaker: '',       text: 'you step into his path.' },
      { speaker: 'walker', text: 'that new joint is crazy.' },
      { speaker: 'walker', text: 'that new joint is —' },
      { speaker: 'walker', text: '... you.' },
    ];

    this.showDialogue(walkerLines, () => {
      this.fadeOut(400, () => {
        const playerState = this.registry.get('playerState');
        this.scene.start('CombatScene', {
          enemy: ENEMIES.walker,
          playerState,
          returnScene: 'E1Scene'
        });
      });
    });
  }

  // ─── BEAT 3: CAFE + MARK ─────────────────────────────────────────────────

  startCafeBeat() {
    this.fadeIn(800);
    this.drawCafeBg();
    const { width, height } = this.scale;

    const player = this.addPlayer(width * 0.15, height * 0.65);

    // two figures at a table — mark and a friend, mid-conversation
    const friend = this.addNPC(width * 0.52, height * 0.6, 0x888866, null);
    const mark = this.addNPC(width * 0.62, height * 0.6, 0xcc9966, 'mark');

    const cafeLines = [
      { speaker: '',     text: 'the cafe is warm. everyone is talking.' },
      { speaker: '',     text: 'nobody looks up. except one.' },
      { speaker: 'mark', text: 'hey —' },
      { speaker: 'mark', text: 'you been around here long?' },
    ];

    this.showDialogue(cafeLines, () => {
      // mark walks toward player
      this.tweens.add({
        targets: mark, x: width * 0.42, duration: 800, ease: 'Linear',
        onComplete: () => {
          const preMarkLines = [
            { speaker: 'mark', text: 'i feel like i\'ve seen you before.' },
            { speaker: '',     text: 'his face is friendly. his eyes don\'t match.' },
            { speaker: 'mark', text: 'what\'d you say your name was?' },
            { speaker: '',     text: 'you don\'t answer.' },
            { speaker: 'mark', text: 'you should sit down.' },
            { speaker: '',     text: 'the conversation wasn\'t an invitation. it was a hold.' },
          ];
          this.showDialogue(preMarkLines, () => {
            this.fadeOut(500, () => {
              const playerState = this.registry.get('playerState');
              this.scene.start('CombatScene', {
                enemy: ENEMIES.mark,
                playerState,
                returnScene: 'E1Scene'
              });
            });
          });
        }
      });
    });
  }

  // ─── BEAT 4: OBSIDIAN + RED JACKET ───────────────────────────────────────

  startObsidianBeat() {
    this.fadeIn(1000);
    this.drawObsidianBg();
    const { width, height } = this.scale;

    // player walks out — in the red jacket now
    const player = this.addPlayer(width * 0.45, height * 0.68);
    // red jacket tint
    player.setFillStyle(0xb32a1f);
    player.setStrokeStyle(2, 0xff6644);

    // red jacket equip moment — happens silently as they walk out
    this.equipRedJacket();

    const endLines = [
      { speaker: '',  text: 'the conversation kept going.' },
      { speaker: '',  text: 'it just wasn\'t with him anymore.' },
      { speaker: '',  text: 'you walk out.' },
      { speaker: '',  text: 'the jacket is on. you don\'t remember putting it on.' },
      { speaker: '',  text: 'someone across the street looks up.' },
      { speaker: '',  text: 'that\'s the first sighting.' },
    ];

    this.showDialogue(endLines, () => {
      this.fadeOut(1200, () => {
        this.registry.set('e1Progress', 'complete');
        // for now, route to overworld with e1 complete flag
        // episode 2 scene will replace this when built
        this.scene.start('OverworldScene', { e1Complete: true });
      });
    });
  }

  equipRedJacket() {
    // pull the avatar config from registry, overwrite outerwear with redjacket
    const config = this.registry.get('avatarConfig') || {};
    if (!config.outerwear_starter) {
      config.outerwear_starter = config.outerwear || 'blacktrench';
    }
    config.outerwear = 'redjacket';
    this.registry.set('avatarConfig', config);
    // also persist to playerState
    const playerState = this.registry.get('playerState') || {};
    playerState.outerwear = 'redjacket';
    this.registry.set('playerState', playerState);
  }

  // ─── COMBAT RETURN ROUTING ───────────────────────────────────────────────

  // called when returning from CombatScene
  // progress is already set before launching combat, so create() routes correctly
  // but we need to handle loses gracefully
  handleCombatReturn() {
    if (this.combatResult === 'lose') {
      // restore hp and retry the same beat
      const p = this.registry.get('playerState');
      p.hp = p.maxHp;
      this.registry.set('playerState', p);
    }
  }
}

// ─── ENEMY DEFINITIONS FOR E1 ───────────────────────────────────────────────

const ENEMIES = {
  skeptic: {
    key: 'skeptic',
    name: 'The Skeptic',
    hp: 22, maxHp: 22,
    atk: 6, def: 2, spd: 4, lck: 2,
    moves: ['STRIKE', 'STRIKE', 'SLIP'], // pure offense, heavy on strikes
    telegraph: {
      STRIKE: 'winding up',
      SLIP:   'stepping in close'
    }
  },
  walker: {
    key: 'walker',
    name: 'The Walker',
    hp: 28, maxHp: 28,
    atk: 5, def: 4, spd: 8, lck: 2,
    moves: ['STRIKE', 'SLIP'], // only 2 moves, always repeats the one he picked
    telegraph: {
      STRIKE: 'that new joint is crazy',
      SLIP:   'that new joint is crazy'
    },
    ai: 'repeat' // special flag: walker repeats the same move twice before potentially switching
  },
  mark: {
    key: 'mark',
    name: 'Mark',
    hp: 45, maxHp: 45,
    atk: 5, def: 5, spd: 5, lck: 4,
    moves: ['WHISPER', 'STRIKE', 'HOLD', 'WHISPER', 'LOOP'],
    // mark's attacks are named as conversation lines in the telegraph
    telegraph: {
      WHISPER:  'what\'d you say your name was?',
      STRIKE:   'i feel like i\'ve seen you before —',
      HOLD:     'you should sit down',
      LOOP:     'you been around here long?'
    },
    isBoss: true
  }
};

window.E1Scene = E1Scene;
window.ENEMIES = window.ENEMIES ? Object.assign(window.ENEMIES, ENEMIES) : ENEMIES;
