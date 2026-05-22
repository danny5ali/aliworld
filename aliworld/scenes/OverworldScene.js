// aliworld/scenes/OverworldScene.js
//
// placeholder overworld. holds the player, lets them walk around,
// and (for now) lets them press C to trigger a test combat with Mark.
// real encounter triggers will replace the C-key in step 9 (episode 1).

class OverworldScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OverworldScene' });
  }

  init(data) {
    // catch return-from-combat state
    if (data && data.combatResult) {
      this.lastCombatResult = data.combatResult;
      this.lastEnemyKey = data.enemyKey;
    }

    // persist player state across scene transitions
    if (!this.registry.has('playerState')) {
      this.registry.set('playerState', {
        hp: 30, maxHp: 30,
        atk: 5, def: 5, spd: 5, lck: 5,
        moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'],
        accessories: []
      });
    }
  }

  create() {
    const { width, height } = this.scale;

    // placeholder field
    this.add.rectangle(0, 0, width, height, 0x1a2a1a).setOrigin(0, 0);

    this.add.text(20, 20, 'overworld (placeholder)', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cccccc'
    });

    this.add.text(20, 40, 'arrows to move. press C to test combat with Mark.', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888888'
    });

    // post-combat banner
    if (this.lastCombatResult) {
      const msg = this.lastCombatResult === 'win'
        ? `you beat ${this.lastEnemyKey}.`
        : 'you lost. (test mode: hp restored)';
      this.add.text(width / 2, 80, msg, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffcc66'
      }).setOrigin(0.5);

      // in test mode, restore hp after a loss so we can keep iterating
      if (this.lastCombatResult === 'lose') {
        const p = this.registry.get('playerState');
        p.hp = p.maxHp;
        this.registry.set('playerState', p);
      }
    }

    // player placeholder
    this.player = this.add.rectangle(width / 2, height / 2, 32, 48, 0x4488ff)
      .setStrokeStyle(2, 0xffffff);

    // input
    this.cursors = this.input.keyboard.createCursorKeys();
    this.combatKey = this.input.keyboard.addKey('C');
    this.combatKey.on('down', () => this.startTestCombat());
  }

  update() {
    if (!this.player) return;
    const speed = 3;
    if (this.cursors.left.isDown) this.player.x -= speed;
    if (this.cursors.right.isDown) this.player.x += speed;
    if (this.cursors.up.isDown) this.player.y -= speed;
    if (this.cursors.down.isDown) this.player.y += speed;
  }

  startTestCombat() {
    const playerState = this.registry.get('playerState');
    this.scene.start('CombatScene', {
      enemy: {
        key: 'mark',
        name: 'Mark',
        hp: 35, maxHp: 35,
        atk: 5, def: 4, spd: 4, lck: 3,
        moves: ['STRIKE', 'SLIP', 'HOLD']
      },
      playerState: playerState,
      returnScene: 'OverworldScene'
    });
  }
}

window.OverworldScene = OverworldScene;
