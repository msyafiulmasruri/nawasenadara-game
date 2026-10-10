import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';

// Overlay "briefing objektif" — tampil di ATAS gameplay (bukan scene
// terpisah seperti EpisodeEndingScene, karena ini muncul SAAT gameplay
// baru dimulai, sebelum player dilepas bebas bergerak, jadi lebih
// murah & sederhana ditumpuk di scene yang sama daripada pindah scene
// bolak-balik) begitu pemain masuk ke gameplay sebuah episode — WAJIB
// dibaca dulu sebelum bisa lanjut main. Isinya arahan objektif: apa
// yang harus dilakukan pemain di episode ini DAN bagaimana cara
// menjawab/merespons dengan tepat (lihat field `objective` di
// config/episodes.js).
//
// Pola "tap di mana saja untuk lanjut" SENGAJA disamakan dengan
// EpisodeIntroScene/EpisodeEndingScene (bukan tombol kecil) — sudah
// terbukti solid dan konsisten di seluruh alur intro->briefing->
// gameplay->ending.
export default class ObjectiveBriefing {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
  }

  show({ title = 'TUJUAN EPISODE', objectiveText, onContinue }) {
    if (this.isOpen) return;
    this.isOpen = true;
    this._onContinue = onContinue;
    this._readyToAdvance = false;
    this._advancing = false;

    const scene = this.scene;
    const bounds = getVisibleBounds(scene);

    this._container = scene.add.container(0, 0).setDepth(700).setScrollFactor(0);

    const dim = scene.add
      .rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height, 0x05050f, 0.88)
      .setScrollFactor(0);
    this._container.add(dim);

    const cardWidth = Math.min(bounds.width * 0.9, 640);
    const cardX = bounds.centerX;

    const labelFont = pxToWorld(scene, 26);
    const bodyFont = pxToWorld(scene, 22);
    const promptFont = pxToWorld(scene, 20);

    const label = scene.add
      .text(cardX, bounds.top + bounds.height * 0.20, title, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${labelFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this._container.add(label);

    const body = scene.add
      .text(cardX, label.y + label.height + 24, objectiveText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: cardWidth },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);
    this._container.add(body);

    const promptText = scene.add
      .text(cardX, bounds.top + bounds.height * 0.86, 'TEKAN UNTUK MULAI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this._container.add(promptText);
    this._promptText = promptText;

    // Kunci "harus dibaca" sederhana: tombol lanjut baru aktif setelah
    // jeda singkat (cukup untuk minimal sempat membaca 1-2 baris
    // pertama), bukan bisa langsung di-skip sepersekian detik begitu
    // muncul.
    scene.time.delayedCall(900, () => {
      if (!this.isOpen) return;
      this._readyToAdvance = true;
      scene.tweens.add({
        targets: promptText,
        alpha: 1,
        duration: 400,
      });
      scene.tweens.add({
        targets: promptText,
        alpha: 0.3,
        duration: 700,
        yoyo: true,
        repeat: -1,
        delay: 400,
      });
    });

    this._handleAdvance = () => {
      if (!this._readyToAdvance || this._advancing) return;
      this._advancing = true;
      this.close();
    };
    scene.input.keyboard?.on('keydown-SPACE', this._handleAdvance);
    scene.input.keyboard?.on('keydown-E', this._handleAdvance);
    scene.input.on('pointerdown', this._handleAdvance);

    this._shutdownHandler = () => this.close(true);
    scene.events.once('shutdown', this._shutdownHandler);
  }

  close(silent = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    const scene = this.scene;
    scene.input.keyboard?.off('keydown-SPACE', this._handleAdvance);
    scene.input.keyboard?.off('keydown-E', this._handleAdvance);
    scene.input.off('pointerdown', this._handleAdvance);
    if (this._shutdownHandler) {
      scene.events.off('shutdown', this._shutdownHandler);
      this._shutdownHandler = null;
    }
    this._container?.destroy();
    this._container = null;
    if (!silent) this._onContinue?.();
  }
}
