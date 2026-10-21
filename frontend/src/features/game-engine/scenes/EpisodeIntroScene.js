import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { stopMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { getEpisodeById } from '../config/episodes';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld, isCompactLandscape } from '../utils/visibleBounds';

export default class EpisodeIntroScene extends Phaser.Scene {
  constructor() {
    super('EpisodeIntroScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.episodeData = getEpisodeById(this.episodeId);
    this._startingEpisode = false;
    this._typewriterDone = false;
    this._typewriterIndex = 0;
    this._fallbackStartTimer = null;
  }

  create() {
    this._startingEpisode = false;
    this._fallbackStartTimer = null;

    // WAJIB dipanggil di awal secara sinkron supaya kanvas langsung
    // dirender pada frame pertama tanpa jeda layar kosong saat transisi
    // dari GameIntroGuideScene maupun EpisodeSelectScene.
    const { width, height } = syncGameSizeToOrientation(this);
    this.cameras.main.fadeEffect?.reset?.();
    this.cameras.main.fadeIn(400, 5, 5, 15);

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

    this.bgRect = this.add
      .rectangle(0, 0, width, height, 0x05050f)
      .setOrigin(0, 0)
      .setDepth(0)
      .setInteractive({ useHandCursor: true });

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
    const compact0 = isCompactLandscape(this);

    const episodeLabelFont = compact0 ? 28 : pxToWorld(this, 46);
    const episodeTitleFont = compact0 ? 32 : pxToWorld(this, 36);
    const episodeDescFont = compact0 ? 19 : pxToWorld(this, 34);
    const promptFont = compact0 ? 16 : pxToWorld(this, 24);

    const baseY0 = compact0 ? bounds0.top + bounds0.height * 0.17 : height * 0.28;
    const titleY0 = compact0 ? bounds0.top + bounds0.height * 0.29 : height * 0.28 + 48;
    const descY0 = compact0 ? bounds0.top + bounds0.height * 0.55 : height * 0.54;
    const promptY0 = compact0 ? bounds0.top + bounds0.height * 0.87 : height * 0.85;

    this.episodeLabel = this.add
      .text(width / 2, baseY0, `EPISODE ${this.episodeId}`, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${episodeLabelFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.episodeTitle = this.add
      .text(width / 2, titleY0, this.episodeData?.title ?? '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${episodeTitleFont}px`,
        fontStyle: '600',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: Math.min(bounds0.width * 0.86, compact0 ? 720 : bounds0.width * 0.88) },
        lineSpacing: compact0 ? 4 : 0,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.episodeDesc = this.add
      .text(width / 2, descY0, '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${episodeDescFont}px`,
        color: '#f1f5f9',
        align: 'center',
        wordWrap: { width: Math.min(bounds0.width * 0.84, compact0 ? 700 : bounds0.width * 0.88) },
        lineSpacing: compact0 ? 8 : 12,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.promptText = this.add
      .text(width / 2, promptY0, 'TEKAN UNTUK LEWATI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        fontStyle: '700',
        color: '#ffdd57',
        align: 'center',
        wordWrap: { width: bounds0.width * 0.85 },
      })
      .setOrigin(0.5)
      .setDepth(3)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: this.promptText,
      alpha: 0.25,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    const fullText = this.episodeData?.description ?? '';
    this._typewriterIndex = 0;
    this._typewriterDone = fullText.length === 0;
    this.promptText.setText(fullText.length === 0 ? 'TEKAN UNTUK MULAI' : 'TEKAN UNTUK LEWATI');

    const revealNextChar = () => {
      if (this._typewriterDone) return;
      this._typewriterIndex += 1;
      this.episodeDesc.setText(fullText.slice(0, this._typewriterIndex));

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
      delay: 24,
      loop: true,
      callback: revealNextChar,
    });

    const startEpisode = () => {
      if (this._startingEpisode) return;
      this._startingEpisode = true;
      this.promptText?.setText('MEMUAT EPISODE...');
      const sceneKey = this.episodeData?.sceneKey ?? 'Episode1Scene';

      let transitioned = false;
      const proceedToScene = async () => {
        if (transitioned) return;
        transitioned = true;
        if (this._fallbackStartTimer) {
          clearTimeout(this._fallbackStartTimer);
          this._fallbackStartTimer = null;
        }
        const progressReady = window.__nawasenadaraProgress?.ready;
        if (progressReady) {
          try {
            await Promise.race([
              progressReady,
              new Promise((resolve) => setTimeout(resolve, 1200)),
            ]);
          } catch {
            // Abaikan error network agar tidak pernah menahan mulai episode
          }
        }
        if (this.scene) {
          this.scene.start(sceneKey, { episodeId: this.episodeId });
        }
      };

      // PENTING: reset fadeEffect terlebih dahulu supaya jika fadeIn di awal create()
      // masih berjalan ketika pemain klik cepat, fadeOut tidak diabaikan oleh Phaser!
      this.cameras.main.fadeEffect?.reset?.();
      this.cameras.main.once('camerafadeoutcomplete', proceedToScene);
      this.cameras.main.fadeOut(320, 5, 5, 15);

      // Jaring pengaman: pastikan transisi selalu jalan walau event kamera terlewat
      this._fallbackStartTimer = setTimeout(proceedToScene, 400);
    };

    let lastAdvanceAt = 0;
    const handleAdvance = () => {
      const now = Date.now();
      if (now - lastAdvanceAt < 80) return;
      lastAdvanceAt = now;

      if (!this._typewriterDone) {
        this._finishTypewriter();
        return;
      }
      startEpisode();
    };

    this.promptText.on('pointerdown', handleAdvance);
    this.bgRect.on('pointerdown', handleAdvance);
    this.input.on('pointerdown', handleAdvance);
    this.input.keyboard?.on('keydown-SPACE', handleAdvance);
    this.input.keyboard?.on('keydown-ENTER', handleAdvance);

    // Fallback native DOM listener supaya bila fokus canvas sempat teralihkan oleh
    // overlay DOM sebelumnya, klik atau tekan Space/Enter tetap tertangkap 100%.
    const createdAt = Date.now();
    this._onWindowPointerDown = () => {
      if (Date.now() - createdAt < 140) return;
      handleAdvance();
    };
    this._onWindowKeyDown = (e) => {
      if (Date.now() - createdAt < 140 || e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        handleAdvance();
      }
    };
    window.addEventListener('pointerdown', this._onWindowPointerDown);
    window.addEventListener('keydown', this._onWindowKeyDown);

    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 80);
    };
    this._onFullscreenChange = () => {
      this._reposition();
      setTimeout(() => this._reposition(), 120);
      setTimeout(() => this._reposition(), 300);
    };
    this.scale.on('resize', this._onResize);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);

