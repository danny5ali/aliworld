// aliworld/SpriteNormalizer.js
// runtime sprite normalization:
//   - finds the content bbox (where the character actually is)
//   - re-anchors content to a consistent feet-center, bottom-aligned canvas
//   - DOES NOT touch transparency. the source files are already transparent.
//
// runs once per sprite at first use. cached after.

(function () {

  // alpha threshold for "this pixel counts as content"
  const CONTENT_ALPHA = 80;

  function cleanAndNormalize(scene, sourceKey, targetKey) {
    if (scene.textures.exists(targetKey)) return targetKey;
    if (!scene.textures.exists(sourceKey)) return sourceKey;

    const source = scene.textures.get(sourceKey).getSourceImage();
    const W = source.width;
    const H = source.height;

    // draw source to an offscreen canvas (no manipulation, just for pixel access)
    const work = document.createElement('canvas');
    work.width = W;
    work.height = H;
    const ctx = work.getContext('2d');
    ctx.drawImage(source, 0, 0);

    // find content bbox using alpha
    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    let foundContent = false;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const a = data[(y * W + x) * 4 + 3];
        if (a >= CONTENT_ALPHA) {
          foundContent = true;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // no content found - return source unchanged
    if (!foundContent) return sourceKey;

    const contentW = maxX - minX + 1;
    const contentH = maxY - minY + 1;

    // build output canvas: just fits the content with a small padding
    // content is bottom-anchored (feet at bottom-center), horizontally centered
    const padding = 8;
    const outW = contentW + padding * 2;
    const outH = contentH + padding;

    const out = document.createElement('canvas');
    out.width = outW;
    out.height = outH;
    const outCtx = out.getContext('2d');

    // copy the source content to (padding, 0) so feet end up at outH (bottom)
    outCtx.drawImage(
      source,
      minX, minY, contentW, contentH,  // source rect
      padding, 0, contentW, contentH   // destination rect
    );

    scene.textures.addCanvas(targetKey, out);
    return targetKey;
  }

  function getCleanKey(scene, archetype, state, frame) {
    const src = `${archetype}_${state}_${frame}`;
    const tgt = `${src}_clean`;
    return cleanAndNormalize(scene, src, tgt);
  }

  window.SpriteNormalizer = { cleanAndNormalize, getCleanKey };
})();
