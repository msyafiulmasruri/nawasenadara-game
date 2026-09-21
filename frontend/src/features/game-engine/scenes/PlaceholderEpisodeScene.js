import BasePlayerScene from './BasePlayerScene';
import { getEpisodeById, EPISODES } from '../config/episodes';
import { LEVEL_EDGE_MARGIN } from '../config/gameConfig';
import { pxToWorld, getVisibleBounds } from '../utils/visibleBounds';

// Dipakai sementara oleh episode 2-9 selagi background asli belum jadi.
// Begitu aset latar tersedia, cara menggantinya:
// 1. Buat file scene baru (contoh: Episode2Scene.js) meniru pola
//    Episode1Scene.js (extend BasePlayerScene, override createBackground
//    supaya load gambar asli lewat this.add.tileSprite/this.add.image).
// 2. Daftarkan scene baru itu di PhaserGame.jsx (array `scene`).
// 3. Ganti `sceneKey` episode terkait di config/episodes.js dari
//    'PlaceholderEpisodeScene' menjadi nama scene baru itu.
// Tidak ada bagian lain yang perlu diubah — EpisodeSelectScene,
// EpisodeIntroScene, dan progressStore semuanya baca dari episodes.js.
export default class PlaceholderEpisodeScene extends BasePlayerScene {
  constructor() {
    super('PlaceholderEpisodeScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 2;
    this.episodeData = getEpisodeById(this.episodeId);
    this.finished = false;
  }

  createBackground(width, height) {
    const hasRealArt =
      Boolean(this.episodeData?.bgKey) &&
      this.textures.exists(this.episodeData.bgKey);

    if (hasRealArt) {
      // --- Aset asli sudah terpasang: pakai LOGIKA PERSIS SAMA seperti
      // Episode1Scene.createBackground() (lihat komentar lengkap di
      // sana) — proporsional, tidak diregangkan/di-tile, lantai selalu
      // sinkron dengan groundY di kedua orientasi. Sengaja disalin
      // di sini (bukan dipanggil lewat helper bersama) supaya kalau
      // episode ini nanti "naik kelas" jadi Scene khusus sendiri
      // (Episode2Scene dst.), tinggal copy-paste utuh tanpa perlu
      // bongkar abstraksi apa pun.
      this._createRealBackground(width, height);
    } else {
      this._createPlaceholderColorBackground(width, height);
    }

    this.finished = false;
    this._createHudLabels(width, height);

    // Episode 7 — Mencari Tempat Aman: titik integrasi NLP paling
    // penting (lihat NLP_INTEGRATION_DESIGN.md §4 tabel Episode 7).
    // Objek telepon SELALU ada di episode ini; auto-open chatbot cuma
    // terjadi kalau backend bilang ada risk_level 'tinggi' dalam 72 jam
    // terakhir (dicek lewat shouldAutoOpenCounseling()).
    if (this.episodeId === 7) {
      this._createEpisode7Phone(width, height);
    }
  }

  // Objek telepon di rumah tokoh. Bisa DITEKAN MANUAL kapan saja
  // (triggerSource 'episode7_phone' tetap dipakai walau dibuka manual,
  // supaya backend tahu konteks pemicunya tetap sama — beda dengan
  // ikon chat umum yang triggerSource-nya 'manual'). Selain itu, saat
  // scene ini pertama kali dimuat, dicek otomatis apakah perlu
  // auto-muncul (should-auto-open) sesuai desain proposal Bab 2.2.6.
  _createEpisode7Phone(width, height) {
    const phoneX = width / 2;
    const phoneY = height - 220;

    const phoneBox = this.add
      .rectangle(phoneX, phoneY, 90, 90, 0x3a2e5c, 0.9)
      .setStrokeStyle(2, 0xffdd57, 0.9)
      .setDepth(1)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(phoneX, phoneY, '📞', { fontFamily: 'monospace', fontSize: '36px' })
      .setOrigin(0.5)
      .setDepth(2);

    this.add
      .text(phoneX, phoneY + 62, 'Telepon', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 14)}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2);

    phoneBox.on('pointerdown', () => {
      window.__nawasenadaraUI?.openChatbot({
        triggerSource: 'episode7_phone',
        episodeId: 7,
      });
    });

