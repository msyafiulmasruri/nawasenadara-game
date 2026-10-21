import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getVisibleBounds, syncGameSizeToOrientation, isPortrait } from '../utils/visibleBounds';
import { completeEpisode } from '../utils/progressStore';

// Data dialog terkurasi dengan arahan/hint bahasa santai & mudah dimengerti anak SMA
const FALLBACK_DIALOGUES = [
  {
    round: 1,
    topic: 'Candaan Seksis & Stereotip Gender',
    npc_name: 'Reno',
    npc_line: 'Halah, baperan amat sih lu jadi cewek! Lagian cewek ngapain sih sok ambis mimpin kelompok, ujungnya kan paling cuma ngurus dapur doang, haha!',
    context: 'Reno meremehkan kepemimpinan perempuan dengan stereotip kolot di depan teman-teman kelas.',
    guide_hint: 'Tegur dia bahwa cewek juga bisa memimpin dan minta dia stop meremehkan.',
  },
  {
    round: 2,
    topic: 'Penyebaran Foto Aib & Rumor di Grup Chat',
    npc_name: 'Reno',
    npc_line: 'Woy santai napa! Foto lu di grup angkatan tuh cuma buat lucu-lucuan doang kali. Gitu aja ngambek pengen ngadu ke wali kelas, gak asik lu parah!',
    context: 'Reno melakukan gaslighting setelah menyebarkan foto aib teman di grup chat sekolah.',
    guide_hint: 'Tolak leluconnya dan minta foto aibmu segera dihapus dari grup.',
  },
  {
    round: 3,
    topic: 'Pelanggaran Privasi & Desakan PAP Foto Pribadi',
    npc_name: 'Reno',
    npc_line: 'Bagi nomor WA pribadi lu lah, sama kirim PAP muka lu sekarang juga! Jangan sok jual mahal deh, masa sama temen seangkatan doang pelit amat!',
    context: 'Reno memaksa meminta kontak pribadi dan foto diri secara agresif.',
    guide_hint: 'Tolak tegas permintaan nomor WA dan fotomu karena itu privasimu.',
  },
  {
    round: 4,
    topic: 'Catcalling & Komentar Fisik di Tempat Umum Sekolah',
    npc_name: 'Reno',
    npc_line: 'Cuit cuit... Cewek manis lewat nih! Mukanya jangan judes-judes gitu napa, senyum dikit kek biar enak diliat anak-anak cowok di kantin!',
    context: 'Reno melakukan catcalling dan mengomentari penampilan fisik di area umum sekolah.',
    guide_hint: 'Tegur langsung bahwa kamu risih dan minta dia berhenti menggoda.',
  },
  {
    round: 5,
    topic: 'Paksaan Fisik & Hadangan di Tempat Sepi Dekat Gerbang',
    npc_name: 'Reno',
    npc_line: 'Heh, buruan ikut gue ke gang samping pos satpam sekarang! Gak usah lebay mau teriak atau manggil orang, tinggal nurut apa susahnya sih?!',
    context: 'Reno memaksa secara fisik untuk ikut ke tempat sepi saat pulang sekolah.',
    guide_hint: 'Tolak ikut ke tempat sepi dan katakan kamu akan lapor ke satpam atau guru.',
  },
];

const EMOTION_TIERS = [
  { id: 1, label: 'aman', name: 'Aman', color: 0x10b981, hex: '#10b981' },
  { id: 2, label: 'netral', name: 'Netral', color: 0x22c55e, hex: '#22c55e' },
  { id: 3, label: 'sedih', name: 'Sedih', color: 0x38bdf8, hex: '#38bdf8' },
  { id: 4, label: 'takut', name: 'Takut', color: 0xeab308, hex: '#eab308' },
  { id: 5, label: 'menyinggung', name: 'Tersinggung', color: 0xf97316, hex: '#f97316' },
  { id: 6, label: 'marah', name: 'Marah', color: 0xef4444, hex: '#ef4444' },
];

