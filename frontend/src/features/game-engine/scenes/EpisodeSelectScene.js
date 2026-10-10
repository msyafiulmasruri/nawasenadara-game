import Phaser from 'phaser';
import { startMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { EPISODES } from '../config/episodes';
import { isEpisodeUnlocked } from '../utils/progressStore';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';

export default class EpisodeSelectScene extends Phaser.Scene {
  constructor() {
    super('EpisodeSelectScene');
  }

  create() {
    // WAJIB di awal — lihat dokumentasi di syncGameSizeToOrientation()
    // (utils/visibleBounds.js). Mencegah "bekas" lebar dunia game dari
    // scene episode landscape sebelumnya menyisakan area hitam kosong
    // tidak simetris di layar pilih episode ini.
    const { width, height } = syncGameSizeToOrientation(this);

    // Idempotent: no-op kalau masih jalan dari Menu; menyalakan lagi
    // kalau sebelumnya dihentikan (mis. pemain baru kembali langsung
    // dari gameplay episode ke sini, melewati MenuScene).
    startMenuBGM(getSettings());

    this.bgRect = this.add.rectangle(width / 2, height / 2, width, height, 0x12101c).setDepth(0);

    this.titleText = this.add
      .text(width / 2, 44, 'PILIH EPISODE', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${pxToWorld(this, 28)}px`,
        color: '#ffdd57',
        align: 'center',
        wordWrap: { width: width * 0.9 },
      })
      .setOrigin(0.5)
      .setDepth(1);

    this.backBtn = this.add
      .text(24, 24, '< Menu', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 17)}px`,
        color: '#ffffff',
      })
      .setInteractive({ useHandCursor: true })
      .setDepth(1);
    this.backBtn.on('pointerdown', () => this.scene.start('MenuScene'));

    this._buildGrid();

    // Reposisi grid & tombol kembali setiap viewport berubah ukuran,
    // supaya kotak-kotak episode tidak ke luar area yang benar-benar
    // terlihat di layar portrait sempit (di-debounce ringan supaya
    // tidak dihitung ulang berkali-kali di tengah animasi resize).
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => {
        // Sync ulang di sini juga — menangani fullscreen di-toggle
        // sementara masih di layar pilih episode.
        const { width, height } = syncGameSizeToOrientation(this);
        this.bgRect?.setPosition(width / 2, height / 2);
        this.bgRect?.setSize(width, height);

        this._repositionBackButton();
        this._repositionTitle();
        this._repositionGrid();
      }, 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
    });

    this._repositionBackButton();
    this._repositionTitle();
  }

  // Grid enam episode, ukuran & posisi dihitung dari area yang BENAR-BENAR
  // terlihat (getVisibleBounds) di KEDUA sumbu — bukan cuma horizontal.
  // Sebelumnya gridTop/gridBottom dihitung dari WORLD_HEIGHT (720) mentah,
  // padahal di layar landscape pendek (HP direbahkan, atau browser
  // dengan address bar besar) mode ENVELOP ikut memotong sisi atas/bawah
  // dunia game, bukan cuma kiri/kanan — itulah sebabnya kotak episode
  // baris atas/bawah kadang terpotong/hilang sebagian.
  _buildGrid() {
    const bounds = getVisibleBounds(this);
    // Dua kolom lebih mudah disentuh pada ponsel portrait; landscape
    // memakai tiga kolom. Jumlah baris selalu mengikuti jumlah episode,
    // jadi layout tidak lagi mengasumsikan struktur grid lama.
    const cols = bounds.width < bounds.height * 0.9 ? 2 : 3;
    const rows = Math.ceil(EPISODES.length / cols);

    // Judul ada di y=44 dengan area teks kira-kira 30px tinggi -> beri
    // ruang aman relatif terhadap TOP yang benar-benar terlihat, bukan 0.
    const headerSpace = 76;
    const bottomMargin = 24;
    const gridTop = Math.max(bounds.top + headerSpace, bounds.top + bounds.height * 0.1);
    const gridBottom = bounds.bottom - bottomMargin;
    const availableWidth = bounds.width * 0.92;
    const availableHeight = Math.max(gridBottom - gridTop, bounds.height * 0.5);

    const gap = 16;
    const cellFromWidth = (availableWidth - gap * (cols - 1)) / cols;
    const cellFromHeight = (availableHeight - gap * (rows - 1)) / rows;
    // Kotak PERSEGI: pakai sisi terkecil dari dua batas itu supaya
    // tetap 1:1 dan tetap muat di ruang yang tersedia.
    const cellSize = Math.min(cellFromWidth, cellFromHeight);

    const gridWidth = cellSize * cols + gap * (cols - 1);
    const gridHeight = cellSize * rows + gap * (rows - 1);
    const startX = bounds.centerX - gridWidth / 2 + cellSize / 2;
    const startY = gridTop + (availableHeight - gridHeight) / 2 + cellSize / 2;

    this._cells = [];

    EPISODES.forEach((ep, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cellSize + gap);
      const y = startY + row * (cellSize + gap);
      const unlocked = isEpisodeUnlocked(ep.id);

      const box = this.add
        .rectangle(x, y, cellSize, cellSize, unlocked ? 0x2a2540 : 0x1a1a24, 1)
        .setStrokeStyle(2, unlocked ? 0xffdd57 : 0x3a3a44, unlocked ? 0.9 : 0.5)
        .setDepth(1);

      const numberText = this.add
        .text(x, y - cellSize * 0.18, `${ep.id}`, {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${Math.round(cellSize * 0.32)}px`,
          color: unlocked ? '#ffdd57' : '#555566',
        })
        .setOrigin(0.5)
        .setDepth(2);

      const label = unlocked ? ep.title : '🔒 Terkunci';
      const labelText = this.add
        .text(x, y + cellSize * 0.28, label, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${Math.round(cellSize * 0.1)}px`,
          color: unlocked ? '#ffffff' : '#777788',
          align: 'center',
          wordWrap: { width: cellSize * 0.85 },
        })
        .setOrigin(0.5)
        .setDepth(2);

      if (unlocked) {
        box.setInteractive({ useHandCursor: true });
        const goToIntro = () => this.scene.start('EpisodeIntroScene', { episodeId: ep.id });
        box.on('pointerdown', goToIntro);
        box.on('pointerover', () => box.setFillStyle(0x3a3560, 1));
        box.on('pointerout', () => box.setFillStyle(0x2a2540, 1));
      }

      this._cells.push({ box, numberText, labelText, episodeId: ep.id });
    });
  }

  _repositionGrid() {
    // Cara paling aman & sederhana: hapus kotak lama, bangun ulang
    // dengan ukuran/posisi baru sesuai viewport saat ini.
    this._cells?.forEach(({ box, numberText, labelText }) => {
      box.destroy();
      numberText.destroy();
      labelText.destroy();
    });
    this._buildGrid();
  }

  _repositionBackButton() {
    const bounds = getVisibleBounds(this);
    this.backBtn?.setFontSize(pxToWorld(this, 17));
    this.backBtn?.setPosition(bounds.left + 24, bounds.top + 24);
  }

  _repositionTitle() {
    const bounds = getVisibleBounds(this);
    this.titleText?.setFontSize(pxToWorld(this, 28));
    this.titleText?.setWordWrapWidth(bounds.width * 0.9);
    this.titleText?.setPosition(bounds.centerX, bounds.top + 44);
  }
}
