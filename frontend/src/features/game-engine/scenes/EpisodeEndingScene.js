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
  isCompactLandscape,
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

const REPORT_ROOT_ID = 'nd-report-root';
const REPORT_STYLE_ID = 'nd-report-style';

const REPORT_CSS = `
#${REPORT_ROOT_ID} {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 12%, rgba(255, 221, 87, 0.08), transparent 55%),
    radial-gradient(ellipse at 85% 85%, rgba(96, 165, 250, 0.09), transparent 60%),
    rgba(6, 6, 17, 0.96);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: 'Pixelify Sans', monospace;
  color: #ffffff;
  padding: clamp(14px, 2.5vh, 28px) clamp(16px, 3vw, 36px);
  box-sizing: border-box;
  opacity: 0;
  transition: opacity 320ms cubic-bezier(0.4, 0, 0.2, 1);
  user-select: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  overflow-y: auto;
}
#${REPORT_ROOT_ID}.is-visible {
  opacity: 1;
}
#${REPORT_ROOT_ID}.is-closing {
  opacity: 0;
  pointer-events: none;
}

.nd-report-content {
  width: min(1260px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(12px, 1.8vh, 18px);
  margin: auto;
}

.nd-report-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.nd-report-tag {
  display: inline-block;
  background: #ffdd57;
  color: #14122a;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700;
  font-size: clamp(13px, 1.3vw, 15px);
  padding: 3px 14px;
  border-radius: 4px;
  letter-spacing: 0.06em;
  margin-bottom: 2px;
}
.nd-report-title {
  font-family: 'Jersey 15', monospace;
  font-size: clamp(32px, 4vw, 48px);
  color: #ffdd57;
  letter-spacing: 0.05em;
  margin: 0;
  text-shadow: 0 0 18px rgba(255, 221, 87, 0.45);
  line-height: 1.15;
}
.nd-report-subtitle {
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(16px, 1.6vw, 20px);
  color: #cbd5e1;
  margin: 0;
}

.nd-report-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(10px, 1.4vw, 16px);
  width: 100%;
}
@media (max-width: 820px) {
  .nd-report-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}

.nd-report-card {
  background: rgba(20, 18, 38, 0.92);
  border: 2px solid rgba(255, 221, 87, 0.35);
  border-radius: 8px;
  padding: 10px 16px 12px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.4);
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nd-report-card:hover {
  border-color: rgba(255, 221, 87, 0.85);
  background: rgba(28, 25, 52, 0.96);
  transform: translateY(-2px);
}

.nd-report-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  padding-bottom: 5px;
}
.nd-report-card-title {
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(18px, 1.8vw, 22px);
  font-weight: 700;
  color: #ffdd57;
}
.nd-report-card-badge {
  font-family: 'Jersey 15', monospace;
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 4px;
  white-space: nowrap;
}
.nd-report-card-badge.is-perfect {
  background: rgba(34, 197, 94, 0.22);
  border: 1.5px solid #22c55e;
  color: #86efac;
}
.nd-report-card-badge.is-good {
  background: rgba(234, 179, 8, 0.22);
  border: 1.5px solid #eab308;
  color: #fde047;
}

.nd-report-card-detail {
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.4;
  color: #e2e8f0;
}
.nd-report-card-detail.is-perfect {
  color: #bbf7d0;
}
.nd-report-card-detail.is-good {
  color: #fef08a;
}

.nd-report-note {
  position: relative;
  width: 100%;
  background: rgba(30, 27, 75, 0.92);
  border: 1.8px solid rgba(129, 140, 248, 0.7);
  border-radius: 8px;
  padding: 14px 22px 12px;
  box-sizing: border-box;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  text-align: center;
}
.nd-report-note-tag {
  position: absolute;
  top: -12px;
  left: 20px;
  background: #ffdd57;
  color: #14122a;
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700;
  font-size: 14px;
  padding: 2px 12px;
  border-radius: 4px;
  letter-spacing: 0.04em;
}
.nd-report-note-text {
  margin: 0;
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(16px, 1.6vw, 19px);
  color: #fef08a;
  line-height: 1.5;
}

.nd-report-finish-btn {
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 700;
  color: #ffffff;
  background: linear-gradient(135deg, #16a34a, #15803d);
  border: 2px solid #86efac;
  border-radius: 8px;
  padding: 12px 42px;
  cursor: pointer;
  letter-spacing: 0.03em;
  box-shadow: 0 6px 22px rgba(22, 163, 74, 0.45), 0 0 14px rgba(134, 239, 172, 0.35);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
  outline: none;
}
.nd-report-finish-btn:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 28px rgba(22, 163, 74, 0.6), 0 0 20px rgba(134, 239, 172, 0.5);
  filter: brightness(1.1);
}
.nd-report-finish-btn:active {
  transform: translateY(1px);
}

@media (max-height: 520px) {
  #nd-report-root {
    padding: 8px 16px;
    align-items: flex-start;
  }
  .nd-report-content {
    gap: 8px;
  }
  .nd-report-title {
    font-size: 20px;
  }
  .nd-report-subtitle {
    font-size: 13px;
  }
  .nd-report-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }
  .nd-report-card {
    padding: 6px 10px;
    gap: 3px;
  }
  .nd-report-card-title {
    font-size: 13px;
  }
  .nd-report-card-badge {
    font-size: 14px;
    padding: 1px 6px;
  }
  .nd-report-card-detail {
    font-size: 11px;
    line-height: 1.25;
  }
  .nd-report-note {
    padding: 8px 14px 6px;
  }
  .nd-report-note-tag {
    font-size: 11px;
    top: -9px;
  }
  .nd-report-note-text {
    font-size: 12px;
    line-height: 1.3;
  }
  .nd-report-finish-btn {
    font-size: 14px;
    padding: 8px 24px;
  }
}
`;

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

    this.aspectEvaluation = evaluateEpisodeAspects(this.episodeId, this.choices);
    this.needsAspectRetry = Boolean(this.aspectEvaluation.needsRetry);

    const endingChoices = this.isLastEpisode
      ? getStoryChoices(this.episodeId, this.choices)
      : this.choices;
    const endingResult = computeEnding(
      this.episodeId,
      endingChoices,
      this.aspectEvaluation.endingKey,
    );

    this.endingKey = this.aspectEvaluation.endingKey || endingResult.endingKey;
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
    const fallback = computeEnding(this.episodeId, this.choices, this.endingKey);
    const totalResponses = Object.values(fallback.tally).reduce(
      (total, count) => total + count,
      0,
    );
    const fallbackCount = fallback.tally[fallback.dominant] || 0;

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
      this._cleanupFinalReport();
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
    const compact = isCompactLandscape(this);

    const evalData = this.aspectEvaluation;
    const titleFont = compact ? 24 : pxToWorld(this, 34);
    const subTitleFont = compact ? 15 : pxToWorld(this, 19);
    const bodyFont = compact ? 13.5 : pxToWorld(this, 18);
    const badgeFont = compact ? 15 : pxToWorld(this, 20);
    const cardWidth = Math.min(bounds.width * 0.94, compact ? 780 : pxToWorld(this, 900));

    const titleY = compact ? bounds.top + bounds.height * 0.05 : bounds.top + bounds.height * 0.08;
    const title = this.add
      .text(centerX, titleY, 'EVALUASI 3 LANGKAH MISI', {
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

    const subTitleY = compact ? bounds.top + bounds.height * 0.11 : bounds.top + bounds.height * 0.145;
    const subTitle = this.add
      .text(
        centerX,
        subTitleY,
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
    const listStartY = compact ? bounds.top + bounds.height * 0.18 : bounds.top + bounds.height * 0.22;
    const itemGap = compact ? bounds.height * 0.145 : bounds.height * 0.132;
    const itemHeight = compact ? 72 : pxToWorld(this, 70);

    evalData.aspects.forEach((aspect, idx) => {
      const y = listStartY + idx * itemGap;
      const statusIcon = aspect.fulfilled ? '[TERPENUHI]' : '[BELUM]';
      const statusColor = aspect.fulfilled ? '#4ade80' : '#fb7185';
      const bgFill = aspect.fulfilled ? 0x142820 : 0x281820;
      const strokeColor = aspect.fulfilled ? 0x22c55e : 0xf43f5e;

      const itemBg = this.add
        .rectangle(centerX, y + 10, cardWidth, itemHeight, bgFill, 0.92)
        .setStrokeStyle(2, strokeColor, 0.75);
      this._aspectContainer.add(itemBg);

      const statusBadge = this.add
        .text(centerX - cardWidth / 2 + (compact ? 12 : 18), y + 10, statusIcon, {
          fontFamily: '"Jersey 15", monospace',
          fontSize: `${badgeFont}px`,
          color: statusColor,
        })
        .setOrigin(0, 0.5);
      this._aspectContainer.add(statusBadge);

      const textOffsetX = compact ? 116 : pxToWorld(this, 142);
      const aspectText = this.add
        .text(
          centerX - cardWidth / 2 + textOffsetX,
          y + 10,
          `${aspect.id}. ${aspect.title}\n${aspect.feedback}`,
          {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${bodyFont}px`,
            color: '#f8fafc',
            lineSpacing: compact ? 2 : 4,
            wordWrap: { width: cardWidth - textOffsetX - (compact ? 12 : 18) },
          },
        )
        .setOrigin(0, 0.5);
      this._aspectContainer.add(aspectText);
    });

    // Summary Box
    const summaryY = compact ? bounds.top + bounds.height * 0.67 : bounds.top + bounds.height * 0.68;
    const summaryFont = compact ? 14 : pxToWorld(this, 18);
    const summaryText = this.add
      .text(centerX, summaryY, evalData.feedbackSummary, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${summaryFont}px`,
        fontStyle: '600',
        color: evalData.needsRetry ? '#fecdd3' : '#fef08a',
        align: 'center',
        wordWrap: { width: cardWidth - 20 },
        lineSpacing: compact ? 3 : 5,
      })
      .setOrigin(0.5);
    this._aspectContainer.add(summaryText);

    const btnY = compact ? bounds.top + bounds.height * 0.86 : bounds.top + bounds.height * 0.87;
    const btnW = compact ? Math.min(cardWidth * 0.55, 340) : (evalData.needsRetry ? pxToWorld(this, 360) : pxToWorld(this, 380));
    const btnH = compact ? 46 : pxToWorld(this, 54);
    const btnFont = compact ? 16 : pxToWorld(this, 20);

    // Action Buttons
    if (evalData.needsRetry) {
      // Tombol 1: Ulangi Episode (merah)
      // Tombol 2: Lanjutkan Saja (gelap bergaris, mencatat ending buruk di guru BK)
      const dualBtnW = compact ? Math.min(cardWidth * 0.46, 260) : pxToWorld(this, 280);
      const gap = compact ? 12 : pxToWorld(this, 20);
      const retryX = centerX - (dualBtnW / 2 + gap / 2);
      const contX = centerX + (dualBtnW / 2 + gap / 2);

      const retryBtn = this.add
        .rectangle(retryX, btnY, dualBtnW, btnH, 0xe11d48, 1)
        .setStrokeStyle(2, 0xffa4b6, 0.9)
        .setInteractive({ useHandCursor: true });
      const retryText = this.add
        .text(retryX, btnY, 'ULANGI EPISODE', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${btnFont}px`,
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

      // Tombol Lanjutkan Saja
      const continueBtn = this.add
        .rectangle(contX, btnY, dualBtnW, btnH, 0x334155, 1)
        .setStrokeStyle(2, 0x94a3b8, 0.9)
        .setInteractive({ useHandCursor: true });
      const continueText = this.add
        .text(contX, btnY, 'LANJUTKAN SAJA >', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${btnFont}px`,
          fontStyle: '700',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this._aspectContainer.add(continueBtn);
      this._aspectContainer.add(continueText);

      const doContinue = () => {
        this._advancing = true;
        this._teardownInput();
        void this._goToJournal();
      };
      continueBtn.on('pointerdown', doContinue);
      continueText.setInteractive({ useHandCursor: true }).on('pointerdown', doContinue);
    } else {
      // Pemain memenuhi minimal 1 aspek: Lanjut ke Jurnal Refleksi terlebih dahulu
      // (Jurnal Refleksi selalu muncul duluan; Rapor 6 Episode baru keluar setelah jurnal selesai diisi di Ep 6)
      const nextBtn = this.add
        .rectangle(centerX, btnY, btnW, btnH, 0x16a34a, 1)
        .setStrokeStyle(2, 0x86efac, 0.9)
        .setInteractive({ useHandCursor: true });
      const nextText = this.add
        .text(centerX, btnY, 'LANJUT KE JURNAL REFLEKSI >', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${btnFont}px`,
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

  _cleanupFinalReport() {
    if (typeof document === 'undefined') return;
    const root = document.getElementById(REPORT_ROOT_ID);
    if (root) {
      root.classList.add('is-closing');
      setTimeout(() => {
        root.remove();
      }, 240);
    }
  }

  _showFinalReportLandscape(onCloseCallback = null) {
    if (!this._isSceneValid()) return;

    this._stage = 'final_report';
    this._finalReportOnClose = onCloseCallback;
    this._readyToAdvance = false;
    this._teardownInput();

    // Sembunyikan elemen canvas ending sebelumnya
    this.endingObjects?.forEach((obj) => obj.setVisible(false));
    this.emotionObjects?.forEach((obj) => obj.setVisible(false));
    this.emotionLoadingText?.setVisible(false);
    this.promptText?.setVisible(false);
    this._aspectContainer?.setVisible(false);
    this.learningObjects?.forEach((obj) => obj.setVisible(false));

    if (typeof document === 'undefined') return;

    // Bersihkan overlay lama jika ada
    document.getElementById(REPORT_ROOT_ID)?.remove();

    // Pastikan stylesheet terpasang
    if (!document.getElementById(REPORT_STYLE_ID)) {
      const style = document.createElement('style');
      style.id = REPORT_STYLE_ID;
      style.textContent = REPORT_CSS;
      document.head.appendChild(style);
    }

    const reportData = getFullAspectReport();

    // Bangun elemen HTML kartu rapor
    const cardsHtml = EPISODES.map((ep) => {
      const data = reportData[ep.id];
      const fulfilled = data ? data.fulfilledCount : 3;
      const total = data ? data.totalCount : 3;
      const isPerfect = fulfilled === total;
      const badgeClass = isPerfect ? 'is-perfect' : 'is-good';
      const badgeText = `${fulfilled}/${total} ${isPerfect ? 'Sempurna' : 'Tercapai'}`;

      let detailLine = '';
      if (data && Array.isArray(data.aspects)) {
        const passedTitles = data.aspects
          .filter((a) => a.fulfilled)
          .map((a) => a.title);
        detailLine = passedTitles.length > 0
          ? `Langkah: ${passedTitles.join(', ')}`
          : 'Perlu latihan lebih lanjut';
      } else {
        detailLine = 'Seluruh 3 aspek berhasil dipenuhi dengan baik.';
      }

      return `
        <div class="nd-report-card">
          <div class="nd-report-card-top">
            <span class="nd-report-card-title">${ep.title}</span>
            <span class="nd-report-card-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="nd-report-card-detail ${badgeClass}">
            ${detailLine}
          </div>
        </div>
      `;
    }).join('');

    const root = document.createElement('div');
    root.id = REPORT_ROOT_ID;
    root.innerHTML = `
      <div class="nd-report-content">
        <div class="nd-report-header">
          <span class="nd-report-tag">RAPOR 6 EPISODE</span>
          <h1 class="nd-report-title">CAPAIAN EVALUASI 6 EPISODE — NAWASENA DARA</h1>
          <p class="nd-report-subtitle">Rangkuman pemenuhan langkah tujuan di setiap episode perjalananmu di sekolah:</p>
        </div>

        <div class="nd-report-grid">
          ${cardsHtml}
        </div>

        <div class="nd-report-note">
          <span class="nd-report-note-tag">Pesan Kak Dara</span>
          <p class="nd-report-note-text">
            &ldquo;Hebat sudah menyelesaikan seluruh 6 episode! Dari rapor ini kamu bisa melihat langkah mana yang sudah kamu kuasai dan mana yang perlu terus dilatih dalam keseharian.&rdquo;
          </p>
        </div>

        <button id="nd-report-finish-btn" class="nd-report-finish-btn" type="button">
          SELESAI &amp; KEMBALI KE MENU UTAMA &gt;
        </button>
      </div>
    `;

    document.body.appendChild(root);

    // Fade-in mulus di frame berikutnya
    requestAnimationFrame(() => {
      root.classList.add('is-visible');
    });

    const finishBtn = root.querySelector('#nd-report-finish-btn');
    if (finishBtn) {
      finishBtn.addEventListener('click', () => {
        finishBtn.disabled = true;
        this._cleanupFinalReport();
        if (typeof onCloseCallback === 'function') {
          onCloseCallback();
        } else {
          this.scene.start('EpisodeSelectScene');
        }
      });
    }
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
    const compact = isCompactLandscape(this);

    this.endingLabel
      ?.setFontSize(compact ? 22 : pxToWorld(this, 32))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.12 : 0.16))
      .setWordWrapWidth(wrapWidth);
    this.endingTitle
      ?.setFontSize(compact ? 24 : pxToWorld(this, 36))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.28 : 0.31))
      .setWordWrapWidth(wrapWidth);
    this.endingSummary
      ?.setFontSize(compact ? 16 : pxToWorld(this, 23))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.56 : 0.59))
      .setWordWrapWidth(bounds.width * 0.82);

    const barWidth = Math.min(bounds.width * 0.74, compact ? 420 : pxToWorld(this, 560));
    const barHeight = compact ? 22 : pxToWorld(this, 30);
    const barY = bounds.top + bounds.height * (compact ? 0.52 : 0.55);
    const barLeft = centerX - barWidth / 2;
    const fillWidth = Math.max(compact ? 8 : pxToWorld(this, 10), barWidth * this.emotionConfidence);

    this.emotionHeaderText
      ?.setFontSize(compact ? 20 : pxToWorld(this, 30))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.14 : 0.18))
      .setWordWrapWidth(wrapWidth);
    this.emotionLabel
      ?.setFontSize(
        compact ? 36 : pxToWorld(this, this.dominantEmotion === 'menyinggung' ? 52 : 64),
      )
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.34 : 0.37))
      .setWordWrapWidth(wrapWidth);
    this.emotionBarTrack?.setPosition(centerX, barY).setDisplaySize(barWidth, barHeight);
    this.emotionBarFill
      ?.setPosition(barLeft, barY)
      .setDisplaySize(fillWidth, barHeight);
    this.emotionPercent
      ?.setFontSize(compact ? 18 : pxToWorld(this, 26))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.62 : 0.64));
    this.emotionExplainText
      ?.setFontSize(compact ? 13 : pxToWorld(this, 19))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.74 : 0.76))
      .setWordWrapWidth(Math.min(bounds.width * 0.86, compact ? 680 : pxToWorld(this, 780)));
    this.emotionLoadingText
      ?.setFontSize(compact ? 22 : pxToWorld(this, 30))
      .setPosition(centerX, bounds.centerY);
    this.promptText
      ?.setFontSize(compact ? 15 : pxToWorld(this, 22))
      .setPosition(centerX, bounds.top + bounds.height * (compact ? 0.90 : 0.91));

    if (this._stage === 'aspect' && this._aspectContainer) {
      this._revealAspectStage();
    }
    // Stage final_report menggunakan lapisan DOM responsif asli layar
    // sehingga tidak perlu digambar ulang saat kanvas Phaser berubah ukuran.
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
      completeEpisode(this.episodeId, this.choices, this.endingKey);
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
    const compact = isCompactLandscape(this);

    const title = this.add.text(
      centerX,
      bounds.top + bounds.height * (compact ? 0.12 : 0.17),
      'YUK, BELAJAR DARI PILIHANMU',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontStyle: '700',
        color: '#ffdd57',
        align: 'center',
        fontSize: `${compact ? 24 : pxToWorld(this, 34)}px`,
        wordWrap: { width: bounds.width * 0.86 },
      }
    ).setOrigin(0.5).setDepth(10);

    const body = this.add.text(
      centerX,
      bounds.top + bounds.height * (compact ? 0.40 : 0.42),
      learningText,
      {
        fontFamily: '"Pixelify Sans", monospace',
        color: '#ffffff',
        align: 'center',
        fontSize: `${compact ? 15 : pxToWorld(this, 23)}px`,
        lineSpacing: compact ? 4 : 8,
        wordWrap: { width: bounds.width * 0.82 },
      }
    ).setOrigin(0.5).setDepth(10);

    this.learningObjects.push(title, body);

    const makeButton = (y, label, callback, fill) => {
      const button = this.add.rectangle(
        centerX,
        y,
        Math.min(bounds.width * 0.66, compact ? 380 : pxToWorld(this, 520)),
        compact ? 44 : pxToWorld(this, 58),
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
        fontSize: `${compact ? 16 : pxToWorld(this, 22)}px`,
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
      bounds.top + bounds.height * (compact ? 0.85 : 0.83),
      this.isLastEpisode || this.episodeId === 6
        ? 'LIHAT RAPOR 6 EPISODE & SELESAI'
        : 'LANJUT KE EPISODE BERIKUTNYA',
      () => {
        if (this.isLastEpisode || this.episodeId === 6) {
          completeEpisode(this.episodeId, this.choices, this.endingKey);
          this._showFinalReportLandscape(() => {
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
    completeEpisode(this.episodeId, this.choices, this.endingKey);

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
