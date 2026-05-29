// aliworld/scenes/CombatScene.js
// read-and-answer combat. the enemy telegraphs; your move is the answer.
//
// the loop:
//   enemy about to HIT  -> SLIP (dodge + counter, chance to stun) or HOLD (brace, chip)
//   enemy NOT hitting    -> STRIKE the opening (big), or WHISPER to break their rhythm
//   STRIKE into a hit     -> you trade, you eat the full shot
//
// statuses: brace (your next hit softened), shake (their next hit softened),
//           bleed (tail damage on the enemy), stun (enemy skips a turn).

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

    this.playerStatus = { brace: 0 };
    this.enemyStatus  = { shake: 0, bleed: 0, stun: 0 };

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
      this.npcId = 'walker';
      this.npc = NPCRegistry.get('walker');
    } else this.npc = npc;
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

  // which enemy moves actually come at you
  _enemyAttacks(move) {
    return move === 'STRIKE' || move === 'LOOP' || move === 'SLIP';
  }

  create() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;

    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(0, 0, W, H, 0x0a0a0a).setOrigin(0, 0);

    // subtle vignette
    const vg = this.add.graphics().setDepth(0);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vg.fillRect(0, 0, W, 140);
    vg.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, 0.55, 0.55);
    vg.fillRect(0, H - 180, W, 180);

    const DIVIDER_Y = H * 0.42;
    this.add.rectangle(0, DIVIDER_Y, W, 2, 0x222222).setOrigin(0, 0);

    // enemy
    this.enemyX = W / 2;
    this.enemyFeetY = H * 0.39;
    this._enemyTargetH = 250;

    this.add.ellipse(this.enemyX, this.enemyFeetY + 2, 130, 24, 0x000000, 0.30);

    const idleKey = window.NPCRegistry && NPCRegistry.getFrame(this, this.npcId, 'idle_1');
    if (idleKey && this.textures.exists(idleKey) && window.SpriteAutoFit) {
      this.enemySprite = SpriteAutoFit.place(this, this.enemyX, this.enemyFeetY, idleKey, { targetH: this._enemyTargetH, crop: true });
    }
    if (!this.enemySprite) {
      this.enemySprite = this.add.rectangle(this.enemyX, this.enemyFeetY, 80, 250, 0x554433)
        .setStrokeStyle(1, 0xffffff).setOrigin(0.5, 1);
    }

    this.add.text(this.enemyX, 32, this.npc.displayName, {
      fontFamily:'monospace', fontSize:'18px', color:'#f4e8c1'
    }).setOrigin(0.5);
    this.enemyHPBarBg = this.add.rectangle(this.enemyX, 58, 220, 8, 0x333333);
    this.enemyHPBar   = this.add.rectangle(this.enemyX - 110, 58, 220, 8, 0xcc4444).setOrigin(0, 0.5);
    this.enemyStatusText = this.add.text(this.enemyX, 72, '', {
      fontFamily:'monospace', fontSize:'10px', color:'#c89b6b'
    }).setOrigin(0.5);

    // telegraph + log band
    this.telegraphText = this.add.text(W / 2, DIVIDER_Y + 8, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#9a9a9a',
      align:'center', wordWrap:{ width: W - 40 }
    }).setOrigin(0.5, 0);
    this.logText = this.add.text(W / 2, DIVIDER_Y + 28, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#c8b890',
      align:'center', wordWrap:{ width: W - 40 }, lineSpacing:3
    }).setOrigin(0.5, 0);

    // player
    this.playerX = W / 2;
    this.playerFeetY = H * 0.78;
    this._playerTargetH = 220;

    this.add.ellipse(this.playerX, this.playerFeetY + 2, 150, 28, 0x000000, 0.35);

    const srcKey = `${this.playerArchetype}_${this.outerwearState}_idle_0`;
    if (this.textures.exists(srcKey) && window.SpriteAutoFit) {
      this.playerSprite = SpriteAutoFit.place(this, this.playerX, this.playerFeetY, srcKey, { targetH: this._playerTargetH, crop: true });
    }
    if (!this.playerSprite) {
      this.playerSprite = this.add.rectangle(this.playerX, this.playerFeetY, 80, 220, 0x334466).setOrigin(0.5, 1);
    }

    this.youLabel = this.add.text(this.playerX, this.playerFeetY + 4, 'YOU', {
      fontFamily:'monospace', fontSize:'12px', color:'#f4e8c1'
    }).setOrigin(0.5, 0);
    const barY = this.playerFeetY + 22;
    this.playerHPBarBg = this.add.rectangle(this.playerX, barY, 220, 8, 0x333333);
    this.playerHPBar   = this.add.rectangle(this.playerX - 110, barY, 220, 8, 0x44cc44).setOrigin(0, 0.5);
    this.playerHPText  = this.add.text(this.playerX, barY + 14, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#888'
    }).setOrigin(0.5);

    this.updateHPBars();
    this.refreshStatusDisplay();
    this.createRadialWheel();
    this.showTelegraph();
  }

  _refitEnemy(key) {
    if (window.SpriteAutoFit && this.enemySprite.setTexture) {
      SpriteAutoFit.applyTo(this.enemySprite, key, { targetH: this._enemyTargetH, crop: true });
    }
  }
  _refitPlayer(key) {
    if (window.SpriteAutoFit && this.playerSprite.setTexture) {
      SpriteAutoFit.applyTo(this.playerSprite, key, { targetH: this._playerTargetH, crop: true });
    }
  }

  pushLog(line) {
    if (!line) return;
    this._logLines.push(line);
    if (this._logLines.length > 3) this._logLines.shift();
    if (this.logText) this.logText.setText(this._logLines.join('\n'));
  }

  refreshStatusDisplay() {
    const es = [];
    if (this.enemyStatus.stun > 0)  es.push('reeling');
    if (this.enemyStatus.shake > 0) es.push('shaken');
    if (this.enemyStatus.bleed > 0) es.push('bleeding');
    if (this.enemyStatusText) this.enemyStatusText.setText(es.join('   '));
    if (this.youLabel) this.youLabel.setText(this.playerStatus.brace > 0 ? 'YOU · braced' : 'YOU');
  }

  createRadialWheel() {
    const W = this.cameras.main.width;
    const H = this.cameras.main.height;
    const cx = W / 2;
    const cy = H - 88;
    const r  = 50;

    const ps = this._ps;
    const available = (ps && ps.moves) || ['STRIKE','SLIP','WHISPER','HOLD'];
    const wheel = available.slice(0, 4);
    const colors = { STRIKE:0xcc4444, SLIP:0x44cc88, HOLD:0x4488cc, WHISPER:0xcc44cc, LOOP:0x9988cc };
    const angles = [-90, 0, 90, 180];

    this.moveButtons = [];
    wheel.forEach((moveId, i) => {
      const x = cx + Math.cos(angles[i] * Math.PI / 180) * r;
      const y = cy + Math.sin(angles[i] * Math.PI / 180) * r;
      const btn = this.add.circle(x, y, 22, colors[moveId] || 0x666666)
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
    if (this.enemyStatus.stun > 0) {
      this._upcomingMove = 'STUNNED';
      this.telegraphText.setText(`${this.npc.displayName.toLowerCase()} is reeling.`);
      return;
    }
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

  // ===== turn resolution =====

  resolveMoves(pMove, eMove) {
    const atk  = this.playerStats.atk;
    const eAtk = this.npc.stats.atk;
    const enemyStunned = this.enemyStatus.stun > 0;
    const enemyAttacks = !enemyStunned && this._enemyAttacks(eMove);

    // raw incoming before the player's choice
    let eDmg = 0;
    if (enemyAttacks) {
      eDmg = eAtk;
      if (eMove === 'LOOP') eDmg = Math.floor(eAtk * 1.3);
      if (eMove === 'SLIP') eDmg = Math.floor(eAtk * 0.7);
      if (this.enemyStatus.shake > 0) eDmg = Math.floor(eDmg * 0.5);
    }

    const out = {
      playerDmg: 0, crit: false, incoming: 0,
      dodged: false, braced: false,
      stunApplied: false, shakeApplied: false, bleedApplied: false,
      enemyAttacks, enemyStunned, eMove, pMove
    };

    const jitter = (d) => Math.max(0, d + Math.floor((Math.random() - 0.5) * 3));

    if (pMove === 'STRIKE') {
      let dmg = Math.floor(atk * 1.3);
      if (!enemyAttacks) dmg = Math.floor(dmg * 1.5);           // punish the opening
      if (Math.random() * 100 < this.playerStats.lck * 2 + 6) { // crit
        out.crit = true; out.bleedApplied = true; dmg = Math.floor(dmg * 1.6);
      }
      out.playerDmg = jitter(dmg);
      out.incoming = eDmg;                                       // you traded, full shot

    } else if (pMove === 'SLIP') {
      if (enemyAttacks) {
        out.dodged = true; out.incoming = 0;
        out.playerDmg = jitter(Math.floor(atk * 0.7));
        if (Math.random() * 100 < 20 + this.playerStats.lck * 2) out.stunApplied = true;
      } else {
        out.incoming = 0;
        out.playerDmg = jitter(Math.floor(atk * 0.4));           // slipped nothing
      }

    } else if (pMove === 'HOLD') {
      out.braced = true;
      out.playerDmg = 0;
      out.incoming = Math.floor(eDmg * 0.3);                     // tanked to chip

    } else if (pMove === 'WHISPER') {
      out.playerDmg = jitter(Math.floor(atk * 0.5));
      out.shakeApplied = true;
      out.incoming = eDmg;                                       // didn't defend
    }

    // existing brace token from a prior HOLD
    if (this.playerStatus.brace > 0 && out.incoming > 0) {
      out.incoming = Math.floor(out.incoming * 0.6);
    }
    // defense soak
    if (out.incoming > 0) out.incoming = Math.max(1, out.incoming - Math.floor(this.playerStats.def / 3));

    return out;
  }

  playerMove(moveId) {
    if (this.busy || !this.playerTurn) return;
    this.busy = true;
    this.setWheelEnabled(false);

    const eMove = this._upcomingMove || NPCRegistry.chooseMove(this.npcId, this.turn);
    const r = this.resolveMoves(moveId, eMove);
    this.runPlayerPhase(r);
  }

  runPlayerPhase(r) {
    // player lunge if dealing damage
    if (r.playerDmg > 0) {
      const lungeKey = `${this.playerArchetype}_${this.outerwearState}_atk_lunge`;
      if (this.textures.exists(lungeKey) && this.playerSprite.setTexture) {
        const prev = this.playerSprite.texture.key;
        this.playerSprite.setTexture(lungeKey);
        this._refitPlayer(lungeKey);
        this.time.delayedCall(160, () => {
          if (this.playerSprite.active) { this.playerSprite.setTexture(prev); this._refitPlayer(prev); }
        });
      }
      this.shakeTarget(this.enemySprite, this.enemyX);
    }

    const pause = r.crit ? 100 : 50;
    this.time.delayedCall(pause, () => {
      if (r.playerDmg > 0) {
        this.enemyHP = Math.max(0, this.enemyHP - r.playerDmg);
        this.updateHPBars();
        this.spawnDamageNumber(this.enemyX, this.enemyFeetY - 130, r.playerDmg, r.crit);
      }
      this.pushLog(this._playerLogLine(r));
      if (r.crit) { this.cameras.main.flash(60, 255, 220, 200); this.cameras.main.shake(90, 0.004); }

      // bleed tick on the enemy
      if (this.enemyStatus.bleed > 0 && this.enemyHP > 0) {
        const b = Math.max(1, Math.floor(this.enemyMaxHP * 0.06));
        this.enemyHP = Math.max(0, this.enemyHP - b);
        this.updateHPBars();
        this.spawnDamageNumber(this.enemyX + 26, this.enemyFeetY - 150, b, false);
        this.pushLog(`${this.npc.displayName.toLowerCase()} bleeds. ${b} damage.`);
      }

      if (this.enemyHP <= 0) {
        this.pushLog(`${this.npc.displayName.toLowerCase()} is finished.`);
        this.time.delayedCall(600, () => this.victory());
      } else {
        this.time.delayedCall(420, () => this.runEnemyPhase(r));
      }
    });
  }

  runEnemyPhase(r) {
    this.playerTurn = false;

    if (r.enemyStunned) {
      this.pushLog(`${this.npc.displayName.toLowerCase()} can't move.`);
      this.time.delayedCall(260, () => this.finalizeTurn(r));
      return;
    }

    if (!r.enemyAttacks) {
      // stalled / looped - no contact
      this.time.delayedCall(220, () => this.finalizeTurn(r));
      return;
    }

    const stanceKey = NPCRegistry.getFrame(this, this.npcId, 'attack_stance');
    if (stanceKey && this.textures.exists(stanceKey) && this.enemySprite.setTexture) {
      this.enemySprite.setTexture(stanceKey); this._refitEnemy(stanceKey);
    }

    this.time.delayedCall(250, () => {
      const actionKey = NPCRegistry.getFrame(this, this.npcId, 'attack_action');
      if (actionKey && this.textures.exists(actionKey) && this.enemySprite.setTexture) {
        this.enemySprite.setTexture(actionKey); this._refitEnemy(actionKey);
      }

      if (r.incoming > 0) this.shakeTarget(this.playerSprite, this.playerX);

      this.time.delayedCall(200, () => {
        const idleKey = NPCRegistry.getFrame(this, this.npcId, 'idle_1');
        if (idleKey && this.textures.exists(idleKey) && this.enemySprite.setTexture) {
          this.enemySprite.setTexture(idleKey); this._refitEnemy(idleKey);
        }

        if (r.incoming > 0) {
          this.playerHP = Math.max(0, this.playerHP - r.incoming);
          this.updateHPBars();
          this.spawnDamageNumber(this.playerX, this.playerFeetY - 110, r.incoming, false);
        }

        if (this.playerHP <= 0) {
          this.time.delayedCall(500, () => this.defeat());
        } else {
          this.finalizeTurn(r);
        }
      });
    });
  }

  finalizeTurn(r) {
    // age existing statuses
    if (this.enemyStatus.shake > 0) this.enemyStatus.shake--;
    if (this.enemyStatus.bleed > 0) this.enemyStatus.bleed--;
    if (this.enemyStatus.stun  > 0) this.enemyStatus.stun--;
    if (this.playerStatus.brace > 0) this.playerStatus.brace--;

    // apply new statuses
    if (r.shakeApplied) this.enemyStatus.shake = 2;
    if (r.bleedApplied) this.enemyStatus.bleed = 2;
    if (r.stunApplied)  this.enemyStatus.stun  = 1;
    if (r.braced)       this.playerStatus.brace = 1;

    this.refreshStatusDisplay();

    this.turn++;
    this.playerTurn = true;
    this.busy = false;
    this.setWheelEnabled(true);
    this.showTelegraph();
  }

  _playerLogLine(r) {
    const name = this.npc.displayName.toLowerCase();
    switch (r.pMove) {
      case 'STRIKE':
        if (r.enemyStunned || !r.enemyAttacks) return `you struck the opening. ${r.playerDmg}!${r.crit ? ' crit.' : ''}`;
        return `you traded blows. ${r.playerDmg} dealt, ${r.incoming} taken.`;
      case 'SLIP':
        if (r.dodged) return `you slipped it. counter for ${r.playerDmg}.${r.stunApplied ? ` ${name} reels.` : ''}`;
        return `you slipped nothing. ${r.playerDmg}.`;
      case 'HOLD':
        if (r.enemyAttacks) return `you braced. ${r.incoming} chip.`;
        return `you set your feet. nothing comes.`;
      case 'WHISPER':
        return `you whisper. ${name}'s rhythm breaks.`;
      default:
        return `you used ${r.pMove}.`;
    }
  }

  shakeTarget(sprite, baseX) {
    if (!sprite || !sprite.active) return;
    this.tweens.add({
      targets: sprite, x: baseX - 8, duration: 40, yoyo: true, repeat: 1,
      onComplete: () => { if (sprite.active) sprite.x = baseX; }
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
      this.scene.start(this.returnScene, { combatResult:'win', enemyKey: this.npcId, droppedItem });
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
      this.scene.start(this.returnScene, { combatResult:'lose', enemyKey: this.npcId, droppedItem: null });
    });
  }
}

window.CombatScene = CombatScene;
