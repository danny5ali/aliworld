// aliworld/DialogueManager.js
// robust dialogue: works on mobile, handles scene transitions cleanly

(function () {

  class DialogueManager {
    constructor(scene) {
      this.scene = scene;
      this.active = false;
      this.objects = [];
    }

    show(lines, onComplete) {
      const scene = this.scene;
      const { width, height } = scene.scale;
      const boxH = 140;
      const boxY = height - boxH - 16;
      const PAD = 20;

      this.cleanup();
      this.active = true;

      const box = scene.add.rectangle(width / 2, boxY + boxH / 2, width - 32, boxH, 0x07070f, 0.95)
        .setStrokeStyle(1, 0x333355).setDepth(100);

      const speakerText = scene.add.text(PAD + 12, boxY + 14, '', {
        fontFamily:'monospace', fontSize:'11px', color:'#888899'
      }).setDepth(101);

      const lineText = scene.add.text(PAD + 12, boxY + 34, '', {
        fontFamily:'monospace', fontSize:'14px', color:'#ebe2d2',
        wordWrap:{ width: width - PAD * 2 - 40 }
      }).setDepth(101);

      const prompt = scene.add.text(width - 32, boxY + boxH - 18, '▶', {
        fontFamily:'monospace', fontSize:'13px', color:'#555566'
      }).setOrigin(0.5).setDepth(101);

      scene.tweens.add({
        targets: prompt, alpha:{ from:1, to:0.2 }, duration:700, yoyo:true, repeat:-1
      });

      // input zone covering entire screen
      const inputZone = scene.add.zone(0, 0, width, height)
        .setOrigin(0, 0).setInteractive().setDepth(99);

      this.objects = [box, speakerText, lineText, prompt, inputZone];

      let index = 0;
      let charIdx = 0;
      let fullText = '';
      let ticker = null;
      let isAdvancing = false;

      const showLine = () => {
        if (index >= lines.length) {
          this.cleanup();
          if (onComplete) onComplete();
          return;
        }
        const { speaker, text } = lines[index];
        fullText = text;
        charIdx = 0;
        const isNarration = !speaker;

        speakerText.setText(speaker ? speaker.toUpperCase() : '');
        lineText.setColor(isNarration ? '#7a7060' : '#ebe2d2');
        lineText.setText('');

        if (ticker) { ticker.remove(); ticker = null; }
        ticker = scene.time.addEvent({
          delay: isNarration ? 22 : 28,
          repeat: text.length - 1,
          callback: () => { lineText.setText(text.slice(0, ++charIdx)); }
        });
      };

      const advance = () => {
        if (!this.active || isAdvancing) return;
        isAdvancing = true;
        // tiny debounce to prevent double-fire on mobile (touch + click)
        scene.time.delayedCall(50, () => { isAdvancing = false; });

        if (charIdx < fullText.length) {
          if (ticker) { ticker.remove(); ticker = null; }
          lineText.setText(fullText);
          charIdx = fullText.length;
          return;
        }
        index++;
        showLine();
      };

      // wire input
      inputZone.on('pointerup', advance);

      // keyboard - use a fresh key object per dialogue session
      const spaceKey = scene.input.keyboard.addKey('SPACE');
      const enterKey = scene.input.keyboard.addKey('ENTER');
      spaceKey.on('down', advance);
      enterKey.on('down', advance);

      this._spaceKey = spaceKey;
      this._enterKey = enterKey;
      this._ticker = ticker;

      showLine();
    }

    cleanup() {
      this.active = false;
      if (this._ticker) { try { this._ticker.remove(); } catch (e) {} this._ticker = null; }
      if (this._spaceKey) { try { this._spaceKey.removeAllListeners(); this._spaceKey.destroy(); } catch (e) {} this._spaceKey = null; }
      if (this._enterKey) { try { this._enterKey.removeAllListeners(); this._enterKey.destroy(); } catch (e) {} this._enterKey = null; }
      this.objects.forEach(o => { if (o && o.destroy) try { o.destroy(); } catch (e) {} });
      this.objects = [];
    }
  }

  window.DialogueManager = DialogueManager;
})();
