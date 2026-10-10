import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getSettings } from '../utils/settingsStore';
import { computeEnding } from '../utils/emotionEnding';
import { getEpisodeChoiceTexts } from '../utils/episodeChoiceText';
import { setMood } from '../utils/moodStore';
import {
  getVisibleBounds,
  syncGameSizeToOrientation,
  pxToWorld,
} from '../utils/visibleBounds';
import {
  getCompletedEpisodes,
  completeEpisode,
  getStoryChoices,
} from '../utils/progressStore';

// Enam label ini berasal langsung dari id2label model IndoBERT.
const AI_EMOTION_COLORS = {
  aman: { value: 0x4ade80, css: '#4ade80' },
  menyinggung: { value: 0xfb923c, css: '#fdba74' },
  takut: { value: 0xa78bfa, css: '#c4b5fd' },
  marah: { value: 0xf87171, css: '#fca5a5' },
  netral: { value: 0x94a3b8, css: '#cbd5e1' },
  sedih: { value: 0x60a5fa, css: '#93c5fd' },
};
const AI_EMOTION_LABELS = new Set(Object.keys(AI_EMOTION_COLORS));
const MOOD_REQUEST_TIMEOUT_MS = 16000;

const ENDING_SUMMARIES = {
  true: 'Kamu konsisten memilih langkah yang aman dan tegas.',
  good: 'Kamu sudah memilih cukup aman, meski masih sempat ragu.',
  bad: 'Beberapa pilihanmu masih berisiko, tetapi kamu bisa mencoba lagi.',
};

