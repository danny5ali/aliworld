// aliworld/scenes/E1Scene.js
// uses SpriteAutoFit so scales and origins work regardless of transparent padding.

class E1Scene extends Phaser.Scene {
  constructor() { super({ key: 'E1Scene' }); }

  init(data) {
    this.combatResult  = data && data.combatResult;
    this.defeatedEnemy = data && data.enemyKey;
    this.droppedItem   = data && data.droppedItem;
  }

  create() {
    if (this.combatResult === 'lose') {
      const p = this.registry.get('playerState');
      if (p) { p.hp = p.maxHp; this.registry.set('playerState', p); }
    }

    if (this.combatResult === 'win') {
      const ps = this.registry.get('playerState');
      if (ps) {
        const recovery = Math.floor((ps.maxHp || 28) * 0.25);
        ps.hp = Math.min(ps.maxHp, (ps.hp || ps.maxHp) + recovery);
        this.registry.set('playerState', ps);
      }
      const current = this.registry.get('e1Progress');
      let payoff = null;
      if (current === 'skeptic_fight') {
        this.registry.set('e1Progress', 'walker_beat');
        payoff = { lines: [
          { speaker: null, text: 'he stops. blinks twice.' },
          { speaker: null, text: 'walks past you like nothing happened.' },
          { speaker: null, text: "he won't remember asking." },
        ]};
      } else if (current === 'walker_fight') {
        this.registry.set('e1Progress', 'cafe_beat');
        payoff = { lines: [
          { speaker: null,     text: 'he keeps walking.' },
          { speaker: 'walker', text: 'that new joint is —' },
          { speaker: null,     text: "the loop holds. but he's a little quieter now." },
        ]};
      } else if (current === 'mark_fight') {
        this.registry.set('e1Progress', 'obsidian_beat');
        payoff = { lines: [
          { speaker: null, text: "mark goes still. his eyes don't move." },
          { speaker: null, text: "the conversation kept going. it just wasn't with him anymore." },
          { speaker: null, text: 'on the table behind him, a red jacket.' },
          { speaker: null, text: "you don't remember seeing it before." },
        ]};
      }
      if (payoff && this.droppedItem) {
        payoff.lines.push(
          { speaker: null, text: `you found: ${this.droppedItem.name}.` },
          { speaker: null, text: this.droppedItem.desc || '' }
        );
      }
      this._pendingPayoff = payoff;
    }

    const progress = this.registry.get('e1Progress') || 'intro';
    if (this._pendingPayoff) {
      const payoff = this._pendingPayoff;
      this._pendingPayoff = null;
      return this.showPayoff(payoff, () => this.routeToProgress(progress));
    }
    return this.routeToProgress(progress);
  }

  routeToProgress(progress) {
    switch (progress) {
      case 'intro':         return this.startIntro();
      case 'skeptic_fight': return this.startSkepticFight();
      case 'walker_beat':   return this.startWalkerBeat();
      case 'walker_fight':  return this.startWalkerFight();
      case 'cafe_beat':     return this.startCafeBeat();
      case 'mark_fight':    return this.startMarkFight();
      case 'obsidian_beat': return this.startObsidianBeat();
      case 'complete':
        this.registry.set('e1Progress', null);
        this.scene.start('HomeScene');
        return;
      default: return this.startIntro();
    }
  }

  showPayoff(payoff, onComplete) {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.time.delayedCall(600, () => this.showDialogue(payoff.lines, onComplete));
  }

  drawBg(key) {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor('#000000');
    if (this.textures.exists(key)) {
      const img = this.add.image(width / 2, height, key).setOrigin(0.5, 1);
      const scaleX = width  / img.width;
      const scaleY = height / img.height;
      img.setScale(Math.max(scaleX, scaleY));
      img.setDepth(-100);
    } else {
      const colors = { bg_field:0x2a4a2a, bg_cafe:0x2a1f0f, bg_obsidian:0x1a2030, bg_steps:0x2a3a2a };
      this.add.rectangle(0, 0, width, height, colors[key] || 0x0a0a0f).setOrigin(0, 0).setDepth(-100);
    }
    // feet land at this y. just above the dialogue strip.
    this._groundY = height - 230;
  }

