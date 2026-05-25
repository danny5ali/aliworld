// aliworld/scenes/CharacterCreationScene.js
//
// step 1 of the game flow (after login, before HomeScene)
// player picks: archetype (LCK/ATK/DEF/SPD) + skin tone (4) + hair color (4)
// saves to supabase + registry, then advances to HomeScene

class CharacterCreationScene extends Phaser.Scene {
  constructor() {
    super({ key: 'CharacterCreationScene' });
  }

  init() {
    this.selected = {
      archetype: 'atk',
      skin: 'medium',
      hair: 'black'
    };
    this.previewTextures = {};
  }

  create() {
    const { width, height } = this.scale;

    // background
    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    // title
    this.add.text(width / 2, 32, 'WHO ARE YOU.', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(width / 2, 58, 'your build follows you through every episode.', {
      fontFamily: 'monospace', fontSize: '12px', color: '#555566'
    }).setOrigin(0.5);

    // archetype cards
    this.buildArchetypeCards();

    // skin tone row
    this.buildSwatchRow(
      'skin tone',
      height * 0.72,
      ['light', 'medium', 'dark', 'deep'],
      [0xe8c4a0, 0xb87840, 0x7a4820, 0x4a2810],
      (val) => { this.selected.skin = val; this.refreshPreview(); },
      'skin'
    );

    // hair color row
    this.buildSwatchRow(
      'hair',
      height * 0.82,
      ['black', 'brown', 'auburn', 'silver'],
      [0x1a1a1a, 0x4a2e1a, 0x6b2e1a, 0xc8c8c8],
      (val) => { this.selected.hair = val; this.refreshPreview(); },
      'hair'
    );

    // confirm button
    const btnY = height - 38;
    const btn = this.add.rectangle(width / 2, btnY, 260, 44, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    const btnText = this.add.text(width / 2, btnY, 'ENTER ALIWORLD', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setFillStyle(0x8a1f15));
    btn.on('pointerout',  () => btn.setFillStyle(0xb32a1f));
    btn.on('pointerup',   () => this.confirm());

    // preview container (center-right)
    this.previewContainer = this.add.container(width * 0.72, height * 0.42);
    this.previewSprite = null;
    this.previewBg = this.add.rectangle(
      width * 0.72, height * 0.42, 200, 340, 0x111120
    ).setStrokeStyle(1, 0x333355);

    this.refreshPreview();
  }

  // ─── ARCHETYPE CARDS ─────────────────────────────────────────────────────

  buildArchetypeCards() {
    const { width, height } = this.scale;
    const archetypes = [
      {
        key: 'lck',
        label: 'LCK',
        desc: 'gambler',
        stats: 'high luck. crits hit different.',
        color: 0xd4a017
      },
      {
        key: 'atk',
        label: 'ATK',
        desc: 'fighter',
        stats: 'heavy damage. glass cannon.',
        color: 0xb32a1f
      },
      {
        key: 'def',
        label: 'DEF',
        desc: 'wall',
        stats: 'takes everything. gives nothing back.',
        color: 0x2a4a7a
      },
      {
        key: 'spd',
        label: 'SPD',
        desc: 'runner',
        stats: 'always moves first. hard to pin.',
        color: 0x2a7a4a
      },
    ];

    const cardW = 148;
    const cardH = 180;
    const startX = 24;
    const cardY = height * 0.34;
    const gap = 8;

    this.archetypeCards = {};

    archetypes.forEach((arch, i) => {
      const x = startX + i * (cardW + gap) + cardW / 2;

      const bg = this.add.rectangle(x, cardY, cardW, cardH, 0x111120)
        .setStrokeStyle(2, arch.key === this.selected.archetype ? arch.color : 0x333344)
        .setInteractive({ useHandCursor: true });

      // archetype portrait (if loaded)
      const portraitKey = `${arch.key}_pre_e1_portrait`;
      let portrait;
      if (this.textures.exists(portraitKey)) {
        portrait = this.add.image(x, cardY - 20, portraitKey)
          .setDisplaySize(80, 120)
          .setOrigin(0.5);
      } else {
        portrait = this.add.rectangle(x, cardY - 20, 80, 120, arch.color, 0.3);
      }

      const label = this.add.text(x, cardY + 55, arch.label, {
        fontFamily: 'monospace', fontSize: '16px',
        color: '#' + arch.color.toString(16).padStart(6, '0'),
        fontStyle: 'bold'
      }).setOrigin(0.5);

      const desc = this.add.text(x, cardY + 73, arch.desc, {
        fontFamily: 'monospace', fontSize: '11px', color: '#888899'
      }).setOrigin(0.5);

      const stats = this.add.text(x, cardY + 90, arch.stats, {
        fontFamily: 'monospace', fontSize: '9px', color: '#555566',
        wordWrap: { width: cardW - 12 }, align: 'center'
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        if (this.selected.archetype !== arch.key) bg.setStrokeStyle(2, 0x666688);
      });
      bg.on('pointerout', () => {
        if (this.selected.archetype !== arch.key) bg.setStrokeStyle(2, 0x333344);
      });
      bg.on('pointerup', () => {
        this.selectArchetype(arch.key);
      });

      this.archetypeCards[arch.key] = { bg, color: arch.color };
    });
  }

  selectArchetype(key) {
    // deselect all
    Object.entries(this.archetypeCards).forEach(([k, card]) => {
      card.bg.setStrokeStyle(2, 0x333344);
    });
    // select new
    const card = this.archetypeCards[key];
    card.bg.setStrokeStyle(2, card.color);
    this.selected.archetype = key;
    this.refreshPreview();
  }

  // ─── SWATCH ROWS ─────────────────────────────────────────────────────────

  buildSwatchRow(label, y, values, colors, onChange, groupKey) {
    const { width } = this.scale;
    const swatchSize = 28;
    const gap = 10;
    const totalW = values.length * (swatchSize + gap) - gap;
    const startX = (width * 0.58 - totalW) / 2;

    this.add.text(startX, y - 18, label, {
      fontFamily: 'monospace', fontSize: '11px', color: '#666677'
    });

    this['_swatches_' + groupKey] = {};

    values.forEach((val, i) => {
      const x = startX + i * (swatchSize + gap) + swatchSize / 2;
      const isDefault = (groupKey === 'skin' && val === 'medium') ||
                        (groupKey === 'hair' && val === 'black');

      const swatch = this.add.rectangle(x, y, swatchSize, swatchSize, colors[i])
        .setStrokeStyle(isDefault ? 2 : 1, isDefault ? 0xffffff : 0x333344)
        .setInteractive({ useHandCursor: true });

      swatch.on('pointerup', () => {
        // deselect all in group
        Object.values(this['_swatches_' + groupKey]).forEach(s => {
          s.setStrokeStyle(1, 0x333344);
        });
        swatch.setStrokeStyle(2, 0xffffff);
        onChange(val);
      });

      this['_swatches_' + groupKey][val] = swatch;
    });
  }

  // ─── PREVIEW ─────────────────────────────────────────────────────────────

  refreshPreview() {
    const { archetype, skin, hair } = this.selected;
    const sourceKey = `${archetype}_pre_e1_idle_0`;

    if (!this.textures.exists(sourceKey)) {
      // no texture loaded yet - show colored placeholder
      if (this.previewSprite) this.previewSprite.destroy();
      const colors = { lck: 0xd4a017, atk: 0xb32a1f, def: 0x2a4a7a, spd: 0x2a7a4a };
      this.previewSprite = this.add.rectangle(
        this.previewBg.x, this.previewBg.y, 80, 160, colors[archetype] || 0x444466
      );
      return;
    }

    const targetKey = `${archetype}_pre_e1_idle_0_${skin}_${hair}`;
    const usedKey = PaletteSwap.swapPalette(this, sourceKey, targetKey, skin, hair);

    if (this.previewSprite) this.previewSprite.destroy();
    this.previewSprite = this.add.image(
      this.previewBg.x, this.previewBg.y, usedKey
    ).setDisplaySize(140, 280).setOrigin(0.5);
  }

  // ─── CONFIRM ─────────────────────────────────────────────────────────────

  async confirm() {
    const { archetype, skin, hair } = this.selected;

    // save to registry immediately
    const playerState = this.registry.get('playerState') || {};
    playerState.archetype = archetype;
    playerState.skin_tone = skin;
    playerState.hair_color = hair;
    playerState.outerwear_state = 'pre_e1';

    // set base stats per archetype
    const statBuilds = {
      lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
      atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
      def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
      spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 },
    };
    Object.assign(playerState, statBuilds[archetype]);
    playerState.moves = ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'];
    playerState.accessories = [];

    this.registry.set('playerState', playerState);
    this.registry.set('avatarConfig', { archetype, skin_tone: skin, hair_color: hair, outerwear_state: 'pre_e1' });

    // save to supabase (best-effort, don't block on failure)
    try {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;
      if (supabase && userId) {
        await supabase.from('aw_users').update({
          archetype,
          skin_tone: skin,
          hair_color: hair,
          outerwear_state: 'pre_e1'
        }).eq('user_id', userId);
      }
    } catch (e) {
      console.warn('[CharacterCreation] supabase save failed (non-blocking):', e);
    }

    // advance to HomeScene
    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('HomeScene');
    });
  }
}

window.CharacterCreationScene = CharacterCreationScene;
