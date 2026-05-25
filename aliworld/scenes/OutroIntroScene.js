// aliworld/scenes/OutroIntroScene.js
// after character + name + loadout, adam returns to send player into the world

class OutroIntroScene extends Phaser.Scene {
  constructor() {
    super({ key: 'OutroIntroScene' });
  }

  create() {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0, 0);
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    const handle = (window.aliworldGame && window.aliworldGame.userHandle) || 'unknown';

    const lines = [
      { speaker: 'adam', text: `${handle}.` },
      { speaker: 'adam', text: 'there you are.' },
      { speaker: 'adam', text: 'i was looking for you.' },
      { speaker: null,   text: 'adam\'s voice is closer now. like he\'s in the next room.' },
      { speaker: 'adam', text: 'i can\'t come with you. i\'ve got my own thing.' },
      { speaker: 'adam', text: 'but i wanted you to hear it first.' },
      { speaker: 'adam', text: 'the album. the world. all of it.' },
      { speaker: null,   text: 'somewhere, the track keeps playing.' },
      { speaker: 'adam', text: 'just remember. you\'re not the only one in here.' },
      { speaker: 'adam', text: 'some people forget that.' },
      { speaker: 'adam', text: 'go on.' },
    ];

    new DialogueManager(this).show(lines, () => {
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('E1Scene');
      });
    });
  }
}

window.OutroIntroScene = OutroIntroScene;
