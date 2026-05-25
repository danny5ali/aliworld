// aliworld/scenes/CharacterCreationScene.js
// mobile-first. pick archetype + skin + hair.
// includes lore per archetype, test battle, then confirm.

class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  init() {
    this.selected = { archetype: 'atk', skin: 'medium', hair: 'black' };
    this.phase = 'pick'; // 'pick' | 'confirm'
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    this.add.text(this.cx, 28, 'WHO ARE YOU.', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(this.cx, 52, 'choose your build. it follows you through every episode.', {
      fontFamily: 'monospace', fontSize: '11px', color: '#444455'
    }).setOrigin(0.5);

    this.buildCards();
    this.buildSwatches();
    this.buildConfirmRow();
    this.refreshSelected();
  }

  // ─── ARCHETYPE CARDS ─────────────────────────────────────────────────────

  buildCards() {
    const { width, height } = this.scale;
    const isMobile = width < 600;

    this.archetypes = [
      {
        key: 'lck',
        label: 'LCK',
        name: 'the gambler',
        lore: 'moves like water. wins on readings others miss. one good hit ends it.',
        stats: '+9 LCK  +4 SPD  +4 ATK  +4 DEF  25 HP',
        color: 0xd4a017,
        hex: '#d4a017'
      },
      {
        key: 'atk',
        label: 'ATK',
        name: 'the fighter',
        lore: 'trades clean. no hesitation. takes damage to give damage. glass cannon.',
        stats: '+9 ATK  +4 SPD  +4 LCK  +3 DEF  28 HP',
        color: 0xb32a1f,
        hex: '#b32a1f'
      },
      {
        key: 'def',
        label: 'DEF',
        name: 'the wall',
        lore: 'built to absorb. every fight is a war of attrition. outlasts everything.',
        stats: '+9 DEF  +40 HP  +4 ATK  +4 LCK  +3 SPD',
        color: 0x2a4a8a,
        hex: '#2a4a8a'
      },
      {
        key: 'spd',
        label: 'SPD',
        name: 'the runner',
        lore: 'always moves first. hard to pin down. wins before the other side adjusts.',
        stats: '+9 SPD  +5 ATK  +4 LCK  +4 DEF  28 HP',
        color: 0x2a8a4a,
        hex: '#2a8a4a'
      },
    ];

    // layout: 2x2 grid on mobile, 4-wide on desktop
    const cols = isMobile ? 2 : 4;
    const cardW = isMobile
      ? Math.floor((width - 32) / 2) - 6
      : Math.floor((width * 0.55 - 32) / 4) - 6;
    const cardH = isMobile ? 160 : 200;
    const startX = isMobile ? 16 + cardW / 2 : 16 + cardW / 2;
    const startY = isMobile ? 90 : 80;
    const gap = 8;

    this.cardObjects = {};

    this.archetypes.forEach((arch, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap) + cardH / 2;

      const bg = this.add.rectangle(x, y, cardW, cardH, 0x0d0d1a)
        .setStrokeStyle(2, 0x222233)
        .setInteractive({ useHandCursor: true });

      // portrait or color block
      const portraitKey = `${arch.key}_pre_e1_idle_0`;
      let portrait;
      if (this.textures.exists(portraitKey)) {
        portrait = this.add.image(x, y - cardH * 0.18, portraitKey)
          .setDisplaySize(cardW * 0.55, cardH * 0.55)
          .setOrigin(0.5);
      } else {
        portrait = this.add.rectangle(x, y - cardH * 0.18, cardW * 0.5, cardH * 0.5, arch.color, 0.25);
      }

      const label = this.add.text(x, y + cardH * 0.22, arch.label, {
        fontFamily: 'monospace', fontSize: isMobile ? '14px' : '16px',
        color: arch.hex, fontStyle: 'bold'
      }).setOrigin(0.5);

      const name = this.add.text(x, y + cardH * 0.34, arch.name, {
        fontFamily: 'monospace', fontSize: '10px', color: '#666677'
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (this.selected.archetype !== arch.key) bg.setFillStyle(0x111122);
      });
      bg.on('pointerout', () => {
        if (this.selected.archetype !== arch.key) bg.setFillStyle(0x0d0d1a);
      });
      bg.on('pointerup', () => this.selectArchetype(arch.key));

      this.cardObjects[arch.key] = { bg, color: arch.color, portrait, label, name };
    });

