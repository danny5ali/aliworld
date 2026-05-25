// aliworld/scenes/IntroScene.js
// adam's voice-only intro before character creation
// black screen, dialogue, then fade to character creation

class IntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'IntroScene' });
  }

  create() {
    const { width, height } = this.scale;

    // pure black
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);

    // small breathing dot in center while waiting (so screen doesn't feel frozen)
    const dot = this.add.circle(width / 2, height / 2 - 40, 4, 0x222233);
    this.tweens.add({
      targets: dot, alpha: { from: 0.3, to: 1 },
      duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    this.cameras.main.fadeIn(2000, 0, 0, 0);

    // wait a beat then start adam's intro
    this.time.delayedCall(1800, () => this.startIntro(dot));
  }

  startIntro(dot) {
    const intro = [
      { speaker: null,   text: '...' },
      { speaker: 'adam', text: 'you up?' },
      { speaker: 'adam', text: 'i\'ve been looking for you.' },
      { speaker: null,   text: 'a voice. familiar. close, but not in the room.' },
      { speaker: 'adam', text: 'i need you to hear something.' },
      { speaker: 'adam', text: 'first run through. nobody\'s heard it but me.' },
      // [music kicks in here - placeholder for now]
      { speaker: null,   text: 'somewhere, something begins to play.' },
      { speaker: null,   text: 'the room you can\'t see fills with it.' },
      { speaker: 'adam', text: 'this is it. this is the world i was telling you about.' },
      { speaker: 'adam', text: 'aliworld.' },
      { speaker: 'adam', text: 'i can\'t walk you all the way through it. but i can put you in.' },
      { speaker: 'adam', text: 'you ready?' },
      { speaker: null,   text: 'before you answer, you feel yourself sliding forward.' },
      { speaker: null,   text: 'somewhere, your body is being assembled.' },
    ];

    new DialogueManager(this).show(intro, () => {
      dot.destroy();
      this.cameras.main.fadeOut(1200, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('CharacterCreationScene');
      });
    });
  }
}

window.IntroScene = IntroScene;
