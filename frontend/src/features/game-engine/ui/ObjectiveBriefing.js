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

    const viewportHeight = scene.scale.parentSize?.height || 720;
    const isCompactLandscape = viewportHeight <= 430;
    const cardWidth = Math.min(
      bounds.width * 0.94,
      pxToWorld(scene, isCompactLandscape ? 780 : 940),
    );
    const cardX = bounds.centerX;

    // Ukuran diperbesar secara signifikan agar tujuan episode tampil tegas dan
    // sangat mudah dibaca pada layar HP maupun desktop.
    const labelFont = pxToWorld(scene, isCompactLandscape ? 36 : 42);
    const preferredBodyFont = isCompactLandscape ? 26 : 30;
    const minimumBodyFont = 22;
    const promptFont = pxToWorld(scene, isCompactLandscape ? 20 : 23);
    const labelY = bounds.top + bounds.height * (isCompactLandscape ? 0.10 : 0.14);
    const promptY = bounds.top + bounds.height * 0.90;

    const label = scene.add
      .text(cardX, labelY, title, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${labelFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5, 0);
    this._container.add(label);

    const promptText = scene.add
      .text(cardX, promptY, 'TEKAN UNTUK MULAI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setAlpha(0);
    this._container.add(promptText);
    this._promptText = promptText;

    const bodyY = label.y + label.height + pxToWorld(scene, isCompactLandscape ? 14 : 20);
    const bodyMaxHeight = Math.max(
      1,
      promptText.y - promptText.height / 2 - bodyY - pxToWorld(scene, 18),
    );

    const body = scene.add
      .text(cardX, bodyY, objectiveText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(scene, preferredBodyFont)}px`,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: cardWidth },
        lineSpacing: pxToWorld(scene, isCompactLandscape ? 7 : 11),
      })
      .setOrigin(0.5, 0);

    // Turunkan ukuran hanya bila teks episode yang panjang benar-benar
    // melewati ruang tersedia.
    let fittedBodyFont = preferredBodyFont;
    while (body.height > bodyMaxHeight && fittedBodyFont > minimumBodyFont) {
      fittedBodyFont -= 1;
      body.setFontSize(pxToWorld(scene, fittedBodyFont));
    }
    this._container.add(body);

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
