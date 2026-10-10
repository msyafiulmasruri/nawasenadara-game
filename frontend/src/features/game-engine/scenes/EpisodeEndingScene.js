import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getSettings } from '../utils/settingsStore';
import { computeEnding } from '../utils/emotionEnding';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';
import { getCompletedEpisodes, completeEpisode } from '../utils/progressStore';

// Halaman "Ending Scene" — muncul PENUH SATU LAYAR (bukan overlay kartu
// di atas gameplay seperti percobaan sebelumnya, ui/EndingCard.js —
// sudah tidak dipakai lagi & boleh dihapus) persis setelah quest dialog
// utama sebuah episode selesai, SEBELUM jurnal refleksi wajib + tawaran
// Kak Dara.
//
// Gaya visualnya sengaja disalin dari EpisodeIntroScene (background
// gelap + bintang berkedip, fade-in bertahap, "tap di mana saja untuk
// lanjut") — BUKAN rectangle tombol kecil yang harus tepat disentuh
// seperti EndingCard lama (itu penyebab keluhan "gak bisa ditekan
// lanjut"). Pola tap-di-mana-saja ini sudah terbukti solid dipakai
// EpisodeIntroScene, jadi dipakai ulang persis di sini — bukan
// dieksperimen ulang dengan pola baru.
export default class EpisodeEndingScene extends Phaser.Scene {
  constructor() {
    super('EpisodeEndingScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.isLastEpisode = Boolean(data?.isLastEpisode);
    this.choices = Array.isArray(data?.choices) ? data.choices : [];
    // Dihitung SEKALI di sini dari `choices` yang sama persis yang
    // nanti dikirim ke backend lewat completeEpisode() di bawah —
    // supaya ending yang PEMAIN lihat selalu konsisten dengan
    // emotion_tally/ending_key yang tersimpan di server (lihat juga
    // cermin logic-nya di backend, services/progress/utils/emotion-
    // ending.js).
    const { ending } = computeEnding(this.episodeId, this.choices);
    this.ending = ending;
    this._readyToAdvance = false;
    this._advancing = false;
  }

  async create() {
    const { width, height } = syncGameSizeToOrientation(this);

    this.audioManager = new AudioManager();
    this.audioManager.init();
    const savedSettings = getSettings();
    this.audioManager.setBGMVolume(savedSettings.bgmVolume);
    if (savedSettings.muted) this.audioManager.setMasterVolume(0);

    // --- Pembersihan input WAJIB saat scene ini ditutup ---
    // Scene lain (BasePlayerScene) sempat punya bug listener nyangkut
    // kalau scene pindah di tengah jalan tanpa membersihkan listener
    // keydown/pointerdown-nya sendiri dulu (lihat catatan panjang soal
    // itu di BasePlayerScene.js & DialogueBox.js) — scene ini jaring
    // pengaman yang sama: SEMUA listener yang didaftarkan di create()
    // (keyboard SPACE/E, pointerdown global, resize) dilepas eksplisit
    // di shutdown, bukan dibiarkan ke garbage collector Phaser.
    // --- Bridge window.__nawasenadaraInput ---
    // FIX BUG: "WASD tidak berfungsi saat mengetik di jurnal refleksi
    // di akhir ending". Akar masalahnya: bridge ini SEBELUMNYA cuma
    // didaftarkan oleh BasePlayerScene (lihat scenes/BasePlayerScene.js)
    // dan DIHAPUS (delete window.__nawasenadaraInput) begitu scene itu
    // shutdown. Episode1Scene memanggil `this.scene.start(
    // 'EpisodeEndingScene', ...)` SEBELUM jurnal dibuka — yang berarti
    // Episode1Scene (BasePlayerScene) sudah shutdown & bridge-nya sudah
    // terhapus PADAHAL jurnal baru dibuka belakangan dari scene INI
    // (lihat _goToNextStep -> ui.openJournal). Akibatnya
    // GameUIBridge.jsx memanggil
    // `window.__nawasenadaraInput?.disableGameKeyboard()` ke bridge
    // yang sudah tidak ada (optional chaining -> no-op diam-diam),
    // jadi `keyboard.disableGlobalCapture()` TIDAK PERNAH terpanggil,
    // dan huruf w/a/s/d yang diketik ke textarea jurnal tetap
    // ditangkap/di-preventDefault oleh Phaser sebagai perintah gerak,
    // tidak pernah benar-benar masuk ke kotak teksnya.
    //
    // Perbaikannya: scene APAPUN yang mungkin memicu overlay React
    // (jurnal/chatbot) WAJIB mendaftarkan bridge fungsional ini sendiri
    // selama dia aktif — bukan cuma BasePlayerScene. Scene ini tidak
    // punya WASD/gerak pemain sama sekali (cuma listener tap-lanjut
    // yang sudah dilepas duluan sebelum _goToNextStep dipanggil, lihat
    // _handleAdvance), jadi cukup versi minimal: matikan/nyalakan
    // keyboard plugin scene ini sendiri + capture global-nya.
    // lockGameButtons/unlockGameButtons di-no-op (tidak ada tombol
    // sentuh apa pun di scene penuh-layar ini yang perlu dikunci).
    window.__nawasenadaraInput = {
      disableGameKeyboard: () => {
        this.input.keyboard.enabled = false;
        this.input.keyboard.disableGlobalCapture();
      },
      enableGameKeyboard: () => {
        this.input.keyboard.enabled = true;
        this.input.keyboard.enableGlobalCapture();
      },
      lockGameButtons: () => {},
      unlockGameButtons: () => {},
    };
    this.events.once('shutdown', () => {
      // Jaring pengaman sama seperti BasePlayerScene: pastikan
      // keyboard tidak "nyangkut" mati kalau scene ini hancur PERSIS
      // saat overlay masih terbuka, dan hapus bridge-nya sendiri
      // (hanya kalau bridge itu memang MASIH milik instance INI —
      // dicek lewat referensi fungsi, bukan asal delete — supaya tidak
      // menghapus bridge scene lain yang mungkin sudah menggantikannya
      // di antara waktu shutdown ini terjadwal & benar-benar berjalan).
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      delete window.__nawasenadaraInput;
    });

    this._teardownInput = () => {
      this.input?.keyboard?.off('keydown-SPACE', this._handleAdvance);
      this.input?.keyboard?.off('keydown-E', this._handleAdvance);
      this.input?.off('pointerdown', this._handleAdvance);
    };
    this.events.once('shutdown', () => {
      this._teardownInput?.();
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      this.audioManager?.destroy();
    });

    this.bgRect = this.add.rectangle(width / 2, height / 2, width, height, 0x05050f).setDepth(0);

    // Bintang berkedip — sama persis polanya dengan EpisodeIntroScene.
    for (let i = 0; i < 80; i += 1) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.FloatBetween(1, 2.4);
      const star = this.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
      star.setDepth(1);

      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.15, 0.4),
        duration: Phaser.Math.Between(1200, 3200),
        yoyo: true,
        repeat: -1,
        delay: Phaser.Math.Between(0, 2000),
      });
    }

    const bounds0 = getVisibleBounds(this);

    const labelFont = pxToWorld(this, 26);
    const titleFont = pxToWorld(this, 31);
    const bodyFont = pxToWorld(this, 18);
    const promptFont = pxToWorld(this, 19);

    this.endingLabel = this.add
      .text(width / 2, height * 0.18, 'EPISODE SELESAI', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${labelFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0);

    this.endingTitle = this.add
      .text(width / 2, height * 0.18 + 38, this.ending.title, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${titleFont}px`,
        fontStyle: '600',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.85 },
      })
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setAlpha(0);

    this.plusText = this.add
      .text(width / 2, height * 0.44, `(+) ${this.ending.plusText}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#4ade80',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.8 },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setAlpha(0);

    this.minusText = this.add
      .text(width / 2, 0, `(−) ${this.ending.minusText}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#f87171',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.8 },
        lineSpacing: 5,
      })
      .setOrigin(0.5, 0)
      .setDepth(2)
      .setAlpha(0);
    // Diposisikan tepat di bawah plusText setelah tinggi baris
    // sebenarnya diketahui (word-wrap membuat tinggi bervariasi).
    this.minusText.setY(this.plusText.y + this.plusText.height + 20);

    this.promptText = this.add
      .text(width / 2, height * 0.88, 'TEKAN UNTUK LANJUT', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setAlpha(0);

    // --- Fade-in bertahap: label+judul -> konklusi -> prompt ---
    this.tweens.add({
      targets: [this.endingLabel, this.endingTitle],
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: [this.plusText, this.minusText],
      alpha: 1,
      duration: 600,
      delay: 400,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 500,
      delay: 900,
      onComplete: () => {
        this._readyToAdvance = true;
        this.tweens.add({
          targets: this.promptText,
          alpha: 0,
          duration: 700,
          yoyo: true,
          repeat: -1,
        });
      },
    });

    // --- Lanjut: tap/klik di mana saja, atau Space/E ---
    // FIX (laporan sebelumnya: "ending tidak bisa ditekan lanjut") —
    // dulu pakai rectangle tombol kecil (EndingCard lama) yang harus
    // tepat disentuh & rawan luput/miss. Sekarang persis pola
    // EpisodeIntroScene: SELURUH layar jadi area tap, jauh lebih susah
    // gagal ke-trigger. `_readyToAdvance` mencegah tap SEBELUM fade-in
    // konklusi selesai (supaya tidak ke-skip tanpa sempat kebaca), dan
    // `_advancing` mencegah tap DOBEL memicu dua kali proses lanjut
    // (jurnal + completeEpisode + pindah scene) secara bersamaan.
    this._handleAdvance = () => {
      if (!this._readyToAdvance || this._advancing) return;
      this._advancing = true;
      // Lepas listener SEGERA (bukan menunggu shutdown) — mencegah
      // input lanjutan (mis. keyboard yang masih fokus di scene ini)
      // ikut nyangkut sampai await di _goToNextStep() selesai, yang
      // baru benar-benar men-transisi/menutup scene ini.
      this._teardownInput?.();
      this._goToNextStep();
    };
    this.input.keyboard.on('keydown-SPACE', this._handleAdvance);
    this.input.keyboard.on('keydown-E', this._handleAdvance);
    this.input.on('pointerdown', this._handleAdvance);

    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 150);
    };
    this.scale.on('resize', this._onResize);
  }

  // Sama alurnya dengan finishEpisode() di BasePlayerScene (jurnal
  // refleksi wajib -> completeEpisode() -> pindah scene) — diulang di
  // sini (bukan memanggil balik instance Episode1Scene, yang oleh
  // Phaser sudah di-shutdown begitu scene ini start) supaya alurnya
  // tetap jalan walau scene gameplay sumbernya sudah tidak ada lagi.
  //
  // PENTING soal overlay React (jurnal/Kak Dara) & keyboard: fungsi
  // `ui.openJournal()` di GameUIBridge.jsx SUDAH bertanggung jawab
  // penuh memanggil window.__nawasenadaraInput.disableGameKeyboard()
  // saat overlay-nya dibuka dan enableGameKeyboard() saat ditutup (pola
  // yang sama dipakai semua overlay React lain di codebase ini) — scene
  // Phaser manapun (termasuk scene ini) TIDAK PERNAH perlu menyentuh
  // keyboard.enabled secara langsung sendiri, supaya tidak ada dua
  // pihak berebut men-toggle flag yang sama dan saling menimpa.
  async _goToNextStep() {
    const id = this.episodeId;
    const alreadyCompletedBefore = getCompletedEpisodes().includes(id);
    const ui = window.__nawasenadaraUI;
    if (ui?.openJournal) {
      await ui.openJournal(id, { allowSkip: alreadyCompletedBefore });
    }

    completeEpisode(id, this.choices);

    if (this.isLastEpisode) {
      this.scene.start('EpisodeSelectScene');
    } else {
      this.scene.start('EpisodeIntroScene', { episodeId: id + 1 });
    }
  }

  _reposition() {
    const { width, height } = syncGameSizeToOrientation(this);
    this.bgRect?.setPosition(width / 2, height / 2);
    this.bgRect?.setSize(width, height);

    const bounds = getVisibleBounds(this);

    this.endingLabel?.setFontSize(pxToWorld(this, 26));
    this.endingLabel?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.18);

    this.endingTitle?.setFontSize(pxToWorld(this, 31));
    this.endingTitle?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.18 + 38);
    this.endingTitle?.setWordWrapWidth(bounds.width * 0.85);

    this.plusText?.setFontSize(pxToWorld(this, 18));
    this.plusText?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.44);
    this.plusText?.setWordWrapWidth(bounds.width * 0.8);

    if (this.minusText && this.plusText) {
      this.minusText.setFontSize(pxToWorld(this, 18));
      this.minusText.setWordWrapWidth(bounds.width * 0.8);
      this.minusText.setPosition(bounds.centerX, this.plusText.y + this.plusText.height + 20);
    }

    this.promptText?.setFontSize(pxToWorld(this, 19));
    this.promptText?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.88);
  }
}
