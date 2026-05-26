// aliworld/scenes/OverworldScene.js
// dev scratchpad scene. main flow goes Auth -> Boot -> HomeScene -> E1Scene now.
// kept around for keyboard-driven testing (C = test combat, E = episode 1).

class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data) {
    if (data && data.combatResult) {
      this.lastCombatResult = data.combatResult;
      this.lastEnemyKey = data.enemyKey;
    }
    if (!this.registry.has('playerState')) {
      this.registry.set('playerState', {
        hp: 30, maxHp: 30, atk: 5, def: 5, spd: 5, lck: 5,
        archetype: 'atk', skin_tone: 'medium', hair_color: 'black', outerwear_state: 'pre_e1',
        moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'], accessories: []
      });
    }
  }

  create() {
    const { width, height } = this.scale;

    this.add.rectangle(0, 0, width, height, 0x1a2a1a).setOrigin(0, 0);

    if (this.lastCombatResult) {
      const msg = this.lastCombatResult === 'win' ? `you beat ${this.lastEnemyKey}.` : 'you lost. hp restored.';
      this.add.text(width / 2, 50, msg, { fontFamily: 'monospace', fontSize: '14px', color: '#ffcc66' }).setOrigin(0.5);
      if (this.lastCombatResult === 'lose') {
        const p = this.registry.get('playerState');
        p.hp = p.maxHp;
        this.registry.set('playerState', p);
      }
    }

    this.player = this.add.rectangle(width / 2, height / 2, 32, 48, 0x4488ff).setStrokeStyle(2, 0xffffff);

    const e1Btn = this.add.rectangle(width / 2, height / 2 + 80, 240, 44, 0xb32a1f).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 80, 'EPISODE 1 — THE FIELD', { fontFamily: 'monospace', fontSize: '13px', color: '#ebe2d2' }).setOrigin(0.5);
    e1Btn.on('pointerover', () => e1Btn.setFillStyle(0x6a1612));
    e1Btn.on('pointerout',  () => e1Btn.setFillStyle(0xb32a1f));
    e1Btn.on('pointerup',   () => { this.registry.set('e1Progress', 'intro'); this.scene.start('E1Scene'); });

    const loadoutBtn = this.add.rectangle(width / 2, height / 2 + 136, 240, 40, 0x1a1a2a).setStrokeStyle(1, 0x333355).setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height / 2 + 136, 'LOADOUT', { fontFamily: 'monospace', fontSize: '13px', color: '#888899' }).setOrigin(0.5);
    loadoutBtn.on('pointerup', () => this.scene.start('AccessoryScene', { returnScene: 'OverworldScene' }));

    this.add.text(20, height - 24, 'C = test combat  |  E = episode 1', { fontFamily: 'monospace', fontSize: '10px', color: '#333344' });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.combatKey = this.input.keyboard.addKey('C');
    this.combatKey.on('down', () => this.startTestCombat());
    this.e1Key = this.input.keyboard.addKey('E');
    this.e1Key.on('down', () => { this.registry.set('e1Progress', 'intro'); this.scene.start('E1Scene'); });
  }

  update() {
    if (!this.player) return;
    const speed = 3;
    if (this.cursors.left.isDown)  this.player.x -= speed;
    if (this.cursors.right.isDown) this.player.x += speed;
    if (this.cursors.up.isDown)    this.player.y -= speed;
    if (this.cursors.down.isDown)  this.player.y += speed;
  }

  startTestCombat() {
    this.scene.start('CombatScene', {
      npcId: 'mark',
      returnScene: 'OverworldScene'
    });
  }
}

window.OverworldScene = OverworldScene;
