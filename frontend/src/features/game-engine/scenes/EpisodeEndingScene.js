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
  resetEpisodeProgress,
} from '../utils/progressStore';
import { evaluateEpisodeAspects, getFullAspectReport } from '../utils/aspectRubric';
import { getEpisodeById, EPISODES } from '../config/episodes';

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

function shouldShowEpisodeLearning(episodeId, choices = []) {
  if (episodeId === 3) {
    const finalChoice = choices.find(
      (choice) => choice?.nodeId === 'n_cb4'
    )?.choiceId;

    return ['b', 'c'].includes(finalChoice);
  }

  return false;
}

function shouldShowEpisode1Learning(choices = []) {
  const riskyChoices = {
    n3: ['a', 'c'],
    n5: ['c'],
  };

  return choices.some((choice) =>
    riskyChoices[choice?.nodeId]?.includes(choice?.choiceId)
  );
}

function shouldShowEpisode4Learning(choices = []) {
  const riskyChoices = {
    n3: ['c'],
    n6: ['b', 'c'],
  };

  return choices.some((choice) =>
    riskyChoices[choice?.nodeId]?.includes(choice?.choiceId)
  );
}

function shouldShowEpisode5Learning(choices = []) {
  const riskyChoices = {
    n_icebreak: ['c'],
    n_action: ['c'],
    n3: ['c'],
    n6: ['c'],
  };

  return choices.some((choice) =>
    riskyChoices[choice?.nodeId]?.includes(choice?.choiceId)
  );
}

function shouldShowEpisode6Learning(choices = []) {
  const riskyChoices = {
    n3: ['c'],
    n6: ['c'],
  };

  return choices.some((choice) =>
    riskyChoices[choice?.nodeId]?.includes(choice?.choiceId)
  );
}

export default class EpisodeEndingScene extends Phaser.Scene {
  constructor() {
    super('EpisodeEndingScene');
  }

