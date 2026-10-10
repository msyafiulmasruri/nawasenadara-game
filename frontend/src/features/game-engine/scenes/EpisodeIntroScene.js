import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { stopMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { getEpisodeById } from '../config/episodes';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';

export default class EpisodeIntroScene extends Phaser.Scene {
  constructor() {
    super('EpisodeIntroScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.episodeData = getEpisodeById(this.episodeId);
  }

  async create() {
    // FIX: episode yang punya quest wajib (mis. Episode1Scene, cek
    // getCompletedEpisodes()) menentukan status "sudah pernah
    // diselesaikan?" secara SINKRON dari window.__nawasenadaraProgressCache
    // begitu scene-nya create(). Cache itu diisi ASYNC oleh
    // GameProgressBridge.jsx saat game pertama kali dimuat — kalau
    // pemain sampai di titik ini SEBELUM fetch pertama itu selesai
    // (jaringan lambat), cache masih kosong dan episode yang SUDAH
    // selesai di server pun terbaca seolah belum pernah disentuh,
    // memaksa quest diulang walau pemain memilih "Lanjutkan Permainan
    // Lama". Menunggu di SINI — satu-satunya pintu masuk ke scene
    // episode manapun — memastikan cache-nya sudah pasti terisi
    // sebelum scene gameplay episode sempat dibuat.
    // Race dengan timeout 4 detik supaya tidak macet permanen kalau
    // bridge-nya entah kenapa tidak pernah terpasang/gagal total.
    const progressReady = window.__nawasenadaraProgress?.ready;
    if (progressReady) {
      await Promise.race([
        progressReady,
        new Promise((resolve) => setTimeout(resolve, 4000)),
      ]);
    }

    // WAJIB dipanggil di awal — lihat dokumentasi lengkap di
    // syncGameSizeToOrientation() (utils/visibleBounds.js). Tanpa ini,
    // scene sebelumnya (episode landscape dengan lebar dinamis, mis.
    // 1650) bisa "membekas": scene ini menggambar dengan asumsi lebar
    // tetap 1280, menyisakan area kosong (hitam) tidak simetris di
    // kanan/kiri layar karena dunia game sebenarnya masih lebih lebar
    // dari yang digambar.
    const { width, height } = syncGameSizeToOrientation(this);

    // Musik tema menu berhenti di sini (bukan menunggu sampai gameplay
    // sungguhan mulai) — layar intro episode ini sekarang punya tema
    // sendiri yang beda nuansanya (lebih menegangkan/antisipatif).
    stopMenuBGM();
    this.audioManager = new AudioManager();
    this.audioManager.init();
    const savedSettings = getSettings();
    this.audioManager.setBGMVolume(savedSettings.bgmVolume);
    if (savedSettings.muted) this.audioManager.setMasterVolume(0);
    this.audioManager.startIntroBGM();
    this.events.once('shutdown', () => {
      this.audioManager?.destroy();
    });

    this.bgRect = this.add.rectangle(width / 2, height / 2, width, height, 0x05050f).setDepth(0);

    // Bintang-bintang kecil, posisi acak, tiap bintang berkedip dengan
    // kecepatan berbeda-beda supaya tidak terasa seragam/kaku.
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

    // --- Ukuran font: PENTING pakai pxToWorld(), bukan angka world-unit
    // tetap ---
    // Portrait sekarang punya lebar dunia yang DINAMIS mengikuti rasio
    // layar (bisa serendah ~300-400 world unit di HP sempit — lihat
    // syncGameSizeToOrientation()). Font yang ditulis sebagai angka
    // world-unit tetap (mis. "40px" dulu) jadi punya UKURAN FISIK yang
    // berubah-ubah tergantung lebar dunia saat itu — di dunia sempit,
    // font 40 unit itu jadi proporsinya SANGAT besar dibanding lebar
    // layar (~40/330 ≈ 12% tinggi per karakter), gampang bikin judul
    // episode yang panjang meluber keluar layar / ke-crop. pxToWorld()
    // mengonversi ukuran CSS px FISIK yang diinginkan (konsisten di
    // semua perangkat) ke world-unit yang sesuai skala ENVELOP saat
    // ini — sama seperti yang sudah dipakai untuk tombol sentuh.
    const episodeLabelFont = pxToWorld(this, 40);
    const episodeTitleFont = pxToWorld(this, 30);
    // Sinopsis sengaja dibuat lebih besar daripada versi awal agar tetap
    // nyaman dibaca remaja di layar ponsel. Teksnya sudah diperingkas di
    // config/episodes.js sehingga kenaikan ukuran tidak membuat layar padat.
    const episodeDescFont = pxToWorld(this, 27);
    const promptFont = pxToWorld(this, 20);

    this.episodeLabel = this.add
      .text(width / 2, height * 0.32, `EPISODE ${this.episodeId}`, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${episodeLabelFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // wordWrap WAJIB di sini — episodeTitle diisi dari data episode
    // (judulnya bervariasi panjangnya, mis. "Rahasia di Grup Kelas"),
    // sebelumnya TIDAK ADA wordWrap sama sekali di teks ini, jadi judul
    // yang lebih panjang dari lebar dunia portrait yang sempit pasti
    // meluber/ke-crop di kedua sisi. Ini penyebab utama keluhan "teks
    // kepotong saat portrait".
    this.episodeTitle = this.add
      .text(width / 2, height * 0.32 + 46, this.episodeData?.title ?? '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${episodeTitleFont}px`,
        fontStyle: '600',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.85 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.episodeDesc = this.add
      .text(width / 2, height * 0.55, '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${episodeDescFont}px`,
        color: '#dddddd',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.85 },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.promptText = this.add
      .text(width / 2, height * 0.85, 'TEKAN UNTUK LEWATI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.85 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.tweens.add({
      targets: this.promptText,
      alpha: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // --- Efek ketik-mesin-tik (typewriter) untuk deskripsi episode ---
    // Teks penuh muncul huruf demi huruf, dibarengi blip suara pendek
    // ala Harvest Moon/Animal Crossing tiap beberapa huruf (bukan tiap
    // satu huruf — kalau tiap huruf, blip-nya jadi berdengung/berisik
    // di teks yang panjang). Bisa di-skip kapan saja (langsung tampil
    // penuh) dengan Space/klik/tap; sekali lagi Space/klik/tap setelah
    // itu baru lanjut ke gameplay episode — supaya pemain yang belum
    // sempat baca tidak ke-skip otomatis ke gameplay.
    const fullText = this.episodeData?.description ?? '';
    this._typewriterIndex = 0;
    this._typewriterDone = fullText.length === 0;
    this.promptText.setText(fullText.length === 0 ? 'TEKAN UNTUK MULAI' : 'TEKAN UNTUK LEWATI');

    const revealNextChar = () => {
      if (this._typewriterDone) return;
      this._typewriterIndex += 1;
      this.episodeDesc.setText(fullText.slice(0, this._typewriterIndex));

      // Blip tiap 2 karakter, dan dilewati untuk spasi (supaya jeda
      // antar kata tidak ikut "bunyi").
      if (
        this._typewriterIndex % 2 === 0 &&
        fullText[this._typewriterIndex - 1] !== ' '
      ) {
        this.audioManager?.playTypewriterBlip();
      }

      if (this._typewriterIndex >= fullText.length) {
        this._finishTypewriter();
      }
    };

    this._typewriterTimer = this.time.addEvent({
      delay: 32,
      loop: true,
      callback: revealNextChar,
    });

    const startEpisode = () => {
      const sceneKey = this.episodeData?.sceneKey ?? 'Episode1Scene';
      this.scene.start(sceneKey, { episodeId: this.episodeId });
    };

    // Tap/klik/Space pertama: kalau teks masih berjalan, langsung
    // tuntaskan (skip ke teks penuh) — TIDAK langsung pindah scene.
    // Tap/klik/Space berikutnya (setelah teks penuh tampil): baru
    // benar-benar lanjut ke episode.
    const handleAdvance = () => {
      if (!this._typewriterDone) {
        this._finishTypewriter();
        return;
      }
      startEpisode();
    };

    this.input.keyboard.on('keydown-SPACE', handleAdvance);
    this.input.on('pointerdown', handleAdvance);

    // Reposisi semua teks ke area yang benar-benar terlihat kalau
    // viewport berubah ukuran/orientasi saat masih di scene ini —
    // sebelumnya scene ini tidak punya listener resize sama sekali,
    // jadi kalau HP diputar di sini teks tetap di posisi/lebar lama.
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      this._typewriterTimer?.remove();
    });
  }

  _finishTypewriter() {
    if (this._typewriterDone) return;
    this._typewriterDone = true;
    this._typewriterTimer?.remove();
    this.episodeDesc?.setText(this.episodeData?.description ?? '');
    this.promptText?.setText('TEKAN UNTUK MULAI');
  }

  _reposition() {
    // Sync ulang juga di sini (bukan cuma di create()) — supaya kalau
    // rasio aspek berubah SAAT masih di scene ini (mis. user toggle
    // fullscreen persis waktu di layar intro episode — INI KASUS YANG
    // DIMINTA: "dari belum fullscreen hingga fullscreen tetap
    // responsive"), lebar dunia game ikut disesuaikan lagi, bukan cuma
    // teks-nya yang dipindah tapi background rectangle-nya tetap
    // ukuran lama (bekas lebar sebelumnya) dan menyisakan celah hitam
    // di tepi.
    const { width, height } = syncGameSizeToOrientation(this);
    this.bgRect?.setPosition(width / 2, height / 2);
    this.bgRect?.setSize(width, height);

    const bounds = getVisibleBounds(this);
    const baseY = bounds.top + bounds.height * 0.32;

    // Ukuran font DIHITUNG ULANG tiap resize (bukan cuma posisi) —
    // supaya transisi non-fullscreen <-> fullscreen (yang mengubah
    // skala ENVELOP secara signifikan) tetap menghasilkan ukuran teks
    // yang proporsional & tidak meluber, bukan cuma dipindah posisinya
    // saja dengan ukuran font basi dari render sebelumnya.
    this.episodeLabel?.setFontSize(pxToWorld(this, 40));
    this.episodeLabel?.setPosition(bounds.centerX, baseY);

    this.episodeTitle?.setFontSize(pxToWorld(this, 30));
    this.episodeTitle?.setPosition(bounds.centerX, baseY + 46);
    this.episodeTitle?.setWordWrapWidth(bounds.width * 0.85);

    this.episodeDesc?.setFontSize(pxToWorld(this, 27));
    this.episodeDesc?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.55);
    this.episodeDesc?.setWordWrapWidth(bounds.width * 0.85);

    this.promptText?.setFontSize(pxToWorld(this, 20));
    this.promptText?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.85);
    this.promptText?.setWordWrapWidth(bounds.width * 0.85);
  }
}
