// aliworld/scenes/AccessoryScene.js
// loadout screen: 3 equip slots, 24 accessories across 5 stat categories
// accessible from overworld menu
// stat bonuses only - no visual layer change

class AccessoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AccessoryScene' });
  }

  init(data) {
    this.returnScene = data && data.returnScene || 'OverworldScene';
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    // save current loadout state in case player cancels
    const playerState = this.registry.get('playerState') || {};
    this._originalSlots = [...(playerState.accessories || [])];
    this._slots = [...this._originalSlots];
    while (this._slots.length < 3) this._slots.push(null);

    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    this.add.text(this.cx, 24, 'LOADOUT', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);

    this.add.text(this.cx, 46, '3 slots. equip what fits your build.', {
      fontFamily: 'monospace', fontSize: '11px', color: '#444455'
    }).setOrigin(0.5);

    this.buildEquipSlots();
    this.buildAccessoryGrid();
    this.buildStatPreview();
    this.buildFooter();
    this.refreshSlotDisplay();
  }

  // ─── EQUIP SLOTS ─────────────────────────────────────────────────────────

  buildEquipSlots() {
    const { width } = this.scale;
    const slotSize = 56;
    const gap = 16;
    const totalW = 3 * slotSize + 2 * gap;
    const startX = this.cx - totalW / 2 + slotSize / 2;
    const y = 82;

    this._slotObjects = [];

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotSize + gap);

      const bg = this.add.rectangle(x, y, slotSize, slotSize, 0x111122)
        .setStrokeStyle(1, 0x333344)
        .setInteractive({ useHandCursor: true });

      const icon = this.add.image(x, y, '__DEFAULT').setDisplaySize(40, 40).setVisible(false);
      const emptyText = this.add.text(x, y, `${i + 1}`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#333344'
      }).setOrigin(0.5);

      bg.on('pointerup', () => this.unequipSlot(i));

      this._slotObjects.push({ bg, icon, emptyText, index: i });
    }

    this.add.text(this.cx, 115, 'tap a slot to unequip', {
      fontFamily: 'monospace', fontSize: '9px', color: '#333344'
    }).setOrigin(0.5);
  }

  refreshSlotDisplay() {
    this._slotObjects.forEach(({ bg, icon, emptyText }, i) => {
      const item = this._slots[i];
      if (item) {
        bg.setStrokeStyle(2, ACCESSORY_COLOR[item.stat] || 0x666688);
        if (this.textures.exists(`acc_${item.id}`)) {
          icon.setTexture(`acc_${item.id}`).setVisible(true);
        } else {
          icon.setVisible(false);
        }
        emptyText.setVisible(false);
      } else {
        bg.setStrokeStyle(1, 0x333344);
        icon.setVisible(false);
        emptyText.setVisible(true);
      }
    });
    this.refreshStatPreview();
  }

  unequipSlot(i) {
    this._slots[i] = null;
    this.refreshSlotDisplay();
  }

  // ─── ACCESSORY GRID ──────────────────────────────────────────────────────

  buildAccessoryGrid() {
    const { width, height } = this.scale;
    const isMobile = width < 600;
    const iconSize = isMobile ? 44 : 48;
    const gap = isMobile ? 8 : 10;
    const cols = isMobile ? 6 : 8;

    // group accessories by stat
    const groups = ['hp', 'atk', 'def', 'lck', 'spd'];
    const groupColors = {
      hp: '#cc4444', atk: '#cc8844', def: '#4488cc', lck: '#cccc44', spd: '#44cc88'
    };

    let currentY = 142;

    groups.forEach(stat => {
      const items = ACCESSORIES.filter(a => a.stat === stat);
      if (!items.length) return;

      this.add.text(16, currentY, stat.toUpperCase(), {
        fontFamily: 'monospace', fontSize: '10px',
        color: groupColors[stat] || '#888888'
      });
      currentY += 16;

      items.forEach((item, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 16 + col * (iconSize + gap) + iconSize / 2;
        const y = currentY + row * (iconSize + gap) + iconSize / 2;

        const bg = this.add.rectangle(x, y, iconSize, iconSize, 0x0d0d1a)
          .setStrokeStyle(1, 0x222233)
          .setInteractive({ useHandCursor: true });

        // icon image
        const texKey = `acc_${item.id}`;
        if (this.textures.exists(texKey)) {
          this.add.image(x, y, texKey).setDisplaySize(iconSize - 8, iconSize - 8);
        } else {
          this.add.text(x, y, item.icon || '?', {
            fontFamily: 'monospace', fontSize: '16px', color: groupColors[stat]
          }).setOrigin(0.5);
        }

        // tooltip on hover (desktop) or tap
        bg.on('pointerover', () => {
          bg.setFillStyle(0x1a1a2a);
          this.showTooltip(item, x, y - iconSize);
        });
        bg.on('pointerout', () => {
          bg.setFillStyle(0x0d0d1a);
          this.hideTooltip();
        });
        bg.on('pointerup', () => this.equipItem(item));
      });

      const rows = Math.ceil(items.length / cols);
      currentY += rows * (iconSize + gap) + 12;
    });
  }

  equipItem(item) {
    // find empty slot
    const emptySlot = this._slots.findIndex(s => s === null);
    if (emptySlot === -1) {
      // no empty slot - flash a message
      this.showMessage('unequip a slot first.');
      return;
    }
    // check not already equipped
    if (this._slots.some(s => s && s.id === item.id)) {
      this.showMessage('already equipped.');
      return;
    }
    this._slots[emptySlot] = item;
    this.refreshSlotDisplay();
  }

  // ─── STAT PREVIEW ────────────────────────────────────────────────────────

  buildStatPreview() {
    const { width, height } = this.scale;
    this._statPreviewBg = this.add.rectangle(width - 80, 200, 140, 120, 0x0d0d1a)
      .setStrokeStyle(1, 0x222233);
    this._statPreviewText = this.add.text(width - 80, 165, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#888899',
      align: 'center'
    }).setOrigin(0.5, 0);
  }

  refreshStatPreview() {
    const playerState = this.registry.get('playerState') || {};
    const bonuses = { hp: 0, atk: 0, def: 0, spd: 0, lck: 0 };
    this._slots.forEach(item => {
      if (item) bonuses[item.stat] = (bonuses[item.stat] || 0) + item.bonus;
    });
    const lines = [
      'WITH LOADOUT',
      '',
      `HP  ${(playerState.maxHp || 0) + (bonuses.hp || 0)}  (+${bonuses.hp})`,
      `ATK ${(playerState.atk || 0) + (bonuses.atk || 0)}  (+${bonuses.atk})`,
      `DEF ${(playerState.def || 0) + (bonuses.def || 0)}  (+${bonuses.def})`,
      `SPD ${(playerState.spd || 0) + (bonuses.spd || 0)}  (+${bonuses.spd})`,
      `LCK ${(playerState.lck || 0) + (bonuses.lck || 0)}  (+${bonuses.lck})`,
    ];
    this._statPreviewText.setText(lines.join('\n'));
  }

  // ─── TOOLTIP ─────────────────────────────────────────────────────────────

  showTooltip(item, x, y) {
    this.hideTooltip();
    const { width } = this.scale;
    const tx = Math.min(x + 60, width - 80);
    this._tooltip = [
      this.add.rectangle(tx, y - 10, 140, 52, 0x1a1a2a).setStrokeStyle(1, 0x444455).setDepth(200),
      this.add.text(tx, y - 28, item.name, {
        fontFamily: 'monospace', fontSize: '10px', color: '#ebe2d2', fontStyle: 'bold'
      }).setOrigin(0.5).setDepth(201),
      this.add.text(tx, y - 14, `+${item.bonus} ${item.stat.toUpperCase()}`, {
        fontFamily: 'monospace', fontSize: '10px', color: '#888899'
      }).setOrigin(0.5).setDepth(201),
      this.add.text(tx, y, item.desc, {
        fontFamily: 'monospace', fontSize: '9px', color: '#555566',
        wordWrap: { width: 128 }, align: 'center'
      }).setOrigin(0.5).setDepth(201),
    ];
  }

  hideTooltip() {
    if (this._tooltip) {
      this._tooltip.forEach(o => o.destroy());
      this._tooltip = null;
    }
  }

  showMessage(msg) {
    const { width, height } = this.scale;
    const t = this.add.text(this.cx, height / 2, msg, {
      fontFamily: 'monospace', fontSize: '14px', color: '#cc4444',
      backgroundColor: '#0d0d1a', padding: { x: 12, y: 6 }
    }).setOrigin(0.5).setDepth(300);
    this.time.delayedCall(1200, () => t.destroy());
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────

  buildFooter() {
    const { width, height } = this.scale;
    const btnY = height - 28;

    const cancelBg = this.add.rectangle(this.cx - 80, btnY, 140, 40, 0x111122)
      .setStrokeStyle(1, 0x333344).setInteractive({ useHandCursor: true });
    this.add.text(this.cx - 80, btnY, 'CANCEL', {
      fontFamily: 'monospace', fontSize: '12px', color: '#666677'
    }).setOrigin(0.5);
    cancelBg.on('pointerup', () => this.cancel());

    const saveBg = this.add.rectangle(this.cx + 80, btnY, 140, 40, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    this.add.text(this.cx + 80, btnY, 'SAVE LOADOUT', {
      fontFamily: 'monospace', fontSize: '12px', color: '#ebe2d2', fontStyle: 'bold'
    }).setOrigin(0.5);
    saveBg.on('pointerover', () => saveBg.setFillStyle(0x8a1f15));
    saveBg.on('pointerout',  () => saveBg.setFillStyle(0xb32a1f));
    saveBg.on('pointerup',   () => this.saveLoadout());
  }

  saveLoadout() {
    const playerState = this.registry.get('playerState') || {};
    playerState.accessories = this._slots.filter(Boolean);
    this.registry.set('playerState', playerState);
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.returnScene);
    });
  }

  cancel() {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(this.returnScene);
    });
  }
}

