import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getVisibleBounds, syncGameSizeToOrientation, isPortrait } from '../utils/visibleBounds';
import { completeEpisode } from '../utils/progressStore';

// Data dialog terkurasi jika backend/NLP belum terhubung
const FALLBACK_DIALOGUES = [
  {
    round: 1,
    topic: 'Candaan Seksis & Stereotip Gender',
    npc_name: 'Reno',
    npc_line: 'Halah, baperan amat sih lu jadi cewek! Lagian cewek ngapain sih sok ambis mimpin kelompok, ujungnya kan paling cuma ngurus dapur doang, haha!',
    context: 'Reno meremehkan kepemimpinan perempuan dengan stereotip kolot di depan teman-teman kelas.',
    guide_hint: 'Tegur dengan tenang bahwa kepemimpinan dan kemampuan tidak ditentukan oleh gender, dan minta dia berhenti meremehkan.',
  },
  {
    round: 2,
    topic: 'Penyebaran Foto Aib & Rumor di Grup Chat',
    npc_name: 'Reno',
    npc_line: 'Woy santai napa! Foto lu di grup angkatan tuh cuma buat lucu-lucuan doang kali. Gitu aja ngambek pengen ngadu ke wali kelas, gak asik lu parah!',
    context: 'Reno melakukan gaslighting setelah menyebarkan foto aib teman di grup chat sekolah.',
    guide_hint: 'Tegaskan bahwa menyebarkan foto tanpa izin itu melanggar privasi, bukan lelucon, dan kamu berhak menuntut foto itu dihapus.',
  },
  {
    round: 3,
    topic: 'Pelanggaran Privasi & Desakan PAP Foto Pribadi',
    npc_name: 'Reno',
    npc_line: 'Bagi nomor WA pribadi lu lah, sama kirim PAP muka lu sekarang juga! Jangan sok jual mahal deh, masa sama temen seangkatan doang pelit amat!',
    context: 'Reno memaksa meminta kontak pribadi dan foto diri secara agresif.',
    guide_hint: 'Tolak dengan tegas dan lugas bahwa kontak dan foto pribadimu adalah hakmu, dan kamu tidak bersedia membagikannya.',
  },
  {
    round: 4,
    topic: 'Catcalling & Komentar Fisik di Tempat Umum Sekolah',
    npc_name: 'Reno',
    npc_line: 'Cuit cuit... Cewek manis lewat nih! Mukanya jangan judes-judes gitu napa, senyum dikit kek biar enak diliat anak-anak cowok di kantin!',
    context: 'Reno melakukan catcalling dan mengomentari penampilan fisik di area umum sekolah.',
    guide_hint: 'Tegur langsung dengan kepala dingin bahwa tubuh dan ekspresimu bukan untuk dinilai orang lain dan kamu merasa tidak nyaman.',
  },
  {
    round: 5,
    topic: 'Paksaan Fisik & Hadangan di Tempat Sepi Dekat Gerbang',
    npc_name: 'Reno',
    npc_line: 'Heh, buruan ikut gue ke gang samping pos satpam sekarang! Gak usah lebay mau teriak atau manggil orang, tinggal nurut apa susahnya sih?!',
    context: 'Reno memaksa secara fisik untuk ikut ke tempat sepi saat pulang sekolah.',
    guide_hint: 'Tolak keras dengan tegas, mundur ke area ramai, dan nyatakan akan segera melapor ke pos satpam atau guru.',
  },
];