export default class MiniBossScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MiniBossScene' });
  }

  init(data) {
    this.episodeId = data?.episodeId || 6;
    this.isLastEpisode = data?.isLastEpisode ?? true;
    this.choices = data?.choices || [];

    // State pertempuran
    this.maxDaraHp = 3;
    this.daraHp = 3;
    this.maxBossHp = 5;
    this.bossHp = 5;

    this.currentRound = 1;
    this.totalRounds = 5;
    this.currentEmotionTier = 2; // Default: Netral (Tier 2)

    this.dialogues = [...FALLBACK_DIALOGUES];
    this.currentDialogue = this.dialogues[0];

    this.isTypewriterActive = false;
    this.typewriterTimer = null;
    this.fullNpcText = '';
    this.currentDisplayedText = '';

    this.isEvaluating = false;
    this.isBattleOver = false;

    // DOM & UI elemen
    this.domInputWrapper = null;
    this.daraHpPips = [];
    this.bossHpPips = [];
    this.meterLabels = [];
  }

  create() {
    // 1. Audio Manager
    this.audioManager = new AudioManager();
    this.audioManager.init();
    this.audioManager.startBossBGM();

    // 2. Responsive viewport resize
    syncGameSizeToOrientation(this);
    this.scale.on('resize', this._handleResize, this);

    // 3. Render Background Cutscenes
    this._createBackgrounds();

    // 4. Render HUD di paling atas
    this._createHUD();

    // 5. Render Loading Bar Vertikal di sebelah KIRI
    this._createVerticalEmotionMeter();

    // 6. Render Kotak Dialog Reno di area ATAS
    this._createTopDialogueUI();

    // 7. Muat dialog dinamis dari AI backend jika tersedia
    this._fetchAiDialogues();

    // 8. Mulai Ronde 1
    this._startRound(1);

    // Cleanup saat scene ditutup/berpindah
    this.events.once('shutdown', () => {
      this._cleanupScene();
    });
  }

  _cleanupScene() {
    this._removeHtmlInput();
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
    this.audioManager?.stopBGM();
    this.audioManager?.destroy();
    this.audioManager = null;
    this.scale.off('resize', this._handleResize, this);
    window.__nawasenadaraInput?.enableGameKeyboard?.();
  }

  _handleResize() {
    syncGameSizeToOrientation(this);
    this._layoutElements();
  }

  _createBackgrounds() {
    const bounds = getVisibleBounds(this);

    // Background 1: Konfrontasi Tatap Muka
    this.bgConfrontation = this.add.image(bounds.centerX, bounds.centerY, 'miniboss-confrontation-cg')
      .setOrigin(0.5)
      .setDepth(1);

    // Background 2: Reno Kalah / Tertegun (Crossfade saat kena damage atau menang)
    this.bgDefeated = this.add.image(bounds.centerX, bounds.centerY, 'miniboss-defeated-cg')
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(2);

    // Vignette atas (untuk latar HUD & Dialog)
    this.topVignette = this.add.rectangle(bounds.centerX, bounds.top + 75, bounds.width + 40, 150, 0x070b14, 0.88)
      .setOrigin(0.5)
      .setDepth(3);

    // Vignette bawah (untuk latar input)
    this.bottomVignette = this.add.rectangle(bounds.centerX, bounds.bottom - 45, bounds.width + 40, 90, 0x070b14, 0.8)
      .setOrigin(0.5)
      .setDepth(3);

    this._scaleBackgrounds();
  }

  _scaleBackgrounds() {
    const bounds = getVisibleBounds(this);
    if (!this.bgConfrontation || !this.bgConfrontation.width) return;

    const scaleX = bounds.width / this.bgConfrontation.width;
    const scaleY = bounds.height / this.bgConfrontation.height;
    const bgScale = Math.max(scaleX, scaleY);

    this.bgConfrontation.setPosition(bounds.centerX, bounds.centerY).setScale(bgScale);
    if (this.bgDefeated) {
      this.bgDefeated.setPosition(bounds.centerX, bounds.centerY).setScale(bgScale);
    }

    if (this.topVignette) {
      this.topVignette.setPosition(bounds.centerX, bounds.top + 75).setSize(bounds.width + 20, 150);
    }
    if (this.bottomVignette) {
      this.bottomVignette.setPosition(bounds.centerX, bounds.bottom - 45).setSize(bounds.width + 20, 90);
    }
  }

  _createHUD() {
    this.hudContainer = this.add.container(0, 0).setDepth(15);

    // ── KIRI: DARA HP ──
    this.daraPanel = this.add.rectangle(0, 0, 120, 32, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x334155);
    this.daraNameText = this.add.text(-50, 0, 'DARA', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0, 0.5);

    this.daraHpGroup = this.add.container(10, 0);
    this.daraHpPips = [];
    for (let i = 0; i < this.maxDaraHp; i++) {
      const pip = this.add.rectangle(i * 15, 0, 11, 14, 0x10b981, 1)
        .setStrokeStyle(1, 0x047857);
      this.daraHpPips.push(pip);
      this.daraHpGroup.add(pip);
    }
    this.daraGroup = this.add.container(0, 0, [this.daraPanel, this.daraNameText, this.daraHpGroup]);
    this.hudContainer.add(this.daraGroup);

    // ── KANAN: RENO HP ──
    this.bossPanel = this.add.rectangle(0, 0, 136, 32, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x334155);
    this.bossNameText = this.add.text(-58, 0, 'RENO', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0, 0.5);

    this.bossHpGroup = this.add.container(-8, 0);
    this.bossHpPips = [];
    for (let i = 0; i < this.maxBossHp; i++) {
      const pip = this.add.rectangle(i * 13, 0, 9, 14, 0xdc2626, 1)
        .setStrokeStyle(1, 0x991b1b);
      this.bossHpPips.push(pip);
      this.bossHpGroup.add(pip);
    }
    this.bossGroup = this.add.container(0, 0, [this.bossPanel, this.bossNameText, this.bossHpGroup]);
    this.hudContainer.add(this.bossGroup);

    // ── TENGAH: STATUS RONDE ──
    this.roundInfoText = this.add.text(0, 0, 'RONDE 1 / 5', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);
    this.hudContainer.add(this.roundInfoText);

    this._layoutElements();
  }

  _createVerticalEmotionMeter() {
    this.emotionMeterContainer = this.add.container(0, 0).setDepth(18);

    this.meterTrackW = 20;
    this.meterTrackH = 132;

    // Header teks vertikal
    this.meterHeader = this.add.text(0, -this.meterTrackH / 2 - 12, 'EMOSI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Background track loading bar
    this.meterTrack = this.add.rectangle(0, 0, this.meterTrackW, this.meterTrackH, 0x090d16, 0.95)
      .setStrokeStyle(1.5, 0x334155);

    // Bar pengisian vertikal (tumbuh dari bawah ke atas)
    // Titik tumpu origin Y = 1 (bawah track)
    this.meterFill = this.add.rectangle(
      0,
      this.meterTrackH / 2 - 2,
      this.meterTrackW - 4,
      Math.round((this.meterTrackH - 4) * (2 / 6)),
      0x22c55e,
      1
    ).setOrigin(0.5, 1);

    this.emotionMeterContainer.add([this.meterHeader, this.meterTrack, this.meterFill]);

    // Label teks tingkat 1 - 6 di samping kanan bar
    this.meterLabels = [];
    const stepH = (this.meterTrackH - 8) / 6;

    EMOTION_TIERS.forEach((tier, index) => {
      // index 0 = tier 1 (Aman) di paling bawah
      const labelY = this.meterTrackH / 2 - 6 - (index * stepH);
      const text = this.add.text(this.meterTrackW / 2 + 6, labelY, `${tier.id} ${tier.name}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '10px',
        color: tier.id === this.currentEmotionTier ? '#f8fafc' : '#64748b',
        fontStyle: tier.id === this.currentEmotionTier ? '700' : '400',
      }).setOrigin(0, 0.5);

      this.meterLabels.push(text);
      this.emotionMeterContainer.add(text);
    });
  }

  _createTopDialogueUI() {
    const bounds = getVisibleBounds(this);

    // Container Kotak Dialog Reno di ATAS
    this.dialogueContainer = this.add.container(bounds.centerX, bounds.top + 88).setDepth(20);

    const boxW = Math.min(bounds.width - 24, 600);
    const boxH = 82;

    // Background Panel Dialog
    this.dialogueBg = this.add.rectangle(0, 0, boxW, boxH, 0x090d16, 0.95)
      .setStrokeStyle(1.5, 0x334155, 1)
      .setInteractive({ useHandCursor: true });

    // Header Nama NPC Reno
    this.npcNameBox = this.add.rectangle(-boxW / 2 + 52, -boxH / 2, 88, 20, 0x1e293b, 1)
      .setStrokeStyle(1, 0x475569);
    this.npcNameLabel = this.add.text(-boxW / 2 + 52, -boxH / 2, 'RENO', {
      fontFamily: '"Jersey 15", monospace',
      fontSize: '14px',
      color: '#f87171',
    }).setOrigin(0.5);

    // Topik Kasus Badge
    this.topicLabel = this.add.text(-boxW / 2 + 104, -boxH / 2, '[Topik: Candaan Seksis]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#94a3b8',
    }).setOrigin(0, 0.5);

    // Teks Ucapan Reno (Huruf besar & jelas)
    this.npcSpeechText = this.add.text(-boxW / 2 + 16, -14, '', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '16px',
      color: '#ffffff',
      lineSpacing: 5,
      wordWrap: { width: boxW - 32 },
    });

    // Petunjuk ketuk untuk mempercepat
    this.tapHintText = this.add.text(boxW / 2 - 14, boxH / 2 - 12, 'Klik untuk lanjut >', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#94a3b8',
    }).setOrigin(1, 0.5).setAlpha(0);

    this.dialogueContainer.add([
      this.dialogueBg,
      this.npcNameBox,
      this.npcNameLabel,
      this.topicLabel,
      this.npcSpeechText,
      this.tapHintText,
    ]);

    // Klik kotak dialog untuk langsung menuntaskan teks
    this.dialogueBg.on('pointerdown', () => {
      if (this.isTypewriterActive) {
        this._finishTypewriterInstantly();
      }
    });
  }

  _layoutElements() {
    const bounds = getVisibleBounds(this);
    this._scaleBackgrounds();

    // Posisi Bar HUD di paling atas
    const topMargin = bounds.top + 20;
    if (this.daraGroup) this.daraGroup.setPosition(bounds.left + 72, topMargin);
    if (this.bossGroup) this.bossGroup.setPosition(bounds.right - 80, topMargin);
    if (this.roundInfoText) this.roundInfoText.setPosition(bounds.centerX, topMargin);

    // Posisi Loading Bar Vertikal di sebelah KIRI
    if (this.emotionMeterContainer) {
      this.emotionMeterContainer.setPosition(bounds.left + 36, bounds.centerY + 8);
    }

    // Posisi Kotak Dialog di ATAS
    if (this.dialogueContainer) {
      const boxW = Math.min(bounds.width - 24, 600);
      const boxH = 82;
      const boxY = topMargin + 54;

      this.dialogueContainer.setPosition(bounds.centerX, boxY);
      this.dialogueBg.setSize(boxW, boxH);
      this.npcNameBox.setPosition(-boxW / 2 + 52, -boxH / 2);
      this.npcNameLabel.setPosition(-boxW / 2 + 52, -boxH / 2);
      this.topicLabel.setPosition(-boxW / 2 + 104, -boxH / 2);
      this.npcSpeechText.setPosition(-boxW / 2 + 16, -14).setStyle({ wordWrap: { width: boxW - 32 } });
      this.tapHintText.setPosition(boxW / 2 - 14, boxH / 2 - 12);
    }

    // Reposisi input HTML jika sedang aktif
    this._repositionHtmlInput();
  }

  async _fetchAiDialogues() {
    try {
      const nlp = window.__nawasenadaraNlp;
      if (nlp?.getMiniBossDialogues) {
        const res = await nlp.getMiniBossDialogues();
        if (res?.dialogues && Array.isArray(res.dialogues) && res.dialogues.length >= 5) {
          this.dialogues = res.dialogues;
          this.currentDialogue = this.dialogues[this.currentRound - 1] || this.dialogues[0];
          this._updateRoundInfo();
        }
      }
    } catch (err) {
      console.warn('[MiniBossScene] Menggunakan dialog terkurasi lokal:', err?.message || err);
    }
  }

  _startRound(roundNumber) {
    if (this.isBattleOver) return;

    this.currentRound = roundNumber;
    this.currentDialogue = this.dialogues[roundNumber - 1] || FALLBACK_DIALOGUES[roundNumber - 1] || FALLBACK_DIALOGUES[0];

    this._updateRoundInfo();
    this._removeHtmlInput();

    // Siapkan teks ucapan Reno
    this.fullNpcText = `"${this.currentDialogue.npc_line}"`;
    this.currentDisplayedText = '';
    this.npcSpeechText.setText('');
    this.tapHintText.setAlpha(0);

    this.isTypewriterActive = true;
    let charIndex = 0;

    if (this.typewriterTimer) this.typewriterTimer.remove();

    this.typewriterTimer = this.time.addEvent({
      delay: 20,
      repeat: this.fullNpcText.length - 1,
      callback: () => {
        if (!this.isTypewriterActive) return;
        charIndex++;
        this.currentDisplayedText = this.fullNpcText.substring(0, charIndex);
        this.npcSpeechText.setText(this.currentDisplayedText);

        if (charIndex % 3 === 0) {
          this.audioManager?.playTypewriterBlip();
        }

        if (charIndex >= this.fullNpcText.length) {
          this._onTypewriterComplete();
        }
      },
    });
  }

  _finishTypewriterInstantly() {
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
    this.isTypewriterActive = false;
    this.currentDisplayedText = this.fullNpcText;
    this.npcSpeechText.setText(this.fullNpcText);
    this._onTypewriterComplete();
  }

  _onTypewriterComplete() {
    this.isTypewriterActive = false;
    this.tapHintText.setAlpha(0.8);

    // Kotak input muncul SETELAH Reno selesai berbicara
    this.time.delayedCall(250, () => {
      this._showHtmlInput();
    });
  }

  _showHtmlInput() {
    if (this.isBattleOver || this.domInputWrapper) return;

    // Matikan tombol game keyboard Phaser saat mengetik
    window.__nawasenadaraInput?.disableGameKeyboard?.();

    const parentEl = this.game.canvas.parentElement || document.body;
    const wrapper = document.createElement('div');
    wrapper.id = 'miniboss-input-overlay';
    wrapper.style.position = 'absolute';
    wrapper.style.zIndex = '999';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.pointerEvents = 'auto';

    const hint = this.currentDialogue.guide_hint || 'Ketik kalimat balasan asertifmu:';

    wrapper.innerHTML = `
      <div style="
        background: rgba(15, 23, 42, 0.96);
        border: 1.5px solid #334155;
        border-radius: 10px;
        padding: 10px 14px;
        color: #f8fafc;
        font-family: 'Pixelify Sans', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 13px; font-weight: 700; color: #f8fafc;">Respon Asertif:</span>
          <span style="font-size: 11px; color: #94a3b8;">Ronde ${this.currentRound} / ${this.totalRounds}</span>
        </div>
        
        <div style="font-size: 12px; color: #cbd5e1; line-height: 1.4;">
          Panduan: ${hint}
        </div>

        <div style="display: flex; gap: 8px;">
          <textarea
            id="miniboss-textarea"
            rows="2"
            placeholder="Tuliskan responmu di sini... (Bersikap tenang, tegas, dan tentukan batasanmu)"
            style="
              flex: 1;
              background: #090d16;
              border: 1.5px solid #334155;
              border-radius: 6px;
              color: #ffffff;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 14px;
              line-height: 1.4;
              padding: 8px 10px;
              resize: none;
              outline: none;
            "
          ></textarea>

          <button
            id="miniboss-submit-btn"
            type="button"
            style="
              background: #1e293b;
              border: 1.5px solid #475569;
              border-radius: 6px;
              color: #ffffff;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 13px;
              font-weight: 700;
              padding: 0 16px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              white-space: nowrap;
            "
          >
            Kirim Respon
          </button>
        </div>
        <div id="miniboss-error-hint" style="font-size: 11px; color: #f87171; display: none;"></div>
      </div>
    `;

    parentEl.appendChild(wrapper);
    this.domInputWrapper = wrapper;

    const textarea = wrapper.querySelector('#miniboss-textarea');
    const submitBtn = wrapper.querySelector('#miniboss-submit-btn');
    const errorHint = wrapper.querySelector('#miniboss-error-hint');

    textarea.focus();

    textarea.addEventListener('focus', () => {
      textarea.style.borderColor = '#64748b';
      window.__nawasenadaraInput?.disableGameKeyboard?.();
    });

    textarea.addEventListener('blur', () => {
      textarea.style.borderColor = '#334155';
    });

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitHandler();
      }
    });

    const submitHandler = () => {
      if (this.isEvaluating) return;
      const text = textarea.value.trim();
      if (!text || text.length < 3) {
        errorHint.textContent = 'Ketik kalimat balasanmu terlebih dahulu.';
        errorHint.style.display = 'block';
        textarea.focus();
        return;
      }
      errorHint.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.textContent = 'Menganalisis...';
      textarea.disabled = true;

      this._evaluateResponse(text);
    };

    submitBtn.addEventListener('click', submitHandler);

    this._repositionHtmlInput();
  }

  _repositionHtmlInput() {
    if (!this.domInputWrapper) return;
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const isPort = isPortrait(this);

    const inputWidth = Math.min(rect.width - 24, isPort ? 440 : 540);
    const leftPos = rect.left + (rect.width - inputWidth) / 2;
    const bottomPos = window.innerHeight - rect.bottom + 16;

    this.domInputWrapper.style.width = `${inputWidth}px`;
    this.domInputWrapper.style.left = `${leftPos}px`;
    this.domInputWrapper.style.bottom = `${bottomPos}px`;
  }

  _removeHtmlInput() {
    if (this.domInputWrapper) {
      this.domInputWrapper.remove();
      this.domInputWrapper = null;
    }
    window.__nawasenadaraInput?.enableGameKeyboard?.();
  }

  async _evaluateResponse(playerText) {
    this.isEvaluating = true;

    try {
      const nlp = window.__nawasenadaraNlp;
      let evalResult = null;

      if (nlp?.evaluateMiniBossResponse) {
        evalResult = await nlp.evaluateMiniBossResponse({
          text: playerText,
          round: this.currentRound,
          topic: this.currentDialogue.topic,
          npcLine: this.currentDialogue.npc_line,
          currentEmotionTier: this.currentEmotionTier,
        });
      }

      if (!evalResult) {
        evalResult = this._localFallbackEvaluation(playerText);
      }

      this._applyEvaluationOutcome(evalResult);
    } catch (err) {
      console.warn('[MiniBossScene] Evaluator offline fallback:', err);
      const fallbackResult = this._localFallbackEvaluation(playerText);
      this._applyEvaluationOutcome(fallbackResult);
    } finally {
      this.isEvaluating = false;
      this._removeHtmlInput();
    }
  }

  _localFallbackEvaluation(playerText) {
    const lower = playerText.toLowerCase();
    const hasCurse = /anjing|babi|bangsat|tolol|goblok|bacot|brengsek|kampret|mati lu/i.test(lower);
    const isPassive = /^(ya udah|maaf|terserah|ampun|jangan ganggu aku ya|iya deh)$/i.test(playerText.trim());
    const isAssertive = !hasCurse && !isPassive && playerText.trim().length >= 6;

    let detectedTier = isAssertive ? 1 : 5;
    if (hasCurse) detectedTier = 6;

    let newTier = this.currentEmotionTier;
    if (detectedTier > this.currentEmotionTier) {
      newTier = detectedTier;
    } else if (detectedTier < this.currentEmotionTier) {
      newTier = Math.max(detectedTier, this.currentEmotionTier - 1);
    }

    return {
      is_assertive: isAssertive,
      damage_boss: isAssertive,
      damage_player: !isAssertive,
      detected_emotion: isAssertive ? 'aman' : (hasCurse ? 'marah' : 'menyinggung'),
      previous_emotion_tier: this.currentEmotionTier,
      current_emotion_tier: newTier,
    };
  }

  _applyEvaluationOutcome(res) {
    const {
      damage_boss,
      damage_player,
      current_emotion_tier,
    } = res;

    // 1. Update Loading Bar Emosi Vertikal
    this.currentEmotionTier = current_emotion_tier || this.currentEmotionTier;
    this._updateVerticalEmotionMeter();

    // 2. Terapkan Damage & Efek Visual
    if (damage_boss) {
      this.bossHp = Math.max(0, this.bossHp - 1);
      this._animateBossHit();
      this.audioManager?.playAssertiveBeam();
    }

    if (damage_player) {
      this.daraHp = Math.max(0, this.daraHp - 1);
      this._animatePlayerHurt();
      this.audioManager?.playPlayerHurt();
    }

    this._updateHpDisplays();

    // 3. Tanpa modal popup: langsung jeda singkat agar efek terasa, lalu lanjut!
    this.time.delayedCall(700, () => {
      this._advanceNextStep();
    });
  }

  _advanceNextStep() {
    // Cek kondisi menang / kalah
    if (this.bossHp <= 0 || (this.currentRound >= this.totalRounds && this.daraHp > 0)) {
      this._handleVictory();
      return;
    }

    if (this.daraHp <= 0) {
      this._handleDefeat();
      return;
    }

    // Langsung lanjut ke ronde & dialog berikutnya!
    this._startRound(this.currentRound + 1);
  }

  _animateBossHit() {
    this.cameras.main.shake(180, 0.012);

    // Crossfade sejenak ke CG Reno tertegun
    if (this.bgDefeated) {
      this.tweens.add({
        targets: this.bgDefeated,
        alpha: 1,
        duration: 150,
        yoyo: true,
        hold: 350,
      });
    }
  }

  _animatePlayerHurt() {
    this.cameras.main.flash(200, 220, 38, 38, true);

    this.tweens.add({
      targets: this.daraGroup,
      x: this.daraGroup.x + 5,
      duration: 35,
      yoyo: true,
      repeat: 3,
    });
  }

  _updateHpDisplays() {
    // Dara HP: 3 Bar Hijau
    this.daraHpPips.forEach((pip, idx) => {
      if (idx < this.daraHp) {
        pip.setFillStyle(0x10b981, 1);
      } else {
        pip.setFillStyle(0x334155, 0.5);
      }
    });

    // Reno HP: 5 Bar Merah
    this.bossHpPips.forEach((pip, idx) => {
      if (idx < this.bossHp) {
        pip.setFillStyle(0xdc2626, 1);
      } else {
        pip.setFillStyle(0x334155, 0.5);
      }
    });
  }

  _updateVerticalEmotionMeter() {
    if (!this.meterFill) return;

    const maxH = this.meterTrackH - 4;
    const targetH = Math.max(12, Math.round(maxH * (this.currentEmotionTier / 6)));
    const tierMeta = EMOTION_TIERS.find((t) => t.id === this.currentEmotionTier) || EMOTION_TIERS[1];

    // Animasi tinggi bar vertikal
    this.tweens.add({
      targets: this.meterFill,
      height: targetH,
      duration: 300,
      ease: 'Back.easeOut',
    });

    this.meterFill.setFillStyle(tierMeta.color, 1);

    // Update label highlight
    this.meterLabels.forEach((label, idx) => {
      const tierId = idx + 1;
      if (tierId === this.currentEmotionTier) {
        label.setColor('#ffffff').setFontStyle('700');
      } else {
        label.setColor('#64748b').setFontStyle('400');
      }
    });
  }

  _updateRoundInfo() {
    const topic = this.currentDialogue?.topic || 'Konfrontasi Batasan Diri';
    this.roundInfoText.setText(`RONDE ${this.currentRound} / ${this.totalRounds}`);
    this.topicLabel.setText(`[Topik: ${topic}]`);
    this._updateVerticalEmotionMeter();
  }

  _handleVictory() {
    this.isBattleOver = true;
    this.audioManager?.stopBGM();
    this.audioManager?.playBossDefeat();

    // Tampilkan CG Reno kalah secara permanen
    if (this.bgDefeated) {
      this.tweens.add({
        targets: this.bgDefeated,
        alpha: 1,
        duration: 400,
      });
    }

    // Catat episode 6 selesai di database lokal
    completeEpisode(6, this.choices || []);

    const bounds = getVisibleBounds(this);
    const winContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.85);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 420), 220, 0x0f172a, 0.98)
      .setStrokeStyle(1.5, 0x10b981);

    const title = this.add.text(0, -60, 'Tantangan Selesai - Dara Berhasil', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '16px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -14, 'Dara berhasil menghadapi seluruh provokasi Reno dengan komunikasi asertif yang tenang, lugas, dan berwibawa.\n\nReno tertegun dan tidak berani lagi meremehkan batasan dirimu.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 370 },
    }).setOrigin(0.5);

    // Tombol 1: Lihat Rapor Evaluasi Akhir Keseluruhan (Membuka Rapor 6 Episode Landscape)
    const reportBtn = this.add.rectangle(0, 36, 250, 30, 0x064e3b, 1)
      .setStrokeStyle(1.2, 0x10b981).setInteractive({ useHandCursor: true });
    const reportBtnText = this.add.text(0, 36, 'Lihat Evaluasi & Rapor Akhir', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    reportBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeEndingScene', {
        episodeId: 6,
        isLastEpisode: true,
        showReportOnly: true,
        choices: this.choices || [],
      });
    });

    // Tombol 2: Pilih Episode Lain
    const exitBtn = this.add.rectangle(0, 72, 250, 28, 0x1e293b, 1)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 72, 'Pilih Episode Lain', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });

    winContainer.add([backdrop, card, title, desc, reportBtn, reportBtnText, exitBtn, exitBtnText]);
    winContainer.setAlpha(0);
    this.tweens.add({ targets: winContainer, alpha: 1, duration: 250 });
  }

  _handleDefeat() {
    this.isBattleOver = true;
    this.audioManager?.stopBGM();

    const bounds = getVisibleBounds(this);
    const loseContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.85);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 400), 200, 0x0f172a, 0.98)
      .setStrokeStyle(1.5, 0xdc2626);

    const title = this.add.text(0, -50, 'Tantangan Belum Berhasil', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '15px',
      fontStyle: '700',
      color: '#f87171',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -10, 'Dara kehabisan ketenangan emosional saat menghadapi provokasi Reno.\nTarik napas, tetap tenang, dan nyatakan batasanmu dengan lugas tanpa terpancing emosi.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 350 },
    }).setOrigin(0.5);

    // Tombol Coba Lagi
    const retryBtn = this.add.rectangle(0, 44, 220, 30, 0x991b1b, 1)
      .setStrokeStyle(1.2, 0xef4444).setInteractive({ useHandCursor: true });
    const retryBtnText = this.add.text(0, 44, 'Coba Lagi', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.restart();
    });

    // Tombol Kembali
    const exitBtn = this.add.rectangle(0, 80, 220, 28, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 80, 'Kembali ke Menu', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#94a3b8',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });

    loseContainer.add([backdrop, card, title, desc, retryBtn, retryBtnText, exitBtn, exitBtnText]);
    loseContainer.setAlpha(0);
    this.tweens.add({ targets: loseContainer, alpha: 1, duration: 250 });
  }
}
