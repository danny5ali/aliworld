// aliworld/scenes/AccessoryScene.js
// loadout screen: 3 equip slots, inventory of owned items, equip/unequip
// stat bonuses + occasional drawbacks - real tradeoffs
//
// data model:
//   playerState.accessories     = currently equipped items (array of item objects, max 3)
//   playerState.inventory       = all owned items (array of item objects)
//
// on first time, give player the 5 starter items in inventory.
// boss drops + minor enemy drops add to inventory.

class AccessoryScene extends Phaser.Scene {
  constructor() {
    super({ key: 'AccessoryScene' });
  }

  init(data) {
    this.returnScene = (data && data.returnScene) || 'HomeScene';
    this.isFirstTime = (data && data.isFirstTime) || false;

    const ps = this.registry.get('playerState') || {};
    if (!ps.inventory) {
      ps.inventory = STARTER_ACCESSORIES.map(a => ({ ...a }));
    }
    if (!ps.accessories) ps.accessories = [];
    this.registry.set('playerState', ps);

    this._equipped = [...(ps.accessories || [])];
    while (this._equipped.length < 3) this._equipped.push(null);
    this._inventory = [...(ps.inventory || [])];
  }

  create() {
    const { width, height } = this.scale;
    this.cx = width / 2;

    this.add.rectangle(0, 0, width, height, 0x07070f).setOrigin(0, 0);

    const title = this.isFirstTime ? 'PICK YOUR STARTERS.' : 'LOADOUT';
    const subtitle = this.isFirstTime
      ? 'every item has a cost. choose 3.'
      : 'swap items between bag and slots.';

    this.add.text(this.cx, 28, title, {
      fontFamily:'monospace', fontSize:'18px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5);

    this.add.text(this.cx, 52, subtitle, {
      fontFamily:'monospace', fontSize:'11px', color:'#444455'
    }).setOrigin(0.5);

    this.buildEquipSlots();
    this.buildStatPreview();
    this.buildInventoryGrid();
    this.buildFooter();
    this.refreshAll();
  }

  // ─── EQUIP SLOTS ─────────────────────────────────────────────────────────

  buildEquipSlots() {
    const slotSize = 58;
    const gap = 18;
    const totalW = 3 * slotSize + 2 * gap;
    const startX = this.cx - totalW / 2 + slotSize / 2;
    const y = 96;

    this.add.text(this.cx, y - 38, 'EQUIPPED', {
      fontFamily:'monospace', fontSize:'10px', color:'#666677'
    }).setOrigin(0.5);

    this._slotObjects = [];

    for (let i = 0; i < 3; i++) {
      const x = startX + i * (slotSize + gap);

      const bg = this.add.rectangle(x, y, slotSize, slotSize, 0x111122)
        .setStrokeStyle(1, 0x333344)
        .setInteractive({ useHandCursor: true });

      const placeholder = this.add.graphics();
      const labelText = this.add.text(x, y, '', {
        fontFamily:'monospace', fontSize:'14px', fontStyle:'bold', color:'#ebe2d2'
      }).setOrigin(0.5);
      const slotNumText = this.add.text(x, y, `${i + 1}`, {
        fontFamily:'monospace', fontSize:'18px', color:'#222233'
      }).setOrigin(0.5);

      bg.on('pointerup', () => this.unequipSlot(i));

      this._slotObjects.push({ bg, placeholder, labelText, slotNumText, x, y, slotSize });
    }
  }

  // ─── INVENTORY GRID ──────────────────────────────────────────────────────

  buildInventoryGrid() {
    this.add.text(20, 320, 'INVENTORY', {
      fontFamily:'monospace', fontSize:'10px', color:'#666677'
    });

    this._invContainer = this.add.container(0, 340);
  }

  drawInventoryItems() {
    if (this._invContainer) this._invContainer.removeAll(true);

    const itemSize = 54;
    const gap = 8;
    const cols = 4;
    const iconR = 18;  // fill most of the tile

    this._inventory.forEach((item, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = 24 + col * (itemSize + gap) + itemSize / 2;
      const y = row * (itemSize + gap) + itemSize / 2;

      const isEquipped = this._equipped.some(e => e && e.id === item.id);

      const bg = this.add.rectangle(x, y, itemSize, itemSize, isEquipped ? 0x1a1a2a : 0x0d0d1a)
        .setStrokeStyle(1, isEquipped ? 0x666677 : 0x222233)
        .setInteractive({ useHandCursor: true });

      // icon: colored circle sized to fill tile, letter centered inside
      const color = STAT_COLOR[item.stat] || 0x666677;
      const circle = this.add.circle(x, y - 6, iconR, color, 0.85).setStrokeStyle(1, 0xffffff);
      const letter = this.add.text(x, y - 6, item.stat[0].toUpperCase(), {
        fontFamily:'monospace', fontSize:'16px', fontStyle:'bold', color:'#ffffff'
      }).setOrigin(0.5);

      const name = this.add.text(x, y + itemSize / 2 - 10, item.shortName || item.name.split(' ')[0], {
        fontFamily:'monospace', fontSize:'8px', color:'#aaaabb'
      }).setOrigin(0.5);

      if (isEquipped) {
        const eq = this.add.text(x + 22, y - 22, '●', {
          fontFamily:'monospace', fontSize:'10px', color:'#44cc88'
        }).setOrigin(0.5);
        this._invContainer.add(eq);
      }

      // tooltip uses world Y accounting for container offset
      const worldY = y + 340;
      bg.on('pointerover', () => {
        bg.setFillStyle(0x1a1a2a);
        this.showTooltip(item, x, worldY, itemSize);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(isEquipped ? 0x1a1a2a : 0x0d0d1a);
        this.hideTooltip();
      });
      bg.on('pointerup', () => this.toggleEquip(item));

      this._invContainer.add([bg, circle, letter, name]);
    });
  }

  toggleEquip(item) {
    const equippedIdx = this._equipped.findIndex(e => e && e.id === item.id);
    if (equippedIdx !== -1) {
      this._equipped[equippedIdx] = null;
      this.refreshAll();
      return;
    }
    const emptyIdx = this._equipped.findIndex(s => s === null);
    if (emptyIdx === -1) {
      this.showMessage('all slots full. unequip first.');
      return;
    }
    this._equipped[emptyIdx] = item;
    this.refreshAll();
  }

  unequipSlot(i) {
    if (!this._equipped[i]) return;
    this._equipped[i] = null;
    this.refreshAll();
  }

  // ─── STAT PREVIEW ────────────────────────────────────────────────────────

  buildStatPreview() {
    const { width } = this.scale;
    const y = 180;

    this.add.text(this.cx, y - 12, 'STATS', {
      fontFamily:'monospace', fontSize:'10px', color:'#666677'
    }).setOrigin(0.5);

    this._statBg = this.add.rectangle(this.cx, y + 50, width - 60, 100, 0x0d0d1a)
      .setStrokeStyle(1, 0x222233);
    this._statText = this.add.text(this.cx, y + 4, '', {
      fontFamily:'monospace', fontSize:'11px', color:'#aaaabb', align:'center'
    }).setOrigin(0.5, 0);
  }

  refreshStatPreview() {
    const ps = this.registry.get('playerState') || {};
    const base = { hp: ps.maxHp || 0, atk: ps.atk || 0, def: ps.def || 0, spd: ps.spd || 0, lck: ps.lck || 0 };
    const bonus = { hp: 0, atk: 0, def: 0, spd: 0, lck: 0 };
    this._equipped.forEach(item => {
      if (!item || !item.bonuses) return;
      Object.entries(item.bonuses).forEach(([k, v]) => { bonus[k] = (bonus[k] || 0) + v; });
    });

    const lines = [
      'HP  ' + (base.hp + bonus.hp) + (bonus.hp ? `  ${bonus.hp > 0 ? '+' : ''}${bonus.hp}` : ''),
      'ATK ' + (base.atk + bonus.atk) + (bonus.atk ? `  ${bonus.atk > 0 ? '+' : ''}${bonus.atk}` : ''),
      'DEF ' + (base.def + bonus.def) + (bonus.def ? `  ${bonus.def > 0 ? '+' : ''}${bonus.def}` : ''),
      'SPD ' + (base.spd + bonus.spd) + (bonus.spd ? `  ${bonus.spd > 0 ? '+' : ''}${bonus.spd}` : ''),
      'LCK ' + (base.lck + bonus.lck) + (bonus.lck ? `  ${bonus.lck > 0 ? '+' : ''}${bonus.lck}` : ''),
    ];
    this._statText.setText(lines.join('   '));
  }

  // ─── SLOT RENDERING ──────────────────────────────────────────────────────

  refreshSlotDisplay() {
    this._slotObjects.forEach(({ bg, placeholder, labelText, slotNumText, x, y, slotSize }, i) => {
      placeholder.clear();
      const item = this._equipped[i];
      if (item) {
        const color = STAT_COLOR[item.stat] || 0x666677;
        const r = (slotSize / 2) - 4;   // circle fills almost the whole slot box
        placeholder.fillStyle(color, 0.85);
        placeholder.lineStyle(2, 0xffffff, 0.9);
        placeholder.fillCircle(x, y, r);
        placeholder.strokeCircle(x, y, r);
        labelText.setText(item.stat[0].toUpperCase());
        labelText.setPosition(x, y);
        slotNumText.setVisible(false);
        bg.setStrokeStyle(2, color);
      } else {
        labelText.setText('');
        slotNumText.setVisible(true);
        bg.setStrokeStyle(1, 0x333344);
      }
    });
  }

  refreshAll() {
    this.refreshSlotDisplay();
    this.refreshStatPreview();
    this.drawInventoryItems();
  }

  // ─── TOOLTIP ─────────────────────────────────────────────────────────────
  // clamped: never above canvas top, never overlaps equip slots area

  showTooltip(item, x, worldY, itemSize) {
    this.hideTooltip();
    const { width, height } = this.scale;
    const TT_W = 180;
    const TT_H = 64;
    const SAFE_TOP = 160;   // below the equip slots + stats area

    const tx = Math.min(Math.max(x, TT_W / 2 + 8), width - TT_W / 2 - 8);

    // prefer above the item; if that would clip into equip area, show below
    let ty = worldY - (itemSize || 54) / 2 - TT_H / 2 - 8;
    if (ty < SAFE_TOP) {
      ty = worldY + (itemSize || 54) / 2 + TT_H / 2 + 8;
    }
    // clamp bottom
    if (ty + TT_H / 2 > height - 50) {
      ty = height - 50 - TT_H / 2;
    }

    const bonuses = [];
    if (item.bonuses) {
      Object.entries(item.bonuses).forEach(([k, v]) => {
        bonuses.push(`${v > 0 ? '+' : ''}${v} ${k.toUpperCase()}`);
      });
    }

    this._tooltip = [
      this.add.rectangle(tx, ty, TT_W, TT_H, 0x1a1a2a)
        .setStrokeStyle(1, 0x666677).setDepth(200),
      this.add.text(tx, ty - 20, item.name, {
        fontFamily:'monospace', fontSize:'10px', color:'#ebe2d2', fontStyle:'bold'
      }).setOrigin(0.5).setDepth(201),
      this.add.text(tx, ty - 4, bonuses.join('   '), {
        fontFamily:'monospace', fontSize:'10px', color:'#aaaabb'
      }).setOrigin(0.5).setDepth(201),
      this.add.text(tx, ty + 14, item.desc || '', {
        fontFamily:'monospace', fontSize:'9px', color:'#666677',
        wordWrap:{ width: TT_W - 20 }, align:'center'
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
    const { height } = this.scale;
    const t = this.add.text(this.cx, height / 2 + 100, msg, {
      fontFamily:'monospace', fontSize:'12px', color:'#cc4444',
      backgroundColor:'#0d0d1a', padding:{ x:12, y:6 }
    }).setOrigin(0.5).setDepth(300);
    this.time.delayedCall(1400, () => t.destroy());
  }

  // ─── FOOTER ──────────────────────────────────────────────────────────────

  buildFooter() {
    const { width, height } = this.scale;
    const btnY = height - 40;
    const btnW = (width - 48) / 2;

    const cancelBg = this.add.rectangle(this.cx - btnW / 2 - 4, btnY, btnW, 44, 0x111122)
      .setStrokeStyle(1, 0x333344).setInteractive({ useHandCursor: true });
    this.add.text(this.cx - btnW / 2 - 4, btnY, this.isFirstTime ? 'BACK' : 'CANCEL', {
      fontFamily:'monospace', fontSize:'12px', color:'#666677'
    }).setOrigin(0.5);
    cancelBg.on('pointerup', () => this.cancel());

    const saveBg = this.add.rectangle(this.cx + btnW / 2 + 4, btnY, btnW, 44, 0xb32a1f)
      .setInteractive({ useHandCursor: true });
    const saveLabel = this.isFirstTime ? 'BEGIN' : 'SAVE';
    this.add.text(this.cx + btnW / 2 + 4, btnY, saveLabel, {
      fontFamily:'monospace', fontSize:'12px', color:'#ebe2d2', fontStyle:'bold'
    }).setOrigin(0.5);
    saveBg.on('pointerover', () => saveBg.setFillStyle(0x8a1f15));
    saveBg.on('pointerout',  () => saveBg.setFillStyle(0xb32a1f));
    saveBg.on('pointerup',   () => this.saveLoadout());
  }

  saveLoadout() {
    const ps = this.registry.get('playerState') || {};
    ps.accessories = this._equipped.filter(Boolean);
    ps.inventory = this._inventory;
    this.registry.set('playerState', ps);

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

const STAT_COLOR = {
  hp:  0xcc4444,
  atk: 0xcc8844,
  def: 0x4488cc,
  lck: 0xcccc44,
  spd: 0x44cc88
};

const STARTER_ACCESSORIES = [
  { id:'st_cube',  name:'Iron Cube',    shortName:'cube',  stat:'hp',  bonuses:{ hp:+2, spd:-1 }, desc:'old and heavy. takes hits.' },
  { id:'st_beads', name:'Worn Beads',   shortName:'beads', stat:'lck', bonuses:{ lck:+2, atk:-1 }, desc:'someone counted these a thousand times.' },
  { id:'st_blade', name:'Short Blade',  shortName:'blade', stat:'atk', bonuses:{ atk:+2, def:-1 }, desc:'sharp and unforgiving. so are you now.' },
  { id:'st_cross', name:'Guard Cross',  shortName:'guard', stat:'def', bonuses:{ def:+2, spd:-1 }, desc:'a wall costs you motion.' },
  { id:'st_laces', name:'Runner Laces', shortName:'laces', stat:'spd', bonuses:{ spd:+2, hp:-1 }, desc:'light shoes. light bones.' },
];

const BOSS_DROPS = {
  mark:    { id:'bd_mark',    name:'The Steady Mind', shortName:'steady', stat:'hp',  bonuses:{ hp:+5, lck:+1 },  desc:'silence from a man who never stopped talking.' },
  clerk:   { id:'bd_clerk',   name:'The Unkind Hand', shortName:'unkind', stat:'atk', bonuses:{ atk:+5 },          desc:'a register key. it opens nothing now.' },
  choir:   { id:'bd_choir',   name:'The Broken Hymn', shortName:'hymn',   stat:'spd', bonuses:{ spd:+4, lck:+2 },  desc:'one voice less. the song moves anyway.' },
  fadiron: { id:'bd_fadiron', name:'The Cosigner',    shortName:'cosign', stat:'def', bonuses:{ def:+6 },           desc:'their signatures, dried.' },
  mirror:  { id:'bd_mirror',  name:'The Mirror',      shortName:'mirror', stat:'lck', bonuses:{ hp:+3, atk:+3, def:+3, spd:+3, lck:+3 }, desc:'you in your own pocket.' },
};

const MINOR_DROPS = {
  skeptic: { id:'md_balm',    name:'Sunburn Balm', shortName:'balm', stat:'hp',  bonuses:{ hp:+1 },  desc:'his pocket had this in it. you took it.' },
  walker:  { id:'md_crystal', name:'Loop Crystal', shortName:'loop', stat:'atk', bonuses:{ atk:+1 }, desc:'small. heavy. hums faintly.' },
};

window.AccessoryScene      = AccessoryScene;
window.STARTER_ACCESSORIES = STARTER_ACCESSORIES;
window.BOSS_DROPS          = BOSS_DROPS;
window.MINOR_DROPS         = MINOR_DROPS;
window.STAT_COLOR          = STAT_COLOR;