    // Auto-open: dicek SEKALI saat scene dimuat. Backend yang menentukan
    // "tinggi dalam 72 jam terakhir dari episode manapun" (lihat
    // desain §4) — frontend di sini cuma nurut hasilnya, tidak
    // menghitung sendiri.
    window.__nawasenadaraNlp
      ?.shouldAutoOpenCounseling()
      .then((res) => {
        if (res?.should_open) {
          window.__nawasenadaraUI?.openChatbot({
            triggerSource: 'episode7_phone',
            episodeId: 7,
          });
        }
      })
      .catch((err) => {
        console.warn('Gagal memeriksa should-auto-open counseling:', err);
      });
  }

  _createRealBackground(width, height) {
    const key = this.episodeData.bgKey;
    const source = this.textures.get(key).getSourceImage();
    const scale = height / source.height;
    const naturalWidth = Math.round(source.width * scale);

    // Pola sama persis dengan Episode1Scene.createBackground() — lihat
    // komentar lengkap di sana. Satu jalur kode untuk semua orientasi:
    // gambar asli apa adanya, sisa celah kanan (kalau ada) diisi tile
    // kecil dari gambar yang sama, bukan diregangkan.
    this.levelWidth = Math.max(naturalWidth, width);

    this.bg = this.add.image(naturalWidth / 2, height / 2, key);
    this.bg.setDisplaySize(naturalWidth, height);
    this.bg.setDepth(0);

    const extraWidth = this.levelWidth - naturalWidth;
    if (extraWidth > 0) {
      const tile = this.add.tileSprite(
        naturalWidth + extraWidth / 2,
        height / 2,
        extraWidth,
        height,
        key,
      );
      tile.setTileScale(scale, scale);
      tile.setDepth(0);
    }
  }

  _createPlaceholderColorBackground(width, height) {
    const color = this.episodeData?.placeholderColor ?? 0x222222;

    // Warna polos dibentang sepanjang seluruh level (bukan cuma satu
    // layar), supaya tetap penuh menutupi layar sepanjang kamera pan
    // mengikuti karakter berjalan (lihat _updatePortraitCamera di
    // BasePlayerScene). Placeholder tidak punya art asli untuk dijaga
    // proporsinya, jadi cukup warna polos selebar this.levelWidth
    // (default LEVEL_WIDTH dari BasePlayerScene karena scene ini tidak
    // menimpanya kalau belum ada art).
    this.add
      .rectangle(
        this.levelWidth / 2,
        height / 2,
        this.levelWidth,
        height,
        color,
      )
      .setDepth(0);
  }

  _createHudLabels(width, height) {
    const bounds = getVisibleBounds(this);

    // Teks informasi ini di-scrollFactor(0) supaya diam di layar (HUD),
    // tidak ikut bergeser mengikuti kamera saat karakter berjalan.
    //
    // wordWrap WAJIB di sini — judul episode panjangnya bervariasi
    // (lihat config/episodes.js), jadi tanpa wordWrap judul yang
    // panjang akan meluber/ke-crop di portrait sempit. Font size juga
    // pakai pxToWorld() (px fisik) supaya konsisten & tidak meluber
    // saat transisi non-fullscreen <-> fullscreen — lihat catatan
    // panjang soal ini di EpisodeIntroScene.create().
    this.add
      .text(
        width / 2,
        60,
        `EPISODE ${this.episodeId} — ${this.episodeData?.title ?? ''}`,
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 19)}px`,
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: bounds.width * 0.85 },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1);

    // Sub-label placeholder cuma ditampilkan kalau memang belum ada art
    // asli — begitu asetnya terpasang, keterangan "menunggu aset final"
    // ini otomatis hilang sendiri tanpa perlu ubah kode apa pun.
    const hasRealArt =
      Boolean(this.episodeData?.bgKey) &&
      this.textures.exists(this.episodeData.bgKey);
    if (!hasRealArt) {
      this.add
        .text(width / 2, 92, '(Background placeholder — menunggu aset final)', {
          fontFamily: 'monospace',
          fontSize: `${pxToWorld(this, 13)}px`,
          color: '#cccccc',
          align: 'center',
          wordWrap: { width: bounds.width * 0.85 },
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1);
    }

    this.add
      .text(width - 20, height - 20, 'Jalan ke kanan untuk lanjut ->', {
        fontFamily: 'monospace',
        fontSize: `${pxToWorld(this, 13)}px`,
        color: '#ffdd57',
        align: 'right',
        wordWrap: { width: bounds.width * 0.5 },
      })
      .setOrigin(1, 1)
      .setScrollFactor(0)
      .setDepth(1);
  }

  onSceneUpdate() {
    if (this.finished) return;
    if (this.player.x > this.levelWidth - LEVEL_EDGE_MARGIN) {
      this.finished = true;
      const isLastEpisode = this.episodeId >= EPISODES.length;
      this.finishEpisode({ episodeId: this.episodeId, isLastEpisode });
    }
  }
}