// ─── ACCESSORY DATA ──────────────────────────────────────────────────────────

const ACCESSORY_COLOR = {
  hp:  0xcc4444,
  atk: 0xcc8844,
  def: 0x4488cc,
  lck: 0xcccc44,
  spd: 0x44cc88
};

const ACCESSORIES = [
  // HP (6)
  { id: 'hp_cube',    name: 'Iron Cube',      stat: 'hp',  bonus: 8,  desc: 'old and heavy. takes hits.' },
  { id: 'hp_vial',    name: 'Red Vial',        stat: 'hp',  bonus: 5,  desc: 'one dose. keeps you moving.' },
  { id: 'hp_crate',   name: 'Field Crate',     stat: 'hp',  bonus: 6,  desc: 'surplus gear. adds bulk.' },
  { id: 'hp_chain',   name: 'Link Chain',      stat: 'hp',  bonus: 4,  desc: 'worn close. absorbs impact.' },
  { id: 'hp_flask',   name: 'Amber Flask',     stat: 'hp',  bonus: 5,  desc: 'carry it. use it slow.' },
  { id: 'hp_pack',    name: 'Stone Pack',      stat: 'hp',  bonus: 7,  desc: 'heavy. worth it.' },
  // ATK (6)
  { id: 'atk_sword',  name: 'Short Sword',     stat: 'atk', bonus: 4,  desc: 'clean cuts. reliable.' },
  { id: 'atk_blade',  name: 'Slim Blade',      stat: 'atk', bonus: 3,  desc: 'fast draw. quiet.' },
  { id: 'atk_elixir', name: 'Blue Elixir',     stat: 'atk', bonus: 5,  desc: 'one hit harder. period.' },
  { id: 'atk_dagger', name: 'Cross Dagger',    stat: 'atk', bonus: 4,  desc: 'two edges. one purpose.' },
  { id: 'atk_cube',   name: 'Ember Cube',      stat: 'atk', bonus: 6,  desc: 'burns when it lands.' },
  { id: 'atk_tome',   name: 'Dark Tome',       stat: 'atk', bonus: 3,  desc: 'knowledge of pressure points.' },
  // DEF (6)
  { id: 'def_cross',  name: 'Guard Cross',     stat: 'def', bonus: 4,  desc: 'holds the line.' },
  { id: 'def_orb',    name: 'Black Orb',       stat: 'def', bonus: 3,  desc: 'absorbs on contact.' },
  { id: 'def_gem',    name: 'Platinum Gem',    stat: 'def', bonus: 5,  desc: 'rare. protective.' },
  { id: 'def_shield', name: 'Ruin Shield',     stat: 'def', bonus: 4,  desc: 'scarred but holding.' },
  { id: 'def_relic',  name: 'Red Relic',       stat: 'def', bonus: 3,  desc: 'marked and protected.' },
  { id: 'def_medal',  name: 'Gold Medallion',  stat: 'def', bonus: 5,  desc: 'carries weight. deflects intent.' },
  // LCK (6)
  { id: 'lck_star',   name: 'Chaos Star',      stat: 'lck', bonus: 4,  desc: 'spins toward good outcomes.' },
  { id: 'lck_beads',  name: 'Iron Beads',      stat: 'lck', bonus: 3,  desc: 'count them. stay grounded.' },
  { id: 'lck_eye',    name: 'Watcher Eye',     stat: 'lck', bonus: 5,  desc: 'sees what others miss.' },
  { id: 'lck_coin',   name: 'Star Coin',       stat: 'lck', bonus: 4,  desc: 'flip it. trust it.' },
  { id: 'lck_sigil',  name: 'Hidden Sigil',    stat: 'lck', bonus: 3,  desc: 'the mark works quietly.' },
  { id: 'lck_disc',   name: 'Gray Disc',       stat: 'lck', bonus: 4,  desc: 'tuned to frequencies others ignore.' },
];

window.AccessoryScene = AccessoryScene;
window.ACCESSORIES    = ACCESSORIES;
