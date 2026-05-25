// aliworld/scenes/CombatScene.js
//
// turn-based combat. radial wheel menu, 4 active moves visible.
// enemies telegraph their next move before they use it.
// hidden rng under the hood (player never sees numbers, just outcomes).
//
// data flow:
//   scene receives { enemy, playerState } via init()
//   playerState = { hp, maxHp, atk, def, spd, lck, moves: [4 move keys], accessories: [...] }
//   enemy = { key, name, hp, maxHp, atk, def, spd, lck, moves: [...], spritesheet }
//
// on win/lose, scene emits 'combatEnd' with result and returns to caller scene.

class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.enemy = data.enemy || this.getTestEnemy();
    this.player = data.playerState || this.getTestPlayer();
    this.returnScene = data.returnScene || 'OverworldScene';

    // runtime combat state
    this.playerStatus = { shake: 0, bleed: 0, stun: 0, brace: 0 };
    this.enemyStatus = { shake: 0, bleed: 0, stun: 0, brace: 0 };
    this.turnCount = 0;
    this.busy = false;
    this.enemyNextMove = null;
  }

  preload() {
    // assumed already loaded by BootScene. safety only.
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;
    this.cy = height / 2;

    // background plate (placeholder, swap with location bg per encounter later)
    this.add.rectangle(0, 0, width, height, 0x0a0a0f).setOrigin(0, 0);

    // enemy on top
    this.enemySprite = this.add.rectangle(this.cx, height * 0.32, 96, 128, 0x8b2828)
      .setStrokeStyle(2, 0xffffff);
    this.enemyNameText = this.add.text(this.cx, height * 0.32 - 90, this.enemy.name, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffffff'
    }).setOrigin(0.5);

    // enemy hp bar
    this.enemyHpBg = this.add.rectangle(this.cx, height * 0.32 - 70, 200, 8, 0x333333)
      .setStrokeStyle(1, 0xffffff);
    this.enemyHpFill = this.add.rectangle(this.cx - 100, height * 0.32 - 70, 200, 8, 0xff4444)
      .setOrigin(0, 0.5);

    // enemy telegraph banner (hidden until set)
    this.telegraphText = this.add.text(this.cx, height * 0.32 + 80, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffcc66',
      backgroundColor: '#1a1a22', padding: { x: 8, y: 4 }
    }).setOrigin(0.5).setVisible(false);

    // player sprite - use archetype + palette swap if available
    const config = this.registry.get('avatarConfig') || {};
    const archetype = this.player.archetype || config.archetype || 'atk';
    const state     = config.outerwear_state || 'pre_e1';
    const skin      = config.skin_tone || 'medium';
    const hair      = config.hair_color || 'black';
    const srcKey = `${archetype}_${state}_atk_stance_0`;
    const fallbackKey = `${archetype}_${state}_idle_0`;
    const useSrc = this.textures.exists(srcKey) ? srcKey :
                   this.textures.exists(fallbackKey) ? fallbackKey : null;
    if (useSrc && window.PaletteSwap) {
      const tgt = `${useSrc}_${skin}_${hair}`;
      const finalKey = PaletteSwap.swapPalette(this, useSrc, tgt, skin, hair);
      this.playerSprite = this.add.image(width * 0.25, height * 0.7, finalKey)
        .setOrigin(0.5, 1).setScale(0.5);
    } else {
      this.playerSprite = this.add.rectangle(width * 0.25, height * 0.7, 60, 90, 0x4444cc)
        .setStrokeStyle(2, 0xffffff);
    }

    // player hp bar
    this.playerHpBg = this.add.rectangle(width * 0.25, height * 0.7 + 60, 160, 10, 0x333333)
      .setStrokeStyle(1, 0xffffff);
    this.playerHpFill = this.add.rectangle(width * 0.25 - 80, height * 0.7 + 60, 160, 10, 0x44ff44)
      .setOrigin(0, 0.5);
    this.playerHpText = this.add.text(width * 0.25, height * 0.7 + 78,
      `${this.player.hp}/${this.player.maxHp}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffffff'
    }).setOrigin(0.5);

    // combat log (bottom strip)
    this.logText = this.add.text(20, height - 60, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#cccccc',
      wordWrap: { width: width - 40 }
    });

    // radial wheel for moves
    this.buildRadialWheel();

    // status icons row (under player)
    this.statusIconsContainer = this.add.container(width * 0.25, height * 0.7 + 95);

    // start with player turn (or determine by spd later)
    this.startPlayerTurn();
  }

  // ---------- radial wheel ----------

  buildRadialWheel() {
    const { width, height } = this.scale;
    const wheelCx = width * 0.75;
    const wheelCy = height * 0.7;
    const radius = 80;

    this.wheelCenter = { x: wheelCx, y: wheelCy };

    // center label
    this.wheelLabel = this.add.text(wheelCx, wheelCy, 'choose', {
      fontFamily: 'monospace', fontSize: '14px', color: '#888888'
    }).setOrigin(0.5);

    // 4 active moves, positioned at 12/3/6/9 o'clock
    const positions = [
      { angle: -Math.PI / 2, name: 'top' },
      { angle: 0, name: 'right' },
      { angle: Math.PI / 2, name: 'bottom' },
      { angle: Math.PI, name: 'left' }
    ];

    this.moveButtons = [];
    const activeMoves = this.player.moves.slice(0, 4);

    activeMoves.forEach((moveKey, i) => {
      const move = MOVES[moveKey];
      if (!move) return;
      const pos = positions[i];
      const bx = wheelCx + Math.cos(pos.angle) * radius;
      const by = wheelCy + Math.sin(pos.angle) * radius;

      const bg = this.add.circle(bx, by, 32, 0x222233).setStrokeStyle(2, 0x666688);
      const label = this.add.text(bx, by, move.name, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffffff'
      }).setOrigin(0.5);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        if (this.busy) return;
        bg.setFillStyle(0x444466);
        this.wheelLabel.setText(move.name);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x222233);
        this.wheelLabel.setText('choose');
      });
      bg.on('pointerdown', () => this.onPlayerMove(moveKey));

      this.moveButtons.push({ bg, label, moveKey });
    });
  }

  setWheelInteractive(enabled) {
    this.moveButtons.forEach(b => {
      if (enabled) b.bg.setInteractive({ useHandCursor: true });
      else b.bg.disableInteractive();
      b.bg.setAlpha(enabled ? 1 : 0.4);
      b.label.setAlpha(enabled ? 1 : 0.4);
    });
  }

  // ---------- turn flow ----------

  startPlayerTurn() {
    this.turnCount++;
    this.busy = false;

    // tick player status effects at top of player turn
    this.tickStatus('player');
    if (this.player.hp <= 0) return this.endCombat('lose');
    if (this.enemy.hp <= 0) return this.endCombat('win');

    // if stunned, skip turn
    if (this.playerStatus.stun > 0) {
      this.log('you are stunned. you can\'t move.');
      this.playerStatus.stun--;
      this.refreshStatusIcons();
      this.time.delayedCall(900, () => this.startEnemyTurn());
      return;
    }

    // pick enemy's next move now and telegraph it
    this.enemyNextMove = this.pickEnemyMove();
    this.showTelegraph(this.enemyNextMove);

    this.setWheelInteractive(true);
  }

  onPlayerMove(moveKey) {
    if (this.busy) return;
    this.busy = true;
    this.setWheelInteractive(false);

    const move = MOVES[moveKey];
    this.log(`you use ${move.name}.`);

    this.resolveMove(move, 'player', 'enemy', () => {
      // check enemy death
      if (this.enemy.hp <= 0) return this.endCombat('win');
      // proceed to enemy turn
      this.time.delayedCall(700, () => this.startEnemyTurn());
    });
  }

  startEnemyTurn() {
    this.busy = true;
    this.hideTelegraph();

    this.tickStatus('enemy');
    if (this.enemy.hp <= 0) return this.endCombat('win');
    if (this.player.hp <= 0) return this.endCombat('lose');

    if (this.enemyStatus.stun > 0) {
      this.log(`${this.enemy.name} is stunned.`);
      this.enemyStatus.stun--;
      this.refreshStatusIcons();
      this.time.delayedCall(900, () => this.startPlayerTurn());
      return;
    }

    const moveKey = this.enemyNextMove || this.pickEnemyMove();
    const move = MOVES[moveKey];
    this.log(`${this.enemy.name} uses ${move.name}.`);

    this.resolveMove(move, 'enemy', 'player', () => {
      if (this.player.hp <= 0) return this.endCombat('lose');
      this.time.delayedCall(700, () => this.startPlayerTurn());
    });
  }

  // ---------- move resolution ----------

  resolveMove(move, attackerKey, defenderKey, onComplete) {
    const attacker = this[attackerKey];
    const defender = this[defenderKey];
    const attackerStatus = this[attackerKey + 'Status'];
    const defenderStatus = this[defenderKey + 'Status'];

    // hit/miss roll. base 85%, modified by spd diff and lck.
    const hitChance = this.calcHitChance(attacker, defender, move);
    const roll = Math.random();
    const hit = roll < hitChance;

    if (!hit && move.type === 'attack') {
      this.log(`it missed.`);
      this.flashSprite(defenderKey, 0x888888);
      return this.time.delayedCall(400, onComplete);
    }

    // apply damage if attack
    if (move.power > 0) {
      let dmg = this.calcDamage(attacker, defender, move);
      // brace cuts incoming damage
      if (defenderStatus.brace > 0) {
        dmg = Math.floor(dmg * 0.5);
        defenderStatus.brace--;
      }
      defender.hp = Math.max(0, defender.hp - dmg);
      this.log(`${dmg} damage.`);
      this.flashSprite(defenderKey, 0xff4444);
      this.shakeSprite(defenderKey);
    }

    // apply status effects
    if (move.applyStatus) {
      for (const [status, chance] of Object.entries(move.applyStatus)) {
        if (Math.random() < chance) {
          // self-target for brace, opponent-target for the rest
          const target = status === 'brace' ? attackerStatus : defenderStatus;
          target[status] = (target[status] || 0) + (move.statusDuration || 2);
          const who = (status === 'brace')
            ? (attackerKey === 'player' ? 'you' : this.enemy.name)
            : (defenderKey === 'player' ? 'you' : this.enemy.name);
          this.log(`${who} ${this.statusVerb(status)}.`);
        }
      }
    }

    // self-heal moves
    if (move.heal) {
      const healed = Math.min(move.heal, attacker.maxHp - attacker.hp);
      attacker.hp += healed;
      this.log(`recovered ${healed} hp.`);
      this.flashSprite(attackerKey, 0x44ff88);
    }

    this.refreshBars();
    this.refreshStatusIcons();
    this.time.delayedCall(500, onComplete);
  }

  calcHitChance(attacker, defender, move) {
    if (move.type !== 'attack') return 1.0;
    let base = move.accuracy ?? 0.85;
    const spdDiff = (attacker.spd - defender.spd) * 0.02;
    const lckBonus = attacker.lck * 0.005;
    return Math.max(0.3, Math.min(0.98, base + spdDiff + lckBonus));
  }

  calcDamage(attacker, defender, move) {
    if (!move.power) return 0;
    const base = move.power + attacker.atk - Math.floor(defender.def * 0.5);
    const variance = 0.85 + Math.random() * 0.3; // 85% to 115%
    const critRoll = Math.random() < (0.05 + attacker.lck * 0.005);
    const crit = critRoll ? 1.5 : 1.0;
    if (critRoll) this.log('critical.');
    return Math.max(1, Math.floor(base * variance * crit));
  }

  // ---------- status effects ----------
  // shake: spd debuff, reduces hit chance against this side
  // bleed: ticks damage at top of side's turn
  // stun: skip next turn
  // brace: halves next incoming damage

  tickStatus(side) {
    const statusObj = this[side + 'Status'];
    const entity = this[side];

    if (statusObj.bleed > 0) {
      const dmg = Math.max(1, Math.floor(entity.maxHp * 0.06));
      entity.hp = Math.max(0, entity.hp - dmg);
      const who = side === 'player' ? 'you bleed' : `${this.enemy.name} bleeds`;
      this.log(`${who} for ${dmg}.`);
      statusObj.bleed--;
      this.flashSprite(side, 0xaa2222);
    }
    if (statusObj.shake > 0) statusObj.shake--;
    // brace decrements on hit, not on tick
    this.refreshBars();
    this.refreshStatusIcons();
  }

  statusVerb(status) {
    return {
      shake: 'is shaken',
      bleed: 'is bleeding',
      stun: 'is stunned',
      brace: 'braces'
    }[status] || `is afflicted by ${status}`;
  }

  refreshStatusIcons() {
    this.statusIconsContainer.removeAll(true);
    const icons = Object.entries(this.playerStatus).filter(([, v]) => v > 0);
    icons.forEach(([status, turns], i) => {
      const color = {
        shake: 0xffcc44, bleed: 0xff4444, stun: 0x8844ff, brace: 0x44ccff
      }[status] || 0xffffff;
      const x = i * 28 - (icons.length - 1) * 14;
      const dot = this.add.circle(x, 0, 8, color);
      const num = this.add.text(x, 0, String(turns), {
        fontFamily: 'monospace', fontSize: '10px', color: '#000000'
      }).setOrigin(0.5);
      this.statusIconsContainer.add([dot, num]);
    });
  }

  // ---------- enemy ai ----------

  pickEnemyMove() {
    const moves = this.enemy.moves;
    const hpRatio = this.enemy.hp / this.enemy.maxHp;

    // walker ai: repeat the same move twice in a row before possibly switching
    if (this.enemy.ai === 'repeat') {
      if (this._lastEnemyMove && this._repeatUsed < 1) {
        this._repeatUsed = (this._repeatUsed || 0) + 1;
        return this._lastEnemyMove;
      }
      this._repeatUsed = 0;
      const pick = moves[Math.floor(Math.random() * moves.length)];
      this._lastEnemyMove = pick;
      return pick;
    }

    // low hp: try to heal
    if (hpRatio < 0.3) {
      const healMove = moves.find(k => MOVES[k] && MOVES[k].heal);
      if (healMove && Math.random() < 0.6) return healMove;
    }

    // under pressure: try to brace
    if (this.enemyStatus.bleed > 0 || this.enemyStatus.shake > 1) {
      const braceMove = moves.find(k => MOVES[k] && MOVES[k].applyStatus && MOVES[k].applyStatus.brace);
      if (braceMove && Math.random() < 0.4) return braceMove;
    }

    // otherwise random attack
    const attacks = moves.filter(k => MOVES[k] && MOVES[k].type === 'attack');
    if (attacks.length === 0) return moves[0];
    return attacks[Math.floor(Math.random() * attacks.length)];
  }

  showTelegraph(moveKey) {
    const move = MOVES[moveKey];
    if (!move) return;
    // enemy-specific telegraph overrides (e.g. mark's conversation lines)
    const enemyTelegraph = this.enemy.telegraph && this.enemy.telegraph[moveKey];
    const verb = enemyTelegraph || move.telegraph || `winding up ${move.name}`;
    // boss conversation style: show as dialogue, not "is X..."
    const isBoss = this.enemy.isBoss;
    const line = isBoss
      ? `"${verb}"`
      : `${this.enemy.name} is ${verb}...`;
    this.telegraphText.setText(line).setVisible(true);
  }

  hideTelegraph() {
    this.telegraphText.setVisible(false);
  }

  // ---------- visual feedback ----------

  flashSprite(side, color) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    if (sprite.setFillStyle) {
      const original = sprite.fillColor;
      sprite.setFillStyle(color);
      this.time.delayedCall(180, () => sprite.setFillStyle(original));
    } else if (sprite.setTint) {
      sprite.setTint(color);
      this.time.delayedCall(180, () => sprite.clearTint());
    }
  }

  shakeSprite(side) {
    const sprite = side === 'player' ? this.playerSprite : this.enemySprite;
    const ox = sprite.x;
    this.tweens.add({
      targets: sprite,
      x: ox + 6,
      duration: 50,
      yoyo: true,
      repeat: 3,
      onComplete: () => sprite.setX(ox)
    });
  }

  refreshBars() {
    // enemy
    const eRatio = this.enemy.hp / this.enemy.maxHp;
    this.enemyHpFill.width = 200 * eRatio;
    // player
    const pRatio = this.player.hp / this.player.maxHp;
    this.playerHpFill.width = 160 * pRatio;
    this.playerHpText.setText(`${this.player.hp}/${this.player.maxHp}`);
  }

  // ---------- log ----------

  log(msg) {
    const existing = this.logText.text.split('\n');
    existing.push(msg);
    while (existing.length > 3) existing.shift();
    this.logText.setText(existing.join('\n'));
  }

  // ---------- end states ----------

  endCombat(result) {
    this.busy = true;
    this.setWheelInteractive(false);
    this.hideTelegraph();
    const msg = result === 'win' ? `${this.enemy.name} is broken.` : 'you are broken.';
    this.log(msg);

    this.time.delayedCall(1400, () => {
      // for test battles, restore the playerState before returning so character creation isn't borked
      const data = { combatResult: result, enemyKey: this.enemy.key };
      this.scene.start(this.returnScene, data);
    });
  }

  // ---------- test defaults ----------

  getTestPlayer() {
    return {
      hp: 30, maxHp: 30,
      atk: 5, def: 5, spd: 5, lck: 5,
      moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'],
      accessories: []
    };
  }

  getTestEnemy() {
    return {
      key: 'mark',
      name: 'Mark',
      hp: 35, maxHp: 35,
      atk: 5, def: 4, spd: 4, lck: 3,
      moves: ['STRIKE', 'SLIP', 'HOLD']
    };
  }
}

// ---------- moves table ----------
// 9 total. 4 starters, 5 episode-earned.
// type: 'attack' | 'support'
// power: damage base (0 for non-damaging)
// accuracy: 0-1 hit chance base (default 0.85)
// applyStatus: { statusName: chance } e.g. { bleed: 0.4 }
// statusDuration: turns the status lasts (default 2)
// heal: flat hp restore
// telegraph: short string shown when enemy queues this move

const MOVES = {
  // starters
  STRIKE: {
    name: 'STRIKE', type: 'attack', power: 6, accuracy: 0.9,
    telegraph: 'cocking back'
  },
  SLIP: {
    name: 'SLIP', type: 'attack', power: 3, accuracy: 0.95,
    applyStatus: { shake: 0.5 }, statusDuration: 2,
    telegraph: 'slipping in close'
  },
  WHISPER: {
    name: 'WHISPER', type: 'attack', power: 4, accuracy: 0.85,
    applyStatus: { stun: 0.25 }, statusDuration: 1,
    telegraph: 'mouthing something'
  },
  HOLD: {
    name: 'HOLD', type: 'support', power: 0, accuracy: 1.0,
    applyStatus: { brace: 1.0 }, statusDuration: 2,
    telegraph: 'bracing'
  },

  // episode-earned
  LOOP: {
    name: 'LOOP', type: 'attack', power: 5, accuracy: 0.8,
    applyStatus: { bleed: 0.6 }, statusDuration: 3,
    telegraph: 'looping back'
  },
  POSSESS: {
    name: 'POSSESS', type: 'attack', power: 7, accuracy: 0.75,
    applyStatus: { stun: 0.35 }, statusDuration: 1,
    telegraph: 'reaching for you'
  },
  CONDUCT: {
    name: 'CONDUCT', type: 'attack', power: 8, accuracy: 0.8,
    applyStatus: { shake: 0.6 }, statusDuration: 2,
    telegraph: 'raising a hand'
  },
  REPLICATE: {
    name: 'REPLICATE', type: 'support', power: 0, accuracy: 1.0,
    heal: 8,
    telegraph: 'copying itself'
  },
  ECHO: {
    name: 'ECHO', type: 'attack', power: 9, accuracy: 0.85,
    applyStatus: { bleed: 0.3, shake: 0.3 }, statusDuration: 2,
    telegraph: 'about to echo'
  }
};

window.CombatScene = CombatScene;
window.MOVES = MOVES;