  addPlayerSprite(xRatio) {
    const { width } = this.scale;
    const x = width * xRatio;
    const y = this._groundY;

    const config = this.registry.get('avatarConfig') || {};
    const archetype = config.archetype     || 'atk';
    const state     = config.outerwear_state || 'pre_e1';
    const key = `${archetype}_${state}_idle_0`;

    if (this.textures.exists(key) && window.SpriteAutoFit) {
      const sprite = SpriteAutoFit.place(this, x, y, key, { targetH: 380 });
      if (sprite) { sprite.setDepth(10); return sprite; }
    }
    return this.add.rectangle(x, y, 36, 70, 0x4444cc)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5, 1).setDepth(10);
  }

  addNPC(xRatio, npcIdOrColor, label) {
    const { width } = this.scale;
    const x = width * xRatio;
    const y = this._groundY;

    if (typeof npcIdOrColor === 'string' && window.NPCRegistry) {
      const idleKey = NPCRegistry.getFrame(this, npcIdOrColor, 'idle_1');
      if (idleKey && window.SpriteAutoFit) {
        const sprite = SpriteAutoFit.place(this, x, y, idleKey, { targetH: 340 });
        if (sprite) {
          sprite.setDepth(10);
          sprite.npcId = npcIdOrColor;
          sprite._idleFrames = ['idle_1', 'idle_2'];
          sprite._frameIdx = 0;
          this.time.addEvent({
            delay: 1200, loop: true,
            callback: () => {
              if (!sprite.active) return;
              sprite._frameIdx = (sprite._frameIdx + 1) % sprite._idleFrames.length;
              const k = NPCRegistry.getFrame(this, npcIdOrColor, sprite._idleFrames[sprite._frameIdx]);
              if (k) { sprite.setTexture(k); SpriteAutoFit.applyTo(sprite, k, { targetH: 340 }); }
            }
          });
          return sprite;
        }
      }
    }

    const color = typeof npcIdOrColor === 'number' ? npcIdOrColor : 0xaa7744;
    const rect = this.add.rectangle(x, y, 40, 76, color)
      .setStrokeStyle(2, 0xffffff).setOrigin(0.5, 1).setDepth(10);
    if (label) {
      this.add.text(x, y - 88, label, {
        fontFamily:'monospace', fontSize:'12px', color:'#aaaaaa'
      }).setOrigin(0.5).setDepth(11);
    }
    return rect;
  }

  addMenuButton() {
    const { width } = this.scale;
    const bg = this.add.circle(width - 38, 28, 18, 0x1a1a2a)
      .setStrokeStyle(1, 0x444455).setInteractive({ useHandCursor: true }).setDepth(50);
    this.add.text(width - 38, 28, '⋮', {
      fontFamily:'monospace', fontSize:'20px', color:'#888899'
    }).setOrigin(0.5).setDepth(51);
    bg.on('pointerup', () => this.fadeOut(300, () => this.scene.start('AccessoryScene', { returnScene: 'E1Scene' })));
  }

  fadeIn(d, cb) {
    this.cameras.main.fadeIn(d || 600, 0, 0, 0);
    if (cb) this.time.delayedCall(d || 600, cb);
  }
  fadeOut(d, cb) {
    this.cameras.main.fadeOut(d || 600, 0, 0, 0);
    if (cb) this.cameras.main.once('camerafadeoutcomplete', cb);
  }
  showDialogue(lines, onComplete) {
    if (this._dialogue) this._dialogue.cleanup();
    this._dialogue = new DialogueManager(this);
    this._dialogue.show(lines, onComplete);
  }
  launchCombat(npcId, progressKey) {
    this.registry.set('e1Progress', progressKey);
    if (this._dialogue) this._dialogue.cleanup();
    this.fadeOut(400, () => this.scene.start('CombatScene', { npcId, returnScene: 'E1Scene' }));
  }

  startIntro() {
    this.fadeIn(1000);
    this.drawBg('bg_field');
    const { width } = this.scale;
    const player = this.addPlayerSprite(0.25);
    this.showDialogue([
      { speaker:null, text:'where am i.' },
      { speaker:null, text:'what is this place.' },
      { speaker:null, text:'it feels like something already happened here.' },
      { speaker:null, text:"like everyone is playing a part they don't know they memorized." },
      { speaker:null, text:"i've been here before. i don't remember arriving." },
    ], () => {
      this.tweens.add({
        targets: player, x: width * 0.4, duration: 1400, ease:'Linear',
        onComplete: () => this.triggerSkeptic(player)
      });
    });
  }

  triggerSkeptic(player) {
    const { width } = this.scale;
    const skeptic = this.addNPC(1.2, 'skeptic', 'stranger');
    this.tweens.add({
      targets: skeptic, x: width * 0.7, duration: 900, ease:'Linear',
      onComplete: () => {
        this.showDialogue([
          { speaker:'stranger', text:'hey.' },
          { speaker:'stranger', text:"hey — i'm talking to you." },
          { speaker:null,       text:"he asked you a question. you didn't answer. now he's angry." },
        ], () => this.launchCombat('skeptic', 'skeptic_fight'));
      }
    });
  }

  startSkepticFight() {
    this.fadeIn(400);
    this.drawBg('bg_field');
    this.addPlayerSprite(0.35);
    this.addNPC(0.7, 'skeptic', 'stranger');
    this.showDialogue([
      { speaker:null, text:"he's still in your way." }
    ], () => this.launchCombat('skeptic', 'skeptic_fight'));
  }

  startWalkerBeat() {
    this.fadeIn(600);
    this.drawBg('bg_field');
    this.addMenuButton();
    this.addPlayerSprite(0.3);
    const walker = this.addNPC(0.7, 'walker', 'walker');
    if (walker.npcId) {
      walker._idleFrames = ['walk_1','walk_2','walk_3','walk_4','walk_5','walk_6'];
      walker._frameIdx = 0;
    }
    this.showDialogue([
      { speaker:'walker', text:'that new joint is crazy.' },
      { speaker:'walker', text:'that new joint is crazy.' },
      { speaker:null,     text:"he doesn't see you. he's somewhere else entirely." },
      { speaker:null,     text:'you step into his path.' },
      { speaker:'walker', text:'that new joint is crazy.' },
      { speaker:'walker', text:'that new joint is —' },
      { speaker:'walker', text:'... you.' },
    ], () => this.launchCombat('walker', 'walker_fight'));
  }

  startWalkerFight() {
    this.fadeIn(400);
    this.drawBg('bg_field');
    this.addPlayerSprite(0.3);
    this.addNPC(0.7, 'walker', 'walker');
    this.showDialogue([
      { speaker:'walker', text:'that new joint is crazy.' },
      { speaker:null,     text:'he loops back.' }
    ], () => this.launchCombat('walker', 'walker_fight'));
  }

  startCafeBeat() {
    this.fadeIn(800);
    this.drawBg('bg_cafe');
    this.addMenuButton();
    const { width } = this.scale;
    this.addPlayerSprite(0.25);
    this.addNPC(0.55, 0x888866, null);
    const mark = this.addNPC(0.85, 'mark', 'mark');
    this.showDialogue([
      { speaker:null,   text:'the cafe is warm. everyone is talking.' },
      { speaker:null,   text:'nobody looks up. except one.' },
      { speaker:'mark', text:'hey —' },
      { speaker:'mark', text:'you been around here long?' },
    ], () => {
      this.tweens.add({
        targets: mark, x: width * 0.55, duration: 800, ease:'Linear',
        onComplete: () => {
          this.showDialogue([
            { speaker:'mark', text:"i feel like i've seen you before." },
            { speaker:null,   text:"his face is friendly. his eyes don't match." },
            { speaker:'mark', text:"what'd you say your name was?" },
            { speaker:null,   text:"you don't answer." },
            { speaker:'mark', text:'you should sit down.' },
            { speaker:null,   text:"the conversation wasn't an invitation. it was a hold." },
          ], () => this.launchCombat('mark', 'mark_fight'));
        }
      });
    });
  }

  startMarkFight() {
    this.fadeIn(400);
    this.drawBg('bg_cafe');
    this.addPlayerSprite(0.25);
    this.addNPC(0.55, 'mark', 'mark');
    this.showDialogue([
      { speaker:'mark', text:'you should sit down.' },
      { speaker:null,   text:"he says it again. like it's the first time." }
    ], () => this.launchCombat('mark', 'mark_fight'));
  }

  startObsidianBeat() {
    this.equipRedJacket();
    this.fadeIn(1000);
    this.drawBg('bg_obsidian');
    const { width } = this.scale;
    const config = this.registry.get('avatarConfig') || {};
    const arch = config.archetype || 'atk';
    const srcKey = `${arch}_post_e1_idle_0`;

    if (this.textures.exists(srcKey) && window.SpriteAutoFit) {
      const sprite = SpriteAutoFit.place(this, width * 0.5, this._groundY, srcKey, { targetH: 460 });
      if (sprite) sprite.setDepth(10);
    } else {
      this.add.rectangle(width * 0.5, this._groundY, 40, 80, 0xb32a1f)
        .setStrokeStyle(2, 0xff6644).setOrigin(0.5, 1).setDepth(10);
    }

    this.showTriangleFlash(() => {
      this.showDialogue([
        { speaker:null, text:'the conversation kept going.' },
        { speaker:null, text:"it just wasn't with him anymore." },
        { speaker:null, text:'you walk out.' },
        { speaker:null, text:"the jacket is on. you don't remember putting it on." },
        { speaker:null, text:'someone across the street looks up.' },
        { speaker:null, text:"that's the first sighting." },
      ], () => {
        this.fadeOut(1200, () => {
          this.registry.set('e1Progress', 'complete');
          this.scene.start('HomeScene', { e1Complete:true });
        });
      });
    });
  }

  showTriangleFlash(onComplete) {
    const { width, height } = this.scale;
    const g = this.add.graphics();
    g.lineStyle(3, 0xb32a1f, 1);
    const cx = width / 2, cy = height / 2, s = 80;
    g.beginPath();
    g.moveTo(cx, cy - s);
    g.lineTo(cx + s * 0.866, cy + s * 0.5);
    g.lineTo(cx - s * 0.866, cy + s * 0.5);
    g.closePath();
    g.strokePath();
    g.lineBetween(cx - s * 0.4, cy + s * 0.5, cx + s * 0.4, cy + s * 0.5);
    g.setAlpha(0);
    this.tweens.add({
      targets: g, alpha:{ from:0, to:1 }, duration:300, yoyo:true, repeat:2,
      onComplete: () => { g.destroy(); onComplete && onComplete(); }
    });
  }

  equipRedJacket() {
    const config = this.registry.get('avatarConfig') || {};
    if (!config.outerwear_starter) config.outerwear_starter = config.outerwear_state || 'pre_e1';
    config.outerwear_state = 'post_e1';
    this.registry.set('avatarConfig', config);
    const ps = this.registry.get('playerState') || {};
    ps.outerwear_state = 'post_e1';
    this.registry.set('playerState', ps);
    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        supabase.from('aw_users').update({ outerwear_state:'post_e1' }).eq('user_id', userId).then(()=>{}).catch(()=>{});
      }
    } catch (e) {}
  }
}

const E1_ENEMIES = {
  skeptic: { key:'skeptic', name:'The Skeptic', hp:22, maxHp:22, atk:6, def:2, spd:4, lck:2 },
  walker:  { key:'walker',  name:'The Walker',  hp:28, maxHp:28, atk:5, def:4, spd:8, lck:2 },
  mark:    { key:'mark',    name:'Mark',        hp:45, maxHp:45, atk:5, def:5, spd:5, lck:4, isBoss:true }
};

window.E1Scene = E1Scene;
window.E1_ENEMIES = E1_ENEMIES;
