// aliworld/SpriteAutoFit.js
// fixes the "sprite is small because source png has lots of transparent padding" problem.
//
// for any texture, scans the alpha channel ONCE to find the actual content bounding box.
// caches the result. then places + scales the sprite so its visible content
// (not the transparent canvas) fills the target dimensions.
//
// USAGE:
//   const sprite = SpriteAutoFit.place(scene, x, y, textureKey, { targetH: 360 });
//   // sprite is positioned so feet are at (x, y), scaled so visible character is targetH tall.
//
//   SpriteAutoFit.applyTo(sprite, textureKey, { targetH: 360 });
//   // re-apply after a setTexture() swap.

(function () {
  const cache = {};  // textureKey -> { sx, sy, ex, ey, vw, vh }

  function measure(scene, textureKey) {
    if (cache[textureKey]) return cache[textureKey];

    const tex = scene.textures.get(textureKey);
    if (!tex) return null;

    const src = tex.getSourceImage();
    if (!src) return null;

    const w = src.width;
    const h = src.height;

    // draw to offscreen canvas to read pixels
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);

    let data;
    try {
      data = ctx.getImageData(0, 0, w, h).data;
    } catch (e) {
      // CORS or other read error. fall back to full bounds.
      const result = { sx:0, sy:0, ex:w, ey:h, vw:w, vh:h };
      cache[textureKey] = result;
      return result;
    }

    let minX = w, minY = h, maxX = 0, maxY = 0;
    const alphaThreshold = 20;

    // sample every 4 pixels for speed (still accurate enough for bounds)
    for (let y = 0; y < h; y += 2) {
      for (let x = 0; x < w; x += 2) {
        const i = (y * w + x) * 4 + 3;
        if (data[i] > alphaThreshold) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }

    // if nothing found, use full bounds
    if (minX > maxX || minY > maxY) {
      const result = { sx:0, sy:0, ex:w, ey:h, vw:w, vh:h };
      cache[textureKey] = result;
      return result;
    }

    const result = {
      sx: minX, sy: minY, ex: maxX, ey: maxY,
      vw: maxX - minX, vh: maxY - minY,
      srcW: w, srcH: h
    };
    cache[textureKey] = result;
    return result;
  }

  // scale + position a sprite so its VISIBLE content has target height `targetH`,
  // and its visible bottom (feet) lands at (x, y).
  // returns the sprite for chaining.
  function applyTo(sprite, textureKey, opts) {
    opts = opts || {};
    const targetH = opts.targetH || 200;
    const scene = sprite.scene;
    const bounds = measure(scene, textureKey);
    if (!bounds) return sprite;

    // scale so visible character height = targetH
    const scale = targetH / bounds.vh;
    sprite.setScale(scale);

    // figure out where in the SOURCE the feet are.
    // feet = bottom of visible bounds = bounds.ey (in source pixel coords)
    // origin Y as a fraction of source height = bounds.ey / bounds.srcH
    // setOrigin places the origin point at the sprite's x,y position.
    // so if we want feet at sprite.y, origin Y must be bounds.ey / bounds.srcH.
    const originY = bounds.ey / bounds.srcH;

    // x: center the visible content horizontally
    // visible center X in source = (sx + ex) / 2
    const originX = (bounds.sx + (bounds.vw / 2)) / bounds.srcW;

    sprite.setOrigin(originX, originY);
    return sprite;
  }

  function place(scene, x, y, textureKey, opts) {
    if (!scene.textures.exists(textureKey)) return null;
    const sprite = scene.add.image(x, y, textureKey);
    return applyTo(sprite, textureKey, opts);
  }

  window.SpriteAutoFit = { place, applyTo, measure };
})();
