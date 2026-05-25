// aliworld/SpriteNormalizer.js
// runtime sprite cleanup:
//  1. detects black or near-black background pixels and makes them transparent
//  2. finds the content bbox of each sprite (where the character actually is)
//  3. re-anchors all frames of the same archetype to a consistent feet-center position
//  4. registers the cleaned version as a new phaser texture
//
// runs once per sprite at load time (or first use). cached after.

(function () {

  // anything with R+G+B < threshold and any alpha is treated as background
  const BG_THRESHOLD = 30;
  // minimum alpha to count as "content" when finding bbox
  const CONTENT_ALPHA = 100;

  function cleanAndNormalize(scene, sourceKey, targetKey) {
    if (scene.textures.exists(targetKey)) return targetKey;
    if (!scene.textures.exists(sourceKey)) return sourceKey;

    const source = scene.textures.get(sourceKey).getSourceImage();
    const W = source.width;
    const H = source.height;

    // draw source to an offscreen canvas
    const work = document.createElement('canvas');
    work.width = W;
    work.height = H;
    const ctx = work.getContext('2d');
    ctx.drawImage(source, 0, 0);

    // pass 1: remove black background
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r + g + b < BG_THRESHOLD) {
        data[i+3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // pass 2: find content bbox (where the character actually is)
    let minX = W, minY = H, maxX = 0, maxY = 0;
    const pixels = data;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        if (pixels[idx + 3] > CONTENT_ALPHA) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // if no content found, just return the cleaned source
    if (minX >= maxX || minY >= maxY) {
      scene.textures.addCanvas(targetKey, work);
      return targetKey;
    }

    // pass 3: create normalized canvas with content centered horizontally,
    // anchored to bottom (so feet are at canvas bottom)
    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;

    // target canvas: square, sized for the character + padding
    const padding = 20;
    const targetSize = Math.max(contentW, contentH) + padding * 2;

    const out = document.createElement('canvas');
    out.width = targetSize;
    out.height = targetSize;
    const outCtx = out.getContext('2d');

    // position: horizontally centered, vertically bottom-anchored
    const destX = Math.floor((targetSize - contentW) / 2);
    const destY = targetSize - contentH - padding;

    outCtx.drawImage(
      work,
      minX, minY, contentW, contentH,  // source rect
      destX, destY, contentW, contentH  // destination
    );

    scene.textures.addCanvas(targetKey, out);
    return targetKey;
  }

  // cleans + normalizes ALL frames of an archetype + state combo
  // returns a map of frame name → normalized texture key
  function normalizeArchetype(scene, archetype, state) {
    const frames = ['idle_0','idle_1','idle_2','idle_alt','walk_0','walk_1','walk_2','atk_stance_0','atk_stance_1','atk_lunge','atk_lunge_2','portrait'];
    const out = {};
    for (const frame of frames) {
      const src = `${archetype}_${state}_${frame}`;
      const tgt = `${archetype}_${state}_${frame}_clean`;
      out[frame] = cleanAndNormalize(scene, src, tgt);
    }
    return out;
  }

  // helper: get the cleaned key for a sprite, normalizing if needed
  function getCleanKey(scene, archetype, state, frame) {
    const src = `${archetype}_${state}_${frame}`;
    const tgt = `${src}_clean`;
    return cleanAndNormalize(scene, src, tgt);
  }

  window.SpriteNormalizer = {
    cleanAndNormalize,
    normalizeArchetype,
    getCleanKey
  };
})();
