// BootScene.js
// Preloads all avatar layer sprite sheets + existing assets, then routes to HomeScene.
// Plain script — no imports/exports. Attaches BootScene to window.

(function () {
  const FW = 190;
  const FH = 225;

  const LAYERS = {
    base:      ['light', 'medium', 'dark', 'deep'],
    hair:      ['shaved', 'tiedback', 'hooded', 'wildloose'],
    face:      ['vacant', 'sharpgaze', 'cultmark', 'halfcovered'],
    bottoms:   ['heavycargo', 'fittedtapered', 'loosedraped', 'sneakerlight'],
    inner:     ['plainblack', 'cultprint', 'whiteritual', 'barescarred'],
    outerwear: ['blacktrench', 'hoodedzip', 'denimworn', 'ritualrobe'],
  };

  class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
      // ── avatar layers ────────────────────────────────────────────────────
      for (const layer in LAYERS) {
        for (const opt of LAYERS[layer]) {
          this.load.spritesheet(
            `${layer}_${opt}`,
            `assets/sprites/layers/${layer}/${opt}.png`,
            { frameWidth: FW, frameHeight: FH }
          );
        }
      }
      // redjacket: 13 frames, same dimensions
      this.load.spritesheet(
        'outerwear_redjacket',
        'assets/sprites/layers/outerwear/redjacket.png',
        { frameWidth: FW, frameHeight: FH }
      );

      // ── existing assets ──────────────────────────────────────────────────
      this.load.image('sigil_master',  'assets/sigil/sigil_master.png');
      this.load.image('sigil_glowing', 'assets/sigil/sigil_glowing.png');

      // legacy placeholder sheets (keep — referenced elsewhere)
      this.load.spritesheet('player_idle',      'assets/sprites/player_idle_sheet.png',      { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('player_walk',      'assets/sprites/player_walk_sheet.png',      { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('player_attack',    'assets/sprites/player_attack_sheet.png',    { frameWidth: 48, frameHeight: 48 });
      this.load.spritesheet('player_hit_react', 'assets/sprites/player_hit_react_sheet.png', { frameWidth: 48, frameHeight: 48 });
      this.load.image('player_reference', 'assets/sprites/player_reference.png');

      const moves = ['strike', 'slip', 'whisper', 'hold', 'loop', 'possess', 'conduct', 'replicate', 'echo'];
      for (const m of moves) {
        this.load.image(`move_${m}`, `assets/icons/move_${m}.png`);
      }

      // log any 404s explicitly so failed loads are visible
      this.load.on('loaderror', (file) => {
        console.warn('[BootScene] failed to load:', file.src);
      });
    }

    create() {
      // legacy placeholder anims
      this.anims.create({ key: 'player_idle',      frames: this.anims.generateFrameNumbers('player_idle',      { start: 0, end: 3 }), frameRate: 4,  repeat: -1 });
      this.anims.create({ key: 'player_walk',      frames: this.anims.generateFrameNumbers('player_walk',      { start: 0, end: 5 }), frameRate: 10, repeat: -1 });
      this.anims.create({ key: 'player_attack',    frames: this.anims.generateFrameNumbers('player_attack',    { start: 0, end: 3 }), frameRate: 12, repeat:  0 });
      this.anims.create({ key: 'player_hit_react', frames: this.anims.generateFrameNumbers('player_hit_react', { start: 0, end: 1 }), frameRate: 8,  repeat:  0 });

      this.time.delayedCall(300, () => this.scene.start('HomeScene'));
    }
  }

  window.BootScene = BootScene;
})();
