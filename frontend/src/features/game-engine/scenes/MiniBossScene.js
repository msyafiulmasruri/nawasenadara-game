import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import ObjectiveBriefing from '../ui/ObjectiveBriefing';
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
    this.isPaused = false;

    // DOM & UI elemen - Inisialisasi bersih untuk mencegah reuse objek lama
    this.domInputWrapper = null;
    this.objectiveBriefing = null;
    this.pauseContainer = null;
    this.daraHpPips = [];
    this.bossHpPips = [];
    this.meterLabels = [];

    this.hudContainer = null;
    this.daraGroup = null;
    this.bossGroup = null;
    this.roundInfoText = null;
    this.fsGroup = null;
    this.fsBtnBg = null;
    this.fsBtnText = null;
    this.menuGroup = null;
    this.menuBtnBg = null;
    this.menuBtnText = null;

    this.emotionMeterContainer = null;
    this.meterTrack = null;
    this.meterFill = null;
    this.meterHeader = null;

    this.dialogueContainer = null;
    this.dialogueBg = null;
    this.npcNameBox = null;
    this.npcNameLabel = null;
    this.topicLabel = null;
    this.npcSpeechText = null;
    this.tapHintText = null;

    this.bgConfrontation = null;
    this.bgDefeated = null;
    this.topVignette = null;
    this.bottomVignette = null;
  }

  create() {
    // 1. Audio Manager
    this.audioManager = new AudioManager();
    this.audioManager.init();
    this.audioManager.startBossBGM();

    // 2. Responsive viewport resize & Fullscreen change dengan multi-stage debounce
    syncGameSizeToOrientation(this);
    this._onResize = () => this._handleResize();
    this._onFullscreenChange = () => {
      this._updateFullscreenIcon();
      if (this._fsTimer1) clearTimeout(this._fsTimer1);
      if (this._fsTimer2) clearTimeout(this._fsTimer2);
      if (this._fsTimer3) clearTimeout(this._fsTimer3);
      this._fsTimer1 = setTimeout(() => this._handleResize(), 80);
      this._fsTimer2 = setTimeout(() => this._handleResize(), 200);
      this._fsTimer3 = setTimeout(() => this._handleResize(), 350);
    };

    this.scale.on('resize', this._onResize);
    window.addEventListener('resize', this._onResize);
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this._onFullscreenChange);

    // 3. Render Background Cutscenes
    this._createBackgrounds();

    // 4. Render HUD di paling atas
    this._createHUD();

    // 5. Render Loading Bar Vertikal di sebelah KIRI
    this._createVerticalEmotionMeter();

    // 6. Render Kotak Dialog Reno di area ATAS
    this._createTopDialogueUI();

    // 7. Lakukan layout awal posisi seluruh elemen secara serentak
    this._layoutElements();

    // 8. Muat dialog dinamis dari AI backend jika tersedia
    this._fetchAiDialogues();

    // 9. Berikan tujuan misi (Objective Briefing) sebelum Ronde 1 dimulai
    this._showMissionBriefing();

    // Cleanup saat scene ditutup/berpindah
    this.events.once('shutdown', () => {
      this._cleanupScene();
    });
  }

  _cleanupScene() {
    this._removeHtmlInput();
    this._closePauseMenu();
    if (this.objectiveBriefing?.isOpen) {
      this.objectiveBriefing.close();
      this.objectiveBriefing = null;
    }
    if (this.typewriterTimer) {
      this.typewriterTimer.remove();
      this.typewriterTimer = null;
    }
    if (this._fsTimer1) clearTimeout(this._fsTimer1);
    if (this._fsTimer2) clearTimeout(this._fsTimer2);
    if (this._fsTimer3) clearTimeout(this._fsTimer3);
    this.audioManager?.stopBGM();
    this.audioManager?.destroy();
    this.audioManager = null;
    this.scale.off('resize', this._onResize);
    window.removeEventListener('resize', this._onResize);
    document.removeEventListener('fullscreenchange', this._onFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this._onFullscreenChange);
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

    if (this.topVignette && typeof this.topVignette.setSize === 'function') {
      this.topVignette.setPosition(bounds.centerX, bounds.top + 75).setSize(bounds.width + 20, 150);
    }
    if (this.bottomVignette && typeof this.bottomVignette.setSize === 'function') {
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

    // ── KANAN: TOMBOL FULLSCREEN ──
    this.fsBtnBg = this.add.rectangle(0, 0, 36, 32, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x334155)
      .setInteractive({ useHandCursor: true });
    this.fsBtnText = this.add.text(0, 0, '⛶', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#f8fafc',
    }).setOrigin(0.5);
    this.fsBtnBg.on('pointerdown', () => this.toggleFullscreen());
    this.fsBtnBg.on('pointerover', () => this.fsBtnBg.setFillStyle(0x1e293b));
    this.fsBtnBg.on('pointerout', () => this.fsBtnBg.setFillStyle(0x0f172a));
    this.fsGroup = this.add.container(0, 0, [this.fsBtnBg, this.fsBtnText]);
    this.hudContainer.add(this.fsGroup);

    // ── KANAN: TOMBOL MENU ──
    this.menuBtnBg = this.add.rectangle(0, 0, 54, 32, 0x0f172a, 0.95)
      .setStrokeStyle(1.5, 0x334155)
      .setInteractive({ useHandCursor: true });
    this.menuBtnText = this.add.text(0, 0, 'MENU', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#ffdd57',
    }).setOrigin(0.5);
    this.menuBtnBg.on('pointerdown', () => this._togglePauseMenu());
    this.menuBtnBg.on('pointerover', () => this.menuBtnBg.setFillStyle(0x1e293b));
    this.menuBtnBg.on('pointerout', () => this.menuBtnBg.setFillStyle(0x0f172a));
    this.menuGroup = this.add.container(0, 0, [this.menuBtnBg, this.menuBtnText]);
    this.hudContainer.add(this.menuGroup);

    this._updateFullscreenIcon();
  }

  _createVerticalEmotionMeter() {
    this.emotionMeterContainer = this.add.container(0, 0).setDepth(18);

    this.meterTrackW = 22;
    this.meterTrackH = 136;

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
    // Tinggi fisik dasar = trackH - 4. Origin (0.5, 1) agar scaleY tumbuh dari bawah ke atas tanpa merusak geometri.
    const fillMaxH = this.meterTrackH - 4;
    const initialScaleY = Math.min(1, Math.max(0.1, this.currentEmotionTier / 6));
    const tierMeta = EMOTION_TIERS.find((t) => t.id === this.currentEmotionTier) || EMOTION_TIERS[1];

    this.meterFill = this.add.rectangle(
      0,
      this.meterTrackH / 2 - 2,
      this.meterTrackW - 4,
      fillMaxH,
      tierMeta.color,
      1
    )
      .setOrigin(0.5, 1)
      .setScale(1, initialScaleY);

    this.emotionMeterContainer.add([this.meterHeader, this.meterTrack, this.meterFill]);

    // Label teks tingkat 1 - 6 di samping kanan bar
    this.meterLabels = [];
    const stepH = (this.meterTrackH - 8) / 6;

    EMOTION_TIERS.forEach((tier, index) => {
      // index 0 = tier 1 (Aman) di paling bawah
      const labelY = (this.meterTrackH / 2 - 4) - (index + 0.5) * stepH;
      const text = this.add.text(this.meterTrackW / 2 + 8, labelY, `${tier.id} ${tier.name}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        color: tier.id === this.currentEmotionTier ? '#ffffff' : '#64748b',
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
    if (this.roundInfoText) this.roundInfoText.setPosition(bounds.centerX, topMargin);

    // Area kanan: Menu, Fullscreen, Reno HP
    if (this.menuGroup) this.menuGroup.setPosition(bounds.right - 34, topMargin);
    if (this.fsGroup) this.fsGroup.setPosition(bounds.right - 84, topMargin);
    if (this.bossGroup) this.bossGroup.setPosition(bounds.right - 188, topMargin);

    // Posisi Loading Bar Vertikal di sebelah KIRI
    if (this.emotionMeterContainer) {
      const meterX = Math.max(bounds.left + 42, 48);
      const meterY = bounds.centerY + 8;
      this.emotionMeterContainer.setPosition(meterX, meterY);
      this._updateVerticalEmotionMeter(false);
    }

    // Posisi Kotak Dialog di ATAS
    if (this.dialogueContainer && this.dialogueBg && typeof this.dialogueBg.setSize === 'function') {
      const boxW = Math.min(bounds.width - 24, 600);
      const boxH = 82;
      const boxY = topMargin + 54;

      this.dialogueContainer.setPosition(bounds.centerX, boxY);
      this.dialogueBg.setSize(boxW, boxH);
      if (this.npcNameBox) this.npcNameBox.setPosition(-boxW / 2 + 52, -boxH / 2);
      if (this.npcNameLabel) this.npcNameLabel.setPosition(-boxW / 2 + 52, -boxH / 2);
      if (this.topicLabel) this.topicLabel.setPosition(-boxW / 2 + 104, -boxH / 2);
      if (this.npcSpeechText) {
        this.npcSpeechText.setPosition(-boxW / 2 + 16, -14).setStyle({ wordWrap: { width: boxW - 32 } });
      }
      if (this.tapHintText) this.tapHintText.setPosition(boxW / 2 - 14, boxH / 2 - 12);
    }

    // Reposisi input HTML jika sedang aktif
    this._repositionHtmlInput();
  }

  toggleFullscreen() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (!isFs) {
      const el = document.documentElement;
      const req = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
      req?.call(el).catch(() => {});
    } else {
      const exit = document.exitFullscreen ?? document.webkitExitFullscreen ?? document.msExitFullscreen;
      exit?.call(document).catch(() => {});
    }
  }

  _updateFullscreenIcon() {
    const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    if (this.fsBtnText) {
      this.fsBtnText.setText(isFs ? '✕' : '⛶');
    }
  }

  _togglePauseMenu() {
    if (this.isBattleOver) return;
    if (this.isPaused) {
      this._closePauseMenu();
    } else {
      this._openPauseMenu();
    }
  }

  _openPauseMenu() {
    this.isPaused = true;
    if (this.domInputWrapper) {
      this.domInputWrapper.style.visibility = 'hidden';
    }

    const bounds = getVisibleBounds(this);
    this.pauseContainer = this.add.container(0, 0).setDepth(200);

    const overlay = this.add.rectangle(bounds.centerX, bounds.centerY, bounds.width + 60, bounds.height + 60, 0x000000, 0.75)
      .setInteractive();

    const panelW = Math.min(bounds.width * 0.85, 340);
    const panelH = 260;
    const panelBg = this.add.rectangle(bounds.centerX, bounds.centerY, panelW, panelH, 0x0f172a, 0.98)
      .setStrokeStyle(2, 0x38bdf8);

    const title = this.add.text(bounds.centerX, bounds.centerY - panelH / 2 + 30, 'MENU JEDA', {
      fontFamily: '"Jersey 15", monospace',
      fontSize: '26px',
      color: '#ffdd57',
    }).setOrigin(0.5);

    const menuOptions = [
      {
        label: 'Lanjutkan Pertarungan',
        color: 0x1e293b,
        hover: 0x334155,
        action: () => this._closePauseMenu(),
      },
      {
        label: 'Mulai Ulang Tantangan',
        color: 0x1e293b,
        hover: 0x334155,
        action: () => {
          this._cleanupScene();
          this.scene.restart();
        },
      },
      {
        label: 'Pilih Episode',
        color: 0x1e293b,
        hover: 0x334155,
        action: () => {
          this._cleanupScene();
          this.scene.start('EpisodeSelectScene');
        },
      },
      {
        label: 'Menu Utama',
        color: 0x1e293b,
        hover: 0x334155,
        action: () => {
          this._cleanupScene();
          this.scene.start('MenuScene');
        },
      },
    ];

    const btnStartX = bounds.centerX;
    const btnStartY = bounds.centerY - 30;
    const btnGap = 42;

    const optButtons = menuOptions.map((opt, i) => {
      const btnY = btnStartY + i * btnGap;
      const btnBg = this.add.rectangle(btnStartX, btnY, panelW - 44, 34, opt.color, 1)
        .setStrokeStyle(1.5, 0x475569)
        .setInteractive({ useHandCursor: true });
      const btnTxt = this.add.text(btnStartX, btnY, opt.label, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '14px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(opt.hover));
      btnBg.on('pointerout', () => btnBg.setFillStyle(opt.color));
      btnBg.on('pointerdown', opt.action);

      return [btnBg, btnTxt];
    }).flat();

    this.pauseContainer.add([overlay, panelBg, title, ...optButtons]);
  }

  _closePauseMenu() {
    this.isPaused = false;
    if (this.pauseContainer) {
      this.pauseContainer.destroy(true);
      this.pauseContainer = null;
    }
    if (this.domInputWrapper && !this.isBattleOver) {
      this.domInputWrapper.style.visibility = 'visible';
      this._repositionHtmlInput();
    }
  }

  _showMissionBriefing() {
    this.objectiveBriefing = new ObjectiveBriefing(this);
    this.objectiveBriefing.show({
      episodeData: {
        id: 'Mini Boss',
        title: 'Pertahankan Batasan Diri',
        objective: 'Hadapi provokasi dan candaan seksis Reno di lorong sekolah. Berikan tanggapan asertif secara langsung dengan kepala dingin, tegas membela batasan diri, tanpa bersikap kasar atau menghindar.',
        aspects: [
          { desc: 'Pahami perkataan provokasi Reno tanpa langsung terpancing emosi.' },
          { desc: 'Ketik respon kalimat asertif yang tenang, lugas, dan menghargai diri.' },
          { desc: 'Jaga indikator kestabilan emosi tetap terkendali hingga percakapan tuntas.' },
        ],
      },
      promptLabel: 'Mulai Tantangan',
      onContinue: () => {
        this._startRound(1);
      },
    });
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
    wrapper.style.position = 'fixed';
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
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const isPort = isPortrait(this);

    const inputWidth = Math.min(rect.width - 24, isPort ? 440 : 540);
    const leftPos = rect.left + (rect.width - inputWidth) / 2;
    const bottomPos = Math.max(16, window.innerHeight - rect.bottom + 16);

    this.domInputWrapper.style.position = 'fixed';
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

  _updateVerticalEmotionMeter(animate = true) {
    if (!this.meterFill) return;

    const targetScaleY = Math.min(1, Math.max(0.1, this.currentEmotionTier / 6));
    const tierMeta = EMOTION_TIERS.find((t) => t.id === this.currentEmotionTier) || EMOTION_TIERS[1];

    if (animate) {
      this.tweens.killTweensOf(this.meterFill);
      this.tweens.add({
        targets: this.meterFill,
        scaleY: targetScaleY,
        duration: 320,
        ease: 'Cubic.easeOut',
      });
    } else {
      this.meterFill.setScale(1, targetScaleY);
    }

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
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 460), 230, 0x0f172a, 0.98)
      .setStrokeStyle(1.8, 0x10b981);

    const title = this.add.text(0, -64, 'TANTANGAN SELESAI', {
      fontFamily: '"Jersey 15", monospace',
      fontSize: '24px',
      color: '#34d399',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -16, 'Dara berhasil menghadapi seluruh provokasi Reno dengan respon asertif yang tenang, lugas, dan berwibawa.\n\nReno tertegun dan tidak berani lagi meremehkan batasan dirimu.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '14px',
      color: '#e2e8f0',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: 400 },
    }).setOrigin(0.5);

    // Card height adjusted for 3 buttons
    card.setSize(Math.min(bounds.width - 32, 460), 260);

    // Tombol 1: Lanjut ke Mini Boss Runner (Sprint of Truth)
    const runnerBtn = this.add.rectangle(0, 32, 290, 32, 0x064e3b, 1)
      .setStrokeStyle(1.5, 0x10b981).setInteractive({ useHandCursor: true });
    const runnerBtnText = this.add.text(0, 32, 'Tantang Mini Boss Runner (Sprint of Truth) ›', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12.5px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    runnerBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('RunnerScene', {
        episodeId: 6,
        isLastEpisode: true,
        choices: this.choices || [],
      });
    });
    runnerBtn.on('pointerover', () => runnerBtn.setFillStyle(0x047857));
    runnerBtn.on('pointerout', () => runnerBtn.setFillStyle(0x064e3b));

    // Tombol 2: Lihat Rapor Evaluasi Akhir Keseluruhan (Membuka Rapor 6 Episode Landscape)
    const reportBtn = this.add.rectangle(0, 68, 290, 30, 0x1e3a8a, 1)
      .setStrokeStyle(1.2, 0x3b82f6).setInteractive({ useHandCursor: true });
    const reportBtnText = this.add.text(0, 68, 'Lihat Evaluasi & Rapor Akhir ›', {
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
    reportBtn.on('pointerover', () => reportBtn.setFillStyle(0x1d4ed8));
    reportBtn.on('pointerout', () => reportBtn.setFillStyle(0x1e3a8a));

    // Tombol 3: Pilih Episode Lain
    const exitBtn = this.add.rectangle(0, 104, 290, 28, 0x1e293b, 1)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 104, 'Kembali ke Pemilihan Episode', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11.5px',
      fontStyle: '700',
      color: '#f8fafc',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });
    exitBtn.on('pointerover', () => exitBtn.setFillStyle(0x334155));
    exitBtn.on('pointerout', () => exitBtn.setFillStyle(0x1e293b));

    winContainer.add([backdrop, card, title, desc, runnerBtn, runnerBtnText, reportBtn, reportBtnText, exitBtn, exitBtnText]);
    winContainer.setAlpha(0);
    this.tweens.add({ targets: winContainer, alpha: 1, duration: 250 });
  }

  _handleDefeat() {
    this.isBattleOver = true;
    this.audioManager?.stopBGM();

    const bounds = getVisibleBounds(this);
    const loseContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(50);

    const backdrop = this.add.rectangle(0, 0, bounds.width + 40, bounds.height + 40, 0x000000, 0.85);
    const card = this.add.rectangle(0, 0, Math.min(bounds.width - 32, 440), 220, 0x0f172a, 0.98)
      .setStrokeStyle(1.8, 0xdc2626);

    const title = this.add.text(0, -56, 'TANTANGAN BELUM BERHASIL', {
      fontFamily: '"Jersey 15", monospace',
      fontSize: '24px',
      color: '#f87171',
    }).setOrigin(0.5);

    const desc = this.add.text(0, -12, 'Dara kehabisan ketenangan emosional saat menghadapi provokasi Reno.\nTarik napas, tetap tenang, dan nyatakan batasanmu dengan lugas tanpa terpancing emosi.', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      color: '#cbd5e1',
      align: 'center',
      lineSpacing: 5,
      wordWrap: { width: 380 },
    }).setOrigin(0.5);

    // Tombol Coba Lagi
    const retryBtn = this.add.rectangle(0, 46, 240, 34, 0x991b1b, 1)
      .setStrokeStyle(1.5, 0xef4444).setInteractive({ useHandCursor: true });
    const retryBtnText = this.add.text(0, 46, 'Coba Lagi Tantangan', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5);

    retryBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.restart();
    });
    retryBtn.on('pointerover', () => retryBtn.setFillStyle(0xb91c1c));
    retryBtn.on('pointerout', () => retryBtn.setFillStyle(0x991b1b));

    // Tombol Kembali
    const exitBtn = this.add.rectangle(0, 84, 240, 30, 0x1e293b, 1)
      .setStrokeStyle(1, 0x475569).setInteractive({ useHandCursor: true });
    const exitBtnText = this.add.text(0, 84, 'Kembali ke Pemilihan Episode', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#94a3b8',
    }).setOrigin(0.5);

    exitBtn.on('pointerdown', () => {
      this._cleanupScene();
      this.scene.start('EpisodeSelectScene');
    });
    exitBtn.on('pointerover', () => exitBtn.setFillStyle(0x334155));
    exitBtn.on('pointerout', () => exitBtn.setFillStyle(0x1e293b));

    loseContainer.add([backdrop, card, title, desc, retryBtn, retryBtnText, exitBtn, exitBtnText]);
    loseContainer.setAlpha(0);
    this.tweens.add({ targets: loseContainer, alpha: 1, duration: 250 });
  }
}
