import Phaser from 'phaser';
import { startMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { drawStarfieldBackground } from '../utils/starfieldBackground';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';
import { requestAppFullscreen } from '@/lib/fullscreen';

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  create() {
    // WAJIB di awal — lihat dokumentasi di syncGameSizeToOrientation()
    // (utils/visibleBounds.js). Mencegah "bekas" lebar dunia game dari
    // scene episode landscape sebelumnya menyisakan area hitam kosong
    // tidak simetris di scene ini.
    const { width, height } = syncGameSizeToOrientation(this);
    const bounds0 = getVisibleBounds(this);

    // Langit hitam + bintang kecil berkedip — sekarang lewat helper
    // bersama (starfieldBackground.js) supaya MenuScene & SettingsScene
    // bisa pakai visual yang sama persis, bukan cuma TitleScene.
    this._starfield = drawStarfieldBackground(this, width, height);
    this.bgRect = this._starfield.bgRect;

    // --- Ukuran font pakai pxToWorld() (px FISIK, bukan world-unit
    // tetap) --- lihat catatan panjang soal ini di
    // EpisodeIntroScene.create() kalau butuh detail lengkap. Ringkasnya:
    // dunia portrait sekarang lebarnya dinamis mengikuti rasio layar
    // (bisa sempit di HP), jadi font harus dikonversi dari ukuran CSS
    // px yang diinginkan supaya ukuran FISIK di layar konsisten dan
    // tidak meluber/ke-crop di dunia yang sempit.
    const logoFont = pxToWorld(this, 52);
    const pressFont = pxToWorld(this, 24);
    const hintFont = pxToWorld(this, 14);

    if (this.textures.exists('title-logo')) {
      this.logo = this.add.image(width / 2, height / 3, 'title-logo').setOrigin(0.5).setDepth(2);
    } else {
      // Emas (#ffdd57), konsisten dengan aksen warna di seluruh UI lain
      // — sebelumnya pakai stroke ungu, sekarang dihapus.
      //
      // wordWrap ditambahkan sebagai jaring pengaman — "NAWASENA DARA"
      // cukup panjang untuk berpotensi meluber di HP portrait paling
      // sempit sekalipun setelah dikonversi ke px fisik.
      this.logo = this.add
        .text(width / 2, height / 3, 'NAWASENA DARA', {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${logoFont}px`,
          color: '#ffdd57',
          align: 'center',
          wordWrap: { width: bounds0.width * 0.9 },
        })
        .setOrigin(0.5)
        .setDepth(2);
    }

    this.pressText = this.add
      .text(width / 2, height * 0.75, 'PRESS SPACE TO START', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pressFont}px`,
        fontStyle: '600',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.9 },
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.tweens.add({
      targets: this.pressText,
      alpha: 0,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    // Safari iOS TIDAK PERNAH mendukung Fullscreen API untuk halaman
    // web biasa (element.requestFullscreen tidak ada di iPhone/iPad
    // sama sekali, kecuali untuk <video>) — ini keterbatasan WebKit,
    // bukan bug. Satu-satunya cara benar-benar fullscreen di iOS adalah
    // "Add to Home Screen" (sudah dikonfigurasi lewat manifest.json +
    // meta tag apple-mobile-web-app-capable di layout.js). Supaya
    // pemain tahu ini SEKARANG (bukan cuma diam-diam gagal), tampilkan
    // hint singkat kalau terdeteksi iOS dan belum dibuka dari Home
    // Screen (mode standalone).
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isIOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone =
      typeof window !== 'undefined' &&
      (window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone);

    if (isIOS && !isStandalone) {
      this.iosHint = this.add
        .text(
          width / 2,
          height * 0.88,
          'Tips: buka Share > "Add to Home Screen" untuk mode fullscreen',
          {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${hintFont}px`,
            color: '#aaaaaa',
            align: 'center',
            wordWrap: { width: bounds0.width * 0.8 },
          },
        )
        .setOrigin(0.5)
        .setDepth(2);
    }

    // --- Musik tema menu (persisten lintas Title/Menu/Settings) ---
    // Sengaja diinisialisasi dari dalam user gesture (klik/tap/keydown)
    // karena kebijakan autoplay browser modern memblokir audio yang
    // coba mulai sendiri tanpa interaksi pengguna. TIDAK di-destroy
    // saat scene ini shutdown (beda dari BasePlayerScene) — musiknya
    // sengaja diteruskan ke MenuScene/SettingsScene, baru dihentikan
    // eksplisit saat pemain benar-benar masuk gameplay episode.
    const beginMenuBGM = () => {
      startMenuBGM(getSettings());
    };
    this.input.keyboard.once('keydown-SPACE', beginMenuBGM);
    this.input.once('pointerdown', beginMenuBGM);

    const goToMenu = () => {
      // Kemungkinan besar fullscreen sudah aktif duluan sejak halaman
      // login (lihat providers.js — dipasang global untuk semua
      // halaman). requestAppFullscreen() aman dipanggil berkali-kali:
      // fungsinya langsung berhenti di awal kalau sudah fullscreen.
      requestAppFullscreen();
      this.scene.start('MenuScene');
    };

    this.input.keyboard.once('keydown-SPACE', goToMenu);
    this.input.once('pointerdown', goToMenu);

    // Reposisi teks ke area yang benar-benar terlihat kalau viewport
    // berubah ukuran/orientasi sebelum pemain sempat menekan mulai.
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
    });
  }

  _reposition() {
    // Sync ulang di sini juga — menangani kasus fullscreen di-toggle
    // sementara masih di layar judul (lihat catatan sama di
    // EpisodeIntroScene._reposition).
    const { width, height } = syncGameSizeToOrientation(this);
    this._starfield?.reposition(width, height);

    const bounds = getVisibleBounds(this);

    // Ukuran font DIHITUNG ULANG tiap resize (bukan cuma posisi) —
    // penting untuk transisi non-fullscreen <-> fullscreen yang
    // mengubah skala ENVELOP secara signifikan.
    if (this.logo?.setFontSize) {
      this.logo.setFontSize(pxToWorld(this, 52));
      this.logo.setWordWrapWidth(bounds.width * 0.9);
    }
    this.logo?.setPosition(bounds.centerX, bounds.top + bounds.height / 3);

    this.pressText?.setFontSize(pxToWorld(this, 24));
    this.pressText?.setWordWrapWidth(bounds.width * 0.9);
    this.pressText?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.75);

    this.iosHint?.setFontSize(pxToWorld(this, 14));
    this.iosHint?.setWordWrapWidth(bounds.width * 0.8);
    this.iosHint?.setPosition(bounds.centerX, bounds.top + bounds.height * 0.88);
  }
}
