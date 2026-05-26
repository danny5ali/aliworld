// aliworld/scenes/CombatScene.js
// radial-wheel combat with telegraphed enemy turns, damage numbers,
// hit-pause, crit flash, status effects, real npc sprites.
//
// CALL SHAPE:
//   this.scene.start('CombatScene', {
//     npcId: 'mark' | 'skeptic' | 'walker' | 'training_dummy',
//     returnScene: 'E1Scene' | 'HomeScene' | 'CharacterCreationScene' | etc,
//     isTestBattle: true,                  // optional: skips drops + persistence
//     playerStateOverride: { ... }         // optional: used for test battle preview
//   });
//
// returns to returnScene with init data:
//   { combatResult: 'win' | 'lose', enemyKey: <npcId>, droppedItem: {...} | null }
//
// playerState lives on this.registry. effective stats are computed at fight start
// by applying equipped accessory bonuses on top of the archetype base.

class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.npcId = (data && data.npcId) || 'walker';
    this.returnScene = (data && data.returnScene) || 'E1Scene';
    this.isTestBattle = !!(data && data.isTestBattle);
    this.playerStateOverride = (data && data.playerStateOverride) || null;

    this.turn = 0;
    this.playerTurn = true;
    this.busy = false;

    // npc data from registry
    const npc = window.NPCRegistry && NPCRegistry.get(this.npcId);
    if (!npc) {
      console.error('[CombatScene] unknown npcId:', this.npcId);
      this.npc = NPCRegistry.get('training_dummy');
      this.npcId = 'training_dummy';
    } else {
      this.npc = npc;
    }

    this.enemyHP = this.npc.stats.hp;
    this.enemyMaxHP = this.npc.stats.maxHp || this.npc.stats.hp;

    // player state
    const ps = this.playerStateOverride || this.registry.get('playerState') || {};
    this._playerStateRef = ps;

    this.playerArchetype = ps.archetype || 'atk';
    this.skinTone = ps.skin_tone || 'medium';
    this.hairColor = ps.hair_color || 'black';
    this.outerwearState = ps.outerwear_state || 'pre_e1';

    const eff = this.computeEffectiveStats(ps);
    this.playerStats = eff;
    this.playerHP = (ps.hp != null) ? ps.hp : eff.maxHp;
    this.playerMaxHP = eff.maxHp;
  }

  computeEffectiveStats(ps) {
    // base from archetype
    const ARCHETYPE_STATS = {
      lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
      atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
      def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
      spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 }
    };
    const base = Object.assign({}, ARCHETYPE_STATS[ps.archetype || 'atk']);

    // apply equipped accessory bonuses (items are objects with .bonuses)
    const equipped = ps.accessories || [];
    equipped.forEach(item => {
      if (!item || !item.bonuses) return;
      Object.keys(item.bonuses).forEach(k => {
        const key = (k === 'hp') ? 'maxHp' : k;
        base[key] = (base[key] || 0) + item.bonuses[k];
        if (k === 'hp') base.hp = base.maxHp; // keep hp at maxHp during the bonus calc
      });
    });

    // clamp minimums
    Object.keys(base).forEach(k => { if (base[k] < 1) base[k] = 1; });
    return base;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    // backdrop
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);
    this.add.rectangle(0, H * 0.55, W, 2, 0x222222).setOrigin(0, 0);

    // ===== enemy sprite =====
    this.enemyX = W / 2;
    this.enemyY = H * 0.30;
    this.placeEnemySprite();

    // enemy name + hp bar
    this.add.text(this.enemyX, this.enemyY - 130, this.npc.displayName, {
      fontFamily: 'monospace', fontSize: '18px', color: '#f4e8c1'
    }).setOrigin(0.5);

    this.enemyHPBarBg = this.add.rectangle(this.enemyX, this.enemyY - 105, 180, 8, 0x333333);
    this.enemyHPBar = this.add.rectangle(this.enemyX - 90, this.enemyY - 105, 180, 8, 0xc44).setOrigin(0, 0.5);

    // ===== player sprite =====
    this.playerX = W / 2;
    this.playerY = H * 0.72;
    this.placePlayerSprite();

    this.add.text(this.playerX, this.playerY + 30, 'YOU', {
      fontFamily: 'monospace', fontSize: '14px', color: '#f4e8c1'
    }).setOrigin(0.5);

    this.playerHPBarBg = this.add.rectangle(this.playerX, this.playerY + 50, 180, 8, 0x333333);
    this.playerHPBar = this.add.rectangle(this.playerX - 90, this.playerY + 50, 180, 8, 0x4c4).setOrigin(0, 0.5);

    this.playerHPText = this.add.text(this.playerX, this.playerY + 64, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888'
    }).setOrigin(0.5);
    this.updateHPBars();

    // ===== telegraph line =====
    this.telegraphText = this.add.text(W / 2, H * 0.46, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9a9a9a',
      align: 'center', wordWrap: { width: W - 60 }
    }).setOrigin(0.5);

    // ===== radial wheel =====
    this.createRadialWheel();

    // first turn: show what enemy is about to do
    this.showTelegraph();

    this.cameras.main.fadeIn(300, 0, 0, 0);
  }

  placeEnemySprite() {
    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey) {
      this.enemySprite = this.add.image(this.enemyX, this.enemyY, idleKey).setOrigin(0.5, 0.5);
      const targetH = this.cameras.main.height * 0.28;
      this.enemySprite.setScale(targetH / this.enemySprite.height);
    } else {
      // fallback: rectangle. visible signal that art is missing.
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyY, 120, 180, 0x554433)
        .setStrokeStyle(2, 0xffffff);
      if (this.npcId !== 'training_dummy') {
        console.warn('[combat] no sprite for', this.npcId);
      }
    }
  }

  placePlayerSprite() {
    const archetype = this.playerArchetype;
    const state = this.outerwearState;
    const srcKey = `${archetype}_${state}_idle_0`;

    if (this.textures.exists(srcKey)) {
      // run through palette swap if available
      const usedKey = (window.PaletteSwap)
        ? PaletteSwap.swapPalette(this, srcKey, `${srcKey}_${this.skinTone}_${this.hairColor}`, this.skinTone, this.hairColor)
        : srcKey;
      this.playerSprite = this.add.image(this.playerX, this.playerY, usedKey).setOrigin(0.5, 0.5);
      const targetH = this.cameras.main.height * 0.30;
      this.playerSprite.setScale(targetH / this.playerSprite.height);
    } else {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerY, 100, 150, 0x446);
    }
  }

  createRadialWheel() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H - 100;
    const r = 70;

    const ps = this._playerStateRef;
    const available = (ps && ps.moves) || ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'];
    const wheel = available.slice(0, 4);

    const angles = [-90, 0, 90, 180];
    const colors = { STRIKE: 0xc44, SLIP: 0x4c8, HOLD: 0x48c, WHISPER: 0xc8c, LOOP: 0x99c };

    this.moveButtons = [];
    wheel.forEach((moveId, i) => {
      const ang = angles[i];
      const x = cx + Math.cos(ang * Math.PI / 180) * r;
      const y = cy + Math.sin(ang * Math.PI / 180) * r;
      const btn = this.add.circle(x, y, 28, colors[moveId] || 0x666).setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, moveId, {
        fontFamily: 'monospace', fontSize: '10px', color: '#fff'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this.playerMove(moveId));
      this.moveButtons.push({ btn, label });
    });

    this.add.circle(cx, cy, 4, 0x444);
  }

  showTelegraph() {
    const move = NPCRegistry.chooseMove(this.npcId, this.turn);
    const line = NPCRegistry.telegraphFor(this.npcId, move);
    this._upcomingMove = move;
    this.telegraphText.setText(line);
  }

  setWheelEnabled(on) {
    this.moveButtons.forEach(({ btn }) => {
      if (on) btn.setInteractive({ useHandCursor: true });
      else btn.disableInteractive();
      btn.setAlpha(on ? 1 : 0.4);
    });
  }

  playerMove(moveId) {
    if (this.busy || !this.playerTurn) return;
    this.busy = true;
    this.setWheelEnabled(false);

    let dmg = this.playerStats.atk;
    let crit = false;
    if (moveId === 'STRIKE')  dmg = Math.floor(this.playerStats.atk * 1.2);
    if (moveId === 'WHISPER') dmg = Math.floor(this.playerStats.atk * 0.6);
    if (moveId === 'SLIP')    dmg = Math.floor(this.playerStats.atk * 0.8);
    if (moveId === 'HOLD')    dmg = 0;

    // crit roll
    if (Math.random() * 100 < this.playerStats.lck * 2) {
      crit = true;
      dmg = Math.floor(dmg * 1.6);
    }

    // small variance
    dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));

    this.applyDamageToEnemy(dmg, crit, moveId);
  }

  applyDamageToEnemy(dmg, crit, moveId) {
    // swap to attack frame briefly (uses lunge frames)
    const lungeKey = `${this.playerArchetype}_${this.outerwearState}_atk_lunge`;
    if (this.textures.exists(lungeKey) && this.playerSprite.setTexture) {
      const prev = this.playerSprite.texture.key;
      this.playerSprite.setTexture(lungeKey);
      this.time.delayedCall(180, () => {
        if (this.playerSprite.active) this.playerSprite.setTexture(prev);
      });
    }

    // brief flash on enemy
    if (this.enemySprite.setAlpha) {
      this.tweens.add({
        targets: this.enemySprite,
        alpha: { from: 0.3, to: 1 },
        duration: 120
      });
    }

    const pauseMs = crit ? 120 : 60;
    this.time.delayedCall(pauseMs, () => {
      this.enemyHP = Math.max(0, this.enemyHP - dmg);
      this.updateHPBars();
      this.spawnDamageNumber(this.enemyX, this.enemyY - 60, dmg, crit);

      if (crit) this.cameras.main.flash(80, 255, 220, 200);

      if (this.enemyHP <= 0) {
        this.time.delayedCall(500, () => this.victory());
      } else {
        this.time.delayedCall(700, () => this.enemyTurn());
      }
    });
  }

  enemyTurn() {
    this.playerTurn = false;
    const move = this._upcomingMove || NPCRegistry.chooseMove(this.npcId, this.turn);

    // attack stance
    const stanceKey = NPCRegistry.getFrame(this, this.npcId, 'attack_stance');
    if (stanceKey && this.enemySprite.setTexture) this.enemySprite.setTexture(stanceKey);

    this.time.delayedCall(600, () => {
      const actionKey = NPCRegistry.getFrame(this, this.npcId, 'attack_action');
      if (actionKey && this.enemySprite.setTexture) this.enemySprite.setTexture(actionKey);

      // damage calc
      let dmg = this.npc.stats.atk;
      if (move === 'STRIKE')  dmg = Math.floor(this.npc.stats.atk * 1.0);
      if (move === 'SLIP')    dmg = Math.floor(this.npc.stats.atk * 0.8);
      if (move === 'WHISPER') dmg = Math.floor(this.npc.stats.atk * 0.6);
      if (move === 'HOLD')    dmg = 0;
      if (move === 'LOOP')    dmg = Math.floor(this.npc.stats.atk * 1.3);
      dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));
      const reduced = Math.max(1, dmg - Math.floor(this.playerStats.def / 3));

      this.time.delayedCall(180, () => {
        // back to idle
        const idleKey = NPCRegistry.getFrame(this, this.npcId, 'idle_1');
        if (idleKey && this.enemySprite.setTexture) this.enemySprite.setTexture(idleKey);

        // player hit react (uses idle_2 as a stand-in flinch frame for now)
        const reactKey = `${this.playerArchetype}_${this.outerwearState}_idle_2`;
        if (this.textures.exists(reactKey) && this.playerSprite.setTexture) {
          const prev = this.playerSprite.texture.key;
          this.playerSprite.setTexture(reactKey);
          this.time.delayedCall(220, () => {
            if (this.playerSprite.active) this.playerSprite.setTexture(prev);
          });
        }

        this.playerHP = Math.max(0, this.playerHP - reduced);
        this.updateHPBars();
        this.spawnDamageNumber(this.playerX, this.playerY - 40, reduced, false);

        if (this.playerHP <= 0) {
          this.time.delayedCall(500, () => this.defeat());
        } else {
          this.turn++;
          this.playerTurn = true;
          this.busy = false;
          this.setWheelEnabled(true);
          this.showTelegraph();
        }
      });
    });
  }

  spawnDamageNumber(x, y, dmg, crit) {
    const txt = this.add.text(x, y, String(dmg), {
      fontFamily: 'monospace',
      fontSize: crit ? '28px' : '20px',
      color: crit ? '#ffd86b' : '#f4e8c1',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: txt, y: y - 50, alpha: { from: 1, to: 0 }, duration: 800,
      onComplete: () => txt.destroy()
    });
  }

  updateHPBars() {
    const eRatio = this.enemyMaxHP > 0 ? this.enemyHP / this.enemyMaxHP : 0;
    this.enemyHPBar.scaleX = Math.max(0, eRatio);

    const pRatio = this.playerMaxHP > 0 ? this.playerHP / this.playerMaxHP : 0;
    this.playerHPBar.scaleX = Math.max(0, pRatio);

    if (this.playerHPText) {
      this.playerHPText.setText(`${this.playerHP} / ${this.playerMaxHP}`);
    }
  }

  victory() {
    // persist current HP on the playerState (E1Scene will then do 25% recovery on return)
    if (!this.isTestBattle) {
      const ps = this._playerStateRef;
      ps.hp = this.playerHP;
      ps.maxHp = this.playerMaxHP;
      this.registry.set('playerState', ps);
    }

    // drop roll: returns full item object so E1Scene payoff can read .name + .desc
    let droppedItem = null;
    if (!this.isTestBattle && this.npc.drops && Math.random() <= this.npc.dropChance) {
      const dropId = this.npc.drops;
      const lookup = (window.BOSS_DROPS && Object.values(window.BOSS_DROPS).find(i => i.id === dropId))
                  || (window.MINOR_DROPS && Object.values(window.MINOR_DROPS).find(i => i.id === dropId))
                  || (window.STARTER_ACCESSORIES && window.STARTER_ACCESSORIES.find(i => i.id === dropId));
      if (lookup) {
        const ps = this._playerStateRef;
        ps.inventory = ps.inventory || [];
        const already = ps.inventory.some(i => i.id === lookup.id);
        if (!already) {
          ps.inventory.push(Object.assign({}, lookup));
          droppedItem = lookup;
        }
      }
    }

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.returnScene, {
        combatResult: 'win',
        enemyKey: this.npcId,
        droppedItem: droppedItem
      });
    });
  }

  defeat() {
    if (!this.isTestBattle) {
      const ps = this._playerStateRef;
      ps.hp = ps.maxHp || this.playerMaxHP;
      this.registry.set('playerState', ps);
    }
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.returnScene, {
        combatResult: 'lose',
        enemyKey: this.npcId,
        droppedItem: null
      });
    });
  }
}

window.CombatScene = CombatScene;
