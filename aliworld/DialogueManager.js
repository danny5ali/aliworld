// aliworld/DialogueManager.js
// shared dialogue system used by all scenes
// handles typewriter, advance on tap/click/space/enter
// mobile-safe: uses a persistent pointerup listener, not once()

(function () {

  class DialogueManager {
    constructor(scene) {
      this.scene = scene;
      this.active = false;
      this.objects = [];
      this._advanceFn = null;
      this._ticker = null;
    }

    // lines: [{ speaker, text }]
    // speaker null = narration
    show(lines, onComplete) {
      const scene = this.scene;
      const { width, height } = scene.scale;
      const boxH = 120;
      const boxY = height - boxH - 12;
      const PAD = 24;

      this.cleanup();
      this.active = true;

      const box = scene.add.rectangle(
        width / 2, boxY + boxH / 2, width - 40, boxH, 0x07070f, 0.95
      ).setStrokeStyle(1, 0x333355).setDepth(100);

      const speakerText = scene.add.text(PAD + 20, boxY + 12, '', {
        fontFamily: 'monospace', fontSize: '11px', color: '#888899'
      }).setDepth(101);

      const lineText = scene.add.text(PAD + 20, boxY + 30, '', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ebe2d2',
        wordWrap: { width: width - PAD * 2 - 60 }
      }).setDepth(101);

      const prompt = scene.add.text(width - 40, boxY + boxH - 18, '▶', {
        fontFamily: 'monospace', fontSize: '12px', color: '#555566'
      }).setOrigin(0.5).setDepth(101);

      scene.tweens.add({
        targets: prompt, alpha: { from: 1, to: 0.2 },
        duration: 700, yoyo: true, repeat: -1
      });

      this.objects = [box, speakerText, lineText, prompt];

      let index = 0;
      let charIdx = 0;
      let fullText = '';
      let done = false;

      const advance = () => {
        if (!this.active) return;
        if (charIdx < fullText.length) {
          // skip to end of line
          if (this._ticker) { this._ticker.remove(); this._ticker = null; }
          lineText.setText(fullText);
          charIdx = fullText.length;
          return;
        }
        // next line
        index++;
        if (index >= lines.length) {
          this.cleanup();
          if (onComplete) onComplete();
          return;
        }
        showLine();
      };

      const showLine = () => {
        const { speaker, text } = lines[index];
        fullText = text;
        charIdx = 0;
        const isNarration = !speaker;

        speakerText.setText(speaker ? speaker.toUpperCase() : '');
        lineText.setColor(isNarration ? '#7a7060' : '#ebe2d2');
        lineText.setText('');

        if (this._ticker) { this._ticker.remove(); this._ticker = null; }
        this._ticker = scene.time.addEvent({
          delay: isNarration ? 20 : 26,
          repeat: text.length - 1,
          callback: () => { lineText.setText(text.slice(0, ++charIdx)); }
        });
      };

      // persistent input - works on mobile and desktop
      this._advanceFn = advance;

      // tap/click on the dialogue box itself
      box.setInteractive();
      box.on('pointerup', advance);

      // also wire the full screen as a tap target
      this._inputZone = scene.add.zone(0, 0, width, height)
        .setOrigin(0, 0).setInteractive().setDepth(99);
      this._inputZone.on('pointerup', advance);
      this.objects.push(this._inputZone);

      // keyboard
      this._spaceKey = scene.input.keyboard.addKey('SPACE');
      this._enterKey = scene.input.keyboard.addKey('ENTER');
      this._spaceKey.on('down', advance);
      this._enterKey.on('down', advance);

      showLine();
    }

    cleanup() {
      this.active = false;
      if (this._ticker) { this._ticker.remove(); this._ticker = null; }
      if (this._spaceKey) { this._spaceKey.removeAllListeners(); }
      if (this._enterKey) { this._enterKey.removeAllListeners(); }
      this.objects.forEach(o => { if (o && o.destroy) o.destroy(); });
      this.objects = [];
    }
  }

  window.DialogueManager = DialogueManager;
})();
