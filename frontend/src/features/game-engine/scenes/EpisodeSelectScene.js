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

    this.bgRect = this.add.rectangle(0, 0, width, height, 0x12101c).setOrigin(0, 0).setDepth(0);

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
    const applySelectReflow = () => {
      if (!this.scene?.isActive()) return;
      const { width: w, height: h } = syncGameSizeToOrientation(this);
      this.bgRect?.setPosition(0, 0).setSize(w, h).setDisplaySize(w, h).updateDisplayOrigin();

      this._repositionBackButton();
      this._repositionTitle();
      this._repositionGrid();
    };
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(applySelectReflow, 80);
    };
    this._onFullscreenChange = () => {
      applySelectReflow();
      setTimeout(applySelectReflow, 120);
      setTimeout(applySelectReflow, 300);
    };
    this.scale.on('resize', this._onResize);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
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
    // Dua kolom pada ponsel portrait; tiga kolom pada landscape.
    const cols = bounds.width < bounds.height * 0.9 ? 2 : 3;
    const rows = Math.ceil(EPISODES.length / cols);

    const headerSpace = 76;
    const bottomMargin = 24;
    const gridTop = Math.max(bounds.top + headerSpace, bounds.top + bounds.height * 0.1);
    const gridBottom = bounds.bottom - bottomMargin;
    const availableWidth = bounds.width * 0.92;
    const availableHeight = Math.max(gridBottom - gridTop, bounds.height * 0.5);

    const gap = 18;
    const maxCardW = (availableWidth - gap * (cols - 1)) / cols;
    const maxCardH = (availableHeight - gap * (rows - 1)) / rows;

    // Proporsi landscape 16:10 (~1.55) yang pas dengan aspect ratio cutscene game (16:9)
    let cardW = maxCardW;
    let cardH = cardW / 1.55;
    if (cardH > maxCardH) {
      cardH = maxCardH;
      cardW = cardH * 1.55;
    }

    const gridWidth = cardW * cols + gap * (cols - 1);
    const gridHeight = cardH * rows + gap * (rows - 1);
    const startX = bounds.centerX - gridWidth / 2 + cardW / 2;
    const startY = gridTop + (availableHeight - gridHeight) / 2 + cardH / 2;

    this._cells = [];

    EPISODES.forEach((ep, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const unlocked = isEpisodeUnlocked(ep.id);
      const cellItems = [];

      // Base card rectangle
      const box = this.add
        .rectangle(x, y, cardW, cardH, unlocked ? 0x161426 : 0x0c0b14, 1)
        .setStrokeStyle(2, unlocked ? 0xffdd57 : 0x333344, unlocked ? 0.9 : 0.4)
        .setDepth(1);
      cellItems.push(box);

      // Mask sudut membulat untuk thumbnail agar pas di dalam kartu
      const maskShape = this.make.graphics();
      maskShape.fillStyle(0xffffff);
      maskShape.fillRoundedRect(x - cardW / 2 + 1, y - cardH / 2 + 1, cardW - 2, cardH - 2, 8);
      const cardMask = maskShape.createGeometryMask();
      cellItems.push(maskShape);

      // Background cutscene / thumbnail (cover penuh dalam kartu dengan mask)
      const thumbKey =
        (ep.cutsceneThumbnail && this.textures.exists(ep.cutsceneThumbnail) && ep.cutsceneThumbnail) ||
        (ep.bgKey && this.textures.exists(ep.bgKey) && ep.bgKey) ||
        null;

      let bgImg = null;
      if (thumbKey) {
        bgImg = this.add.image(x, y, thumbKey).setDepth(1.5);

        // COVER + Mask: mengisi penuh kartu tanpa ruang kosong, tanpa gepeng/distorsi
        const scaleX = (cardW - 2) / bgImg.width;
        const scaleY = (cardH - 2) / bgImg.height;
        const coverScale = Math.max(scaleX, scaleY);
        bgImg.setScale(coverScale);
        bgImg.setMask(cardMask);

        if (!unlocked) {
          bgImg.setAlpha(0.28).setTint(0x64748b);
        } else {
          bgImg.setAlpha(0.92);
        }
        cellItems.push(bgImg);
      }

      // Dark overlay pada bagian bawah kartu agar teks kontras dan tajam
      const bottomOverlay = this.add
        .rectangle(
          x,
          y + cardH * 0.23,
          cardW - 2,
          cardH * 0.54,
          0x070712,
          unlocked ? 0.78 : 0.86,
        )
        .setDepth(2);
      bottomOverlay.setMask(cardMask);
      cellItems.push(bottomOverlay);

      // Episode badge di bagian atas kartu
      const badge = this.add
        .text(x, y - cardH * 0.3, `EPISODE ${ep.id}`, {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${Math.max(16, Math.round(cardH * 0.18))}px`,
          color: unlocked ? '#ffdd57' : '#94a3b8',
          backgroundColor: unlocked ? '#0f0f22d9' : '#090914cc',
          padding: { x: 10, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      cellItems.push(badge);

      // Judul episode (tampil baik saat terbuka maupun terkunci)
      const labelText = this.add
        .text(x, y + cardH * 0.18, ep.title, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${Math.max(14, Math.round(cardH * 0.13))}px`,
          fontStyle: '700',
          color: unlocked ? '#ffffff' : '#94a3b8',
          align: 'center',
          wordWrap: { width: cardW * 0.9 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      cellItems.push(labelText);

      if (unlocked) {
        const statusLabel = this.add
          .text(x, y + cardH * 0.37, 'TERBUKA — KLIK UNTUK MAIN', {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${Math.max(11, Math.round(cardH * 0.088))}px`,
            fontStyle: '600',
            color: '#4ade80',
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(3);
        cellItems.push(statusLabel);

        box.setInteractive({ useHandCursor: true });
        const goToIntro = () => this.scene.start('EpisodeIntroScene', { episodeId: ep.id });
        box.on('pointerdown', goToIntro);
        box.on('pointerover', () => {
          box.setStrokeStyle(3, 0xffea79, 1);
          box.setFillStyle(0x28233f, 1);
          if (bgImg) bgImg.setAlpha(1.0);
        });
        box.on('pointerout', () => {
          box.setStrokeStyle(2, 0xffdd57, 0.9);
          box.setFillStyle(0x161426, 1);
          if (bgImg) bgImg.setAlpha(0.92);
        });
      } else {
        // Ikon gembok vektor bersih (tanpa emoji) + label TERKUNCI
        const lockGfx = this.add.graphics().setDepth(3);
        const r = Math.max(8, Math.round(cardH * 0.065));
        const lx = x;
        const ly = y - cardH * 0.04;
        lockGfx.lineStyle(2.2, 0x94a3b8, 0.85);
        lockGfx.strokeCircle(lx, ly - r * 0.65, r * 0.55);
        lockGfx.fillStyle(0x1e293b, 0.95);
        lockGfx.fillRoundedRect(lx - r * 0.85, ly - r * 0.2, r * 1.7, r * 1.35, 3);
        lockGfx.strokeRoundedRect(lx - r * 0.85, ly - r * 0.2, r * 1.7, r * 1.35, 3);
        cellItems.push(lockGfx);

        const lockLabel = this.add
          .text(x, y + cardH * 0.37, 'TERKUNCI', {
            fontFamily: '"Jersey 15", monospace',
            fontSize: `${Math.max(13, Math.round(cardH * 0.11))}px`,
            color: '#64748b',
            align: 'center',
          })
          .setOrigin(0.5)
          .setDepth(3);
        cellItems.push(lockLabel);
      }

      this._cells.push({ items: cellItems, episodeId: ep.id });
    });
  }

  _repositionGrid() {
    this._cells?.forEach((cell) => {
      cell.items?.forEach((obj) => obj?.destroy?.());
    });
    this._cells = [];
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
