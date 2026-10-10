import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getSettings } from '../utils/settingsStore';
import { computeEnding } from '../utils/emotionEnding';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';
import { getCompletedEpisodes, completeEpisode } from '../utils/progressStore';

const EMOTION_META = {
  aman: { label: 'Aman & Asertif', color: 0x22c55e, hex: '#22c55e' },
  netral: { label: 'Netral & Menghindar', color: 0x38bdf8, hex: '#38bdf8' },
  takut: { label: 'Takut & Cemas', color: 0xf59e0b, hex: '#f59e0b' },
  sedih: { label: 'Sedih & Menahan Diri', color: 0xa855f7, hex: '#a855f7' },
  menyinggung: { label: 'Sinis & Menyinggung', color: 0xf97316, hex: '#f97316' },
  marah: { label: 'Marah & Konfrontatif', color: 0xef4444, hex: '#ef4444' },
};

export default class EpisodeEndingScene extends Phaser.Scene {
  constructor() {
    super('EpisodeEndingScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.isLastEpisode = Boolean(data?.isLastEpisode);
    this.choices = Array.isArray(data?.choices) ? data.choices : [];

    const { tally, dominant, avgScore, endingKey, ending } = computeEnding(this.episodeId, this.choices);
    this.tally = tally;
    this.dominant = dominant;
    this.avgScore = avgScore;
    this.endingKey = endingKey;
    this.ending = ending;

    this.currentPhase = 'mood'; // 'mood' -> 'ending'
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

    // Bintang berkedip
    for (let i = 0; i < 70; i += 1) {
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

    // Bangun kedua phase
    this._buildMoodPhase();
    this._buildEndingPhase();

    // Tampilkan phase mood terlebih dahulu
    this._showMoodPhase();

    // Input handlers
    this._handleAdvance = () => {
      if (!this._readyToAdvance || this._advancing) return;

      if (this.currentPhase === 'mood') {
        this._transitionToEndingPhase();
      } else if (this.currentPhase === 'ending') {
        this._advancing = true;
        this._teardownInput?.();
        this._goToNextStep();
      }
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

  // ==============================================================
  // FASE 1: TINGKATAN EMOSI KARAKTER
  // ==============================================================
  _buildMoodPhase() {
    const { width, height } = syncGameSizeToOrientation(this);
    const bounds = getVisibleBounds(this);

    this.moodContainer = this.add.container(0, 0).setDepth(2);

    const titleFont = pxToWorld(this, 28);
    const subFont = pxToWorld(this, 20);
    const labelFont = pxToWorld(this, 20);
    const promptFont = pxToWorld(this, 22);

    this.moodTitle = this.add
      .text(width / 2, height * 0.14, 'TINGKATAN EMOSI KARAKTER', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${titleFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5);
    this.moodContainer.add(this.moodTitle);

    this.moodSubtitle = this.add
      .text(
        width / 2,
        height * 0.14 + 36,
        `Spektrum emosi yang terbentuk dari pilihanmu di Episode ${this.episodeId}:`,
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${subFont}px`,
          color: '#cbd5e1',
          align: 'center',
          wordWrap: { width: bounds.width * 0.85 },
        },
      )
      .setOrigin(0.5, 0);
    this.moodContainer.add(this.moodSubtitle);

    // Hitung total respons dan distribusi emosi
    const totalResponses = Object.values(this.tally).reduce((a, b) => a + b, 0);
    const emotionsToShow = ['aman', 'netral', 'takut', 'sedih', 'marah', 'menyinggung']
      .filter((k) => (totalResponses > 0 ? this.tally[k] > 0 : k === 'aman' || k === 'netral'))
      .slice(0, 4);

    if (emotionsToShow.length === 0) {
      emotionsToShow.push('aman', 'netral');
    }

    const cardW = Math.min(bounds.width * 0.88, 640);
    const barW = Math.floor(cardW * 0.55);
    const startY = height * 0.28;
    const rowH = 48;

    this.moodBars = [];

    emotionsToShow.forEach((emotionKey, idx) => {
      const meta = EMOTION_META[emotionKey] || EMOTION_META.netral;
      const count = this.tally[emotionKey] || 0;
      const pct = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : (idx === 0 ? 100 : 0);

      const rowY = startY + idx * rowH;
      const rowX = width / 2;

      // Label Emosi
      const lbl = this.add
        .text(rowX - cardW / 2 + 10, rowY, meta.label, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${labelFont}px`,
          color: '#ffffff',
        })
        .setOrigin(0, 0.5);
      this.moodContainer.add(lbl);

      // Track bar
      const barX = rowX + cardW / 2 - barW / 2 - 40;
      const track = this.add
        .rectangle(barX, rowY, barW, 16, 0x1e293b, 0.95)
        .setStrokeStyle(1, 0x475569, 0.9)
        .setOrigin(0.5);
      this.moodContainer.add(track);

      // Fill bar
      const fillW = Math.max(4, Math.floor((barW - 4) * (pct / 100)));
      const fill = this.add
        .rectangle(barX - (barW - 4) / 2, rowY, 2, 12, meta.color, 0.95)
        .setOrigin(0, 0.5);
      this.moodContainer.add(fill);

      // Pct text
      const pctTxt = this.add
        .text(rowX + cardW / 2 - 25, rowY, `${pct}%`, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${labelFont}px`,
          fontStyle: 'bold',
          color: meta.hex,
        })
        .setOrigin(0, 0.5);
      this.moodContainer.add(pctTxt);

      this.moodBars.push({ fill, targetW: fillW, track, lbl, pctTxt });
    });

    // Summary Card di bawah baris emosi
    const summaryY = startY + emotionsToShow.length * rowH + 28;
    const domMeta = EMOTION_META[this.dominant] || EMOTION_META.netral;

    this.moodSummaryText = this.add
      .text(
        width / 2,
        summaryY,
        `Emosi Dominan: ${domMeta.label.toUpperCase()}`,
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 22)}px`,
          fontStyle: 'bold',
          color: domMeta.hex,
          backgroundColor: '#0f172acc',
          padding: { x: 16, y: 8 },
          align: 'center',
        },
      )
      .setOrigin(0.5);
    this.moodContainer.add(this.moodSummaryText);

    // Prompt Lanjut
    this.moodPrompt = this.add
      .text(width / 2, height * 0.88, 'TEKAN UNTUK MELIHAT HASIL ENDING', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5);
    this.moodContainer.add(this.moodPrompt);

    this.moodContainer.setAlpha(0);
  }

  _showMoodPhase() {
    this._readyToAdvance = false;

    this.tweens.add({
      targets: this.moodContainer,
      alpha: 1,
      duration: 500,
      ease: 'Sine.easeOut',
      onComplete: () => {
        // Animasikan fill bar
        this.moodBars.forEach((bar) => {
          this.tweens.add({
            targets: bar.fill,
            width: bar.targetW,
            duration: 700,
            ease: 'Cubic.easeOut',
          });
        });

        // Kedip prompt
        this.tweens.add({
          targets: this.moodPrompt,
          alpha: 0.25,
          duration: 700,
          yoyo: true,
          repeat: -1,
        });

        this._readyToAdvance = true;
      },
    });
  }

  // ==============================================================
  // FASE 2: HASIL ENDING (TRUE / GOOD / BAD)
  // ==============================================================
  _buildEndingPhase() {
    const { width, height } = syncGameSizeToOrientation(this);
    const bounds = getVisibleBounds(this);

    this.endingContainer = this.add.container(0, 0).setDepth(2).setAlpha(0);

    const labelFont = pxToWorld(this, 26);
    const badgeFont = pxToWorld(this, 24);
    const titleFont = pxToWorld(this, 34);
    const bodyFont = pxToWorld(this, 22);
    const promptFont = pxToWorld(this, 22);

    this.endingLabel = this.add
      .text(width / 2, height * 0.12, `EPISODE ${this.episodeId} SELESAI`, {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${labelFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5);
    this.endingContainer.add(this.endingLabel);

    // Badge Ending (True / Good / Bad)
    let badgeText = '◆ GOOD ENDING ◆';
    let badgeColor = '#38bdf8';
    let badgeBg = '#0369a144';

    if (this.endingKey === 'true') {
      badgeText = '★ TRUE ENDING ★';
      badgeColor = '#ffdd57';
      badgeBg = '#854d0e44';
    } else if (this.endingKey === 'bad') {
      badgeText = '▲ BAD ENDING ▲';
      badgeColor = '#f87171';
      badgeBg = '#991b1b44';
    }

    this.endingBadge = this.add
      .text(width / 2, height * 0.12 + 38, badgeText, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${badgeFont}px`,
        fontStyle: 'bold',
        color: badgeColor,
        backgroundColor: badgeBg,
        padding: { x: 14, y: 4 },
      })
      .setOrigin(0.5);
    this.endingContainer.add(this.endingBadge);

    this.endingTitle = this.add
      .text(width / 2, height * 0.12 + 82, this.ending.title, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${titleFont}px`,
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: bounds.width * 0.88 },
      })
      .setOrigin(0.5, 0);
    this.endingContainer.add(this.endingTitle);

    this.plusText = this.add
      .text(width / 2, height * 0.45, `(+) ${this.ending.plusText}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#4ade80',
        align: 'center',
        wordWrap: { width: bounds.width * 0.84 },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);
    this.endingContainer.add(this.plusText);

    this.minusText = this.add
      .text(width / 2, height * 0.63, `(−) ${this.ending.minusText}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${bodyFont}px`,
        color: '#f87171',
        align: 'center',
        wordWrap: { width: bounds.width * 0.84 },
        lineSpacing: 8,
      })
      .setOrigin(0.5, 0);
    this.endingContainer.add(this.minusText);

    this.endingPrompt = this.add
      .text(width / 2, height * 0.88, 'TEKAN UNTUK LANJUT KE JURNAL REFLEKSI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${promptFont}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5);
    this.endingContainer.add(this.endingPrompt);
  }

  _transitionToEndingPhase() {
    this._readyToAdvance = false;

    this.tweens.add({
      targets: this.moodContainer,
      alpha: 0,
      duration: 400,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.currentPhase = 'ending';

        // Sesuaikan posisi minusText setelah plusText terukur
        if (this.minusText && this.plusText) {
          this.minusText.setY(this.plusText.y + this.plusText.height + 26);
        }

        this.tweens.add({
          targets: this.endingContainer,
          alpha: 1,
          duration: 500,
          ease: 'Sine.easeOut',
          onComplete: () => {
            this._readyToAdvance = true;
            this.tweens.add({
              targets: this.endingPrompt,
              alpha: 0.25,
              duration: 700,
              yoyo: true,
              repeat: -1,
            });
          },
        });
      },
    });
  }

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

    // Reposition Mood Phase
    this.moodTitle?.setPosition(width / 2, height * 0.14);
    this.moodTitle?.setFontSize(pxToWorld(this, 28));

    this.moodSubtitle?.setPosition(width / 2, height * 0.14 + 36);
    this.moodSubtitle?.setFontSize(pxToWorld(this, 20));
    this.moodSubtitle?.setWordWrapWidth(bounds.width * 0.85);

    this.moodPrompt?.setPosition(width / 2, height * 0.88);
    this.moodPrompt?.setFontSize(pxToWorld(this, 22));

    // Reposition Ending Phase
    this.endingLabel?.setPosition(width / 2, height * 0.12);
    this.endingLabel?.setFontSize(pxToWorld(this, 26));

    this.endingBadge?.setPosition(width / 2, height * 0.12 + 38);
    this.endingBadge?.setFontSize(pxToWorld(this, 24));

    this.endingTitle?.setPosition(width / 2, height * 0.12 + 82);
    this.endingTitle?.setFontSize(pxToWorld(this, 34));
    this.endingTitle?.setWordWrapWidth(bounds.width * 0.88);

    this.plusText?.setPosition(width / 2, height * 0.45);
    this.plusText?.setFontSize(pxToWorld(this, 22));
    this.plusText?.setWordWrapWidth(bounds.width * 0.84);

    if (this.minusText && this.plusText) {
      this.minusText.setPosition(width / 2, this.plusText.y + this.plusText.height + 26);
      this.minusText.setFontSize(pxToWorld(this, 22));
      this.minusText.setWordWrapWidth(bounds.width * 0.84);
    }

    this.endingPrompt?.setPosition(width / 2, height * 0.88);
    this.endingPrompt?.setFontSize(pxToWorld(this, 22));
  }
}
