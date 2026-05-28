// aliworld/scenes/CharacterCreationScene.js
// portrait-mode, full-screen swipeable cards.
// skin/hair swatches removed - those need pre-rendered art variants, not runtime swap.
// when artist delivers skin x hair variants we add them back as additional archetype keys.

class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  init() {
    this.currentIndex = 1; // ATK default
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    this.archetypes = [
      { key:'lck', label:'LCK', name:'the gambler', lore:'moves like water. wins on readings others miss.\none good hit ends it.', stats:'+9 LCK  +4 SPD  +4 ATK  +4 DEF  25 HP', color:0xd4a017, hex:'#d4a017' },
      { key:'atk', label:'ATK', name:'the fighter', lore:'trades clean. no hesitation. takes damage\nto give damage. glass cannon.', stats:'+9 ATK  +4 SPD  +4 LCK  +3 DEF  28 HP', color:0xb32a1f, hex:'#b32a1f' },
      { key:'def', label:'DEF', name:'the wall',    lore:'built to absorb. every fight is a war\nof attrition. outlasts everything.', stats:'+9 DEF  +40 HP  +4 ATK  +4 LCK  +3 SPD', color:0x2a4a8a, hex:'#5588cc' },
      { key:'spd', label:'SPD', name:'the runner',  lore:'always moves first. hard to pin down.\nwins before the other side adjusts.', stats:'+9 SPD  +5 ATK  +4 LCK  +4 DEF  28 HP', color:0x2a8a4a, hex:'#44cc88' },
    ];

    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    this.add.text(this.cx, 36, 'WHO ARE YOU.', {
      fontFamily:'monospace', fontSize:'18px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5);

    this.add.text(this.cx, 60, 'swipe or tap arrows.', {
      fontFamily:'monospace', fontSize:'11px', color:'#444455'
    }).setOrigin(0.5);

    // page indicator dots
    this.dots = [];
    const dotY = 84;
    const dotGap = 16;
    const dotStartX = this.cx - (this.archetypes.length - 1) * dotGap / 2;
    this.archetypes.forEach((_, i) => {
      const dot = this.add.circle(dotStartX + i * dotGap, dotY, 3, 0x444455);
      this.dots.push(dot);
    });

    this.buildCard();
    this.buildArrows();
    this.buildButtons();
    this.setupSwipe();
    this.refreshCard();
  }

  buildCard() {
    const { width, height } = this.scale;
    this.portraitX = this.cx;
    this.portraitFeetY = height * 0.62;
    this.currentPortraitImage = null;

    // text under sprite
    this.labelText = this.add.text(this.cx, height - 220, '', {
      fontFamily:'monospace', fontSize:'24px', fontStyle:'bold', color:'#ffffff'
    }).setOrigin(0.5);

    this.nameText = this.add.text(this.cx, height - 192, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#888899'
    }).setOrigin(0.5);

    this.loreText = this.add.text(this.cx, height - 162, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#7a7060',
      align:'center', wordWrap:{ width: width - 60 }
    }).setOrigin(0.5);

