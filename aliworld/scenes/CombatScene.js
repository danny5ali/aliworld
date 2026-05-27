// aliworld/scenes/CombatScene.js
// radial-wheel combat. sprites are 800x1328px source.
// all sizing uses setScale() against known source height, not setDisplaySize.

class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.npcId        = (data && data.npcId)       || 'walker';
    this.returnScene  = (data && data.returnScene) || 'E1Scene';
    this.isTestBattle = !!(data && data.isTestBattle);

    this.turn = 0;
    this.playerTurn = true;
    this.busy = false;
    this._logLines = [];

    const ps = this.registry.get('playerState') || {};
    this._ps = ps;

    this.playerArchetype = ps.archetype       || 'atk';
    this.outerwearState  = ps.outerwear_state || 'pre_e1';

    const eff = this._computeStats(ps);
    this.playerStats = eff;
    this.playerHP    = (ps.hp != null) ? ps.hp : eff.maxHp;
    this.playerMaxHP = eff.maxHp;

    const npc = window.NPCRegistry && NPCRegistry.get(this.npcId);
    if (!npc) {
      console.error('[CombatScene] unknown npcId:', this.npcId);
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
    const W = this.cameras.main.width;   // 540
    const H = this.cameras.main.height;  // 960

    // source sprite height for archetype and npc sprites
    const SRC_H = 1328;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);

    // arena divider at 50% height
    const DIVIDER_Y = H * 0.50;
    this.add.rectangle(0, DIVIDER_Y, W, 2, 0x222222).setOrigin(0, 0);

    // ─── LAYOUT PLAN (all in canvas px) ──────────────────────────────────
    // enemy name + HP bar: top 80px
    // enemy sprite: anchored feet at DIVIDER_Y - 20, visible height ~200px
    // telegraph + log: DIVIDER_Y + 10 to DIVIDER_Y + 80
    // player label + HP bar: H*0.55 to H*0.60
    // player sprite: feet at H*0.56, visible height ~200px (above HP bar)
    // radial wheel: center at H - 90

    // ─── ENEMY ───────────────────────────────────────────────────────────
    this.enemyX = W / 2;
    this.enemyFeetY = DIVIDER_Y - 16;

    // target: enemy sprite appears ~200px tall on screen
    // source height 1328, scale = 200/1328 ≈ 0.151
    const ENEMY_SCALE = 200 / SRC_H;

    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey) {
      this.enemySprite = this.add.image(this.enemyX, this.enemyFeetY, idleKey)
        .setOrigin(0.5, 1)
        .setScale(ENEMY_SCALE);
    } else {
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyFeetY, 80, 200, 0x554433)
        .setStrokeStyle(1, 0xffffff).setOrigin(0.5, 1);
      console.warn('[combat] no sprite for', this.npcId);
    }
    this._enemyScale = ENEMY_SCALE;

    const enemyLabelY = 32;
    this.add.text(this.enemyX, enemyLabelY, this.npc.displayName, {
      fontFamily:'monospace', fontSize:'18px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.enemyHPBarBg = this.add.rectangle(this.enemyX, 58, 220, 8, 0x333333);
    this.enemyHPBar   = this.add.rectangle(this.enemyX - 110, 58, 220, 8, 0xcc4444).setOrigin(0, 0.5);

    // ─── TELEGRAPH + LOG ─────────────────────────────────────────────────
    this.telegraphText = this.add.text(W / 2, DIVIDER_Y + 12, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#9a9a9a',
      align:'center', wordWrap:{ width: W - 40 }
    }).setOrigin(0.5, 0);

    this.logText = this.add.text(W / 2, DIVIDER_Y + 32, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#c8b890',
      align:'center', wordWrap:{ width: W - 40 }, lineSpacing:3
    }).setOrigin(0.5, 0);

    // ─── PLAYER ───────────────────────────────────────────────────────────
    // player feet at 62% down canvas, sprite visible above that, above HP bar
    this.playerX = W / 2;
    this.playerFeetY = H * 0.62;

    // target: player appears ~190px tall
    const PLAYER_SCALE = 190 / SRC_H;

    const srcKey = `${this.playerArchetype}_${this.outerwearState}_idle_0`;
    if (this.textures.exists(srcKey)) {
      this.playerSprite = this.add.image(this.playerX, this.playerFeetY, srcKey)
        .setOrigin(0.5, 1)
        .setScale(PLAYER_SCALE);
    } else {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerFeetY, 80, 190, 0x334466)
        .setOrigin(0.5, 1);
    }
    this._playerScale = PLAYER_SCALE;

    // HP bar and label below the player sprite
    const playerBarY = this.playerFeetY + 16;
    this.add.text(this.playerX, this.playerFeetY + 2, 'YOU', {
      fontFamily:'monospace', fontSize:'12px', color:'#f4e8c1'
    }).setOrigin(0.5, 0);

    this.playerHPBarBg = this.add.rectangle(this.playerX, playerBarY + 14, 220, 8, 0x333333);
    this.playerHPBar   = this.add.rectangle(this.playerX - 110, playerBarY + 14, 220, 8, 0x44cc44).setOrigin(0, 0.5);

    this.playerHPText = this.add.text(this.playerX, playerBarY + 28, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#888'
    }).setOrigin(0.5);

    this.updateHPBars();

    // ─── RADIAL WHEEL ─────────────────────────────────────────────────────
    this.createRadialWheel();
    this.showTelegraph();
  }

  // ─── helper: re-apply scale after texture swap ────────────────────────

  _resizeEnemy() {
    if (this.enemySprite && this.enemySprite.setScale) {
      this.enemySprite.setScale(this._enemyScale);
    }
  }

  _resizePlayer() {
    if (this.playerSprite && this.playerSprite.setScale) {
      this.playerSprite.setScale(this._playerScale);
    }
  }

  pushLog(line) {
    this._logLines.push(line);
    if (this._logLines.length > 3) this._logLines.shift();
    if (this.logText) this.logText.setText(this._logLines.join('\n'));
  }

  createRadialWheel() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H - 85;
    const r  = 66;

    const ps = this._ps;
    const available = (ps && ps.moves) || ['STRIKE','SLIP','WHISPER','HOLD'];
    const wheel = available.slice(0, 4);
    const colors = { STRIKE:0xcc4444, SLIP:0x44cc88, HOLD:0x4488cc, WHISPER:0xcc44cc, LOOP:0x9988cc };
    const angles = [-90, 0, 90, 180];

    this.moveButtons = [];
    wheel.forEach((moveId, i) => {
      const x = cx + Math.cos(angles[i] * Math.PI / 180) * r;
      const y = cy + Math.sin(angles[i] * Math.PI / 180) * r;
      const btn = this.add.circle(x, y, 28, colors[moveId] || 0x666666)
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
    const line = NPCRegistry.telegraphFor(this.npcId, move) || '';
    this.telegraphText.setText(line ? `${this.npc.displayName.toLowerCase()}: ${line}` : '');
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

    this.applyDamageToEnemy(dmg, crit, moveId);
  }

  applyDamageToEnemy(dmg, crit, moveId) {
    const lungeKey = `${this.playerArchetype}_${this.outerwearState}_atk_lunge`;
    if (this.textures.exists(lungeKey) && this.playerSprite.setTexture) {
      const prev = this.playerSprite.texture.key;
      this.playerSprite.setTexture(lungeKey);
      this._resizePlayer();
      this.time.delayedCall(160, () => {
        if (this.playerSprite.active) {
          this.playerSprite.setTexture(prev);
          this._resizePlayer();
        }
      });
    }

    this.shakeTarget(this.enemySprite, this.enemyX);

    const pauseMs = crit ? 100 : 50;
    this.time.delayedCall(pauseMs, () => {
      this.enemyHP = Math.max(0, this.enemyHP - dmg);
      this.updateHPBars();
      this.spawnDamageNumber(this.enemyX, this.enemyFeetY - 220, dmg, crit);
      this.pushLog(`you used ${moveId}.${dmg > 0 ? ` ${dmg} damage${crit ? '. crit!' : '.'}` : ''}`);
      if (crit) this.cameras.main.flash(60, 255, 220, 200);

      if (this.enemyHP <= 0) {
        this.pushLog(`${this.npc.displayName.toLowerCase()} is finished.`);
        this.time.delayedCall(600, () => this.victory());
      } else {
        this.time.delayedCall(450, () => this.enemyTurn());
      }
    });
  }

  shakeTarget(sprite, baseX) {
    if (!sprite || !sprite.active) return;
    this.tweens.add({
      targets: sprite, x: baseX - 8, duration: 40, yoyo: true, repeat: 1,
      onComplete: () => { if (sprite.active) sprite.x = baseX; }
    });
  }

  enemyTurn() {
    this.playerTurn = false;
    const move = this._upcomingMove || NPCRegistry.chooseMove(this.npcId, this.turn);

    const stanceKey = NPCRegistry.getFrame(this, this.npcId, 'attack_stance');
    if (stanceKey && this.enemySprite.setTexture) {
      this.enemySprite.setTexture(stanceKey);
      this._resizeEnemy();
    }

    this.time.delayedCall(250, () => {
      const actionKey = NPCRegistry.getFrame(this, this.npcId, 'attack_action');
      if (actionKey && this.enemySprite.setTexture) {
        this.enemySprite.setTexture(actionKey);
        this._resizeEnemy();
      }

      let dmg = this.npc.stats.atk;
      if (move === 'WHISPER') dmg = Math.floor(dmg * 0.6);
      if (move === 'SLIP')    dmg = Math.floor(dmg * 0.8);
      if (move === 'HOLD')    dmg = 0;
      if (move === 'LOOP')    dmg = Math.floor(dmg * 1.3);
      dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));
      const reduced = Math.max(1, dmg - Math.floor(this.playerStats.def / 3));

      if (reduced > 0) this.shakeTarget(this.playerSprite, this.playerX);

      this.time.delayedCall(200, () => {
        const idleKey = NPCRegistry.getFrame(this, this.npcId, 'idle_1');
        if (idleKey && this.enemySprite.setTexture) {
          this.enemySprite.setTexture(idleKey);
          this._resizeEnemy();
        }

        this.playerHP = Math.max(0, this.playerHP - reduced);
        this.updateHPBars();
        this.spawnDamageNumber(this.playerX, this.playerFeetY - 210, reduced, false);
        this.pushLog(`${this.npc.displayName.toLowerCase()} used ${move}. ${reduced} damage.`);

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
      fontSize: crit ? '26px' : '20px',
      color: crit ? '#ffd86b' : '#f4e8c1',
      stroke:'#000', strokeThickness:3
    }).setOrigin(0.5).setDepth(100);
    this.tweens.add({
      targets: txt, y: y - 40, alpha:{ from:1, to:0 }, duration:700,
      onComplete: () => txt.destroy()
    });
  }

  updateHPBars() {
    this.enemyHPBar.scaleX = Math.max(0, this.enemyMaxHP > 0 ? this.enemyHP / this.enemyMaxHP : 0);
    this.playerHPBar.scaleX = Math.max(0, this.playerMaxHP > 0 ? this.playerHP / this.playerMaxHP : 0);
    if (this.playerHPText) this.playerHPText.setText(`${this.playerHP} / ${this.playerMaxHP}`);
  }

  victory() {
    if (!this.isTestBattle) {
      const ps = this._ps;
      ps.hp = Math.min(this.playerMaxHP, this.playerHP + Math.floor(this.playerMaxHP * 0.25));
      ps.maxHp = this.playerMaxHP;
      this.registry.set('playerState', ps);
    }

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