    const cleanupIntro = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      if (this._fallbackStartTimer) {
        clearTimeout(this._fallbackStartTimer);
        this._fallbackStartTimer = null;
      }
      this.scale?.off('resize', this._onResize);
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
      this._typewriterTimer?.remove();
      if (this._onWindowPointerDown) {
        window.removeEventListener('pointerdown', this._onWindowPointerDown);
        this._onWindowPointerDown = null;
      }
      if (this._onWindowKeyDown) {
        window.removeEventListener('keydown', this._onWindowKeyDown);
        this._onWindowKeyDown = null;
      }
    };
    this.events.once('shutdown', cleanupIntro);
    this.events.once('destroy', cleanupIntro);
  }

  _finishTypewriter() {
    if (this._typewriterDone) return;
    this._typewriterDone = true;
    this._typewriterTimer?.remove();
    this.episodeDesc?.setText(this.episodeData?.description ?? '');
    this.promptText?.setText('TEKAN UNTUK MULAI');
  }

  _isSceneValid() {
    const status = this.sys?.settings?.status;
    return Boolean(
      this.sys &&
      this.sys.game &&
      status !== undefined &&
      status !== Phaser.Scenes.SHUTDOWN &&
      status !== Phaser.Scenes.DESTROYED
    );
  }

  _reposition() {
    if (!this._isSceneValid()) return;
    const { width, height } = syncGameSizeToOrientation(this);
    this.bgRect?.setPosition(0, 0).setSize(width, height).setDisplaySize(width, height).updateDisplayOrigin();

    const bounds = getVisibleBounds(this);
    const compact = isCompactLandscape(this);

    const episodeLabelFont = compact ? 28 : pxToWorld(this, 46);
    const episodeTitleFont = compact ? 32 : pxToWorld(this, 36);
    const episodeDescFont = compact ? 19 : pxToWorld(this, 34);
    const promptFont = compact ? 16 : pxToWorld(this, 22);

    const baseY = compact ? bounds.top + bounds.height * 0.17 : bounds.top + bounds.height * 0.28;
    const titleY = compact ? bounds.top + bounds.height * 0.29 : baseY + 48;
    const descY = compact ? bounds.top + bounds.height * 0.55 : bounds.top + bounds.height * 0.54;
    const promptY = compact ? bounds.top + bounds.height * 0.87 : bounds.top + bounds.height * 0.85;

    this.episodeLabel
      ?.setFontSize(episodeLabelFont)
      .setPosition(bounds.centerX, baseY);

    this.episodeTitle
      ?.setFontSize(episodeTitleFont)
      .setPosition(bounds.centerX, titleY)
      .setWordWrapWidth(Math.min(bounds.width * 0.86, compact ? 720 : bounds.width * 0.88))
      .setLineSpacing(compact ? 4 : 0);

    this.episodeDesc
      ?.setFontSize(episodeDescFont)
      .setPosition(bounds.centerX, descY)
      .setWordWrapWidth(Math.min(bounds.width * 0.84, compact ? 700 : bounds.width * 0.88))
      .setLineSpacing(compact ? 8 : 12);

    this.promptText
      ?.setFontSize(promptFont)
      .setPosition(bounds.centerX, promptY)
      .setWordWrapWidth(bounds.width * 0.88);
  }
}
