// aliworld/NPCRegistry.js
// single source of truth for npc data: sprite paths, stats, telegraphs, ai behavior.
// add new npcs here. BootScene reads getAllIds() + getAllFrameKeys() to know what to preload.
// missing frames silently fall back to idle_1 at runtime (see getFrame()).
//
// load order: must be included in index.html BEFORE BootScene.js.

(function () {

  const BASE_FRAMES = ['portrait', 'idle_1', 'idle_2', 'attack_stance', 'attack_action', 'hit_react'];

  const NPCRegistry = {

    BASE_FRAMES,

    // ===== the registry =====

    npcs: {

      mark: {
        id: 'mark',
        displayName: 'Mark',
        role: 'boss',
        episode: 1,
        spritePath: 'assets/sprites/NPCs/mark/',
        extraFrames: ['stillness_1', 'stillness_2'],

        stats: { hp: 45, maxHp: 45, atk: 5, def: 5, spd: 5, lck: 4 },

        // ai-driven move list (uses combat's move table, like E1_ENEMIES did)
        moves: ['WHISPER', 'STRIKE', 'HOLD', 'WHISPER', 'LOOP'],

        // telegraph per move id. used by combat scene before each enemy turn.
        telegraph: {
          WHISPER: "what'd you say your name was?",
          STRIKE:  "i feel like i've seen you before —",
          HOLD:    'you should sit down',
          LOOP:    'you been around here long?'
        },

        isBoss: true,
        drops: 'bd_mark',
        dropChance: 1.0
      },

      skeptic: {
        id: 'skeptic',
        displayName: 'The Skeptic',
        role: 'minor',
        episode: 1,
        spritePath: 'assets/sprites/NPCs/skeptic/',
        extraFrames: [],

        stats: { hp: 22, maxHp: 22, atk: 6, def: 2, spd: 4, lck: 2 },
        moves: ['STRIKE', 'STRIKE', 'SLIP'],
        telegraph: {
          STRIKE: 'winding up',
          SLIP:   'stepping in close'
        },

        isBoss: false,
        drops: 'md_balm',
        dropChance: 0.3
      },

      walker: {
        id: 'walker',
        displayName: 'The Walker',
        role: 'minor',
        episode: 1,
        spritePath: 'assets/sprites/NPCs/walker/',
        extraFrames: ['walk_1', 'walk_2', 'walk_3', 'walk_4', 'walk_5', 'walk_6'],

        stats: { hp: 28, maxHp: 28, atk: 5, def: 4, spd: 8, lck: 2 },
        moves: ['STRIKE', 'SLIP'],
        telegraph: {
          STRIKE: 'that new joint is crazy',
          SLIP:   'that new joint is crazy'
        },

        ai: 'repeat',
        isBoss: false,
        drops: 'md_crystal',
        dropChance: 0.3
      },

      training_dummy: {
        id: 'training_dummy',
        displayName: 'Training Dummy',
        role: 'practice',
        episode: 0,
        spritePath: null,
        extraFrames: [],

        stats: { hp: 30, maxHp: 30, atk: 4, def: 4, spd: 4, lck: 3 },
        moves: ['STRIKE', 'HOLD', 'SLIP'],
        telegraph: {
          STRIKE: 'winding up',
          HOLD:   'bracing',
          SLIP:   'stepping in'
        },

        isBoss: false,
        drops: null,
        dropChance: 0
      }

      // future episodes:
      // clerk, choir_1/2/3, fadi, ron, danny_ali, mdnght_silhouette, mirror
    },

    // ===== helpers =====

    get(npcId) {
      return this.npcs[npcId] || null;
    },

    // returns the loaded texture key for an npc frame, silent fallback to idle_1.
    // call this anywhere you'd reference a sprite key.
    getFrame(scene, npcId, frameName) {
      const key = `npc_${npcId}_${frameName}`;
      if (scene.textures.exists(key)) return key;
      const fallback = `npc_${npcId}_idle_1`;
      return scene.textures.exists(fallback) ? fallback : null;
    },

    // returns all asset entries this npc needs for preloading.
    // skips npcs with no spritePath (e.g. training_dummy).
    getAllFrameKeys(npcId) {
      const npc = this.get(npcId);
      if (!npc || !npc.spritePath) return [];
      const all = [...BASE_FRAMES, ...(npc.extraFrames || [])];
      return all.map(f => ({
        key: `npc_${npcId}_${f}`,
        path: `${npc.spritePath}${f}.png`
      }));
    },

    getAllIds() {
      return Object.keys(this.npcs);
    },

    // chooses the next move based on the npc's move list. wraps.
    chooseMove(npcId, turnIndex) {
      const npc = this.get(npcId);
      if (!npc || !npc.moves || !npc.moves.length) return 'STRIKE';
      return npc.moves[turnIndex % npc.moves.length];
    },

    // returns telegraph text for an upcoming move
    telegraphFor(npcId, move) {
      const npc = this.get(npcId);
      if (!npc || !npc.telegraph) return '';
      return npc.telegraph[move] || '';
    },

    // returns an enemy-object compatible with the legacy { enemy } combat shape.
    // not actually used internally now that combat takes npcId, but kept for
    // any external callers that might still pass an enemy object.
    asEnemyObject(npcId) {
      const npc = this.get(npcId);
      if (!npc) return null;
      return Object.assign(
        { key: npc.id, name: npc.displayName, isBoss: !!npc.isBoss, ai: npc.ai || null },
        npc.stats,
        { moves: npc.moves, telegraph: npc.telegraph }
      );
    }
  };

  window.NPCRegistry = NPCRegistry;
})();