  init(data) {
    this.episodeId = data?.episodeId ?? 1;
    this.isLastEpisode = Boolean(data?.isLastEpisode || this.episodeId === 6);
    this.choices = Array.isArray(data?.choices) ? data.choices : [];

    const episode2Branch = this.choices.find(
      (choice) => choice?.nodeId === 'n3'
    )?.choiceId;

    const episode2NeedsLearning =
      this.episodeId === 2 &&
      (episode2Branch === 'b' || episode2Branch === 'c');

    const episode3NeedsLearning = shouldShowEpisodeLearning(
      this.episodeId,
      this.choices,
    );

    const episode1NeedsLearning =
      this.episodeId === 1 &&
      shouldShowEpisode1Learning(this.choices); 

    const episode4NeedsLearning =
      this.episodeId === 4 &&
      shouldShowEpisode4Learning(this.choices);

    const episode5NeedsLearning =
      this.episodeId === 5 &&
      shouldShowEpisode5Learning(this.choices);

    const episode6NeedsLearning =
      this.episodeId === 6 &&
      shouldShowEpisode6Learning(this.choices);

    const endingChoices = this.isLastEpisode
      ? getStoryChoices(this.episodeId, this.choices)
      : this.choices;
    const endingResult = computeEnding(this.episodeId, endingChoices);

    this.endingKey = endingResult.endingKey;
    this.ending = endingResult.ending;
    this.isBadEnding = this.endingKey === 'bad';

    this.showLearningMenu =
      this.isBadEnding ||
      episode1NeedsLearning ||
      episode2NeedsLearning ||
      episode3NeedsLearning ||
      episode4NeedsLearning ||
      episode5NeedsLearning ||
      episode6NeedsLearning;

    this.learningChoice =
      this.episodeId === 2 ? episode2Branch : null;

    // Fallback hanya dipakai ketika layanan NLP benar-benar tidak dapat
    // dihubungi. Jalur normal akan menimpa nilai ini dengan hasil model.
    const fallback = computeEnding(this.episodeId, this.choices);
    const totalResponses = Object.values(fallback.tally).reduce(
      (total, count) => total + count,
      0,
    );
    const fallbackCount = fallback.tally[fallback.dominant] || 0;

    this.aspectEvaluation = evaluateEpisodeAspects(this.episodeId, this.choices);
    this.needsAspectRetry = Boolean(this.aspectEvaluation.needsRetry);

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
    this.audioManager.startEndingBGM();

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
      .rectangle(0, 0, width, height, 0x05050f)
      .setOrigin(0, 0)
      .setDepth(0);
    this._createStars(width, height);
    this._createResultObjects();
    this._reposition();
    this._playEndingReveal();

    // Inferensi berjalan saat layar ending dibaca.
    this._moodPromise = this._loadEpisodeMood();

    this._handleAdvance = () => {
      if (!this._readyToAdvance || this._transitioning || this._advancing) return;
      if (this._stage === 'ending') {
        this._showEmotionStage();
        return;
      }

      if (this._stage === 'emotion') {
        this._showAspectStage();
        return;
      }

      if (this._stage === 'aspect') {
        if (this.needsAspectRetry) {
          // Pemain harus mengulang episode lewat tombol yang tersedia
          return;
        }
        this._advancing = true;
        this._teardownInput();
        void this._goToJournal();
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

    this.events.once('shutdown', () => {
      this._teardownInput();
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      window.removeEventListener('resize', this._onResize);
      document.removeEventListener('fullscreenchange', this._onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
      this.audioManager?.destroy();
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      delete window.__nawasenadaraInput;
    });
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
    const bounds = getVisibleBounds(this);
    const cx = bounds.centerX;
    const hiddenText = (text, style, y = bounds.centerY) =>
      this.add.text(cx, y, text, style).setDepth(4).setAlpha(0);
    const emotionColor =
      AI_EMOTION_COLORS[this.dominantEmotion] || AI_EMOTION_COLORS.netral;

    this.endingLabel = hiddenText(
      this.isLastEpisode
        ? 'HASIL AKHIR EPISODE 6'
        : `HASIL EPISODE ${this.episodeId}`,
      {
        fontFamily: '"Jersey 15", monospace',
        color: '#ffdd57',
        align: 'center',
      },
      bounds.top + bounds.height * 0.16,
    ).setOrigin(0.5);
    this.endingTitle = hiddenText(
      this.ending.title,
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '700',
        color: '#ffffff',
        align: 'center',
        lineSpacing: 8,
      },
      bounds.top + bounds.height * 0.31,
    ).setOrigin(0.5);
    this.endingSummary = hiddenText(
      ENDING_SUMMARIES[this.endingKey] || '',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '600',
        color: '#f1f5f9',
        align: 'center',
        lineSpacing: 8,
      },
      bounds.top + bounds.height * 0.59,
    ).setOrigin(0.5);

    this.emotionHeaderText = hiddenText('GAMBARAN PERASAANMU DI EPISODE INI', {
      fontFamily: '"Jersey 15", monospace',
      color: '#ffdd57',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);
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
    this.emotionExplainText = hiddenText(
      'Gambaran perasaan ini dibaca dari pilihan jawabanmu sepanjang episode ini (Aman, Cemas, atau Marah) supaya kamu bisa lebih mengenali perasaanmu sendiri saat menghadapi situasi tersebut.',
      {
        fontFamily: '"Pixelify Sans", monospace',
        color: '#e2e8f0',
        align: 'center',
        lineSpacing: 6,
      },
    ).setOrigin(0.5).setVisible(false);
    this.emotionLoadingText = hiddenText('MENYIAPKAN HASIL...', {
      fontFamily: '"Pixelify Sans", monospace',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
    }).setOrigin(0.5).setVisible(false);

    const initialPrompt = 'TEKAN UNTUK LIHAT GAMBARAN PERASAANMU >';

    this.promptText = hiddenText(
      initialPrompt,
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '700',
        color: '#ffdd57',
        align: 'center',
      },
      bounds.top + bounds.height * 0.91,
    ).setOrigin(0.5);

    this.endingObjects = [
      this.endingLabel,
      this.endingTitle,
      this.endingSummary,
    ];
    this.emotionObjects = [
      this.emotionHeaderText,
      this.emotionLabel,
      this.emotionBarTrack,
      this.emotionBarFill,
      this.emotionPercent,
      this.emotionExplainText,
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
      if (this.isBadEnding) {
        setMood(fallbackResult.label, fallbackResult.confidence);
      } else {
        setMood('aman', 0.85);
      }
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
      if (this._isSceneValid()) this._applyEmotionResult(classified);
      if (this.isBadEnding) {
        setMood(classified.label, classified.confidence);
      } else {
        setMood('aman', Math.max(0.85, classified.confidence));
      }
      return classified;
    } catch (error) {
      console.warn(
        '[EpisodeEndingScene] Klasifikasi NLP gagal; memakai fallback pilihan lokal.',
        error,
      );
      this._moodReady = true;
      if (this._isSceneValid()) this._applyEmotionResult(fallbackResult);
      if (this.isBadEnding) {
        setMood(fallbackResult.label, fallbackResult.confidence);
      } else {
        setMood('aman', 0.85);
      }
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
    if (!this._isSceneValid()) return;

    this.tweens.killTweensOf(this.emotionLoadingText);
    this.emotionLoadingText.setVisible(false).setAlpha(0);
    this.emotionObjects.forEach((object) => object.setVisible(true).setAlpha(0));
    this.promptText.setText('TEKAN UNTUK LIHAT EVALUASI 3 ASPEK ▸');

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

  _showAspectStage() {
    this._readyToAdvance = false;
    this._transitioning = true;
    this.tweens.killTweensOf(this.promptText);
    this.promptText.setAlpha(0);

    this.tweens.add({
      targets: this.emotionObjects,
      alpha: 0,
      duration: 300,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.emotionObjects.forEach((object) => object.setVisible(false));
        this._stage = 'aspect';
        this._revealAspectStage();
      },
    });
  }

  _revealAspectStage() {
    if (!this._isSceneValid()) return;
    if (this._aspectContainer) {
      this._aspectContainer.destroy();
      this._aspectContainer = null;
    }
    this._aspectContainer = this.add.container(0, 0).setDepth(15);
    const bounds = getVisibleBounds(this);
    const centerX = bounds.centerX;

    const evalData = this.aspectEvaluation;
    const titleFont = pxToWorld(this, 34);
    const subTitleFont = pxToWorld(this, 19);
    const bodyFont = pxToWorld(this, 18);
    const cardWidth = Math.min(bounds.width * 0.92, pxToWorld(this, 900));

    const title = this.add
      .text(centerX, bounds.top + bounds.height * 0.08, 'EVALUASI 3 LANGKAH MISI', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${titleFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5);
    this._aspectContainer.add(title);

    const unifiedIntro =
      evalData.fulfilledCount === evalData.totalCount
        ? 'Hebat! Kamu sudah memenuhi ketiga langkah tujuan di episode ini:'
        : evalData.fulfilledCount > 0
          ? `Kamu sudah memenuhi ${evalData.fulfilledCount} dari ${evalData.totalCount} langkah tujuan di episode ini:`
          : 'Sayang sekali, kamu belum memenuhi satu pun langkah tujuan di episode ini:';

    const subTitle = this.add
      .text(
        centerX,
        bounds.top + bounds.height * 0.145,
        unifiedIntro,
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${subTitleFont}px`,
          fontStyle: '700',
          color: evalData.fulfilledCount === evalData.totalCount ? '#86efac' : '#f8fafc',
          align: 'center',
          wordWrap: { width: cardWidth },
        },
      )
      .setOrigin(0.5);
    this._aspectContainer.add(subTitle);

    // List of 3 Aspects
    const listStartY = bounds.top + bounds.height * 0.22;
    const itemGap = bounds.height * 0.132;

    evalData.aspects.forEach((aspect, idx) => {
      const y = listStartY + idx * itemGap;
      const statusIcon = aspect.fulfilled ? '[TERPENUHI]' : '[BELUM]';
      const statusColor = aspect.fulfilled ? '#4ade80' : '#fb7185';
      const bgFill = aspect.fulfilled ? 0x142820 : 0x281820;
      const strokeColor = aspect.fulfilled ? 0x22c55e : 0xf43f5e;

      const itemBg = this.add
        .rectangle(centerX, y + 10, cardWidth, pxToWorld(this, 70), bgFill, 0.92)
        .setStrokeStyle(2, strokeColor, 0.75);
      this._aspectContainer.add(itemBg);

      const statusBadge = this.add
        .text(centerX - cardWidth / 2 + 18, y + 10, statusIcon, {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${pxToWorld(this, 20)}px`,
          color: statusColor,
        })
        .setOrigin(0, 0.5);
      this._aspectContainer.add(statusBadge);

      const aspectText = this.add
        .text(
          centerX - cardWidth / 2 + pxToWorld(this, 142),
          y + 10,
          `${aspect.id}. ${aspect.title}\n${aspect.feedback}`,
          {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${bodyFont}px`,
            color: '#f8fafc',
            lineSpacing: 4,
            wordWrap: { width: cardWidth - pxToWorld(this, 160) },
          },
        )
        .setOrigin(0, 0.5);
      this._aspectContainer.add(aspectText);
    });

    // Summary Box
    const summaryY = bounds.top + bounds.height * 0.68;
    const summaryText = this.add
      .text(centerX, summaryY, evalData.feedbackSummary, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 18)}px`,
        fontStyle: '600',
        color: evalData.needsRetry ? '#fecdd3' : '#fef08a',
        align: 'center',
        wordWrap: { width: cardWidth - 20 },
        lineSpacing: 5,
      })
      .setOrigin(0.5);
    this._aspectContainer.add(summaryText);

    const btnY = bounds.top + bounds.height * 0.87;

    // Action Buttons
    if (evalData.needsRetry) {
      // Must Retry Button (Blocked from continuing ONLY when 0 aspects met)
      const retryBtn = this.add
        .rectangle(centerX, btnY, pxToWorld(this, 360), pxToWorld(this, 54), 0xe11d48, 1)
        .setStrokeStyle(2, 0xffa4b6, 0.9)
        .setInteractive({ useHandCursor: true });
      const retryText = this.add
        .text(centerX, btnY, 'ULANGI EPISODE INI', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 20)}px`,
          fontStyle: '700',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this._aspectContainer.add(retryBtn);
      this._aspectContainer.add(retryText);

      const doRetry = () => {
        resetEpisodeProgress(this.episodeId);
        const sceneKey = {
          1: 'Episode1Scene',
          2: 'Episode2Scene',
          3: 'Episode3Scene',
          4: 'Episode4Scene',
          5: 'Episode5Scene',
          6: 'Episode6Scene',
        }[this.episodeId] || 'Episode1Scene';
        this.scene.start(sceneKey);
      };
      retryBtn.on('pointerdown', doRetry);
      retryText.setInteractive({ useHandCursor: true }).on('pointerdown', doRetry);
    } else {
      // Pemain memenuhi minimal 1 aspek: Lanjut ke Jurnal Refleksi terlebih dahulu
      // (Jurnal Refleksi selalu muncul duluan; Rapor 6 Episode baru keluar setelah jurnal selesai diisi di Ep 6)
      const nextBtn = this.add
        .rectangle(centerX, btnY, pxToWorld(this, 380), pxToWorld(this, 54), 0x16a34a, 1)
        .setStrokeStyle(2, 0x86efac, 0.9)
        .setInteractive({ useHandCursor: true });
      const nextText = this.add
        .text(centerX, btnY, 'LANJUT KE JURNAL REFLEKSI >', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 20)}px`,
          fontStyle: '700',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this._aspectContainer.add(nextBtn);
      this._aspectContainer.add(nextText);

      const advanceNext = () => {
        this._advancing = true;
        this._teardownInput();
        void this._goToJournal();
      };
      nextBtn.on('pointerdown', advanceNext);
      nextText.setInteractive({ useHandCursor: true }).on('pointerdown', advanceNext);
    }

    this._transitioning = false;
    this._readyToAdvance = true;
  }

  _showFinalReportLandscape(onCloseCallback = null) {
    if (!this._isSceneValid()) return;

    this._stage = 'final_report';
    this._finalReportOnClose = onCloseCallback;
    this._readyToAdvance = false;
    this._teardownInput();

    // Sembunyikan elemen stage sebelumnya
    this.endingObjects?.forEach((obj) => obj.setVisible(false));
    this.emotionObjects?.forEach((obj) => obj.setVisible(false));
    this.emotionLoadingText?.setVisible(false);
    this.promptText?.setVisible(false);
    this._aspectContainer?.setVisible(false);
    this.learningObjects?.forEach((obj) => obj.setVisible(false));

    if (this._finalReportContainer) {
      this._finalReportContainer.destroy();
      this._finalReportContainer = null;
    }

    const bounds = getVisibleBounds(this);
    const centerX = bounds.centerX;
    const reportData = getFullAspectReport();

    this._finalReportContainer = this.add.container(0, 0).setDepth(200);

    // Background penuh landscape dengan gradasi malam gelap
    const bg = this.add
      .rectangle(centerX, bounds.centerY, bounds.width, bounds.height, 0x060611, 0.98)
      .setInteractive();
    this._finalReportContainer.add(bg);

    // Judul Besar Rapor
    const titleFont = pxToWorld(this, 36);
    const subFont = pxToWorld(this, 19);
    const title = this.add
      .text(centerX, bounds.top + bounds.height * 0.08, 'RAPOR CAPAIAN 6 EPISODE — NAWASENA DARA', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${titleFont}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5);
    this._finalReportContainer.add(title);

    const sub = this.add
      .text(
        centerX,
        bounds.top + bounds.height * 0.14,
        'Rangkuman pemenuhan langkah tujuan di setiap episode perjalananmu:',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${subFont}px`,
          color: '#cbd5e1',
          align: 'center',
        },
      )
      .setOrigin(0.5);
    this._finalReportContainer.add(sub);

    // TATA LETAK 2 KOLOM LANDSCAPE PENUH (Kiri: Ep 1-3, Kanan: Ep 4-6)
    // Membuat ukuran kartu sangat lebar dan font jauh lebih besar serta mudah dibaca!
    const colWidth = Math.min(bounds.width * 0.465, pxToWorld(this, 580));
    const colGap = bounds.width * 0.025;
    const leftColX = centerX - colWidth / 2 - colGap / 2;
    const rightColX = centerX + colWidth / 2 + colGap / 2;

    const rowStartY = bounds.top + bounds.height * 0.22;
    const rowGap = bounds.height * 0.185;
    const cardHeight = pxToWorld(this, 94);

    const epTitleFont = pxToWorld(this, 20);
    const badgeFont = pxToWorld(this, 21);
    const detailFont = pxToWorld(this, 16);

    EPISODES.forEach((ep, i) => {
      const isLeft = i < 3;
      const colX = isLeft ? leftColX : rightColX;
      const rowIndex = isLeft ? i : i - 3;
      const y = rowStartY + rowIndex * rowGap;

      let epReport = reportData[ep.id] || null;
      if (!epReport) {
        const storedChoices = getStoryChoices(
          ep.id,
          ep.id === this.episodeId ? this.choices : [],
        );
        if (storedChoices && storedChoices.length > 0) {
          epReport = evaluateEpisodeAspects(ep.id, storedChoices);
        }
      }

      const aspects = epReport?.aspects || ep.aspects.map((a) => ({ ...a, fulfilled: true }));
      const missingList = aspects.filter((a) => !a.fulfilled);
      const fulfilled = aspects.filter((a) => a.fulfilled).length;
      const total = aspects.length || 3;
      const isPerfect = missingList.length === 0;

      // Card Background
      const cardBg = this.add
        .rectangle(
          colX,
          y,
          colWidth,
          cardHeight,
          isPerfect ? 0x142820 : 0x271924,
          0.96,
        )
        .setStrokeStyle(2, isPerfect ? 0x22c55e : 0xf43f5e, 0.85);
      this._finalReportContainer.add(cardBg);

      // Header Baris: Judul Episode di kiri, Nilai Aspek di kanan
      const epLabel = this.add
        .text(colX - colWidth / 2 + 18, y - 24, `Ep ${ep.id}: ${ep.title}`, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${epTitleFont}px`,
          fontStyle: '700',
          color: '#ffffff',
        })
        .setOrigin(0, 0.5);
      this._finalReportContainer.add(epLabel);

      const scoreLabel = this.add
        .text(
          colX + colWidth / 2 - 18,
          y - 24,
          `${fulfilled}/${total} Aspek ${isPerfect ? '✓' : ''}`,
          {
            fontFamily: '"Jersey 15", monospace',
            fontSize: `${badgeFont}px`,
            color: isPerfect ? '#4ade80' : '#fb7185',
          },
        )
        .setOrigin(1, 0.5);
      this._finalReportContainer.add(scoreLabel);

      // Keterangan Aspek yang Kurang atau Sudah Sempurna
      const detailLine = isPerfect
        ? '✓ Semua langkah tujuan berhasil dipenuhi dengan baik!'
        : `Perlu dilatih: ${missingList.map((m) => `(${m.id}) ${m.title}`).join(', ')}`;

      const detailText = this.add
        .text(colX - colWidth / 2 + 18, y + 15, detailLine, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${detailFont}px`,
          color: isPerfect ? '#86efac' : '#fecdd3',
          lineSpacing: 3,
          wordWrap: { width: colWidth - 36 },
        })
        .setOrigin(0, 0.5);
      this._finalReportContainer.add(detailText);
    });

    // Pesan Refleksi dari Kak Dara di bawah
    const noteY = bounds.top + bounds.height * 0.81;
    const noteBoxWidth = Math.min(bounds.width * 0.94, pxToWorld(this, 1200));
    const noteBg = this.add
      .rectangle(centerX, noteY, noteBoxWidth, pxToWorld(this, 52), 0x1e1b4b, 0.9)
      .setStrokeStyle(1.5, 0x818cf8, 0.7);
    this._finalReportContainer.add(noteBg);

    const note = this.add
      .text(
        centerX,
        noteY,
        'Pesan Kak Dara: "Hebat sudah menyelesaikan seluruh 6 episode! Dari rapor ini kamu bisa melihat langkah mana yang sudah kamu kuasai dan mana yang perlu terus dilatih dalam keseharian."',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 17)}px`,
          color: '#fef08a',
          align: 'center',
          wordWrap: { width: noteBoxWidth - 32 },
        },
      )
      .setOrigin(0.5);
    this._finalReportContainer.add(note);

