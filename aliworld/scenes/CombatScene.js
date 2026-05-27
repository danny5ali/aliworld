// aliworld/scenes/CombatScene.js
// radial-wheel combat with telegraphed enemy turns, damage numbers,
// hit-pause, crit flash, real npc sprites via NPCRegistry.
//
// hit log: shows the last 3 actions ("you used STRIKE - 6", "skeptic missed")
// pacing: enemy attacks are fast - stance for 250ms, action + shake for 200ms,
// back to idle. total under 600ms.
//
// palette swap currently disabled. needs source-color recalibration.

class CombatScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data) {
    this.npcId       = (data && data.npcId)       || 'walker';
    this.returnScene = (data && data.returnScene) || 'E1Scene';
    this.isTestBattle = !!(data && data.isTestBattle);

    this.turn = 0;
    this.playerTurn = true;
    this.busy = false;
    this._logLines = [];

    const ps = this.registry.get('playerState') || {};
    this._ps = ps;

    this.playerArchetype  = ps.archetype       || 'atk';
    this.skinTone         = ps.skin_tone       || 'medium';
    this.hairColor        = ps.hair_color      || 'black';
    this.outerwearState   = ps.outerwear_state || 'pre_e1';

    const eff = this._computeStats(ps);
    this.playerStats  = eff;
    this.playerHP     = (ps.hp != null) ? ps.hp : eff.maxHp;
    this.playerMaxHP  = eff.maxHp;

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

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);
    this.add.rectangle(0, H * 0.55, W, 2, 0x222222).setOrigin(0, 0);

    // ─── enemy ────────────────────────────────────────────────────────────
    // size to a fixed VISIBLE height so all enemies read comparable
    this.enemyX = W / 2;
    this.enemyY = H * 0.32;
    this.ENEMY_DISPLAY_H = H * 0.26;

    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey) {
      this.enemySprite = this.add.image(this.enemyX, this.enemyY, idleKey).setOrigin(0.5, 1);
      this.enemySprite.setDisplaySize(
        this.ENEMY_DISPLAY_H * (this.enemySprite.width / this.enemySprite.height),
        this.ENEMY_DISPLAY_H
      );
    } else {
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyY, 80, this.ENEMY_DISPLAY_H, 0x554433)
        .setStrokeStyle(1, 0xffffff).setOrigin(0.5, 1);
      console.warn('[combat] no sprite for', this.npcId);
    }

    this.add.text(this.enemyX, this.enemyY - this.ENEMY_DISPLAY_H - 30, this.npc.displayName, {
      fontFamily:'monospace', fontSize:'18px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.enemyHPBarBg = this.add.rectangle(this.enemyX, this.enemyY - this.ENEMY_DISPLAY_H - 10, 180, 8, 0x333333);
    this.enemyHPBar   = this.add.rectangle(this.enemyX - 90, this.enemyY - this.ENEMY_DISPLAY_H - 10, 180, 8, 0xcc4444).setOrigin(0, 0.5);

    // ─── player ───────────────────────────────────────────────────────────
    this.playerX = W / 2;
    this.playerY = H * 0.76;
    this.PLAYER_DISPLAY_H = H * 0.28;

    const srcKey = `${this.playerArchetype}_${this.outerwearState}_idle_0`;
    if (this.textures.exists(srcKey)) {
      this.playerSprite = this.add.image(this.playerX, this.playerY, srcKey).setOrigin(0.5, 1);
      this.playerSprite.setDisplaySize(
        this.PLAYER_DISPLAY_H * (this.playerSprite.width / this.playerSprite.height),
        this.PLAYER_DISPLAY_H
      );
    } else {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerY, 80, this.PLAYER_DISPLAY_H, 0x334466).setOrigin(0.5, 1);
    }

    this.add.text(this.playerX, this.playerY + 10, 'YOU', {
      fontFamily:'monospace', fontSize:'12px', color:'#f4e8c1'
    }).setOrigin(0.5);

    this.playerHPBarBg = this.add.rectangle(this.playerX, this.playerY + 28, 180, 8, 0x333333);
    this.playerHPBar   = this.add.rectangle(this.playerX - 90, this.playerY + 28, 180, 8, 0x44cc44).setOrigin(0, 0.5);

    this.playerHPText = this.add.text(this.playerX, this.playerY + 42, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#888'
    }).setOrigin(0.5);
    this.updateHPBars();

    // ─── telegraph + log ──────────────────────────────────────────────────
    // telegraph: enemy upcoming intent (above)
    // log: last 3 lines of action (below enemy, above player)

    this.telegraphText = this.add.text(W / 2, this.enemyY + 12, '', {
      fontFamily:'monospace', fontSize:'13px', color:'#9a9a9a',
      align:'center', wordWrap:{ width: W - 60 }
    }).setOrigin(0.5, 0);

    this.logText = this.add.text(W / 2, H * 0.50, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#c8b890',
      align:'center', wordWrap:{ width: W - 60 }, lineSpacing:4
    }).setOrigin(0.5, 0);

    // ─── radial wheel ─────────────────────────────────────────────────────
    this.createRadialWheel();
    this.showTelegraph();
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
    const cy = H - 90;
    const r  = 64;

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
    // player attack frame swap (atk_lunge if available)
    const lungeKey = `${this.playerArchetype}_${this.outerwearState}_atk_lunge`;
    if (this.textures.exists(lungeKey) && this.playerSprite.setTexture) {
      const prev = this.playerSprite.texture.key;
      this.playerSprite.setTexture(lungeKey);
      // preserve display size
      this.playerSprite.setDisplaySize(
        this.PLAYER_DISPLAY_H * (this.playerSprite.width / this.playerSprite.height),
        this.PLAYER_DISPLAY_H
      );
      this.time.delayedCall(160, () => {
        if (this.playerSprite.active) {
          this.playerSprite.setTexture(prev);
          this.playerSprite.setDisplaySize(
            this.PLAYER_DISPLAY_H * (this.playerSprite.width / this.playerSprite.height),
            this.PLAYER_DISPLAY_H
          );
        }
      });
    }

    // enemy shake + flash
    this.shakeEnemy();

    const pauseMs = crit ? 100 : 50;
    this.time.delayedCall(pauseMs, () => {
      this.enemyHP = Math.max(0, this.enemyHP - dmg);
      this.updateHPBars();
      this.spawnDamageNumber(this.enemyX, this.enemyY - this.ENEMY_DISPLAY_H / 2, dmg, crit);
      this.pushLog(`you used ${moveId}.${dmg > 0 ? ` ${dmg} damage${crit ? '. crit!' : '.'}` : ''}`);

      if (crit) this.cameras.main.flash(60, 255, 220, 200);

      if (this.enemyHP <= 0) {
        this.pushLog(`${this.npc.displayName.toLowerCase()} is finished.`);
        this.time.delayedCall(600, () => this.victory());
      } else {
        this.time.delayedCall(500, () => this.enemyTurn());
      }
    });
  }

  shakeEnemy() {
    if (!this.enemySprite || !this.enemySprite.active) return;
    const baseX = this.enemyX;
    this.tweens.add({
      targets: this.enemySprite, x: baseX - 8, duration: 40, yoyo: true, repeat: 1,
      onComplete: () => { if (this.enemySprite.active) this.enemySprite.x = baseX; }
    });
  }

  shakePlayer() {
    if (!this.playerSprite || !this.playerSprite.active) return;
    const baseX = this.playerX;
    this.tweens.add({
      targets: this.playerSprite, x: baseX - 6, duration: 40, yoyo: true, repeat: 1,
      onComplete: () => { if (this.playerSprite.active) this.playerSprite.x = baseX; }
    });
  }

  // ─── ENEMY TURN ──────────────────────────────────────────────────────────
  // pacing: stance 250ms -> action + shake 200ms -> back to idle. fast.

  enemyTurn() {
    this.playerTurn = false;
    const move = this._upcomingMove || NPCRegistry.chooseMove(this.npcId, this.turn);

    // step 1: stance briefly
    const stanceKey = NPCRegistry.getFrame(this, this.npcId, 'attack_stance');
    if (stanceKey && this.enemySprite.setTexture) {
      this.enemySprite.setTexture(stanceKey);
      this.enemySprite.setDisplaySize(
        this.ENEMY_DISPLAY_H * (this.enemySprite.width / this.enemySprite.height),
        this.ENEMY_DISPLAY_H
      );
    }

    this.time.delayedCall(250, () => {
      // step 2: action frame + impact on player
      const actionKey = NPCRegistry.getFrame(this, this.npcId, 'attack_action');
      if (actionKey && this.enemySprite.setTexture) {
        this.enemySprite.setTexture(actionKey);
        this.enemySprite.setDisplaySize(
          this.ENEMY_DISPLAY_H * (this.enemySprite.width / this.enemySprite.height),
          this.ENEMY_DISPLAY_H
        );
      }

      // damage from npc stats
      let dmg = this.npc.stats.atk;
      if (move === 'WHISPER') dmg = Math.floor(dmg * 0.6);
      if (move === 'SLIP')    dmg = Math.floor(dmg * 0.8);
      if (move === 'HOLD')    dmg = 0;
      if (move === 'LOOP')    dmg = Math.floor(dmg * 1.3);
      dmg = Math.max(0, dmg + Math.floor((Math.random() - 0.5) * 3));
      const reduced = Math.max(1, dmg - Math.floor(this.playerStats.def / 3));

      // shake player on hit
      if (reduced > 0) this.shakePlayer();

      this.time.delayedCall(200, () => {
        // step 3: back to idle
        const idleKey = NPCRegistry.getFrame(this, this.npcId, 'idle_1');
        if (idleKey && this.enemySprite.setTexture) {
          this.enemySprite.setTexture(idleKey);
          this.enemySprite.setDisplaySize(
            this.ENEMY_DISPLAY_H * (this.enemySprite.width / this.enemySprite.height),
            this.ENEMY_DISPLAY_H
          );
        }

        this.playerHP = Math.max(0, this.playerHP - reduced);
        this.updateHPBars();
        this.spawnDamageNumber(this.playerX, this.playerY - this.PLAYER_DISPLAY_H / 2, reduced, false);
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