export default class EpisodeEndingScene extends Phaser.Scene {
  constructor() {
    super('EpisodeEndingScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.isLastEpisode = Boolean(data?.isLastEpisode);
    this.choices = Array.isArray(data?.choices) ? data.choices : [];

    const endingChoices = this.isLastEpisode
      ? getStoryChoices(this.episodeId, this.choices)
      : this.choices;
    const endingResult = computeEnding(this.episodeId, endingChoices);

    // Fallback hanya dipakai ketika layanan NLP benar-benar tidak dapat
    // dihubungi. Jalur normal akan menimpa nilai ini dengan hasil model.
    const fallback = computeEnding(this.episodeId, this.choices);
    const totalResponses = Object.values(fallback.tally).reduce(
      (total, count) => total + count,
      0,
    );
    const fallbackCount = fallback.tally[fallback.dominant] || 0;

    this.endingKey = endingResult.endingKey;
    this.ending = endingResult.ending;
    this.responseTexts = getEpisodeChoiceTexts(this.episodeId, this.choices);
    this.dominantEmotion = fallback.dominant;
    this.emotionConfidence = totalResponses > 0 ? fallbackCount / totalResponses : 0;
    this.emotionFromAi = false;
    this._stage = 'ending';
    this._readyToAdvance = false;
    this._transitioning = false;
    this._advancing = false;
    this._moodReady = false;
  }

  create() {
    const { width, height } = syncGameSizeToOrientation(this);

    this.audioManager = new AudioManager();
    this.audioManager.init();
    const settings = getSettings();
    this.audioManager.setBGMVolume(settings.bgmVolume);
    if (settings.muted) this.audioManager.setMasterVolume(0);

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

    this.bgRect = this.add
      .rectangle(width / 2, height / 2, width, height, 0x05050f)
      .setDepth(0);
    this._createStars(width, height);
    this._createResultObjects();
    this._reposition();
    this._playEndingReveal();

    // Inferensi berjalan saat layar ending dibaca. Saat pemain lanjut,
    // layar mood biasanya dapat muncul langsung tanpa menunggu lagi.
    this._moodPromise = this._loadEpisodeMood();

    this._handleAdvance = () => {
      if (!this._readyToAdvance || this._transitioning || this._advancing) return;
      if (this._stage === 'ending') {
        this._showEmotionStage();
        return;
      }

      this._advancing = true;
      this._teardownInput();
      void this._goToJournal();
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

    this.events.once('shutdown', () => {
      this._teardownInput();
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      this.audioManager?.destroy();
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      delete window.__nawasenadaraInput;
    });
  }

  _createStars(width, height) {
    for (let index = 0; index < 70; index += 1) {
      const star = this.add
        .circle(
          Phaser.Math.Between(0, width),
          Phaser.Math.Between(0, height),
          Phaser.Math.FloatBetween(1, 2.3),
          0xffffff,
          Phaser.Math.FloatBetween(0.25, 0.85),
        )
        .setDepth(1);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.12, 0.4),
        duration: Phaser.Math.Between(1300, 3000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  _createResultObjects() {
    const hiddenText = (text, style) =>
      this.add.text(0, 0, text, style).setDepth(4).setAlpha(0);
    const emotionColor =
      AI_EMOTION_COLORS[this.dominantEmotion] || AI_EMOTION_COLORS.netral;

    this.endingLabel = hiddenText(
      this.isLastEpisode
        ? 'HASIL PERJALANAN 6 EPISODE'
        : `HASIL EPISODE ${this.episodeId}`,
      {
        fontFamily: '"Jersey 15", monospace',
        color: '#ffdd57',
        align: 'center',
      },
    ).setOrigin(0.5);
    this.endingTitle = hiddenText(this.ending.title, {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 8,
    }).setOrigin(0.5);
    this.endingSummary = hiddenText(ENDING_SUMMARIES[this.endingKey], {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '600',
      color: '#ffffff',
      align: 'center',
      lineSpacing: 7,
    }).setOrigin(0.5);

    this.emotionLabel = hiddenText(this.dominantEmotion.toUpperCase(), {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
    this.emotionBarTrack = this.add
      .rectangle(0, 0, 10, 10, 0x293548, 1)
      .setDepth(3)
      .setAlpha(0)
      .setVisible(false);
    this.emotionBarFill = this.add
      .rectangle(0, 0, 10, 10, emotionColor.value, 1)
      .setOrigin(0, 0.5)
      .setDepth(4)
      .setAlpha(0)
      .setVisible(false);
    this.emotionPercent = hiddenText('0%', {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
    this.emotionLoadingText = hiddenText('MENYIAPKAN HASIL...', {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    this.promptText = hiddenText('TEKAN UNTUK LIHAT EMOSI', {
      fontFamily: '"Pixelify Sans", monospace',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5);

    this.endingObjects = [
      this.endingLabel,
      this.endingTitle,
      this.endingSummary,
    ];
    this.emotionObjects = [
      this.emotionLabel,
      this.emotionBarTrack,
      this.emotionBarFill,
      this.emotionPercent,
    ];
  }

  async _loadEpisodeMood() {
    const fallbackResult = {
      label: this.dominantEmotion,
      confidence: this.emotionConfidence,
      fromAi: false,
    };
    const nlp = typeof window !== 'undefined' ? window.__nawasenadaraNlp : null;
    if (!nlp?.classifyEpisodeMood || this.responseTexts.length === 0) {
      this._moodReady = true;
      this._applyEmotionResult(fallbackResult);
      return fallbackResult;
    }

    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Klasifikasi mood melewati batas waktu.')),
          MOOD_REQUEST_TIMEOUT_MS,
        );
      });
      const result = await Promise.race([
        nlp.classifyEpisodeMood({
          responses: this.responseTexts,
          episodeId: this.episodeId,
        }),
        timeoutPromise,
      ]);
      const label = String(result?.label || '').toLowerCase().trim();
      if (!AI_EMOTION_LABELS.has(label)) {
        throw new Error(`Label NLP tidak dikenal: ${label || '(kosong)'}`);
      }

      const classified = {
        label,
        confidence: Phaser.Math.Clamp(Number(result?.confidence) || 0, 0, 1),
        fromAi: true,
      };
      this._moodReady = true;
      if (this.scene.isActive()) this._applyEmotionResult(classified);
      setMood(classified.label, classified.confidence);
      return classified;
    } catch (error) {
      console.warn(
        '[EpisodeEndingScene] Klasifikasi NLP gagal; memakai fallback pilihan lokal.',
        error,
      );
      this._moodReady = true;
      if (this.scene.isActive()) this._applyEmotionResult(fallbackResult);
      return fallbackResult;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  _applyEmotionResult({ label, confidence, fromAi }) {
    const normalizedLabel = AI_EMOTION_LABELS.has(label) ? label : 'netral';
    const color = AI_EMOTION_COLORS[normalizedLabel];
    this.dominantEmotion = normalizedLabel;
    this.emotionConfidence = Phaser.Math.Clamp(Number(confidence) || 0, 0, 1);
    this.emotionFromAi = Boolean(fromAi);
    this.emotionLabel?.setText(normalizedLabel.toUpperCase()).setColor('#ffffff');
    this.emotionBarFill?.setFillStyle(color.value, 1);
    this.emotionPercent?.setText(`${Math.round(this.emotionConfidence * 100)}%`);
    this._reposition();
  }

  _playEndingReveal() {
    this.tweens.add({
      targets: this.endingObjects,
      alpha: 1,
      duration: 600,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 450,
      delay: 850,
      onComplete: () => {
        this._readyToAdvance = true;
        this._startPromptPulse();
      },
    });
  }

  _showEmotionStage() {
    this._readyToAdvance = false;
    this._transitioning = true;
    this.tweens.killTweensOf(this.promptText);
    this.promptText.setAlpha(0);

    this.tweens.add({
      targets: this.endingObjects,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.endingObjects.forEach((object) => object.setVisible(false));
        this._stage = 'emotion';
        void this._revealEmotionStage();
      },
    });
  }

  async _revealEmotionStage() {
    if (!this._moodReady) {
      this.emotionLoadingText.setVisible(true).setAlpha(1);
      this.tweens.add({
        targets: this.emotionLoadingText,
        alpha: 0.35,
        duration: 550,
        yoyo: true,
        repeat: -1,
      });
    }

    await this._moodPromise;
    if (!this.scene.isActive()) return;

    this.tweens.killTweensOf(this.emotionLoadingText);
    this.emotionLoadingText.setVisible(false).setAlpha(0);
    this.emotionObjects.forEach((object) => object.setVisible(true).setAlpha(0));
    this.promptText.setText('TEKAN UNTUK ISI JURNAL');

    this.tweens.add({
      targets: this.emotionObjects,
      alpha: 1,
      duration: 520,
      ease: 'Sine.easeOut',
    });
    this.tweens.add({
      targets: this.promptText,
      alpha: 1,
      duration: 380,
      delay: 520,
      onComplete: () => {
        this._transitioning = false;
        this._readyToAdvance = true;
        this._startPromptPulse();
      },
    });
  }

  _startPromptPulse() {
    this.tweens.add({
      targets: this.promptText,
      alpha: 0.3,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  _reposition() {
    const { width, height } = syncGameSizeToOrientation(this);
    this.bgRect?.setPosition(width / 2, height / 2).setSize(width, height);

    const bounds = getVisibleBounds(this);
    const centerX = bounds.centerX;
    const wrapWidth = bounds.width * 0.82;

    this.endingLabel
      ?.setFontSize(pxToWorld(this, 31))
      .setPosition(centerX, bounds.top + bounds.height * 0.22)
      .setWordWrapWidth(wrapWidth);
    this.endingTitle
      ?.setFontSize(pxToWorld(this, 46))
      .setPosition(centerX, bounds.top + bounds.height * 0.45)
      .setWordWrapWidth(wrapWidth);
    this.endingSummary
      ?.setFontSize(pxToWorld(this, 26))
      .setPosition(centerX, bounds.top + bounds.height * 0.68)
      .setWordWrapWidth(bounds.width * 0.76);

    const barWidth = Math.min(bounds.width * 0.74, pxToWorld(this, 560));
    const barHeight = pxToWorld(this, 30);
    const barY = bounds.top + bounds.height * 0.57;
    const barLeft = centerX - barWidth / 2;
    const fillWidth = Math.max(pxToWorld(this, 10), barWidth * this.emotionConfidence);

    this.emotionLabel
      ?.setFontSize(
        pxToWorld(this, this.dominantEmotion === 'menyinggung' ? 52 : 68),
      )
      .setPosition(centerX, bounds.top + bounds.height * 0.39)
      .setWordWrapWidth(wrapWidth);
    this.emotionBarTrack?.setPosition(centerX, barY).setDisplaySize(barWidth, barHeight);
    this.emotionBarFill
      ?.setPosition(barLeft, barY)
      .setDisplaySize(fillWidth, barHeight);
    this.emotionPercent
      ?.setFontSize(pxToWorld(this, 25))
      .setPosition(centerX, bounds.top + bounds.height * 0.66);
    this.emotionLoadingText
      ?.setFontSize(pxToWorld(this, 30))
      .setPosition(centerX, bounds.centerY);
    this.promptText
      ?.setFontSize(pxToWorld(this, 20))
      .setPosition(centerX, bounds.top + bounds.height * 0.91);
  }

  _teardownInput() {
    this.input?.keyboard?.off('keydown-SPACE', this._handleAdvance);
    this.input?.keyboard?.off('keydown-E', this._handleAdvance);
    this.input?.off('pointerdown', this._handleAdvance);
  }

  async _goToJournal() {
    const alreadyCompleted = getCompletedEpisodes().includes(this.episodeId);
    const ui = window.__nawasenadaraUI;
    if (ui?.openJournal) {
      await ui.openJournal(this.episodeId, { allowSkip: alreadyCompleted });
    }

    completeEpisode(this.episodeId, this.choices);
    if (this.isLastEpisode) {
      this.scene.start('EpisodeSelectScene');
    } else {
      this.scene.start('EpisodeIntroScene', {
        episodeId: this.episodeId + 1,
      });
    }
  }
}