    // Tombol Selesai & Kembali ke Menu Utama
    const finishBtnY = bounds.top + bounds.height * 0.91;
    const finishBtn = this.add
      .rectangle(centerX, finishBtnY, pxToWorld(this, 420), pxToWorld(this, 52), 0x16a34a, 1)
      .setStrokeStyle(2, 0x86efac, 0.95)
      .setInteractive({ useHandCursor: true });
    const finishText = this.add
      .text(
        centerX,
        finishBtnY,
        'SELESAI & KEMBALI KE MENU UTAMA >',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 20)}px`,
          fontStyle: '700',
          color: '#ffffff',
        },
      )
      .setOrigin(0.5);
    this._finalReportContainer.add(finishBtn);
    this._finalReportContainer.add(finishText);

    const handleFinish = () => {
      this._finalReportContainer?.destroy();
      this._finalReportContainer = null;
      if (typeof onCloseCallback === 'function') {
        onCloseCallback();
      } else {
        this.scene.start('EpisodeSelectScene');
      }
    };
    finishBtn.on('pointerdown', handleFinish);
    finishText.setInteractive({ useHandCursor: true }).on('pointerdown', handleFinish);
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
    if (!this._isSceneValid()) return;
    const { width, height } = syncGameSizeToOrientation(this);
    this.bgRect?.setPosition(0, 0).setSize(width, height).setDisplaySize(width, height).updateDisplayOrigin();

    const bounds = getVisibleBounds(this);
    const centerX = bounds.centerX;
    const wrapWidth = bounds.width * 0.84;

    this.endingLabel
      ?.setFontSize(pxToWorld(this, 32))
      .setPosition(centerX, bounds.top + bounds.height * 0.16)
      .setWordWrapWidth(wrapWidth);
    this.endingTitle
      ?.setFontSize(pxToWorld(this, 36))
      .setPosition(centerX, bounds.top + bounds.height * 0.31)
      .setWordWrapWidth(wrapWidth);
    this.endingSummary
      ?.setFontSize(pxToWorld(this, 23))
      .setPosition(centerX, bounds.top + bounds.height * 0.59)
      .setWordWrapWidth(bounds.width * 0.8);

    const barWidth = Math.min(bounds.width * 0.74, pxToWorld(this, 560));
    const barHeight = pxToWorld(this, 30);
    const barY = bounds.top + bounds.height * 0.55;
    const barLeft = centerX - barWidth / 2;
    const fillWidth = Math.max(pxToWorld(this, 10), barWidth * this.emotionConfidence);

    this.emotionHeaderText
      ?.setFontSize(pxToWorld(this, 30))
      .setPosition(centerX, bounds.top + bounds.height * 0.18)
      .setWordWrapWidth(wrapWidth);
    this.emotionLabel
      ?.setFontSize(
        pxToWorld(this, this.dominantEmotion === 'menyinggung' ? 52 : 64),
      )
      .setPosition(centerX, bounds.top + bounds.height * 0.37)
      .setWordWrapWidth(wrapWidth);
    this.emotionBarTrack?.setPosition(centerX, barY).setDisplaySize(barWidth, barHeight);
    this.emotionBarFill
      ?.setPosition(barLeft, barY)
      .setDisplaySize(fillWidth, barHeight);
    this.emotionPercent
      ?.setFontSize(pxToWorld(this, 26))
      .setPosition(centerX, bounds.top + bounds.height * 0.64);
    this.emotionExplainText
      ?.setFontSize(pxToWorld(this, 19))
      .setPosition(centerX, bounds.top + bounds.height * 0.76)
      .setWordWrapWidth(Math.min(bounds.width * 0.86, pxToWorld(this, 780)));
    this.emotionLoadingText
      ?.setFontSize(pxToWorld(this, 30))
      .setPosition(centerX, bounds.centerY);
    this.promptText
      ?.setFontSize(pxToWorld(this, 22))
      .setPosition(centerX, bounds.top + bounds.height * 0.91);

    if (this._stage === 'aspect' && this._aspectContainer) {
      this._revealAspectStage();
    }
    if (this._stage === 'final_report' && this._finalReportContainer) {
      this._showFinalReportLandscape(this._finalReportOnClose);
    }
  }

  _teardownInput() {
    this.input?.keyboard?.off('keydown-SPACE', this._handleAdvance);
    this.input?.keyboard?.off('keydown-E', this._handleAdvance);
    this.input?.off('pointerdown', this._handleAdvance);
  }

  async _goToJournal() {
    const alreadyCompleted = getCompletedEpisodes().includes(
      this.episodeId
    );

    const ui = window.__nawasenadaraUI;

    if (ui?.openJournal) {
      await ui.openJournal(this.episodeId, {
        allowSkip: alreadyCompleted,
      });
    }

    // Jika pemain sudah sampai ke tahap jurnal refleksi, berarti minimal
    // 1 aspek misi telah terpenuhi (karena 0 aspek wajib mengulang di Stage 3).
    // Langsung lanjutkan ke episode berikutnya (atau Rapor 6 Episode di Ep 6)
    // tanpa memunculkan layar suruh mengulang lagi.
    if (this.isLastEpisode || this.episodeId === 6) {
      completeEpisode(this.episodeId, this.choices);
      // Jurnal refleksi telah selesai diisi; sekarang tampilkan Rapor 6 Episode Landscape!
      this._showFinalReportLandscape(() => {
        this.scene.start('EpisodeSelectScene');
      });
      return;
    }

    this._completeAndContinue();
  }

  _showLearningMenu() {
    if (!this._isSceneValid()) return;

    this._stage = 'learning';
    this._readyToAdvance = false;
    this._teardownInput();

    this.endingObjects.forEach((object) => object.setVisible(false));
    this.emotionObjects.forEach((object) => object.setVisible(false));
    this.emotionLoadingText.setVisible(false);
    this.promptText.setVisible(false);
    this._aspectContainer?.setVisible(false);

    const bounds = getVisibleBounds(this);
    const centerX = bounds.centerX;

    let learningText;

    if (this.episodeId === 1) {
      learningText =
        'Candaan yang meremehkan perempuan tetap bisa menyakiti hati walaupun dianggap cuma bercanda. Kamu berhak bilang tidak nyaman dengan tenang tanpa harus marah-marah atau memendam sendiri. Kalau masih berlanjut, jangan ragu cerita ke guru, ya!';
    } else if (this.episodeId === 2) {
      learningText = this.learningChoice === 'c'
        ? 'Ikut menertawakan foto teman di grup chat bisa bikin temanmu makin sedih dan terpuruk. Yuk, berhenti ikut mengejek dan jadilah teman yang baik!'
        : 'Diam saja saat teman diejek di grup chat bisa membuat dia merasa sendirian. Kamu bisa banget bantu dengan tidak ikut menyebarkan foto itu, menyapa Kirana, atau melapor ke guru.';
    } else if (this.episodeId === 3) {
      learningText =
        'Chat dari akun asing yang sok akrab dan mulai memaksa minta foto atau nomor HP itu tanda bahaya! Jangan pernah turuti atau hadapi sendirian. Simpan bukti screenshot, blokir akunnya, dan langsung ceritakan ke orang tua.';
    } else if (this.episodeId === 4) {
      learningText =
        'Komentar soal bentuk tubuh yang dibungkus candaan itu sama sekali tidak lucu. Kamu berhak merasa tidak nyaman, bilang tidak suka dengan tegas, menjauh ke tempat aman, dan lapor ke guru kalau terus diganggu.';
    } else if (this.episodeId === 5) {
      learningText =
        'Saat sahabatmu sedang takut dan tertekan, dengarkan ceritanya dengan sabar tanpa menyalahkannya. Jangan nekat melabrak pelakunya sendirian karena berbahaya—temani sahabatmu menemui Guru BK atau orang tua.';
    } else if (this.episodeId === 6) {
      learningText =
        'Kalau ada yang memaksa atau menghadangmu di tempat sepi, jangan diam membeku atau membalas emosi sendirian. Tolak dengan tegas, segera pindah ke tempat ramai yang ada satpam atau guru, lalu catat kejadiannya dan lapor bersama teman.';
    } else {
      learningText =
        'Setiap pilihan punya dampak. Pahami situasinya dengan tenang, jaga batasan dirimu, dan jangan ragu minta bantuan orang dewasa yang kamu percaya.';
    }

    this._learningActionTaken = false;
    this.learningObjects = [];

    const title = this.add.text(
      centerX,
      bounds.top + bounds.height * 0.17,
      'YUK, BELAJAR DARI PILIHANMU',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '700',
        color: '#ffdd57',
        align: 'center',
        fontSize: `${pxToWorld(this, 34)}px`,
        wordWrap: { width: bounds.width * 0.86 },
      }
    ).setOrigin(0.5).setDepth(10);

    const body = this.add.text(
      centerX,
      bounds.top + bounds.height * 0.42,
      learningText,
      {
        fontFamily: '"Pixelify Sans", monospace',
        color: '#ffffff',
        align: 'center',
        fontSize: `${pxToWorld(this, 23)}px`,
        lineSpacing: 8,
        wordWrap: { width: bounds.width * 0.78 },
      }
    ).setOrigin(0.5).setDepth(10);

    this.learningObjects.push(title, body);

    const makeButton = (y, label, callback, fill) => {
      const button = this.add.rectangle(
        centerX,
        y,
        Math.min(bounds.width * 0.66, pxToWorld(this, 520)),
        pxToWorld(this, 58),
        fill,
        1
      )
        .setDepth(10)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(centerX, y, label, {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '700',
        color: '#ffffff',
        align: 'center',
        fontSize: `${pxToWorld(this, 22)}px`,
      }).setOrigin(0.5).setDepth(11);

      button.on('pointerover', () => button.setAlpha(0.8));
      button.on('pointerout', () => button.setAlpha(1));

      button.on('pointerdown', () => {
        if (this._learningActionTaken) return;

        this._learningActionTaken = true;
        callback();
      });

      this.learningObjects.push(button, text);
    };

    // Tombol pertama: restart episode yang sedang dimainkan.
    makeButton(
      bounds.top + bounds.height * 0.72,
      'MULAI ULANG EPISODE',
      () => {
        resetEpisodeProgress(this.episodeId);

        const episodeSceneKey = {
          1: 'Episode1Scene',
          2: 'Episode2Scene',
          3: 'Episode3Scene',
          4: 'Episode4Scene',
          5: 'Episode5Scene',
          6: 'Episode6Scene',
        }[this.episodeId];

        if (episodeSceneKey) {
          this.scene.start(episodeSceneKey);
        }
      },
      0x2563eb
    );

    // Tombol kedua: tetap sediakan jalan ke episode berikutnya atau buka rapor 6 episode jika episode terakhir.
    makeButton(
      bounds.top + bounds.height * 0.83,
      this.isLastEpisode || this.episodeId === 6
        ? 'LIHAT RAPOR 6 EPISODE & SELESAI'
        : 'LANJUT KE EPISODE BERIKUTNYA',
      () => {
        if (this.isLastEpisode || this.episodeId === 6) {
          completeEpisode(this.episodeId, this.choices);
          this._showFinalReportModal(() => {
            this.scene.start('EpisodeSelectScene');
          });
          return;
        }
        this._completeAndContinue();
      },
      0x15803d
    );
  }

  _completeAndContinue() {
    completeEpisode(this.episodeId, this.choices);

    if (this.isLastEpisode || this.episodeId === 6) {
      this._showFinalReportLandscape(() => {
        this.scene.start('EpisodeSelectScene');
      });
    } else {
      this.scene.start('EpisodeIntroScene', {
        episodeId: this.episodeId + 1,
      });
    }
  }

}
