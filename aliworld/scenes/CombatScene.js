// aliworld/scenes/CombatScene.js
// radial-wheel combat with telegraphed enemy turns, damage numbers,
// hit-pause, crit flash, real npc sprites via NPCRegistry.
//
// call shape:
//   this.scene.start('CombatScene', { npcId, returnScene, isTestBattle })
//
// returns to returnScene with:
//   { combatResult: 'win' | 'lose', enemyKey: npcId, droppedItem: {...} | null }

class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.npcId       = (data && data.npcId)       || 'walker';
    this.returnScene = (data && data.returnScene)  || 'E1Scene';
    this.isTestBattle = !!(data && data.isTestBattle);

    this.turn = 0;
    this.playerTurn = true;
    this.busy = false;

    // player state lives on registry
    const ps = this.registry.get('playerState') || {};
    this._ps = ps;

    this.playerArchetype  = ps.archetype      || 'atk';
    this.skinTone         = ps.skin_tone       || 'medium';
    this.hairColor        = ps.hair_color      || 'black';
    this.outerwearState   = ps.outerwear_state || 'pre_e1';

    const eff = this._computeStats(ps);
    this.playerStats  = eff;
    this.playerHP     = (ps.hp != null) ? ps.hp : eff.maxHp;
    this.playerMaxHP  = eff.maxHp;

    // npc from registry
    const npc = window.NPCRegistry && NPCRegistry.get(this.npcId);
    if (!npc) {
      console.error('[CombatScene] unknown npcId:', this.npcId, '- falling back to walker');
      this.npcId = 'walker';
      this.npc = NPCRegistry.get('walker');
    } else {
      this.npc = npc;
    }
    this.enemyHP    = this.npc.stats.hp;
    this.enemyMaxHP = this.npc.stats.maxHp || this.npc.stats.hp;
  }

  _computeStats(ps) {
    const BASE = {
      lck: { hp:25, maxHp:25, atk:4, def:4, spd:4, lck:9 },
      atk: { hp:28, maxHp:28, atk:9, def:3, spd:4, lck:4 },
      def: { hp:40, maxHp:40, atk:4, def:9, spd:3, lck:4 },
      spd: { hp:28, maxHp:28, atk:5, def:4, spd:9, lck:4 },
    };
    const base = Object.assign({}, BASE[ps.archetype || 'atk']);
    (ps.accessories || []).forEach(item => {
      if (!item || !item.bonuses) return;
      Object.entries(item.bonuses).forEach(([k, v]) => {
        const key = k === 'hp' ? 'maxHp' : k;
        base[key] = (base[key] || 0) + v;
      });
    });
    Object.keys(base).forEach(k => { if (base[k] < 1) base[k] = 1; });
    return base;
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);

    // backdrop
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);
    this.add.rectangle(0, H * 0.55, W, 2, 0x222222).setOrigin(0, 0);

    // ─── enemy ────────────────────────────────────────────────────────────
    this.enemyX = W / 2;
    this.enemyY = H * 0.30;

    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey) {
      this.enemySprite = this.add.image(this.enemyX, this.enemyY, idleKey).setOrigin(0.5, 0.5);
      const targetH = H * 0.28;
      this.enemySprite.setScale(targetH / this.enemySprite.height);
    } else {
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyY, 120, 180, 0x554433)
        .setStrokeStyle(1, 0xffffff);
      console.warn('[combat] no sprite for', this.npcId);
    }

    this.add.text(this.enemyX, this.enemyY - 130, this.npc.displayName, {
      fontFamily:'monospace', fontSize:'18px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.enemyHPBarBg = this.add.rectangle(this.enemyX, this.enemyY - 105, 180, 8, 0x333333);
    this.enemyHPBar   = this.add.rectangle(this.enemyX - 90, this.enemyY - 105, 180, 8, 0xcc4444).setOrigin(0, 0.5);

    // ─── player ───────────────────────────────────────────────────────────
    this.playerX = W / 2;
    this.playerY = H * 0.72;

    // correct key format: ${arch}_${state}_idle_0
    const srcKey = `${this.playerArchetype}_${this.outerwearState}_idle_0`;
    if (this.textures.exists(srcKey)) {
      const usedKey = window.PaletteSwap
        ? PaletteSwap.swapPalette(this, srcKey, `${srcKey}_${this.skinTone}_${this.hairColor}`, this.skinTone, this.hairColor)
        : srcKey;
      this.playerSprite = this.add.image(this.playerX, this.playerY, usedKey).setOrigin(0.5, 0.5);
      const targetH = H * 0.30;
      this.playerSprite.setScale(targetH / this.playerSprite.height);
    } else {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerY, 100, 150, 0x334466);
    }

    this.add.text(this.playerX, this.playerY + 30, 'YOU', {
      fontFamily:'monospace', fontSize:'14px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.playerHPBarBg = this.add.rectangle(this.playerX, this.playerY + 50, 180, 8, 0x333333);
    this.playerHPBar   = this.add.rectangle(this.playerX - 90, this.playerY + 50, 180, 8, 0x44cc44).setOrigin(0, 0.5);

    this.playerHPText = this.add.text(this.playerX, this.playerY + 64, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#888'
    }).setOrigin(0.5);
    this.updateHPBars();

    // ─── telegraph ────────────────────────────────────────────────────────
    this.telegraphText = this.add.text(W / 2, H * 0.46, '', {
      fontFamily:'monospace', fontSize:'14px', color:'#9a9a9a',
      align:'center', wordWrap:{ width: W - 60 }
    }).setOrigin(0.5);

    // ─── radial wheel ─────────────────────────────────────────────────────
    this.createRadialWheel();
    this.showTelegraph();
  }

  createRadialWheel() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H - 110;
    const r  = 70;

    const ps = this._ps;
    const available = (ps && ps.moves) || ['STRIKE','SLIP','WHISPER','HOLD'];
    const wheel = available.slice(0, 4);
    const colors = { STRIKE:0xcc4444, SLIP:0x44cc88, HOLD:0x4488cc, WHISPER:0xcc44cc, LOOP:0x9988cc };
    const angles = [-90, 0, 90, 180];

    this.moveButtons = [];
    wheel.forEach((moveId, i) => {
      const x = cx + Math.cos(angles[i] * Math.PI / 180) * r;
      const y = cy + Math.sin(angles[i] * Math.PI / 180) * r;
      const btn = this.add.circle(x, y, 30, colors[moveId] || 0x666666)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, y, moveId, {
        fontFamily:'monospace', fontSize:'10px', color:'#fff'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this.playerMove(moveId));
      this.moveButtons.push({ btn, label });
    });

    this.add.circle(cx, cy, 4, 0x444444);
  }

  showTelegraph() {
    if (!window.NPCRegistry) return;
    const move = NPCRegistry.chooseMove(this.npcId, this.turn);
    this._upcomingMove = move;
    const line = NPCRegistry.telegraphFor(this.npcId, move);
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

    if (Math.random() * 100 < this.playerStats.lck * 2) {
      crit = true;
      dmg = Math.floor(dmg * 1.6);
    }
    dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));

    this.applyDamageToEnemy(dmg, crit);
  }

  applyDamageToEnemy(dmg, crit) {
    // player attack frame
    const lungeKey = `${this.playerArchetype}_${this.outerwearState}_atk_lunge`;
    if (this.textures.exists(lungeKey) && this.playerSprite.setTexture) {
      const prev = this.playerSprite.texture.key;
      this.playerSprite.setTexture(lungeKey);
      this.time.delayedCall(180, () => { if (this.playerSprite.active) this.playerSprite.setTexture(prev); });
    }

    // enemy flash
    if (this.enemySprite.setAlpha) {
      this.tweens.add({ targets: this.enemySprite, alpha:{ from:0.3, to:1 }, duration:120 });
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

    const stanceKey = NPCRegistry.getFrame(this, this.npcId, 'attack_stance');
    if (stanceKey && this.enemySprite.setTexture) this.enemySprite.setTexture(stanceKey);

    this.time.delayedCall(600, () => {
      const actionKey = NPCRegistry.getFrame(this, this.npcId, 'attack_action');
      if (actionKey && this.enemySprite.setTexture) this.enemySprite.setTexture(actionKey);

      // enemy damage from npc stats directly
      let dmg = this.npc.stats.atk;
      if (move === 'WHISPER') dmg = Math.floor(dmg * 0.6);
      if (move === 'SLIP')    dmg = Math.floor(dmg * 0.8);
      if (move === 'HOLD')    dmg = 0;
      if (move === 'LOOP')    dmg = Math.floor(dmg * 1.3);
      dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));
      const reduced = Math.max(1, dmg - Math.floor(this.playerStats.def / 3));

      this.time.delayedCall(180, () => {
        // enemy back to idle
        const idleKey = NPCRegistry.getFrame(this, this.npcId, 'idle_1');
        if (idleKey && this.enemySprite.setTexture) this.enemySprite.setTexture(idleKey);

        // player flinch
        const flinchKey = `${this.playerArchetype}_${this.outerwearState}_idle_2`;
        if (this.textures.exists(flinchKey) && this.playerSprite.setTexture) {
          const prev = this.playerSprite.texture.key;
          this.playerSprite.setTexture(flinchKey);
          this.time.delayedCall(220, () => { if (this.playerSprite.active) this.playerSprite.setTexture(prev); });
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
      fontFamily:'monospace',
      fontSize: crit ? '28px' : '20px',
      color: crit ? '#ffd86b' : '#f4e8c1',
      stroke:'#000', strokeThickness:3
    }).setOrigin(0.5);
    this.tweens.add({
      targets: txt, y: y - 50, alpha:{ from:1, to:0 }, duration:800,
      onComplete: () => txt.destroy()
    });
  }

  updateHPBars() {
    this.enemyHPBar.scaleX = Math.max(0, this.enemyMaxHP > 0 ? this.enemyHP / this.enemyMaxHP : 0);
    this.playerHPBar.scaleX = Math.max(0, this.playerMaxHP > 0 ? this.playerHP / this.playerMaxHP : 0);
    if (this.playerHPText) this.playerHPText.setText(`${this.playerHP} / ${this.playerMaxHP}`);
  }

  victory() {
    // persist HP with 25% recovery
    if (!this.isTestBattle) {
      const ps = this._ps;
      ps.hp = Math.min(this.playerMaxHP, this.playerHP + Math.floor(this.playerMaxHP * 0.25));
      ps.maxHp = this.playerMaxHP;
      this.registry.set('playerState', ps);
    }

    // drop roll
    let droppedItem = null;
    if (!this.isTestBattle && this.npc.drops && Math.random() <= (this.npc.dropChance || 0)) {
      const dropId = this.npc.drops;
      const allDrops = [
        ...(window.BOSS_DROPS ? Object.values(window.BOSS_DROPS) : []),
        ...(window.MINOR_DROPS ? Object.values(window.MINOR_DROPS) : []),
        ...(window.STARTER_ACCESSORIES || [])
      ];
      const item = allDrops.find(i => i.id === dropId);
      if (item) {
        const ps = this._ps;
        ps.inventory = ps.inventory || [];
        if (!ps.inventory.some(i => i.id === item.id)) {
          ps.inventory.push(Object.assign({}, item));
          droppedItem = item;
          this.registry.set('playerState', ps);
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
      const ps = this._ps;
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
