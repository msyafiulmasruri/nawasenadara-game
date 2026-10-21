import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getVisibleBounds, syncGameSizeToOrientation, isPortrait } from '../utils/visibleBounds';
import { completeEpisode } from '../utils/progressStore';

// Data fallback terkurasi jika backend/NLP service belum terhubung
const FALLBACK_DIALOGUES = [
  {
    round: 1,
    topic: 'Candaan Seksis & Stereotip Gender',
    npc_name: 'Reno (Siswa Nakal)',
    npc_line: 'Halah, baperan amat sih lu jadi cewek! Lagian cewek ngapain sih sok ambis mimpin kelompok, ujungnya kan paling cuma ngurus dapur doang, haha!',
    context: 'Reno meremehkan kepemimpinan perempuan dengan stereotip kolot di depan teman-teman kelas.',
    guide_hint: 'Tegur dengan tenang bahwa kepemimpinan dan kemampuan tidak ditentukan oleh gender, dan minta dia berhenti meremehkan.',
  },
  {
    round: 2,
    topic: 'Penyebaran Foto Aib & Rumor di Grup Chat',
    npc_name: 'Reno (Siswa Nakal)',
    npc_line: 'Woy santai napa! Foto lu di grup angkatan tuh cuma buat lucu-lucuan doang kali. Gitu aja ngambek pengen ngadu ke wali kelas, gak asik lu parah!',
    context: 'Reno melakukan gaslighting setelah menyebarkan foto aib teman di grup chat sekolah.',
    guide_hint: 'Tegaskan bahwa menyebarkan foto tanpa izin itu melanggar privasi, bukan lelucon, dan kamu berhak menuntut foto itu dihapus.',
  },
  {
    round: 3,
    topic: 'Pelanggaran Privasi & Desakan PAP Foto Pribadi',
    npc_name: 'Reno (Siswa Nakal)',
    npc_line: 'Bagi nomor WA pribadi lu lah, sama kirim PAP muka lu sekarang juga! Jangan sok jual mahal deh, masa sama temen seangkatan doang pelit amat!',
    context: 'Reno memaksa meminta kontak pribadi dan foto diri secara agresif.',
    guide_hint: 'Tolak dengan tegas dan lugas bahwa kontak dan foto pribadimu adalah hakmu, dan kamu tidak bersedia membagikannya.',
  },
  {
    round: 4,
    topic: 'Catcalling & Komentar Fisik di Tempat Umum Sekolah',
    npc_name: 'Reno (Siswa Nakal)',
    npc_line: 'Cuit cuit... Cewek manis lewat nih! Mukanya jangan judes-judes gitu napa, senyum dikit kek biar enak diliat anak-anak cowok di kantin!',
    context: 'Reno melakukan catcalling dan mengomentari penampilan fisik di area umum sekolah.',
    guide_hint: 'Tegur langsung dengan kepala dingin bahwa tubuh dan ekspresimu bukan untuk dinilai orang lain dan kamu merasa tidak nyaman.',
  },
  {
    round: 5,
    topic: 'Paksaan Fisik & Hadangan di Tempat Sepi Dekat Gerbang',
    npc_name: 'Reno (Siswa Nakal)',
    npc_line: 'Heh, buruan ikut gue ke gang samping pos satpam sekarang! Gak usah lebay mau teriak atau manggil orang, tinggal nurut apa susahnya sih?!',
    context: 'Reno memaksa secara fisik untuk ikut ke tempat sepi saat pulang sekolah.',
    guide_hint: 'Tolak keras dengan tegas, mundur ke area ramai, dan nyatakan akan segera melapor ke pos satpam atau guru.',
  },
];

