// aliworld/scenes/BootScene.js
// loads assets, routes new players to IntroScene, returning players to HomeScene
//
// asset keys produced here:
//   archetype frames: ${arch}_${state}_${frame}   e.g. 'atk_pre_e1_idle_0'
//   backgrounds:      'bg_field' | 'bg_cafe' | 'bg_obsidian' | 'bg_steps'
//   npc frames:       'npc_${id}_${frame}'        e.g. 'npc_mark_idle_1'
//   accessory icons:  'acc_${item_id}'            e.g. 'acc_st_cube' | 'acc_bd_mark'

(function () {
  const ARCHETYPES = ['atk', 'def', 'lck', 'spd'];
  const STATES = ['pre_e1', 'post_e1'];
  const FRAMES = ['idle_0','idle_1','idle_2','idle_alt','walk_0','walk_1','walk_2','atk_stance_0','atk_stance_1','atk_lunge','atk_lunge_2','portrait'];
  const FRAME_TO_FILE = { portrait:1, atk_lunge:2, idle_2:3, atk_stance_0:4, atk_stance_1:5, atk_lunge_2:6, walk_0:7, walk_1:8, walk_2:9, idle_0:10, idle_1:11, idle_alt:12 };
  const FOLDER_MAP = {
    'atk_pre_e1':'ATK','atk_post_e1':'ATK - MDNGHT',
    'def_pre_e1':'DEF','def_post_e1':'DEF - MDNGHT',
    'lck_pre_e1':'LCK','lck_post_e1':'LCK - MDNGHT',
    'spd_pre_e1':'SPD','spd_post_e1':'SPD - MDNGHT'
  };

  // real accessory ids, sourced from AccessoryScene's data tables.
  // matches files at assets/icons/accessories/${id}.png
  const ACCESSORY_IDS = [
    // starters (5)
    'st_cube','st_beads','st_blade','st_cross','st_laces',
    // boss drops (5)
    'bd_mark','bd_clerk','bd_choir','bd_fadiron','bd_mirror',
    // minor enemy drops (2)
    'md_balm','md_crystal'
  ];

  class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
      const { width, height } = this.scale;
      const barBg = this.add.rectangle(width/2, height/2, 280, 6, 0x222233);
      const bar   = this.add.rectangle(width/2-140, height/2, 0, 6, 0xb32a1f).setOrigin(0, 0.5);
      const label = this.add.text(width/2, height/2+20, 'loading', { fontFamily:'monospace', fontSize:'11px', color:'#444455' }).setOrigin(0.5);

      this.load.on('progress', v => { bar.width = 280 * v; });

      // archetype frames
      const base = 'assets/sprites/characters';
      for (const arch of ARCHETYPES) {
        for (const state of STATES) {
          const folder = FOLDER_MAP[`${arch}_${state}`];
          for (const frame of FRAMES) {
            this.load.image(`${arch}_${state}_${frame}`, `${base}/${folder}/${FRAME_TO_FILE[frame]}.png`);
          }
        }
      }

      // backgrounds
      this.load.image('bg_field',    'assets/backgrounds/e1_field.png');
      this.load.image('bg_cafe',     'assets/backgrounds/e1_cafe.png');
      this.load.image('bg_obsidian', 'assets/backgrounds/e1_obsidian.png');
      this.load.image('bg_steps',    'assets/backgrounds/e1_steps.png');

      // npc sprite frames (registry-driven)
      if (window.NPCRegistry) {
        NPCRegistry.getAllIds().forEach(npcId => {
          NPCRegistry.getAllFrameKeys(npcId).forEach(f => {
            this.load.image(f.key, f.path);
          });
        });
      } else {
        console.warn('[BootScene] NPCRegistry missing. add it to index.html before BootScene.js');
      }

      // accessory icons
      for (const id of ACCESSORY_IDS) {
        this.load.image(`acc_${id}`, `assets/icons/accessories/${id}.png`);
      }

      this.load.on('loaderror', f => console.warn('[BootScene] missing:', f.key, '->', f.src));
    }

    create() {
      const supabase = window.aliworldSupabase;
      const userId = window.aliworldGame && window.aliworldGame.userId;

      if (supabase && userId) {
        supabase.from('aw_users')
          .select('archetype, skin_tone, hair_color, outerwear_state, handle')
          .eq('user_id', userId).single()
          .then(({ data }) => {
            if (data && data.archetype) {
              // returning player - skip intro
              this.registry.set('avatarConfig', {
                archetype: data.archetype,
                skin_tone: data.skin_tone || 'medium',
                hair_color: data.hair_color || 'black',
                outerwear_state: data.outerwear_state || 'pre_e1',
              });
              const statBuilds = {
                lck: { hp:25,maxHp:25,atk:4,def:4,spd:4,lck:9 },
                atk: { hp:28,maxHp:28,atk:9,def:3,spd:4,lck:4 },
                def: { hp:40,maxHp:40,atk:4,def:9,spd:3,lck:4 },
                spd: { hp:28,maxHp:28,atk:5,def:4,spd:9,lck:4 },
              };
              const ps = Object.assign(
                { moves:['STRIKE','SLIP','WHISPER','HOLD'], accessories:[] },
                statBuilds[data.archetype] || statBuilds.atk
              );
              ps.archetype       = data.archetype;
              ps.skin_tone       = data.skin_tone || 'medium';
              ps.hair_color      = data.hair_color || 'black';
              ps.outerwear_state = data.outerwear_state || 'pre_e1';
              this.registry.set('playerState', ps);

              if (data.handle && window.aliworldGame) {
                window.aliworldGame.userHandle = data.handle;
              }

              this.scene.start('HomeScene');
            } else {
              // new player - full intro
              this.scene.start('IntroScene');
            }
          })
          .catch(() => this.scene.start('IntroScene'));
      } else {
        this.scene.start('IntroScene');
      }
    }
  }

  window.BootScene = BootScene;
})();
