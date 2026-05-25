// aliworld/PaletteSwap.js
// runtime palette swap. matches the actual gemini-rendered skin/hair colors.

(function () {

  // source colors (from real ATK portrait)
  // skin: tight cluster around #d2935d
  // hair: pure black to near-black #000000 - #2c2c2c
  // anything matching these gets replaced

  const SKIN_PALETTES = {
    medium: null, // source is already medium

    light: [
      // source skin → lighter
      { fromHex: '#d2935d', to: [232, 184, 140] },
      { fromHex: '#c08550', to: [220, 170, 128] },
      { fromHex: '#a87245', to: [200, 152, 116] },
    ],

    dark: [
      { fromHex: '#d2935d', to: [148,  88,  48] },
      { fromHex: '#c08550', to: [135,  80,  42] },
      { fromHex: '#a87245', to: [115,  66,  34] },
    ],

    deep: [
      { fromHex: '#d2935d', to: [ 92,  55,  25] },
      { fromHex: '#c08550', to: [ 80,  46,  20] },
      { fromHex: '#a87245', to: [ 65,  38,  15] },
    ],
  };

  const HAIR_PALETTES = {
    black: null, // default

    brown: [
      { fromHex: '#000000', to: [ 70,  40,  18] },
      { fromHex: '#1a1a1a', to: [ 85,  52,  25] },
      { fromHex: '#2a2a2a', to: [100,  62,  32] },
    ],

    auburn: [
      { fromHex: '#000000', to: [105,  35,  15] },
      { fromHex: '#1a1a1a', to: [125,  48,  22] },
      { fromHex: '#2a2a2a', to: [145,  60,  30] },
    ],

    silver: [
      { fromHex: '#000000', to: [140, 140, 145] },
      { fromHex: '#1a1a1a', to: [165, 165, 170] },
      { fromHex: '#2a2a2a', to: [190, 190, 195] },
    ],
  };

  // generous tolerance - skin colors cluster tight, hair is near-black
  const SKIN_TOLERANCE = 28;
  const HAIR_TOLERANCE = 22;

  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.slice(0,2), 16), parseInt(hex.slice(2,4), 16), parseInt(hex.slice(4,6), 16)];
  }

  function colorDistance(a, b) {
    const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dr*dr + dg*dg + db*db);
  }

  function expandPalette(palette) {
    // precompute RGB versions of fromHex
    return palette.map(swap => ({
      from: hexToRgb(swap.fromHex),
      to: swap.to
    }));
  }

  function applyPaletteToCanvas(canvas, palette, tolerance) {
    if (!palette) return canvas;
    const expanded = expandPalette(palette);
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 10) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];

      // find closest match in palette
      let bestMatch = null;
      let bestDist = tolerance;
      for (const swap of expanded) {
        const dist = colorDistance([r, g, b], swap.from);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = swap;
        }
      }

      if (bestMatch) {
        // scale the target color by how close the original was to the source
        // this preserves shading within the tolerance band
        const t = 1 - (bestDist / tolerance);
        data[i]     = Math.round(bestMatch.to[0] * t + r * (1 - t));
        data[i + 1] = Math.round(bestMatch.to[1] * t + g * (1 - t));
        data[i + 2] = Math.round(bestMatch.to[2] * t + b * (1 - t));
      }
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  }

  function swapPalette(scene, sourceKey, targetKey, skinTone, hairColor) {
    if (skinTone === 'medium' && hairColor === 'black') return sourceKey;
    if (scene.textures.exists(targetKey)) return targetKey;
    if (!scene.textures.exists(sourceKey)) return sourceKey;

    const frame = scene.textures.get(sourceKey).getSourceImage();

    const offscreen = document.createElement('canvas');
    offscreen.width = frame.width;
    offscreen.height = frame.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(frame, 0, 0);

    applyPaletteToCanvas(offscreen, SKIN_PALETTES[skinTone] || null, SKIN_TOLERANCE);
    applyPaletteToCanvas(offscreen, HAIR_PALETTES[hairColor] || null, HAIR_TOLERANCE);

    scene.textures.addCanvas(targetKey, offscreen);
    return targetKey;
  }

  window.PaletteSwap = { swapPalette };
})();