const EMOTION_TIERS = [
  { id: 1, label: 'aman', name: 'Aman', color: 0x22c55e, hex: '#22c55e', desc: 'Sangat Asertif & Tenang' },
  { id: 2, label: 'netral', name: 'Netral', color: 0x10b981, hex: '#10b981', desc: 'Stabil & Objektif' },
  { id: 3, label: 'sedih', name: 'Sedih', color: 0x38bdf8, hex: '#38bdf8', desc: 'Rentan / Tertekan' },
  { id: 4, label: 'takut', name: 'Takut', color: 0xeab308, hex: '#eab308', desc: 'Cemas / Terintimidasi' },
  { id: 5, label: 'menyinggung', name: 'Tersinggung', color: 0xf97316, hex: '#f97316', desc: 'Risih / Terprovokasi' },
  { id: 6, label: 'marah', name: 'Marah', color: 0xef4444, hex: '#ef4444', desc: 'Distres Tinggi / Agresif' },
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
    this.currentEmotionTier = 2; // Mulai dari tingkat Netral (Tier 2)

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
    this.uiContainer = null;
    this.heartSprites = [];
    this.bossHpBars = [];
    this.tierPillGraphics = [];
    this.tierIndicator = null;
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

    // 4. Render HUD & Emotion Bar
    this._createHUD();

    // 5. Render Dialogue & Battle Stages
    this._createDialogueUI();

    // 6. Muat dialog dinamis dari AI backend jika tersedia
    this._fetchAiDialogues();

    // 7. Mulai Ronde 1
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

    // Vignette atas (untuk keterbacaan HUD)
    this.topVignette = this.add.rectangle(bounds.centerX, bounds.top + 50, bounds.width + 40, 100, 0x05050f, 0.85)
      .setOrigin(0.5)
      .setDepth(3);

    // Vignette bawah (untuk keterbacaan Kotak Dialog)
    this.bottomVignette = this.add.rectangle(bounds.centerX, bounds.bottom - 80, bounds.width + 40, 170, 0x05050f, 0.92)
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
      this.topVignette.setPosition(bounds.centerX, bounds.top + 45).setSize(bounds.width + 20, 95);
    }
    if (this.bottomVignette) {
      this.bottomVignette.setPosition(bounds.centerX, bounds.bottom - 75).setSize(bounds.width + 20, 155);
    }
  }

  _createHUD() {
    const bounds = getVisibleBounds(this);

    // Container HUD
    this.hudContainer = this.add.container(0, 0).setDepth(10);

    // ── KIRI: DARA HP (3 Hati) ──
    this.daraPanel = this.add.rectangle(0, 0, 130, 48, 0x0f172a, 0.88)
      .setStrokeStyle(1.5, 0x38bdf8, 0.9);
    this.daraNameText = this.add.text(0, -12, 'DARA (Kamu)', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5);

    this.heartsGroup = this.add.container(0, 8);
    this.heartSprites = [];
    for (let i = 0; i < this.maxDaraHp; i++) {
      const hX = (i - 1) * 22;
      const heart = this.add.text(hX, 0, '❤️', {
        fontSize: '16px',
      }).setOrigin(0.5);
      this.heartSprites.push(heart);
      this.heartsGroup.add(heart);
    }

    this.daraGroup = this.add.container(0, 0, [this.daraPanel, this.daraNameText, this.heartsGroup]);
    this.hudContainer.add(this.daraGroup);

    // ── KANAN: BOSS RENO HP (5 Bar) ──
    this.bossPanel = this.add.rectangle(0, 0, 150, 48, 0x0f172a, 0.88)
      .setStrokeStyle(1.5, 0xef4444, 0.9);
    this.bossNameText = this.add.text(0, -12, 'RENO (Siswa Nakal)', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#f87171',
    }).setOrigin(0.5);

    this.bossHpGroup = this.add.container(0, 8);
    this.bossHpBars = [];
    const barWidth = 20;
    const barSpacing = 4;
    const totalW = (this.maxBossHp * barWidth) + ((this.maxBossHp - 1) * barSpacing);
    const startX = -totalW / 2 + barWidth / 2;

    for (let i = 0; i < this.maxBossHp; i++) {
      const bX = startX + i * (barWidth + barSpacing);
      const bg = this.add.rectangle(bX, 0, barWidth, 12, 0x334155, 0.9).setStrokeStyle(1, 0x64748b);
      const fill = this.add.rectangle(bX, 0, barWidth - 2, 10, 0xef4444, 1);
      this.bossHpBars.push({ bg, fill });
      this.bossHpGroup.add([bg, fill]);
    }

    this.bossGroup = this.add.container(0, 0, [this.bossPanel, this.bossNameText, this.bossHpGroup]);
    this.hudContainer.add(this.bossGroup);

    // ── TENGAH: BAR EMOSI INDOBERT (6 TIER) ──
    this.emotionGroup = this.add.container(0, 0);

    this.emotionLabel = this.add.text(0, -14, 'BAR EMOSI (INDOBERT): NETRAL [STABIL]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#10b981',
    }).setOrigin(0.5);
    this.emotionGroup.add(this.emotionLabel);

    // 6 Pill Segments
    this.tierPillWidth = 26;
    this.tierPillGap = 3;
    const totalTierW = (6 * this.tierPillWidth) + (5 * this.tierPillGap);
    const tierStartX = -totalTierW / 2 + this.tierPillWidth / 2;

    this.tierPillGraphics = [];
    EMOTION_TIERS.forEach((tier, index) => {
      const pX = tierStartX + index * (this.tierPillWidth + this.tierPillGap);
      const pill = this.add.rectangle(pX, 4, this.tierPillWidth, 14, tier.color, 0.8)
        .setStrokeStyle(1, 0xffffff, 0.4);
      const pText = this.add.text(pX, 4, tier.id.toString(), {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '9px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.tierPillGraphics.push({ pill, text: pText, x: pX, tier });
      this.emotionGroup.add([pill, pText]);
    });

    // Indikator panah / cursor aktif
    this.tierIndicator = this.add.polygon(tierStartX + (this.tierPillWidth + this.tierPillGap), 16, [
      { x: 0, y: 0 },
      { x: -5, y: 7 },
      { x: 5, y: 7 },
    ], 0xffdd57).setDepth(11);
    this.emotionGroup.add(this.tierIndicator);

    this.hudContainer.add(this.emotionGroup);

    // ── BADGE RONDE & TOPIK KASUS ──
    this.roundBadgeBox = this.add.rectangle(0, 0, 320, 22, 0x1e1b4b, 0.95)
      .setStrokeStyle(1.5, 0xa855f7);
    this.roundBadgeText = this.add.text(0, 0, 'RONDE 1 / 5: CANDAAN SEKSIS & STEREOTIP GENDER', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fef08a',
    }).setOrigin(0.5);

    this.roundGroup = this.add.container(0, 0, [this.roundBadgeBox, this.roundBadgeText]).setDepth(10);

    this._layoutElements();
  }

  _createDialogueUI() {
    const bounds = getVisibleBounds(this);

    // Container Kotak Dialog Reno
    this.dialogueContainer = this.add.container(bounds.centerX, bounds.bottom - 75).setDepth(20);

    // Background Panel Dialog
    this.dialogueBg = this.add.rectangle(0, 0, bounds.width - 32, 100, 0x090d16, 0.94)
      .setStrokeStyle(2, 0xef4444, 0.9)
      .setInteractive({ useHandCursor: true });

    // Header Nama NPC Reno
    this.npcNameBox = this.add.rectangle(-this.dialogueBg.width / 2 + 65, -50, 110, 24, 0xef4444, 1)
      .setStrokeStyle(1.5, 0xffffff, 0.8);
    this.npcNameLabel = this.add.text(-this.dialogueBg.width / 2 + 65, -50, 'RENO', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    // Subtitle Delinquent tag
    this.npcTag = this.add.text(-this.dialogueBg.width / 2 + 130, -50, '[Siswa Provokator]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      color: '#fca5a5',
    }).setOrigin(0, 0.5);

    // Teks Isi Ucapan Reno (Typewriter)
    this.npcSpeechText = this.add.text(-this.dialogueBg.width / 2 + 18, -25, '', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      color: '#ffffff',
      lineSpacing: 4,
      wordWrap: { width: this.dialogueBg.width - 36 },
    });

    // Petunjuk ketuk untuk mempercepat
    this.tapHintText = this.add.text(this.dialogueBg.width / 2 - 16, 36, 'Klik untuk lanjut ▶', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      color: '#94a3b8',
    }).setOrigin(1, 0.5).setAlpha(0);

    this.dialogueContainer.add([
      this.dialogueBg,
      this.npcNameBox,
      this.npcNameLabel,
      this.npcTag,
      this.npcSpeechText,
      this.tapHintText,
    ]);

    // Listener klik untuk skip typewriter
    this.dialogueBg.on('pointerdown', () => {
      if (this.isTypewriterActive) {
        this._finishTypewriterInstantly();
      }
    });

    // Modal Evaluasi / Feedback BK
    this._createFeedbackModal();
  }

  _createFeedbackModal() {
    const bounds = getVisibleBounds(this);

    this.feedbackModal = this.add.container(bounds.centerX, bounds.centerY).setDepth(40).setVisible(false);

    this.feedbackBackdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.75)
      .setInteractive();

    this.feedbackCard = this.add.rectangle(0, 0, Math.min(bounds.width - 40, 420), 220, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0xa855f7);

    // Badge Evaluasi
    this.evalBadge = this.add.text(0, -85, 'ASERTIF & TEPAT!', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '14px',
      fontStyle: '700',
      color: '#22c55e',
    }).setOrigin(0.5);

    // Reaksi Spontan Reno
    this.evalBossReaction = this.add.text(0, -56, '"Cih... kok lu malah natap gue berani gitu sih?!"', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: 'italic',
      color: '#cbd5e1',
      align: 'center',
      wordWrap: { width: 380 },
    }).setOrigin(0.5);

    // Indikator Emosi & Tier
    this.evalEmotionInfo = this.add.text(0, -26, 'Emosi Terdeteksi: Aman (94%) | Status Bar Emosi: Netral ➔ Aman', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5);

    // Garis Pemisah
    this.evalDivider = this.add.line(0, -8, -180, 0, 180, 0, 0x334155).setOrigin(0.5);

    // Catatan Edukatif Guru BK
    this.evalBkTitle = this.add.text(0, 6, '💡 CATATAN GURU BK:', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#ffdd57',
    }).setOrigin(0.5);

    this.evalBkText = this.add.text(0, 40, 'Kamu berhasil menyampaikan batasan dirimu dengan tenang dan tegas tanpa membalas dengan makian kasar.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 3,
      wordWrap: { width: 370 },
    }).setOrigin(0.5);

    // Tombol Lanjut Ronde Berikutnya
    this.evalNextBtn = this.add.rectangle(0, 84, 220, 32, 0x064e3b, 1)
      .setStrokeStyle(1.5, 0x10b981)
      .setInteractive({ useHandCursor: true });
    this.evalNextBtnText = this.add.text(0, 84, 'LANJUT KE RONDE BERIKUTNYA ➔', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    this.evalNextBtn.on('pointerdown', () => this._onDismissFeedback());
    this.evalNextBtn.on('pointerover', () => this.evalNextBtn.setFillStyle(0x047857));
    this.evalNextBtn.on('pointerout', () => this.evalNextBtn.setFillStyle(0x064e3b));

    this.feedbackModal.add([
      this.feedbackBackdrop,
      this.feedbackCard,
      this.evalBadge,
      this.evalBossReaction,
      this.evalEmotionInfo,
      this.evalDivider,
      this.evalBkTitle,
      this.evalBkText,
      this.evalNextBtn,
      this.evalNextBtnText,
    ]);
  }

  _layoutElements() {
    const bounds = getVisibleBounds(this);
    const isPort = isPortrait(this);

    this._scaleBackgrounds();

    // Posisi HUD
    const topMargin = bounds.top + 28;
    if (this.daraGroup) {
      this.daraGroup.setPosition(bounds.left + 78, topMargin);
    }
    if (this.bossGroup) {
      this.bossGroup.setPosition(bounds.right - 88, topMargin);
    }
    if (this.emotionGroup) {
      this.emotionGroup.setPosition(bounds.centerX, topMargin);
    }
    if (this.roundGroup) {
      this.roundGroup.setPosition(bounds.centerX, topMargin + 32);
    }

    // Posisi Dialogue Box
    if (this.dialogueContainer) {
      const boxW = Math.min(bounds.width - 24, 600);
      const boxH = isPort ? 120 : 100;
      const boxY = bounds.bottom - (boxH / 2 + 10);

      this.dialogueContainer.setPosition(bounds.centerX, boxY);
      this.dialogueBg.setSize(boxW, boxH);
      this.npcNameBox.setPosition(-boxW / 2 + 65, -boxH / 2);
      this.npcNameLabel.setPosition(-boxW / 2 + 65, -boxH / 2);
      this.npcTag.setPosition(-boxW / 2 + 125, -boxH / 2);
      this.npcSpeechText.setPosition(-boxW / 2 + 16, -boxH / 2 + 20)
        .setStyle({ wordWrap: { width: boxW - 32 } });
      this.tapHintText.setPosition(boxW / 2 - 16, boxH / 2 - 14);
    }

    // Posisikan HTML Input Container jika sedang aktif
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
          this._updateRoundBadge();
          console.log('[MiniBossScene] Dynamic AI dialogues loaded successfully.');
        }
      }
    } catch (err) {
      console.warn('[MiniBossScene] Fallback to curated dialogues:', err?.message || err);
    }
  }

  _startRound(roundNumber) {
    if (this.isBattleOver) return;

    this.currentRound = roundNumber;
    this.currentDialogue = this.dialogues[roundNumber - 1] || FALLBACK_DIALOGUES[roundNumber - 1] || FALLBACK_DIALOGUES[0];

    this._updateRoundBadge();
    this._removeHtmlInput();
    this.feedbackModal?.setVisible(false);

    // Boss siap bicara
    this.fullNpcText = `"${this.currentDialogue.npc_line}"`;
    this.currentDisplayedText = '';
    this.npcSpeechText.setText('');
    this.tapHintText.setAlpha(0);

    this.isTypewriterActive = true;
    let charIndex = 0;

    if (this.typewriterTimer) this.typewriterTimer.remove();

    this.typewriterTimer = this.time.addEvent({
      delay: 24,
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
    this.tapHintText.setAlpha(0.9);

    // Tampilkan formulir ketik bebas Dara setelah Reno selesai berbicara
    this.time.delayedCall(450, () => {
      this._showHtmlInput();
    });
  }

  _showHtmlInput() {
    if (this.isBattleOver || this.domInputWrapper) return;

    // Kunci kontrol game Phaser agar tombol WASD/Space tidak terpencet
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
        border: 2px solid #a855f7;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.7), 0 0 16px rgba(168, 85, 247, 0.35);
        border-radius: 12px;
        padding: 12px 14px;
        color: #ffffff;
        font-family: 'Pixelify Sans', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        gap: 8px;
        backdrop-filter: blur(8px);
      ">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="font-size: 11px; font-weight: 700; color: #facc15; display: flex; align-items: center; gap: 6px;">
            <span>✍️ GILIRANMU MENJAWAB SECARA ASERTIF:</span>
          </div>
          <span style="font-size: 10px; color: #94a3b8;">Ronde ${this.currentRound} / ${this.totalRounds}</span>
        </div>
        
        <div style="font-size: 10px; color: #cbd5e1; background: rgba(30, 27, 75, 0.6); border-left: 3px solid #38bdf8; padding: 4px 8px; border-radius: 4px;">
          💡 <strong>Panduan:</strong> ${hint}
        </div>

        <div style="display: flex; gap: 8px;">
          <textarea
            id="miniboss-textarea"
            rows="2"
            placeholder="Tuliskan responmu di sini... (Bersikap tenang, lugas, pertahankan batasan tanpa memaki)"
            style="
              flex: 1;
              background: #090d16;
              border: 1.5px solid #475569;
              border-radius: 8px;
              color: #f8fafc;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 12px;
              padding: 8px 10px;
              resize: none;
              outline: none;
              transition: border-color 0.2s;
            "
          ></textarea>

          <button
            id="miniboss-submit-btn"
            type="button"
            style="
              background: linear-gradient(135deg, #059669, #10b981);
              border: 1px solid #34d399;
              border-radius: 8px;
              color: #ffffff;
              font-family: 'Pixelify Sans', system-ui, sans-serif;
              font-size: 11px;
              font-weight: 700;
              padding: 0 16px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
              transition: all 0.2s;
              white-space: nowrap;
            "
          >
            KIRIM ↵
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
      textarea.style.borderColor = '#a855f7';
      window.__nawasenadaraInput?.disableGameKeyboard?.();
    });

    textarea.addEventListener('blur', () => {
      textarea.style.borderColor = '#475569';
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
        errorHint.textContent = 'Ketik kalimat balasanmu terlebih dahulu (minimal 3 huruf).';
        errorHint.style.display = 'block';
        textarea.focus();
        return;
      }
      errorHint.style.display = 'none';
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.6';
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

    const inputWidth = Math.min(rect.width - 32, isPort ? 440 : 540);
    const leftPos = rect.left + (rect.width - inputWidth) / 2;
    const bottomPos = window.innerHeight - rect.bottom + 14;

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

      // Fallback lokal jika NLP API tidak dapat dijangkau
      if (!evalResult) {
        evalResult = this._localFallbackEvaluation(playerText);
      }

      this._applyEvaluationOutcome(evalResult);
    } catch (err) {
      console.warn('[MiniBossScene] Evaluator error, using fallback:', err);
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
        : 'Hahaha! Tuh kan, baperan lu mah gak bisa bales apa-apa!',
      feedback: isAssertive
        ? 'Bagus sekali! Kamu menetapkan batasan dengan kepala dingin tanpa membalas dengan makian kasar.'
        : 'Jangan terpancing emosi atau membalas dengan makian. Tetap tenang dan tegaskan batasan pribadimu.',
      damage_boss: isAssertive,
      damage_player: !isAssertive,
      detected_emotion: isAssertive ? 'aman' : (hasCurse ? 'marah' : 'menyinggung'),
      confidence: 0.88,
      previous_emotion_tier: this.currentEmotionTier,
      current_emotion_tier: newTier,
      tier_info: tierMeta,
    };
  }

  _applyEvaluationOutcome(res) {
    const {
      is_assertive,
      boss_reaction,
      feedback,
      damage_boss,
      damage_player,
      detected_emotion,
      confidence,
      previous_emotion_tier,
      current_emotion_tier,
    } = res;

    // 1. Update Emotion Tier
    const oldTier = this.currentEmotionTier;
    this.currentEmotionTier = current_emotion_tier || oldTier;
    this._animateEmotionTier(oldTier, this.currentEmotionTier);

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
    this.time.delayedCall(500, () => {
      this._showFeedbackModal(res);
    });
  }

  _animateEmotionTier(oldTier, newTier) {
    const targetPill = this.tierPillGraphics[newTier - 1];
    if (!targetPill || !this.tierIndicator) return;

    const targetX = targetPill.x;
    this.tweens.add({
      targets: this.tierIndicator,
      x: targetX,
      duration: 350,
      ease: 'Back.easeOut',
    });

    const tierInfo = EMOTION_TIERS.find((t) => t.id === newTier) || EMOTION_TIERS[1];
    this.emotionLabel.setText(`BAR EMOSI (INDOBERT): ${tierInfo.name.toUpperCase()} [${tierInfo.desc.toUpperCase()}]`);
    this.emotionLabel.setColor(tierInfo.hex);

    // Animasi denyut pada pill target
    this.tweens.add({
      targets: targetPill.pill,
      scaleY: 1.3,
      duration: 150,
      yoyo: true,
      repeat: 1,
    });
  }

  _animateBossHit() {
    this.cameras.main.shake(200, 0.015);

    // Flash merah pada panel Boss
    this.tweens.add({
      targets: this.bossPanel,
      fillColor: 0xffffff,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });

    // Crossfade cutscene ke CG Reno kalah sesaat
    if (this.bgDefeated) {
      this.tweens.add({
        targets: this.bgDefeated,
        alpha: 1,
        duration: 180,
        yoyo: true,
        hold: 400,
        ease: 'Quad.easeInOut',
      });
    }
  }

  _animatePlayerHurt() {
    this.cameras.main.flash(220, 239, 68, 68);

    // Shake panel Dara
    this.tweens.add({
      targets: this.daraGroup,
      x: this.daraGroup.x + 6,
      duration: 40,
      yoyo: true,
      repeat: 3,
    });
  }

  _updateHpDisplays() {
    // Update Hati Dara
    this.heartSprites.forEach((heart, idx) => {
      if (idx < this.daraHp) {
        heart.setText('❤️').setAlpha(1);
      } else {
        heart.setText('🖤').setAlpha(0.4);
      }
    });

    // Update Bar Boss Reno
    this.bossHpBars.forEach((barItem, idx) => {
      if (idx < this.bossHp) {
        barItem.fill.setVisible(true);
      } else {
        barItem.fill.setVisible(false);
      }
    });
  }

  _updateRoundBadge() {
    const topic = this.currentDialogue?.topic || 'Konfrontasi Batasan Diri';
    this.roundBadgeText.setText(`RONDE ${this.currentRound} / ${this.totalRounds}: ${topic.toUpperCase()}`);
  }

  _showFeedbackModal(evalData) {
    const isAssertive = evalData.is_assertive;
    const pct = Math.round((evalData.confidence || 0.85) * 100);
    const emoLabel = evalData.detected_emotion || 'netral';

    this.evalBadge.setText(isAssertive ? '✅ ASERTIF & BATASAN JELAS! (-1 HP Boss)' : '⚠️ RESPON KURANG ASERTIF (-1 HP Dara)');
    this.evalBadge.setColor(isAssertive ? '#22c55e' : '#ef4444');

    this.evalBossReaction.setText(`"${evalData.boss_reaction}"`);
    this.evalEmotionInfo.setText(`Emosi Terdeteksi: ${emoLabel.toUpperCase()} (${pct}%) | Tingkat Emosi: Tier ${evalData.previous_emotion_tier} ➔ Tier ${evalData.current_emotion_tier}`);
    this.evalBkText.setText(evalData.feedback);

    if (this.currentRound >= this.totalRounds || this.bossHp <= 0 || this.daraHp <= 0) {
      this.evalNextBtnText.setText('LIHAT HASIL AKHIR ➔');
    } else {
      this.evalNextBtnText.setText('LANJUT KE RONDE BERIKUTNYA ➔');
    }

    this.feedbackModal.setVisible(true).setAlpha(0);
    this.tweens.add({
      targets: this.feedbackModal,
      alpha: 1,
      duration: 200,
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
        duration: 500,
      });
    }

    // Catat episode 6 selesai di database lokal
    completeEpisode(6, this.choices || []);

    const bounds = getVisibleBounds(this);
    const winContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.8);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 40, 420), 220, 0x090d16, 0.98)
      .setStrokeStyle(2, 0x10b981);

    const title = this.add.text(0, -65, '🏆 DARA MENANG! BATASAN TEGAK!', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '15px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -15, 'Hebat! Dara berhasil mematahkan provokasi dan intimidasi Reno dengan komunikasi asertif, tenang, dan berwibawa.\n\nReno tertegun dan tidak berani lagi meremehkan batasan dirimu.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 370 },
    }).setOrigin(0.5);

    // Tombol 1: Evaluasi & Rapor Akhir (Menuju EpisodeEndingScene)
    const reportBtn = this.add.rectangle(0, 44, 250, 32, 0x064e3b, 1)
      .setStrokeStyle(1.5, 0x10b981).setInteractive({ useHandCursor: true });
    const reportBtnText = this.add.text(0, 44, '📜 LIHAT EVALUASI & RAPOR AKHIR', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    reportBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeEndingScene', {
        episodeId: 6,
        isLastEpisode: true,
        choices: this.choices || [],
      });
    });

    // Tombol 2: Pilih Episode
    const menuBtn = this.add.rectangle(0, 84, 250, 30, 0x1e1b4b, 0.9)
      .setStrokeStyle(1.2, 0xa855f7).setInteractive({ useHandCursor: true });
    const menuBtnText = this.add.text(0, 84, '🏠 PILIH EPISODE LAIN', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#e9d5ff',
    }).setOrigin(0.5);

    menuBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });

    winContainer.add([backdrop, card, title, desc, reportBtn, reportBtnText, menuBtn, menuBtnText]);
    winContainer.setAlpha(0);
    this.tweens.add({ targets: winContainer, alpha: 1, duration: 300 });
  }

  _handleDefeat() {
    this.isBattleOver = true;
    this.audioManager?.stopBGM();

    const bounds = getVisibleBounds(this);
    const loseContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.85);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 40, 400), 200, 0x180b13, 0.98)
      .setStrokeStyle(2, 0xef4444);

    const title = this.add.text(0, -55, '💔 BATASAN EMOSI TERGUNCANG', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '14px',
      fontStyle: '700',
      color: '#f87171',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -10, 'Dara kehabisan ketenangan menghadapi provokasi Reno.\nIngat, jangan biarkan orang lain memancing emosimu.\nTarik napas, tetap tenang, dan nyatakan batasanmu dengan lugas.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      color: '#fca5a5',
      align: 'center',
      lineSpacing: 4,
      wordWrap: { width: 350 },
    }).setOrigin(0.5);

    // Tombol Coba Lagi
    const retryBtn = this.add.rectangle(0, 48, 200, 32, 0x831843, 1)
      .setStrokeStyle(1.5, 0xf43f5e).setInteractive({ useHandCursor: true });
    const retryBtnText = this.add.text(0, 48, '🔄 COBA LAGI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.restart();
    });

    // Tombol Kembali
    const exitBtn = this.add.rectangle(0, 84, 200, 28, 0x0f172a, 0.9)
      .setStrokeStyle(1.2, 0x64748b).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 84, '🏠 KEMBALI KE MENU', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#cbd5e1',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });

    loseContainer.add([backdrop, card, title, desc, retryBtn, retryBtnText, exitBtn, exitBtnText]);
    loseContainer.setAlpha(0);
    this.tweens.add({ targets: loseContainer, alpha: 1, duration: 300 });
  }
}
