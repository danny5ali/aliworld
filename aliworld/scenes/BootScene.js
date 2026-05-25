// aliworld/scenes/BootScene.js
// loads all assets then routes to CharacterCreationScene or HomeScene

(function () {

  const ARCHETYPES = ['atk', 'def', 'lck', 'spd'];
  const STATES = ['pre_e1', 'post_e1'];
  const FRAMES = [
    'idle_0', 'idle_1', 'idle_2', 'idle_alt',
    'walk_0', 'walk_1', 'walk_2',
    'atk_stance_0', 'atk_stance_1', 'atk_lunge', 'atk_lunge_2',
    'portrait'
  ];

  // maps frame name → file number (1.png = portrait, 2-12 = animation frames)
  const FRAME_TO_FILE = {
    portrait:     1,
    atk_lunge:    2,
    idle_2:       3,
    atk_stance_0: 4,
    atk_stance_1: 5,
    atk_lunge_2:  6,
    walk_0:       7,
    walk_1:       8,
    walk_2:       9,
    idle_0:       10,
    idle_1:       11,
    idle_alt:     12,
  };

  // maps archetype + state → source folder name on disk
  const FOLDER_MAP = {
    'atk_pre_e1':  'ATK',
    'atk_post_e1': 'ATK - MDNGHT',
    'def_pre_e1':  'DEF',
    'def_post_e1': 'DEF - MDNGHT',
    'lck_pre_e1':  'LCK',
    'lck_post_e1': 'LCK - MDNGHT',
    'spd_pre_e1':  'SPD',
    'spd_post_e1': 'SPD - MDNGHT',
  };

  class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
      const { width, height } = this.scale;

      // loading bar
      const barBg = this.add.rectangle(width / 2, height / 2, 300, 8, 0x222233);
      const bar   = this.add.rectangle(width / 2 - 150, height / 2, 0, 8, 0xb32a1f).setOrigin(0, 0.5);
      const label = this.add.text(width / 2, height / 2 + 24, 'loading...', {
        fontFamily: 'monospace', fontSize: '12px', color: '#666677'
      }).setOrigin(0.5);

      this.load.on('progress', v => { bar.width = 300 * v; });
      this.load.on('fileprogress', f => { label.setText(f.key); });

      // load all archetype frames
      const basePath = 'assets/sprites/characters';
      for (const arch of ARCHETYPES) {
        for (const state of STATES) {
          const folder = FOLDER_MAP[`${arch}_${state}`];
          for (const frame of FRAMES) {
            const fileNum = FRAME_TO_FILE[frame];
            const key = `${arch}_${state}_${frame}`;
            const path = `${basePath}/${folder}/${fileNum}.png`;
            this.load.image(key, path);
          }
        }
      }

      // backgrounds
      this.load.image('bg_field',    'assets/backgrounds/e1_field.png');
      this.load.image('bg_cafe',     'assets/backgrounds/e1_cafe.png');
      this.load.image('bg_obsidian', 'assets/backgrounds/e1_obsidian.png');
      this.load.image('bg_steps',    'assets/backgrounds/e1_steps.png');

      // silence missing asset warnings (non-fatal)
      this.load.on('loaderror', (file) => {
        console.warn('[BootScene] missing asset (skipped):', file.key);
      });
    }

    create() {
      // check if player has already created their character
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;

      if (supabase && userId) {
        supabase
          .from('aw_users')
          .select('archetype, skin_tone, hair_color, outerwear_state')
          .eq('user_id', userId)
          .single()
          .then(({ data, error }) => {
            if (data && data.archetype) {
              // returning player — restore config and go to HomeScene
              this.registry.set('avatarConfig', {
                archetype:      data.archetype,
                skin_tone:      data.skin_tone      || 'medium',
                hair_color:     data.hair_color     || 'black',
                outerwear_state: data.outerwear_state || 'pre_e1',
              });
              // restore player state base stats
              const statBuilds = {
                lck: { hp: 25, maxHp: 25, atk: 4, def: 4, spd: 4, lck: 9 },
                atk: { hp: 28, maxHp: 28, atk: 9, def: 3, spd: 4, lck: 4 },
                def: { hp: 40, maxHp: 40, atk: 4, def: 9, spd: 3, lck: 4 },
                spd: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 9, lck: 4 },
              };
              const playerState = Object.assign(
                { moves: ['STRIKE', 'SLIP', 'WHISPER', 'HOLD'], accessories: [] },
                statBuilds[data.archetype] || statBuilds['atk']
              );
              playerState.archetype      = data.archetype;
              playerState.skin_tone      = data.skin_tone || 'medium';
              playerState.hair_color     = data.hair_color || 'black';
              playerState.outerwear_state = data.outerwear_state || 'pre_e1';
              this.registry.set('playerState', playerState);
              this.scene.start('HomeScene');
            } else {
              // new player — go to character creation
              this.scene.start('CharacterCreationScene');
            }
          })
          .catch(() => {
            this.scene.start('CharacterCreationScene');
          });
      } else {
        this.scene.start('CharacterCreationScene');
      }
    }
  }

  window.BootScene = BootScene;
})();