    this.statsText = this.add.text(this.cx, height - 122, '', {
      fontFamily:'monospace', fontSize:'10px', color:'#444455', align:'center'
    }).setOrigin(0.5);
  }

  buildArrows() {
    const { width, height } = this.scale;
    const arrowY = height * 0.4;

    this.leftArrow = this.add.text(28, arrowY, '◀', {
      fontFamily:'monospace', fontSize:'28px', color:'#444455'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.rightArrow = this.add.text(width - 28, arrowY, '▶', {
      fontFamily:'monospace', fontSize:'28px', color:'#ebe2d2'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.leftArrow.on('pointerup', () => this.swipe(-1));
    this.rightArrow.on('pointerup', () => this.swipe(1));
  }

  buildButtons() {
    const { width, height } = this.scale;
    const btnY = height - 60;
    const btnH = 44;
    const btnW = (width - 48) / 2;

    const testX = this.cx - btnW / 2 - 4;
    const testBg = this.add.rectangle(testX, btnY, btnW, btnH, 0x1a1a2a)
      .setStrokeStyle(1, 0x444455).setInteractive({ useHandCursor: true });
    this.add.text(testX, btnY, 'TEST BATTLE', {
      fontFamily:'monospace', fontSize:'13px', color:'#888899'
    }).setOrigin(0.5);
    testBg.on('pointerup', () => this.launchTestBattle());

    const confirmX = this.cx + btnW / 2 + 4;
    const confirmBg = this.add.rectangle(confirmX, btnY, btnW, btnH, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    this.add.text(confirmX, btnY, 'ENTER ALIWORLD', {
      fontFamily:'monospace', fontSize:'13px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5);
    confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x8a1f15));
    confirmBg.on('pointerout',  () => confirmBg.setFillStyle(0xb32a1f));
    confirmBg.on('pointerup',   () => this.confirm());
  }

  setupSwipe() {
    let startX = null;
    this.input.on('pointerdown', p => { startX = p.x; });
    this.input.on('pointerup', p => {
      if (startX === null) return;
      const dx = p.x - startX;
      if (Math.abs(dx) > 60) this.swipe(dx < 0 ? 1 : -1);
      startX = null;
    });
  }

  swipe(dir) {
    const next = this.currentIndex + dir;
    if (next < 0 || next >= this.archetypes.length) return;
    this.currentIndex = next;
    this.refreshCard();
  }

  refreshPortrait() {
    const arch = this.archetypes[this.currentIndex];
    if (this.currentPortraitImage) {
      this.currentPortraitImage.destroy();
      this.currentPortraitImage = null;
    }

    const portraitKey = `${arch.key}_pre_e1_portrait`;
    const idleKey     = `${arch.key}_pre_e1_idle_0`;
    const sourceKey   = this.textures.exists(portraitKey) ? portraitKey :
                        this.textures.exists(idleKey)     ? idleKey : null;

    if (sourceKey && window.SpriteAutoFit) {
      const sprite = SpriteAutoFit.place(this, this.portraitX, this.portraitFeetY, sourceKey, { targetH: 520 });
      if (sprite) { this.currentPortraitImage = sprite; return; }
    }
    this.currentPortraitImage = this.add.rectangle(this.portraitX, this.portraitFeetY, 140, 240, arch.color, 0.3).setOrigin(0.5, 1);
  }

  refreshCard() {
    const arch = this.archetypes[this.currentIndex];
    this.refreshPortrait();

    this.labelText.setText(arch.label).setColor(arch.hex);
    this.nameText.setText(arch.name);
    this.loreText.setText(arch.lore);
    this.statsText.setText(arch.stats);

    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === this.currentIndex ? arch.color : 0x444455);
      dot.setRadius(i === this.currentIndex ? 4 : 3);
    });

    this.leftArrow.setColor(this.currentIndex === 0 ? '#222233' : '#ebe2d2');
    this.rightArrow.setColor(this.currentIndex === this.archetypes.length - 1 ? '#222233' : '#ebe2d2');
  }

  launchTestBattle() {
    const arch = this.archetypes[this.currentIndex];
    const playerState = this.buildPlayerState(arch.key);
    this.registry.set('playerState', playerState);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CombatScene', {
        npcId: 'training_dummy', returnScene: 'CharacterCreationScene', isTestBattle: true
      });
    });
  }

  buildPlayerState(archetype) {
    const statBuilds = {
      lck: { hp:25,maxHp:25,atk:4,def:4,spd:4,lck:9 },
      atk: { hp:28,maxHp:28,atk:9,def:3,spd:4,lck:4 },
      def: { hp:40,maxHp:40,atk:4,def:9,spd:3,lck:4 },
      spd: { hp:28,maxHp:28,atk:5,def:4,spd:9,lck:4 },
    };
    const ps = Object.assign(
      { moves:['STRIKE','SLIP','WHISPER','HOLD'], accessories:[] },
      statBuilds[archetype]
    );
    ps.archetype = archetype;
    ps.skin_tone = 'medium';
    ps.hair_color = 'black';
    ps.outerwear_state = 'pre_e1';
    return ps;
  }

  async confirm() {
    const arch = this.archetypes[this.currentIndex];
    const playerState = this.buildPlayerState(arch.key);
    this.registry.set('playerState', playerState);
    this.registry.set('avatarConfig', { archetype: arch.key, skin_tone: 'medium', hair_color: 'black', outerwear_state: 'pre_e1' });

    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        await supabase.from('aw_users').update({
          archetype: arch.key, skin_tone: 'medium', hair_color: 'black', outerwear_state: 'pre_e1'
        }).eq('user_id', userId);
      }
    } catch (e) { console.warn('[CharacterCreation] save failed:', e); }

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('NameScene');
    });
  }
}

window.CharacterCreationScene = CharacterCreationScene;
