// aliworld/scenes/CombatScene.js
// sprite source: 800x1328 with transparent padding.
// scales: enemy 280/1328 ≈ 0.211, player 320/1328 ≈ 0.241

class CombatScene extends Phaser.Scene {
  constructor() { super({ key: 'CombatScene' }); }

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
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const SRC_H = 1328;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);

    const DIVIDER_Y = H * 0.52;
    this.add.rectangle(0, DIVIDER_Y, W, 2, 0x222222).setOrigin(0, 0);

    // ─── ENEMY ───────────────────────────────────────────────────────────
    this.enemyX = W / 2;
    this.enemyFeetY = DIVIDER_Y - 12;
    this._enemyScale = 280 / SRC_H;

    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey) {
      this.enemySprite = this.add.image(this.enemyX, this.enemyFeetY, idleKey)
        .setOrigin(0.5, 0.92)
        .setScale(this._enemyScale);
    } else {
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyFeetY, 80, 280, 0x554433)
        .setStrokeStyle(1, 0xffffff).setOrigin(0.5, 1);
    }

    this.add.text(this.enemyX, 32, this.npc.displayName, {
      fontFamily:'monospace', fontSize:'18px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.enemyHPBarBg = this.add.rectangle(this.enemyX, 58, 220, 8, 0x333333);
    this.enemyHPBar   = this.add.rectangle(this.enemyX - 110, 58, 220, 8, 0xcc4444).setOrigin(0, 0.5);

    // ─── TELEGRAPH + LOG ─────────────────────────────────────────────────
    this.telegraphText = this.add.text(W / 2, DIVIDER_Y + 14, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#9a9a9a',
      align:'center', wordWrap:{ width: W - 40 }
    }).setOrigin(0.5, 0);

    this.logText = this.add.text(W / 2, DIVIDER_Y + 34, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#c8b890',
      align:'center', wordWrap:{ width: W - 40 }, lineSpacing:3
    }).setOrigin(0.5, 0);

    // ─── PLAYER ──────────────────────────────────────────────────────────
    this.playerX = W / 2;
    this.playerFeetY = H * 0.78;
    this._playerScale = 320 / SRC_H;

    const srcKey = `${this.playerArchetype}_${this.outerwearState}_idle_0`;
    if (this.textures.exists(srcKey)) {
      this.playerSprite = this.add.image(this.playerX, this.playerFeetY, srcKey)
        .setOrigin(0.5, 0.92)
        .setScale(this._playerScale);
    } else {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerFeetY, 80, 320, 0x334466)
        .setOrigin(0.5, 1);
    }

    this.add.text(this.playerX, this.playerFeetY + 4, 'YOU', {
      fontFamily:'monospace', fontSize:'12px', color:'#f4e8c1'
    }).setOrigin(0.5, 0);

    const barY = this.playerFeetY + 22;
    this.playerHPBarBg = this.add.rectangle(this.playerX, barY, 220, 8, 0x333333);
    this.playerHPBar   = this.add.rectangle(this.playerX - 110, barY, 220, 8, 0x44cc44).setOrigin(0, 0.5);
    this.playerHPText  = this.add.text(this.playerX, barY + 14, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#888'
    }).setOrigin(0.5);

    this.updateHPBars();

    this.createRadialWheel();
    this.showTelegraph();
  }

  _resizeEnemy() { if (this.enemySprite && this.enemySprite.setScale) this.enemySprite.setScale(this._enemyScale); }
  _resizePlayer() { if (this.playerSprite && this.playerSprite.setScale) this.playerSprite.setScale(this._playerScale); }

  pushLog(line) {
    this._logLines.push(line);
    if (this._logLines.length > 3) this._logLines.shift();
    if (this.logText) this.logText.setText(this._logLines.join('\n'));
  }

  createRadialWheel() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H - 70;
    const r  = 56;

    const ps = this._ps;
    const available = (ps && ps.moves) || ['STRIKE','SLIP','WHISPER','HOLD'];
    const wheel = available.slice(0, 4);
    const colors = { STRIKE:0xcc4444, SLIP:0x44cc88, HOLD:0x4488cc, WHISPER:0xcc44cc, LOOP:0x9988cc };
    const angles = [-90, 0, 90, 180];

    this.moveButtons = [];
    wheel.forEach((moveId, i) => {
      const x = cx + Math.cos(angles[i] * Math.PI / 180) * r;
      const y = cy + Math.sin(angles[i] * Math.PI / 180) * r;
      const btn = this.add.circle(x, y, 24, colors[moveId] || 0x666666)
        .setInteractive({ useHandCursor: true });
      this.add.text(x, y, moveId, {
        fontFamily:'monospace', fontSize:'9px', color:'#fff'
      }).setOrigin(0.5);
      btn.on('pointerdown', () => this.playerMove(moveId));
      this.moveButtons.push({ btn });
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
      this.spawnDamageNumber(this.enemyX, this.enemyFeetY - 240, dmg, crit);
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
        this.spawnDamageNumber(this.playerX, this.playerFeetY - 280, reduced, false);
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
        combatResult: 'win', enemyKey: this.npcId, droppedItem
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
        combatResult: 'lose', enemyKey: this.npcId, droppedItem: null
      });
    });
  }
}

window.CombatScene = CombatScene;
