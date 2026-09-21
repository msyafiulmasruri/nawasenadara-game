import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';

// Kartu "Ending Scene" — tampil sesaat setelah quest dialog utama
// sebuah episode selesai (sebelum jurnal refleksi & chatbot Kak Dara),
// menampilkan judul ending yang didapat pemain (ditentukan dari tally
// label emosi pilihan dialog — lihat utils/emotionEnding.js) plus
// konklusi plus/minus-nya. Murni Phaser, gaya visual sama dengan
// DialogueBox supaya terasa satu kesatuan alur, bukan popup asing.
export default class EndingCard {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this._container = null;
  }

  show({ title, plusText, minusText, onContinue }) {
    if (this.isOpen) return;
    this.isOpen = true;
    this._onContinue = onContinue;
    this._nodeReadyAt = this.scene.time.now + 260;

    const scene = this.scene;
    const bounds = getVisibleBounds(scene);
    const cardWidth = Math.min(bounds.width * 0.9, 620);
    const cardX = bounds.centerX;
    const cardY = bounds.centerY;

    this._container = scene.add.container(0, 0).setDepth(600).setScrollFactor(0);

    const dim = scene.add
      .rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height, 0x000000, 0.55)
      .setScrollFactor(0);
    this._container.add(dim);

    const cardHeight = Math.min(bounds.height * 0.7, 420);
    const cardBg = scene.add
      .rectangle(cardX, cardY, cardWidth, cardHeight, 0x0f0f22, 0.97)
      .setStrokeStyle(2, 0xffdd57, 0.85);
    this._container.add(cardBg);

    const titleFont = pxToWorld(scene, 18);
    const bodyFont = pxToWorld(scene, 14);
    const top = cardY - cardHeight / 2 + 20;

    const titleText = scene.add
      .text(cardX, top, title, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${titleFont}px`,
        color: '#ffdd57',
        align: 'center',
        wordWrap: { width: cardWidth - 40 },
      })
      .setOrigin(0.5, 0);
    this._container.add(titleText);

    const plusLabel = scene.add
      .text(cardX - cardWidth / 2 + 20, titleText.y + titleText.height + 24, '(+)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#4ade80',
      })
      .setOrigin(0, 0);
    this._container.add(plusLabel);

    const plusBody = scene.add
      .text(cardX - cardWidth / 2 + 52, plusLabel.y, plusText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#ffffff',
        wordWrap: { width: cardWidth - 80 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this._container.add(plusBody);

    const minusY = plusBody.y + plusBody.height + 18;
    const minusLabel = scene.add
      .text(cardX - cardWidth / 2 + 20, minusY, '(−)', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#f87171',
      })
      .setOrigin(0, 0);
    this._container.add(minusLabel);

    const minusBody = scene.add
      .text(cardX - cardWidth / 2 + 52, minusY, minusText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#ffffff',
        wordWrap: { width: cardWidth - 80 },
        lineSpacing: 3,
      })
      .setOrigin(0, 0);
    this._container.add(minusBody);

    const btnWidth = 200;
    const btnHeight = pxToWorld(scene, 38);
    const btnY = cardY + cardHeight / 2 - 32;
    const btn = scene.add
      .rectangle(cardX, btnY, btnWidth, btnHeight, 0x243b55, 0.95)
      .setStrokeStyle(1.5, 0xffdd57, 0.6)
      .setInteractive({ useHandCursor: true });
    const btnLabel = scene.add
      .text(cardX, btnY, 'Lanjut ▸', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this._container.add(btn);
    this._container.add(btnLabel);

    const handleContinue = () => {
      if (scene.time.now < this._nodeReadyAt) return;
      this.close();
    };
    btn.on('pointerover', () => btn.setFillStyle(0x2f4d73, 0.95));
    btn.on('pointerout', () => btn.setFillStyle(0x243b55, 0.95));
    btn.on('pointerdown', handleContinue);
    this._keyHandler = handleContinue;
    scene.input.keyboard?.on('keydown-E', handleContinue);
    scene.input.keyboard?.on('keydown-SPACE', handleContinue);

    this._shutdownHandler = () => this.close(true);
    scene.events.once('shutdown', this._shutdownHandler);
  }

  close(silent = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    if (this._keyHandler) {
      this.scene.input.keyboard?.off('keydown-E', this._keyHandler);
      this.scene.input.keyboard?.off('keydown-SPACE', this._keyHandler);
      this._keyHandler = null;
    }
    if (this._shutdownHandler) {
      this.scene.events.off('shutdown', this._shutdownHandler);
      this._shutdownHandler = null;
    }
    this._container?.destroy();
    this._container = null;
    if (!silent) this._onContinue?.();
  }
}
