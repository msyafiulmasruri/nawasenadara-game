import Phaser from 'phaser';
import { startMenuBGM, stopMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { EPISODES } from '../config/episodes';
import { isEpisodeUnlocked, isEpisodeCompleted } from '../utils/progressStore';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';

export default class EpisodeSelectScene extends Phaser.Scene {
  constructor() {
    super('EpisodeSelectScene');
    this._cells = [];
    this._miniBossItems = [];
    this._lockedToast = null;
  }

  create() {
    // WAJIB di awal - lihat dokumentasi di syncGameSizeToOrientation()
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
      .text(width / 2, 40, 'PILIH EPISODE', {
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
    this._fsTimeout1 = null;
    this._fsTimeout2 = null;
    const applySelectReflow = () => {
      if (!this.sys || !this.sys.settings?.active || !this.scene) return;
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
      if (this._fsTimeout1) clearTimeout(this._fsTimeout1);
      if (this._fsTimeout2) clearTimeout(this._fsTimeout2);
      this._fsTimeout1 = setTimeout(applySelectReflow, 120);
      this._fsTimeout2 = setTimeout(applySelectReflow, 300);
    };
    this.scale.on('resize', this._onResize);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      if (this._fsTimeout1) clearTimeout(this._fsTimeout1);
      if (this._fsTimeout2) clearTimeout(this._fsTimeout2);
      this.scale.off('resize', this._onResize);
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
      this._miniBossItems?.forEach((obj) => obj?.destroy?.());
      this._miniBossItems = [];
      if (this._lockedToast) this._lockedToast.destroy();
    });

    this._repositionBackButton();
    this._repositionTitle();
  }

  // Grid enam episode + section khusus Mini Boss, ukuran & posisi dihitung
  // dari area yang BENAR-BENAR terlihat (getVisibleBounds) di KEDUA sumbu.
  _buildGrid() {
    const bounds = getVisibleBounds(this);
    // Dua kolom pada ponsel portrait; tiga kolom pada landscape.
    const isPort = bounds.width < bounds.height * 0.9;
    const cols = isPort ? 2 : 3;
    const rows = Math.ceil(EPISODES.length / cols);

    const headerSpace = 68;
    const bottomMargin = 16;
    const gridTop = Math.max(bounds.top + headerSpace, bounds.top + bounds.height * 0.08);
    const gridBottom = bounds.bottom - bottomMargin;
    const availableWidth = bounds.width * 0.92;
    const totalAvailableH = Math.max(gridBottom - gridTop, 360);

    // Alokasi proporsional: Story Episodes di atas, Mini Boss Card di bawah
    const sectionGap = isPort ? 10 : 14;
    const miniBossCardH = Math.max(76, Math.min(Math.round(totalAvailableH * 0.22), 112));
    const storyAvailableH = totalAvailableH - miniBossCardH - sectionGap;

    const gap = isPort ? 10 : 16;
    const maxCardW = (availableWidth - gap * (cols - 1)) / cols;
    const maxCardH = (storyAvailableH - gap * (rows - 1)) / rows;

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

    const totalContentH = gridHeight + sectionGap + miniBossCardH;
    const startY = gridTop + Math.max(0, (totalAvailableH - totalContentH) / 2) + cardH / 2;

    this._cells = [];
    this._miniBossItems = [];

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

        // COVER + Mask: mengisi penuh kartu tanpa ruang kosong, tanpa distorsi
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
          fontSize: `${Math.max(15, Math.round(cardH * 0.17))}px`,
          color: unlocked ? '#ffdd57' : '#94a3b8',
          backgroundColor: unlocked ? '#0f0f22d9' : '#090914cc',
          padding: { x: 9, y: 3 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      cellItems.push(badge);

      // Judul episode (tampil baik saat terbuka maupun terkunci)
      const labelText = this.add
        .text(x, y + cardH * 0.18, ep.title, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${Math.max(13, Math.round(cardH * 0.125))}px`,
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
          .text(x, y + cardH * 0.37, 'TERBUKA - KLIK UNTUK MAIN', {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${Math.max(10, Math.round(cardH * 0.085))}px`,
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

    // ==============================================================
    // SEKSI KHUSUS: MINI BOSS (Terbuka setelah menyelesaikan Episode 6)
    // ==============================================================
    const miniBossY = startY + (gridHeight - cardH / 2) + sectionGap + miniBossCardH / 2;
    const miniBossW = gridWidth;
    const isBossUnlocked = isEpisodeCompleted(6);
    const mbItems = [];

    // Base card rectangle
    const mbBox = this.add
      .rectangle(
        bounds.centerX,
        miniBossY,
        miniBossW,
        miniBossCardH,
        isBossUnlocked ? 0x161226 : 0x0c0b14,
        1,
      )
      .setStrokeStyle(
        isBossUnlocked ? 2.5 : 1.5,
        isBossUnlocked ? 0xa855f7 : 0x333344,
        isBossUnlocked ? 0.95 : 0.45,
      )
      .setDepth(1);
    mbItems.push(mbBox);

    // Rounded mask
    const mbMaskShape = this.make.graphics();
    mbMaskShape.fillStyle(0xffffff);
    mbMaskShape.fillRoundedRect(
      bounds.centerX - miniBossW / 2 + 1,
      miniBossY - miniBossCardH / 2 + 1,
      miniBossW - 2,
      miniBossCardH - 2,
      8,
    );
    const mbMask = mbMaskShape.createGeometryMask();
    mbItems.push(mbMaskShape);

    // Background road runner jika tersedia
    const bgKey = this.textures.exists('runner-road')
      ? 'runner-road'
      : null;

    if (bgKey) {
      const roadImg = this.add
        .image(bounds.centerX, miniBossY, bgKey)
        .setDepth(1.2)
        .setMask(mbMask);
      const sX = miniBossW / roadImg.width;
      const sY = miniBossCardH / roadImg.height;
      roadImg.setScale(Math.max(sX, sY));
      roadImg.setAlpha(isBossUnlocked ? 0.35 : 0.08);
      mbItems.push(roadImg);
    }

    // Vignette overlay
    const mbOverlay = this.add
      .rectangle(
        bounds.centerX,
        miniBossY,
        miniBossW,
        miniBossCardH,
        isBossUnlocked ? 0x100b1d : 0x070712,
        isBossUnlocked ? 0.78 : 0.88,
      )
      .setDepth(1.4)
      .setMask(mbMask);
    mbItems.push(mbOverlay);

    // Thumbnail Icon Box (Kiri)
    const thumbBoxSize = Math.max(48, Math.round(miniBossCardH * 0.76));
    const thumbBoxX = bounds.centerX - miniBossW / 2 + thumbBoxSize / 2 + 14;
    const thumbBoxBg = this.add
      .rectangle(
        thumbBoxX,
        miniBossY,
        thumbBoxSize,
        thumbBoxSize,
        isBossUnlocked ? 0x22153b : 0x161722,
        0.95,
      )
      .setStrokeStyle(1.5, isBossUnlocked ? 0xf43f5e : 0x475569, isBossUnlocked ? 0.8 : 0.4)
      .setDepth(2);
    mbItems.push(thumbBoxBg);

    const questionIcon = this.add
      .text(thumbBoxX, miniBossY, '?', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${Math.round(thumbBoxSize * 0.58)}px`,
        fontStyle: '700',
        color: isBossUnlocked ? '#f8fafc' : '#64748b',
      })
      .setOrigin(0.5)
      .setDepth(2.5);
    mbItems.push(questionIcon);

    // Text Content (Tengah)
    const textLeft = thumbBoxX + thumbBoxSize / 2 + 16;
    const maxTextW = isPort
      ? miniBossW - thumbBoxSize - 40
      : miniBossW - thumbBoxSize - 230;

    // Badge kategori
    const mbBadge = this.add
      .text(
        textLeft,
        miniBossY - miniBossCardH * 0.28,
        isBossUnlocked ? 'EPISODE SPESIAL - TANTANGAN AKHIR' : 'EPISODE SPESIAL',
        {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${Math.max(12, Math.round(miniBossCardH * 0.15))}px`,
          color: isBossUnlocked ? '#ffdd57' : '#94a3b8',
          backgroundColor: isBossUnlocked ? '#2a163dd4' : '#141422cc',
          padding: { x: 8, y: 2 },
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(3);
    mbItems.push(mbBadge);

    // Judul: Mini Boss
    const mbTitle = this.add
      .text(textLeft, miniBossY - miniBossCardH * 0.02, 'Mini Boss - Sprint of Truth', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${Math.max(14, Math.round(miniBossCardH * 0.2))}px`,
        fontStyle: '700',
        color: isBossUnlocked ? '#ffffff' : '#94a3b8',
      })
      .setOrigin(0, 0.5)
      .setDepth(3);
    mbItems.push(mbTitle);

    // Deskripsi singkat
    const mbDesc = this.add
      .text(
        textLeft,
        miniBossY + miniBossCardH * 0.26,
        isBossUnlocked
          ? 'Lari, hindari rintangan bayangan, kumpulkan serpihan fakta, dan kalahkan Mini Boss!'
          : 'Selesaikan Episode 6 untuk membuka babak konfrontasi Mini Boss.',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${Math.max(10, Math.round(miniBossCardH * 0.125))}px`,
          color: isBossUnlocked ? '#cbd5e1' : '#64748b',
          wordWrap: { width: Math.max(160, maxTextW) },
        },
      )
      .setOrigin(0, 0.5)
      .setDepth(3);
    mbItems.push(mbDesc);

    // Sisi Kanan: Tombol Aksi (Landscape) atau Badge Status
    if (!isPort) {
      const rightX = bounds.centerX + miniBossW / 2 - 105;
      if (isBossUnlocked) {
        const playBtn = this.add
          .rectangle(rightX, miniBossY - miniBossCardH * 0.04, 160, Math.round(miniBossCardH * 0.44), 0x064e3b, 1)
          .setStrokeStyle(1.8, 0x10b981)
          .setDepth(3);
        mbItems.push(playBtn);

        const playText = this.add
          .text(rightX, miniBossY - miniBossCardH * 0.04, 'TANTANG BOSS >', {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${Math.max(12, Math.round(miniBossCardH * 0.16))}px`,
            fontStyle: '700',
            color: '#ffffff',
          })
          .setOrigin(0.5)
          .setDepth(4);
        mbItems.push(playText);

        const statusTag = this.add
          .text(rightX, miniBossY + miniBossCardH * 0.3, 'TERBUKA', {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${Math.max(10, Math.round(miniBossCardH * 0.1))}px`,
            fontStyle: '600',
            color: '#4ade80',
          })
          .setOrigin(0.5)
          .setDepth(4);
        mbItems.push(statusTag);
      } else {
        const lockGfx = this.add.graphics().setDepth(3);
        const r = Math.max(9, Math.round(miniBossCardH * 0.1));
        const lx = rightX;
        const ly = miniBossY - r * 0.4;
        lockGfx.lineStyle(2.2, 0x94a3b8, 0.85);
        lockGfx.strokeCircle(lx, ly - r * 0.65, r * 0.55);
        lockGfx.fillStyle(0x1e293b, 0.95);
        lockGfx.fillRoundedRect(lx - r * 0.85, ly - r * 0.2, r * 1.7, r * 1.35, 3);
        lockGfx.strokeRoundedRect(lx - r * 0.85, ly - r * 0.2, r * 1.7, r * 1.35, 3);
        mbItems.push(lockGfx);

        const lockLabel = this.add
          .text(rightX, miniBossY + r * 1.5, 'TERKUNCI', {
            fontFamily: '"Jersey 15", monospace',
            fontSize: `${Math.max(12, Math.round(miniBossCardH * 0.14))}px`,
            color: '#64748b',
          })
          .setOrigin(0.5)
          .setDepth(3);
        mbItems.push(lockLabel);
      }
    }

    // Interaksi Tombol / Kartu
    if (isBossUnlocked) {
      mbBox.setInteractive({ useHandCursor: true });
      const startMiniBoss = () => {
        stopMenuBGM();
        this.scene.start('RunnerScene', {
          episodeId: 6,
          isLastEpisode: true,
          mode: 'runner',
        });
      };
      mbBox.on('pointerdown', startMiniBoss);
      mbBox.on('pointerover', () => {
        mbBox.setStrokeStyle(3, 0xffdd57, 1);
        mbBox.setFillStyle(0x241d3d, 1);
      });
      mbBox.on('pointerout', () => {
        mbBox.setStrokeStyle(2.5, 0xa855f7, 0.95);
        mbBox.setFillStyle(0x161226, 1);
      });
    } else {
      mbBox.setInteractive({ useHandCursor: true });
      mbBox.on('pointerdown', () => {
        this.tweens.killTweensOf(mbBox);
        this.tweens.add({
          targets: mbBox,
          x: bounds.centerX + 5,
          duration: 40,
          yoyo: true,
          repeat: 3,
          onComplete: () => {
            mbBox.setPosition(bounds.centerX, miniBossY);
          },
        });

        if (this._lockedToast) {
          this._lockedToast.destroy();
          this._lockedToast = null;
        }
        const toast = this.add
          .text(
            bounds.centerX,
            miniBossY,
            'Selesaikan Episode 6 terlebih dahulu untuk membuka Mini Boss!',
            {
              fontFamily: '"Pixelify Sans", monospace',
              fontSize: '13px',
              color: '#fca5a5',
              backgroundColor: '#1e1b4bee',
              padding: { x: 14, y: 7 },
              align: 'center',
            },
          )
          .setOrigin(0.5)
          .setDepth(10);
        this._lockedToast = toast;
        mbItems.push(toast);

        this.time.delayedCall(1900, () => {
          if (toast?.active) {
            this.tweens.add({
              targets: toast,
              alpha: 0,
              duration: 250,
              onComplete: () => toast.destroy(),
            });
          }
        });
      });
    }

    this._miniBossItems = mbItems;
  }

  _repositionGrid() {
    this._cells?.forEach((cell) => {
      cell.items?.forEach((obj) => obj?.destroy?.());
    });
    this._cells = [];
    this._miniBossItems?.forEach((obj) => obj?.destroy?.());
    this._miniBossItems = [];
    if (this._lockedToast) {
      this._lockedToast.destroy();
      this._lockedToast = null;
    }
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
    this.titleText?.setPosition(bounds.centerX, bounds.top + 40);
  }
}
