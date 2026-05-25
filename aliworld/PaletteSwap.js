// aliworld/PaletteSwap.js
// runtime palette swap utility for skin tone + hair color
// applied once per character load, cached as a new phaser texture

(function () {

  // skin tone palettes
  // each entry maps source colors (from the medium/default archetype art)
  // to target colors for that skin tone
  // source colors sampled from the actual archetype sheets

  const SKIN_PALETTES = {
    medium: null, // default, no swap needed

    light: [
      { from: [180, 120, 70],  to: [220, 175, 130] },  // base skin
      { from: [155, 95,  50],  to: [195, 150, 105] },  // shadow
      { from: [200, 145, 95],  to: [235, 195, 160] },  // highlight
      { from: [140, 80,  40],  to: [180, 130,  90] },  // deep shadow
    ],

    dark: [
      { from: [180, 120, 70],  to: [130,  80,  40] },
      { from: [155, 95,  50],  to: [105,  60,  25] },
      { from: [200, 145, 95],  to: [155, 100,  60] },
      { from: [140, 80,  40],  to: [ 90,  50,  20] },
    ],

    deep: [
      { from: [180, 120, 70],  to: [ 90,  55,  25] },
      { from: [155, 95,  50],  to: [ 70,  40,  15] },
      { from: [200, 145, 95],  to: [110,  70,  35] },
      { from: [140, 80,  40],  to: [ 55,  30,  10] },
    ],
  };

  const HAIR_PALETTES = {
    black: null, // default

    brown: [
      { from: [25,  20,  20],  to: [ 80,  45,  20] },
      { from: [15,  12,  12],  to: [ 60,  30,  10] },
      { from: [40,  35,  35],  to: [105,  65,  35] },
    ],

    auburn: [
      { from: [25,  20,  20],  to: [100,  35,  15] },
      { from: [15,  12,  12],  to: [ 75,  22,   8] },
      { from: [40,  35,  35],  to: [130,  55,  28] },
    ],

    silver: [
      { from: [25,  20,  20],  to: [160, 160, 165] },
      { from: [15,  12,  12],  to: [120, 120, 125] },
      { from: [40,  35,  35],  to: [195, 195, 200] },
    ],
  };

  // tolerance for color matching (per-channel)
  const TOLERANCE = 18;

  function colorDistance(a, b) {
    return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
  }

  function applyPaletteToCanvas(canvas, palette) {
    if (!palette) return canvas;
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue; // skip transparent

      const r = data[i], g = data[i + 1], b = data[i + 2];

      for (const swap of palette) {
        if (colorDistance([r, g, b], swap.from) <= TOLERANCE) {
          data[i]     = swap.to[0];
          data[i + 1] = swap.to[1];
          data[i + 2] = swap.to[2];
          break;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  // main entry point
  // scene: phaser scene (for texture manager)
  // sourceKey: already-loaded phaser texture key
  // targetKey: new texture key to register
  // skinTone: 'light' | 'medium' | 'dark' | 'deep'
  // hairColor: 'black' | 'brown' | 'auburn' | 'silver'
  function swapPalette(scene, sourceKey, targetKey, skinTone, hairColor) {
    // if no swap needed, just alias the key
    if (skinTone === 'medium' && hairColor === 'black') {
      // already have the source key, just use it directly
      return sourceKey;
    }

    // if already cached, return it
    if (scene.textures.exists(targetKey)) return targetKey;

    // get the source texture as a canvas
    const frame = scene.textures.get(sourceKey).getSourceImage();

    const offscreen = document.createElement('canvas');
    offscreen.width = frame.width;
    offscreen.height = frame.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(frame, 0, 0);

    // apply skin then hair
    const skinPalette = SKIN_PALETTES[skinTone] || null;
    const hairPalette = HAIR_PALETTES[hairColor] || null;

    applyPaletteToCanvas(offscreen, skinPalette);
    applyPaletteToCanvas(offscreen, hairPalette);

    // register as new phaser texture
    scene.textures.addCanvas(targetKey, offscreen);
    return targetKey;
  }

  // convenience: swap all frames for an archetype + state combo
  // returns an object mapping frame names to swapped texture keys
  function swapArchetype(scene, archetype, state, skinTone, hairColor) {
    const frames = [
      'idle_0', 'idle_1', 'idle_2', 'idle_alt',
      'walk_0', 'walk_1', 'walk_2',
      'atk_stance_0', 'atk_stance_1', 'atk_lunge', 'atk_lunge_2',
      'portrait'
    ];

    const result = {};
    for (const frame of frames) {
      const sourceKey = `${archetype}_${state}_${frame}`;
      const targetKey = `${archetype}_${state}_${frame}_${skinTone}_${hairColor}`;
      if (scene.textures.exists(sourceKey)) {
        result[frame] = swapPalette(scene, sourceKey, targetKey, skinTone, hairColor);
      }
    }
    return result;
  }

  window.PaletteSwap = { swapPalette, swapArchetype };
})();