    // lore + stats panel (right side on desktop, below cards on mobile)
    const loreX = isMobile ? this.cx : width * 0.78;
    const loreY = isMobile ? startY + (Math.ceil(4 / cols)) * (cardH + gap) + 20 : startY + cardH / 2;
    const loreW = isMobile ? width - 32 : width * 0.38;

    this.loreBg = this.add.rectangle(loreX, loreY + 60, loreW, isMobile ? 100 : 180, 0x0d0d1a)
      .setStrokeStyle(1, 0x222233);

    this.loreArchLabel = this.add.text(loreX, loreY + 10, '', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.loreText = this.add.text(loreX, loreY + 32, '', {
      fontFamily: 'monospace', fontSize: '11px', color: '#8a8070',
      wordWrap: { width: loreW - 24 }, align: 'center'
    }).setOrigin(0.5, 0);

    this.statsText = this.add.text(loreX, loreY + 90, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#444455',
      align: 'center', wordWrap: { width: loreW - 24 }
    }).setOrigin(0.5, 0);

    this._isMobile = isMobile;
    this._cardH = cardH;
    this._cardW = cardW;
    this._cols = cols;
    this._startY = startY;
    this._gap = gap;
  }

  selectArchetype(key) {
    Object.entries(this.cardObjects).forEach(([k, card]) => {
      card.bg.setFillStyle(0x0d0d1a).setStrokeStyle(2, 0x222233);
    });
    const card = this.cardObjects[key];
    card.bg.setFillStyle(0x111122).setStrokeStyle(2, card.color);
    this.selected.archetype = key;
    this.refreshSelected();
  }

  refreshSelected() {
    const arch = this.archetypes.find(a => a.key === this.selected.archetype);
    if (!arch) return;
    this.loreArchLabel.setText(`${arch.label} — ${arch.name}`).setColor(arch.hex);
    this.loreText.setText(arch.lore);
    this.statsText.setText(arch.stats);
    // ensure the selected card shows as selected
    const card = this.cardObjects[arch.key];
    card.bg.setFillStyle(0x111122).setStrokeStyle(2, arch.color);
  }

  // ─── SWATCHES ────────────────────────────────────────────────────────────

  buildSwatches() {
    const { width, height } = this.scale;
    const isMobile = width < 600;

    // position below lore panel
    const swatchStartY = isMobile ? height - 140 : height - 120;
    const swatchSize = isMobile ? 32 : 28;

    this.buildSwatchRow('skin', 'SKIN', swatchStartY,
      ['light', 'medium', 'dark', 'deep'],
      [0xe8c4a0, 0xb87840, 0x7a4820, 0x4a2810],
      swatchSize
    );

    this.buildSwatchRow('hair', 'HAIR', swatchStartY + swatchSize + 14,
      ['black', 'brown', 'auburn', 'silver'],
      [0x1a1a1a, 0x4a2e1a, 0x8b3a1a, 0xc8c8c8],
      swatchSize
    );
  }

  buildSwatchRow(groupKey, label, y, values, colors, size) {
    const { width } = this.scale;
    const gap = 10;
    const totalW = values.length * (size + gap) - gap;
    const startX = this.cx - totalW / 2;

    this.add.text(startX - 8, y - 2, label, {
      fontFamily: 'monospace', fontSize: '10px', color: '#555566'
    }).setOrigin(1, 0);

    this['_swatches_' + groupKey] = {};

    values.forEach((val, i) => {
      const x = startX + i * (size + gap) + size / 2;
      const isDefault = (groupKey === 'skin' && val === 'medium') ||
                        (groupKey === 'hair' && val === 'black');

      const sw = this.add.rectangle(x, y + size / 2, size, size, colors[i])
        .setStrokeStyle(isDefault ? 2 : 1, isDefault ? 0xffffff : 0x333344)
        .setInteractive({ useHandCursor: true });

      sw.on('pointerup', () => {
        Object.values(this['_swatches_' + groupKey]).forEach(s => s.setStrokeStyle(1, 0x333344));
        sw.setStrokeStyle(2, 0xffffff);
        this.selected[groupKey === 'skin' ? 'skin' : 'hair'] = val;
      });

      this['_swatches_' + groupKey][val] = sw;
    });
  }

  // ─── CONFIRM ROW ─────────────────────────────────────────────────────────

  buildConfirmRow() {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    const btnY = height - 28;
    const btnH = 44;
    const btnW = isMobile ? (width - 48) / 2 : 200;

    // test battle button
    const testX = this.cx - btnW / 2 - 6;
    const testBg = this.add.rectangle(testX, btnY, btnW, btnH, 0x222233)
      .setStrokeStyle(1, 0x444455).setInteractive({ useHandCursor: true });
    this.add.text(testX, btnY, 'TEST BATTLE', {
      fontFamily: 'monospace', fontSize: '12px', color: '#888899'
    }).setOrigin(0.5);
    testBg.on('pointerup', () => this.launchTestBattle());

    // confirm button
    const confirmX = this.cx + btnW / 2 + 6;
    const confirmBg = this.add.rectangle(confirmX, btnY, btnW, btnH, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    this.add.text(confirmX, btnY, 'ENTER ALIWORLD', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);
    confirmBg.on('pointerover', () => confirmBg.setFillStyle(0x8a1f15));
    confirmBg.on('pointerout',  () => confirmBg.setFillStyle(0xb32a1f));
    confirmBg.on('pointerup',   () => this.confirm());
  }

  // ─── TEST BATTLE ─────────────────────────────────────────────────────────

  launchTestBattle() {
    const { archetype, skin, hair } = this.selected;
    const statBuilds = {
      lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
      atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
      def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
      spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 },
    };
    const playerState = Object.assign(
      { moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'], accessories: [] },
      statBuilds[archetype]
    );
    playerState.archetype = archetype;

    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('CombatScene', {
        enemy: {
          key: 'test_dummy',
          name: 'Training Dummy',
          hp: 30, maxHp: 30,
          atk: 4, def: 4, spd: 4, lck: 3,
          moves: ['STRIKE', 'HOLD', 'SLIP'],
          telegraph: {
            STRIKE: 'winding up',
            HOLD:   'bracing',
            SLIP:   'stepping in'
          }
        },
        playerState,
        returnScene: 'CharacterCreationScene',
        isTestBattle: true
      });
    });
  }

  // ─── CONFIRM ─────────────────────────────────────────────────────────────

  async confirm() {
    const { archetype, skin, hair } = this.selected;
    const statBuilds = {
      lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
      atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
      def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
      spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 },
    };

    const playerState = Object.assign(
      { moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'], accessories: [] },
      statBuilds[archetype]
    );
    playerState.archetype      = archetype;
    playerState.skin_tone      = skin;
    playerState.hair_color     = hair;
    playerState.outerwear_state = 'pre_e1';

    this.registry.set('playerState', playerState);
    this.registry.set('avatarConfig', {
      archetype, skin_tone: skin, hair_color: hair, outerwear_state: 'pre_e1'
    });

    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        await supabase.from('aw_users').update({
          archetype, skin_tone: skin, hair_color: hair, outerwear_state: 'pre_e1'
        }).eq('user_id', userId);
      }
    } catch (e) {
      console.warn('[CharacterCreation] save failed (non-blocking):', e);
    }

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('HomeScene');
    });
  }
}

window.CharacterCreationScene = CharacterCreationScene;