const EMOTION_TIERS = [
  { id: 1, label: 'aman', name: 'Aman', desc: 'Tenang & Asertif' },
  { id: 2, label: 'netral', name: 'Netral', desc: 'Stabil' },
  { id: 3, label: 'sedih', name: 'Sedih', desc: 'Tertekan' },
  { id: 4, label: 'takut', name: 'Takut', desc: 'Cemas' },
  { id: 5, label: 'menyinggung', name: 'Tersinggung', desc: 'Risih' },
  { id: 6, label: 'marah', name: 'Marah', desc: 'Agresif' },
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
    this.tierDots = [];
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

    // 5. Render Kotak Dialog Reno di area ATAS
    this._createTopDialogueUI();

    // 6. Modal Evaluasi Ronde & Akhir Permainan
    this._createFeedbackModal();

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
    this.daraPanel = this.add.rectangle(0, 0, 110, 32, 0x0f172a, 0.9)
      .setStrokeStyle(1.2, 0x334155);
    this.daraNameText = this.add.text(-46, 0, 'DARA', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0, 0.5);

    this.daraHpGroup = this.add.container(10, 0);
    this.daraHpPips = [];
    for (let i = 0; i < this.maxDaraHp; i++) {
      const pip = this.add.rectangle(i * 14, 0, 10, 12, 0x10b981, 1)
        .setStrokeStyle(1, 0x047857);
      this.daraHpPips.push(pip);
      this.daraHpGroup.add(pip);
    }
    this.daraGroup = this.add.container(0, 0, [this.daraPanel, this.daraNameText, this.daraHpGroup]);
    this.hudContainer.add(this.daraGroup);

    // ── KANAN: RENO HP ──
    this.bossPanel = this.add.rectangle(0, 0, 126, 32, 0x0f172a, 0.9)
      .setStrokeStyle(1.2, 0x334155);
    this.bossNameText = this.add.text(-54, 0, 'RENO', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0, 0.5);

    this.bossHpGroup = this.add.container(-6, 0);
    this.bossHpPips = [];
    for (let i = 0; i < this.maxBossHp; i++) {
      const pip = this.add.rectangle(i * 12, 0, 8, 12, 0xdc2626, 1)
        .setStrokeStyle(1, 0x991b1b);
      this.bossHpPips.push(pip);
      this.bossHpGroup.add(pip);
    }
    this.bossGroup = this.add.container(0, 0, [this.bossPanel, this.bossNameText, this.bossHpGroup]);
    this.hudContainer.add(this.bossGroup);

    // ── TENGAH: STATUS RONDE & TINGKAT EMOSI ──
    this.centerStatusGroup = this.add.container(0, 0);

    this.roundInfoText = this.add.text(0, -6, 'RONDE 1 / 5', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);

    this.emotionStatusText = this.add.text(0, 8, 'Emosi: Netral (Stabil)', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    this.centerStatusGroup.add([this.roundInfoText, this.emotionStatusText]);
    this.hudContainer.add(this.centerStatusGroup);

    this._layoutElements();
  }

  _createTopDialogueUI() {
    const bounds = getVisibleBounds(this);

    // Container Kotak Dialog Reno di ATAS
    this.dialogueContainer = this.add.container(bounds.centerX, bounds.top + 92).setDepth(20);

    const boxW = Math.min(bounds.width - 24, 580);
    const boxH = 76;

    // Background Panel Dialog (Slate gelap, border minimalis)
    this.dialogueBg = this.add.rectangle(0, 0, boxW, boxH, 0x090d16, 0.95)
      .setStrokeStyle(1.5, 0x334155, 1)
      .setInteractive({ useHandCursor: true });

    // Header Nama NPC Reno
    this.npcNameBox = this.add.rectangle(-boxW / 2 + 50, -boxH / 2, 84, 18, 0x1e293b, 1)
      .setStrokeStyle(1, 0x475569);
    this.npcNameLabel = this.add.text(-boxW / 2 + 50, -boxH / 2, 'RENO', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#f87171',
    }).setOrigin(0.5);

    // Topik Kasus Badge
    this.topicLabel = this.add.text(-boxW / 2 + 100, -boxH / 2, '[Topik: Candaan Seksis]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      color: '#64748b',
    }).setOrigin(0, 0.5);

    // Teks Ucapan Reno
    this.npcSpeechText = this.add.text(-boxW / 2 + 14, -14, '', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#f8fafc',
      lineSpacing: 3,
      wordWrap: { width: boxW - 28 },
    });

    // Petunjuk ketuk untuk mempercepat
    this.tapHintText = this.add.text(boxW / 2 - 12, boxH / 2 - 10, 'Klik untuk lanjut >', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '8px',
      color: '#64748b',
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

  _createFeedbackModal() {
    const bounds = getVisibleBounds(this);

    this.feedbackModal = this.add.container(bounds.centerX, bounds.centerY).setDepth(40).setVisible(false);

    this.feedbackBackdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.78)
      .setInteractive();

    const cardW = Math.min(bounds.width - 32, 400);
    this.feedbackCard = this.add.rectangle(0, 0, cardW, 190, 0x0f172a, 0.98)
      .setStrokeStyle(1.5, 0x334155);

    // Judul Evaluasi
    this.evalBadge = this.add.text(0, -68, 'Respon Asertif & Tepat', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#10b981',
    }).setOrigin(0.5);

    // Reaksi Spontan Reno
    this.evalBossReaction = this.add.text(0, -42, '"Cih... kok lu malah natap gue berani gitu sih?!"', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: 'italic',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: cardW - 36 },
    }).setOrigin(0.5);

    // Info Status Emosi
    this.evalEmotionInfo = this.add.text(0, -18, 'Status Emosi: Aman (Tingkat 1)', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      color: '#94a3b8',
    }).setOrigin(0.5);

    // Garis Pemisah
    this.evalDivider = this.add.line(0, -4, -cardW / 2 + 20, 0, cardW / 2 - 20, 0, 0x334155).setOrigin(0.5);

    // Catatan Edukatif Guru BK
    this.evalBkText = this.add.text(0, 26, 'Catatan Guru BK: Kamu berhasil menyampaikan batasan dirimu dengan tenang dan tegas.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      color: '#f1f5f9',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: cardW - 36 },
    }).setOrigin(0.5);

    // Tombol Lanjut
    this.evalNextBtn = this.add.rectangle(0, 68, 180, 28, 0x1e293b, 1)
      .setStrokeStyle(1.2, 0x475569)
      .setInteractive({ useHandCursor: true });
    this.evalNextBtnText = this.add.text(0, 68, 'Lanjut ke Ronde Berikutnya >', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);

    this.evalNextBtn.on('pointerdown', () => this._onDismissFeedback());
    this.evalNextBtn.on('pointerover', () => this.evalNextBtn.setFillStyle(0x334155));
    this.evalNextBtn.on('pointerout', () => this.evalNextBtn.setFillStyle(0x1e293b));

    this.feedbackModal.add([
      this.feedbackBackdrop,
      this.feedbackCard,
      this.evalBadge,
      this.evalBossReaction,
      this.evalEmotionInfo,
      this.evalDivider,
      this.evalBkText,
      this.evalNextBtn,
      this.evalNextBtnText,
    ]);
  }

  _layoutElements() {
    const bounds = getVisibleBounds(this);
    this._scaleBackgrounds();

    // Posisi Bar HUD di paling atas
    const topMargin = bounds.top + 20;
    if (this.daraGroup) this.daraGroup.setPosition(bounds.left + 68, topMargin);
    if (this.bossGroup) this.bossGroup.setPosition(bounds.right - 74, topMargin);
    if (this.centerStatusGroup) this.centerStatusGroup.setPosition(bounds.centerX, topMargin);

    // Posisi Kotak Dialog di ATAS (di bawah bar HUD)
    if (this.dialogueContainer) {
      const boxW = Math.min(bounds.width - 24, 580);
      const boxH = 76;
      const boxY = topMargin + 50;

      this.dialogueContainer.setPosition(bounds.centerX, boxY);
      this.dialogueBg.setSize(boxW, boxH);
      this.npcNameBox.setPosition(-boxW / 2 + 50, -boxH / 2);
      this.npcNameLabel.setPosition(-boxW / 2 + 50, -boxH / 2);
      this.topicLabel.setPosition(-boxW / 2 + 100, -boxH / 2);
      this.npcSpeechText.setPosition(-boxW / 2 + 14, -14).setStyle({ wordWrap: { width: boxW - 28 } });
      this.tapHintText.setPosition(boxW / 2 - 12, boxH / 2 - 10);
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
    this.feedbackModal?.setVisible(false);

    // Siapkan teks ucapan Reno
    this.fullNpcText = `"${this.currentDialogue.npc_line}"`;
    this.currentDisplayedText = '';
    this.npcSpeechText.setText('');
    this.tapHintText.setAlpha(0);

    this.isTypewriterActive = true;
    let charIndex = 0;

    if (this.typewriterTimer) this.typewriterTimer.remove();

    this.typewriterTimer = this.time.addEvent({
      delay: 22,
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
    this.tapHintText.setAlpha(0.7);

    // Kotak input muncul SETELAH Reno selesai berbicara
    this.time.delayedCall(300, () => {
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
        background: rgba(15, 23, 42, 0.95);
        border: 1.5px solid #334155;
        border-radius: 10px;
        padding: 10px 14px;
        color: #f8fafc;
        font-family: 'Pixelify Sans', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 6px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 11px; font-weight: 700; color: #f8fafc;">Respon Asertif:</span>
          <span style="font-size: 10px; color: #64748b;">Ronde ${this.currentRound} / ${this.totalRounds}</span>
        </div>
        
        <div style="font-size: 10px; color: #94a3b8;">
          Panduan: ${hint}
        </div>

        <div style="display: flex; gap: 8px;">
          <textarea
            id="miniboss-textarea"
            rows="2"
            placeholder="Tuliskan responmu di sini... (Bersikap tenang, lugas, pertahankan batasan tanpa memaki)"
            style="
              flex: 1;
              background: #090d16;
              border: 1px solid #334155;
              border-radius: 6px;
              color: #f8fafc;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 11px;
              padding: 6px 8px;
              resize: none;
              outline: none;
            "
          ></textarea>

          <button
            id="miniboss-submit-btn"
            type="button"
            style="
              background: #1e293b;
              border: 1px solid #475569;
              border-radius: 6px;
              color: #ffffff;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 11px;
              font-weight: 700;
              padding: 0 14px;
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
        <div id="miniboss-error-hint" style="font-size: 10px; color: #f87171; display: none;"></div>
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

    const inputWidth = Math.min(rect.width - 24, isPort ? 420 : 520);
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

    const tierMeta = EMOTION_TIERS.find((t) => t.id === newTier) || EMOTION_TIERS[1];

    return {
      is_assertive: isAssertive,
      score: isAssertive ? 85 : 30,
      boss_reaction: isAssertive
        ? 'Cih... kok lu malah natap gue berani gitu sih?!'
        : 'Hahaha! Tuh kan, gak bisa bales apa-apa lu mah!',
      feedback: isAssertive
        ? 'Kamu berhasil menyampaikan batasan dirimu dengan tenang dan tegas.'
        : 'Hindari terpancing emosi atau membalas kasar. Tetap tenang dan tegaskan batasanmu.',
      damage_boss: isAssertive,
      damage_player: !isAssertive,
      detected_emotion: isAssertive ? 'aman' : (hasCurse ? 'marah' : 'menyinggung'),
      previous_emotion_tier: this.currentEmotionTier,
      current_emotion_tier: newTier,
      tier_info: tierMeta,
    };
  }

  _applyEvaluationOutcome(res) {
    const {
      damage_boss,
      damage_player,
      current_emotion_tier,
    } = res;

    // 1. Update Emotion Tier
    this.currentEmotionTier = current_emotion_tier || this.currentEmotionTier;
    this._updateEmotionDisplay();

    // 2. Terapkan Damage
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

    // 3. Tampilkan Feedback Modal
    this.time.delayedCall(450, () => {
      this._showFeedbackModal(res);
    });
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

  _updateEmotionDisplay() {
    const tierMeta = EMOTION_TIERS.find((t) => t.id === this.currentEmotionTier) || EMOTION_TIERS[1];
    this.emotionStatusText.setText(`Emosi: ${tierMeta.name} (${tierMeta.desc})`);
  }

  _updateRoundInfo() {
    const topic = this.currentDialogue?.topic || 'Konfrontasi Batasan Diri';
    this.roundInfoText.setText(`RONDE ${this.currentRound} / ${this.totalRounds}`);
    this.topicLabel.setText(`[Topik: ${topic}]`);
    this._updateEmotionDisplay();
  }

  _showFeedbackModal(evalData) {
    const isAssertive = evalData.is_assertive;

    this.evalBadge.setText(isAssertive ? 'Respon Asertif & Tepat (-1 HP Reno)' : 'Respon Kurang Asertif (-1 HP Dara)');
    this.evalBadge.setColor(isAssertive ? '#10b981' : '#f87171');

    this.evalBossReaction.setText(`"${evalData.boss_reaction}"`);
    this.evalEmotionInfo.setText(`Status Emosi: Tingkat ${evalData.previous_emotion_tier} ➔ Tingkat ${evalData.current_emotion_tier}`);
    this.evalBkText.setText(`Catatan Guru BK: ${evalData.feedback}`);

    if (this.currentRound >= this.totalRounds || this.bossHp <= 0 || this.daraHp <= 0) {
      this.evalNextBtnText.setText('Lihat Hasil Akhir >');
    } else {
      this.evalNextBtnText.setText('Lanjut ke Ronde Berikutnya >');
    }

    this.feedbackModal.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.feedbackModal,
      alpha: 1,
      duration: 180,
    });
  }

  _onDismissFeedback() {
    this.feedbackModal.setVisible(false);

    // Cek kondisi menang / kalah
    if (this.bossHp <= 0 || (this.currentRound >= this.totalRounds && this.daraHp > 0)) {
      this._handleVictory();
      return;
    }

    if (this.daraHp <= 0) {
      this._handleDefeat();
      return;
    }

    // Lanjut ke ronde berikutnya
    this._startRound(this.currentRound + 1);
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

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.8);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 380), 190, 0x0f172a, 0.98)
      .setStrokeStyle(1.5, 0x10b981);

    const title = this.add.text(0, -52, 'Tantangan Selesai - Dara Berhasil', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '14px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -10, 'Dara berhasil menghadapi seluruh provokasi Reno dengan komunikasi asertif yang tenang, lugas, dan berwibawa.\n\nReno tertegun dan tidak berani lagi meremehkan batasan dirimu.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: 340 },
    }).setOrigin(0.5);

    // Tombol 1: Pilih Episode Lain (Kembali langsung ke EpisodeSelectScene tanpa mood bar)
    const exitBtn = this.add.rectangle(0, 42, 220, 28, 0x064e3b, 1)
      .setStrokeStyle(1.2, 0x10b981).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 42, 'Pilih Episode Lain', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });

    // Tombol 2: Main Lagi
    const retryBtn = this.add.rectangle(0, 76, 220, 26, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const retryBtnText = this.add.text(0, 76, 'Main Lagi', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      fontStyle: '700',
      color: '#94a3b8',
    }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.restart();
    });

    winContainer.add([backdrop, card, title, desc, exitBtn, exitBtnText, retryBtn, retryBtnText]);
    winContainer.setAlpha(0);
    this.tweens.add({ targets: winContainer, alpha: 1, duration: 250 });
  }

  _handleDefeat() {
    this.isBattleOver = true;
    this.audioManager?.stopBGM();

    const bounds = getVisibleBounds(this);
    const loseContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.85);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 380), 180, 0x0f172a, 0.98)
      .setStrokeStyle(1.5, 0xdc2626);

    const title = this.add.text(0, -48, 'Tantangan Belum Berhasil', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#f87171',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -10, 'Dara kehabisan ketenangan emosional saat menghadapi provokasi Reno.\nTarik napas, tetap tenang, dan nyatakan batasanmu dengan lugas tanpa terpancing emosi.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: 340 },
    }).setOrigin(0.5);

    // Tombol Coba Lagi
    const retryBtn = this.add.rectangle(0, 42, 200, 28, 0x991b1b, 1)
      .setStrokeStyle(1.2, 0xef4444).setInteractive({ useHandCursor: true });
    const retryBtnText = this.add.text(0, 42, 'Coba Lagi', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.restart();
    });

    // Tombol Kembali
    const exitBtn = this.add.rectangle(0, 76, 200, 26, 0x1e293b, 0.9)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 76, 'Kembali ke Menu', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
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
