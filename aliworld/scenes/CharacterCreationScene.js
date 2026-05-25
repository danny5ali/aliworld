// aliworld/scenes/CharacterCreationScene.js
// portrait-mode, full-screen swipeable cards
// one archetype at a time, hero portrait dominant

class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  init() {
    this.selected = { skin: 'medium', hair: 'black' };
    this.currentIndex = 1; // ATK default (index 1)
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

    // dark background
    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    // top header
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

    // build card content (portrait + label + name + lore + stats)
    this.buildCard();

    // arrows
    this.buildArrows();

    // swatches
    this.buildSwatches();

    // bottom buttons
    this.buildButtons();

    // swipe input
    this.setupSwipe();

    this.refreshCard();
  }

  buildCard() {
    const { width, height } = this.scale;
    // card area: between header and swatches
    const cardTop = 110;
    const cardBottom = height - 240;
    const cardH = cardBottom - cardTop;

    // portrait section (top 60% of card)
    this.portraitContainer = this.add.container(this.cx, cardTop + cardH * 0.36);

    // create one image per archetype, hide all but current
    this.portraitImages = {};
    this.archetypes.forEach(arch => {
      const portraitKey = `${arch.key}_pre_e1_portrait`;
      const idleKey = `${arch.key}_pre_e1_idle_0`;
      const useKey = this.textures.exists(portraitKey) ? portraitKey :
                     this.textures.exists(idleKey) ? idleKey : null;

      let img;
      if (useKey) {
        img = this.add.image(0, 0, useKey).setOrigin(0.5);
        // scale to fit, height roughly cardH * 0.65
        const target = cardH * 0.65;
        const scale = target / img.height;
        img.setScale(scale);
      } else {
        // fallback colored block
        img = this.add.rectangle(0, 0, 140, 240, arch.color, 0.3);
      }
      img.setVisible(false);
      this.portraitContainer.add(img);
      this.portraitImages[arch.key] = img;
    });

    // label + name + lore - positioned absolutely so they don't push into swatches
    this.labelText = this.add.text(this.cx, height - 330, '', {
      fontFamily:'monospace', fontSize:'24px', fontStyle:'bold', color:'#ffffff'
    }).setOrigin(0.5);

    this.nameText = this.add.text(this.cx, height - 305, '', {
      fontFamily:'monospace', fontSize:'12px', color:'#888899'
    }).setOrigin(0.5);

    this.loreText = this.add.text(this.cx, height - 280, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#7a7060',
      align:'center', wordWrap:{ width: width - 60 }
    }).setOrigin(0.5);

    // stats - position relative to bottom of safe area, NOT lore
    // swatches start at height - 196, so stats must be above that with breathing room
    this.statsText = this.add.text(this.cx, height - 250, '', {
      fontFamily:'monospace', fontSize:'10px', color:'#444455', align:'center'
    }).setOrigin(0.5);
  }

  buildArrows() {
    const { width, height } = this.scale;
    const arrowY = height / 2 - 100;

    this.leftArrow = this.add.text(28, arrowY, '◀', {
      fontFamily:'monospace', fontSize:'28px', color:'#444455'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.rightArrow = this.add.text(width - 28, arrowY, '▶', {
      fontFamily:'monospace', fontSize:'28px', color:'#ebe2d2'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.leftArrow.on('pointerup', () => this.swipe(-1));
    this.rightArrow.on('pointerup', () => this.swipe(1));
  }

  buildSwatches() {
    const { width, height } = this.scale;
    const swatchSize = 36;
    const gap = 12;
    const skinY = height - 196;
    const hairY = height - 144;

    this.buildSwatchRow('skin', 'SKIN', skinY,
      ['light','medium','dark','deep'],
      [0xe8c4a0, 0xb87840, 0x7a4820, 0x4a2810], swatchSize, gap);

    this.buildSwatchRow('hair', 'HAIR', hairY,
      ['black','brown','auburn','silver'],
      [0x1a1a1a, 0x4a2e1a, 0x8b3a1a, 0xc8c8c8], swatchSize, gap);
  }

  buildSwatchRow(group, label, y, values, colors, size, gap) {
    const totalW = values.length * (size + gap) - gap;
    const startX = this.cx - totalW / 2 + size / 2;

    this.add.text(this.cx, y - size / 2 - 14, label, {
      fontFamily:'monospace', fontSize:'10px', color:'#666677'
    }).setOrigin(0.5);

    this['_swatches_' + group] = {};

    values.forEach((val, i) => {
      const x = startX + i * (size + gap);
      const isDefault = (group === 'skin' && val === 'medium') ||
                        (group === 'hair' && val === 'black');

      const sw = this.add.rectangle(x, y, size, size, colors[i])
        .setStrokeStyle(isDefault ? 2 : 1, isDefault ? 0xffffff : 0x333344)
        .setInteractive({ useHandCursor: true });

      sw.on('pointerup', () => {
        Object.values(this['_swatches_' + group]).forEach(s => s.setStrokeStyle(1, 0x333344));
        sw.setStrokeStyle(2, 0xffffff);
        this.selected[group] = val;
      });

      this['_swatches_' + group][val] = sw;
    });
  }

  buildButtons() {
    const { width, height } = this.scale;
    const btnY = height - 70;
    const btnH = 48;
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
      if (Math.abs(dx) > 60) {
        this.swipe(dx < 0 ? 1 : -1);
      }
      startX = null;
    });
  }

  swipe(dir) {
    const next = this.currentIndex + dir;
    if (next < 0 || next >= this.archetypes.length) return;
    this.currentIndex = next;
    this.refreshCard();
  }

  refreshCard() {
    const arch = this.archetypes[this.currentIndex];

    // show current portrait, hide others
    Object.entries(this.portraitImages).forEach(([key, img]) => {
      img.setVisible(key === arch.key);
    });

    this.labelText.setText(arch.label).setColor(arch.hex);
    this.nameText.setText(arch.name);
    this.loreText.setText(arch.lore);
    this.statsText.setText(arch.stats);

    // update dots
    this.dots.forEach((dot, i) => {
      dot.setFillStyle(i === this.currentIndex ? arch.color : 0x444455);
      dot.setRadius(i === this.currentIndex ? 4 : 3);
    });

    // dim/brighten arrows based on whether there's a next/prev
    this.leftArrow.setColor(this.currentIndex === 0 ? '#222233' : '#ebe2d2');
    this.rightArrow.setColor(this.currentIndex === this.archetypes.length - 1 ? '#222233' : '#ebe2d2');
  }

  launchTestBattle() {
    const arch = this.archetypes[this.currentIndex];
    const { skin, hair } = this.selected;
    const playerState = this.buildPlayerState(arch.key, skin, hair);

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CombatScene', {
        enemy: {
          key: 'training_dummy',
          name: 'Training Dummy',
          hp: 30, maxHp: 30, atk: 4, def: 4, spd: 4, lck: 3,
          moves: ['STRIKE', 'HOLD', 'SLIP'],
          telegraph: { STRIKE:'winding up', HOLD:'bracing', SLIP:'stepping in' }
        },
        playerState,
        returnScene: 'CharacterCreationScene',
        isTestBattle: true
      });
    });
  }

  buildPlayerState(archetype, skin, hair) {
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
    ps.skin_tone = skin;
    ps.hair_color = hair;
    ps.outerwear_state = 'pre_e1';
    return ps;
  }

  async confirm() {
    const arch = this.archetypes[this.currentIndex];
    const { skin, hair } = this.selected;
    const playerState = this.buildPlayerState(arch.key, skin, hair);

    this.registry.set('playerState', playerState);
    this.registry.set('avatarConfig', { archetype: arch.key, skin_tone: skin, hair_color: hair, outerwear_state: 'pre_e1' });

    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        await supabase.from('aw_users').update({
          archetype: arch.key, skin_tone: skin, hair_color: hair, outerwear_state: 'pre_e1'
        }).eq('user_id', userId);
      }
    } catch (e) {
      console.warn('[CharacterCreation] save failed:', e);
    }

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('NameScene');
    });
  }
}

window.CharacterCreationScene = CharacterCreationScene;
