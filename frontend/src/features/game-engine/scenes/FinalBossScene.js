import Phaser from 'phaser';
import BasePlayerScene from './BasePlayerScene';
import { getVisibleBounds, pxToWorld } from '../utils/visibleBounds';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/gameConfig';
import { getCharacterName } from '../utils/characterName';

// ================================================================
// FINAL BOSS SCENE: "BAYANGAN INTIMIDASI & KEBISUAN"
// ================================================================
// Klimaks akhir setelah Episode 6:
// Merangkum seluruh rintangan dan keberanian dari Episode 1 s/d 6
// dalam bentuk pertarungan aksi-platformer yang seru, interaktif,
// adil, dan penuh efek visual memukau & audio synthesizer punchy.
// ================================================================

export default class FinalBossScene extends BasePlayerScene {
  constructor() {
    super('FinalBossScene');
  }

  init(data) {
    super.init(data);
    this.episodeId = data?.episodeId ?? 6;
    this.isLastEpisode = data?.isLastEpisode ?? true;
    this.choices = Array.isArray(data?.choices) ? data.choices : [];

    // State Pertarungan
    this.bossMaxHp = 100;
    this.bossHp = 100;
    this.playerMaxCourage = 100;
    this.playerCourage = 100;
    this.currentPhase = 1; // Fase 1, 2, 3
    this.bossState = 'INTRO'; // INTRO, IDLE, ATTACKING, STUNNED, DEFEATED

    // Invulnerability & timers
    this._isInvulnerable = false;
    this._invulnerableTimer = 0;
    this._battleStarted = false;
    this._battleWon = false;
    this._phaseInProgress = false;
    this._isDefeatedModalOpen = false;

    // Koleksi Orbs & Pilar
    this.collectedOrbs = 0;
    this.requiredOrbs = 3;
    this.activePillars = [false, false, false];

    // Groups & GameObjects
    this.orbsGroup = null;
    this.projectilesGroup = null;
    this.hazardZones = [];
    this.pillars = [];
    this.pillarBeams = [];
    this.nexusGraphics = null;

    // Guard inisialisasi HUD agar pemanggilan _repositionUI dari BasePlayerScene tidak error
    this._hudInitialized = false;
    this.bossHudBg = null;
    this.bossHudGlow = null;
    this.bossCrest = null;
    this.bossNameText = null;
    this.phaseBadgeBg = null;
    this.phaseText = null;
    this.hpBg = null;
    this.bossHpGhostFill = null;
    this.bossHpFill = null;
    this.bossHpHighlight = null;
    this.bossHpText = null;
    this.phasePips = [];
    this.courageCardBg = null;
    this.courageLabel = null;
    this.cBg = null;
    this.courageGhostFill = null;
    this.courageFill = null;
    this.courageHighlight = null;
    this.courageText = null;
    this.objectiveBadge = null;
    this.objectiveStatusText = null;

    // Action button & kontrol
    this.actionBtn = null;
    this.actionBtnHalo = null;
    this.actionBtnText = null;
    this.actionBtnGlow = null;
    this.actionKeyE = null;
    this.actionKeyF = null;

    // Timers
    this.phase1AttackTimer = null;
    this.phase1SpikesTimer = null;
    this.phase1GlitchTimer = null;
    this.phase2AttackTimer = null;
    this.phase3MeteorTimer = null;
    this.bossSmokeTimer = null;
  }

  create(data) {
    super.create(data);

    // Kunci kontrol saat intro sinematik
    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    // Pastikan Dara berada di layer terdepan (depth 12) agar tidak terpotong oleh lantai/fissure
    this.player?.setDepth(12);

    // Sembunyikan tombol chat AI Kak Dara selama boss fight agar fokus bertarung
    this.setChatButtonVisible(false);

    // Background musik bos
    if (this.audioManager) {
      this.audioManager.startBossBGM();
    }

    // Bangun elemen visual arena, bos, tombol aksi, dan HUD dalam urutan yang tepat
    this._createAtmosphereEffects();
    this._createBossEntity();
    this._createActionButtons();
    this._createBattleHUD();
    this._createCinematicLetterbox();
    this._setupBossPhysicsColliders();

    // Hook shutdown untuk membersihkan timer dan objek lama saat scene restart / pindah
    this.events.once('shutdown', () => this._cleanupBossScene());

    // Graphics untuk laser nexus pilar penghubung ke Dara
    this.nexusGraphics = this.add.graphics().setDepth(5);

    // Hook resize UI
    this.events.on('resize', () => this._onBossSceneResize());

    // Jalankan Intro Sinematik Pertarungan
    this._playIntroCinematic();
  }

  _startSceneBGM() {
    // Ditangani langsung di create() lewat this.audioManager.startBossBGM()
  }

  // ==============================================================
  // 1. LATAR & ATMOSFER ARENA
  // ==============================================================

  createBackground(width, height) {
    this.finished = false;
    // Titik pijak kaki Dara di atas permukaan paving (~86% tinggi layar)
    this.groundY = Math.round(height * 0.86);

    const bgKey = this.textures.exists('final-boss-arena')
      ? 'final-boss-arena'
      : this.textures.exists('episode-6-bg')
      ? 'episode-6-bg'
      : null;

    this.levelWidth = Math.max(1400, width);

    if (bgKey) {
      this.bg = this.add.image(this.levelWidth / 2, height / 2, bgKey);
      this.bg.setDisplaySize(this.levelWidth, height);
      this.bg.setDepth(0);
    } else {
      this.bg = this.add.rectangle(
        this.levelWidth / 2,
        height / 2,
        this.levelWidth,
        height,
        0x150b24
      );
      this.bg.setDepth(0);
    }

    // Set pembatas kamera arena
    this.cameras.main.setBounds(0, 0, this.levelWidth, height);
    this.physics.world.setBounds(0, 0, this.levelWidth, height);
  }

  _createAtmosphereEffects() {
    const { height } = this.scale;

    // Kabut gelap bergelora di lantai arena
    for (let i = 0; i < 9; i++) {
      const fog = this.add.ellipse(
        Phaser.Math.Between(0, this.levelWidth),
        height - Phaser.Math.Between(15, 80),
        Phaser.Math.Between(280, 500),
        Phaser.Math.Between(50, 100),
        0x1e083a,
        0.35
      );
      fog.setDepth(2);
      this.tweens.add({
        targets: fog,
        x: `+=${Phaser.Math.Between(90, 180)}`,
        alpha: { from: 0.35, to: 0.1 },
        duration: Phaser.Math.Between(4500, 7500),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Partikel bara senja & kelopak bunga hangat melayang
    for (let i = 0; i < 18; i++) {
      const p = this.add.rectangle(
        Phaser.Math.Between(0, this.levelWidth),
        Phaser.Math.Between(50, height * 0.8),
        Phaser.Math.Between(3, 5),
        Phaser.Math.Between(3, 5),
        0xffa044,
        0.65
      );
      p.setDepth(3);
      this.tweens.add({
        targets: p,
        x: `+=${Phaser.Math.Between(120, 240)}`,
        y: `+=${Phaser.Math.Between(30, 90)}`,
        angle: 360,
        alpha: { from: 0.8, to: 0.1 },
        duration: Phaser.Math.Between(5000, 9500),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3000),
      });
    }
  }

  // ==============================================================
  // 2. ENTITAS BOS & EFEK VISUAL AURA (BERSIH DARI BULATAN DADA)
  // ==============================================================

  _createBossEntity() {
    const bossStartX = this.levelWidth - 260;
    const bossStartY = this.groundY - 145;

    // 1. Puddle Bayangan Gelap Melingkar di Permukaan Lantai Arena (Code-based Ground Shadow)
    this.bossGroundShadow = this.add.ellipse(bossStartX, this.groundY - 6, 220, 50, 0x05010a, 0.75).setDepth(4);
    this.bossGroundShadowCore = this.add.ellipse(bossStartX, this.groundY - 6, 140, 28, 0x000000, 0.9).setDepth(4);

    // 2. Aura Kegelapan Melingkar di Sekeliling Boss (Code-based Dark Void Vortex)
    // Menghilangkan disc/persegi panjang palsu, diganti lingkaran bayangan pekat yang bernapas
    this.bossDarkAuraOuter = this.add.circle(bossStartX, bossStartY, 175, 0x07010f, 0.45).setDepth(4);
    this.bossDarkAuraInner = this.add.circle(bossStartX, bossStartY, 120, 0x020005, 0.65).setDepth(4);

    // 3. Sprite Bos Bayangan
    const bossTexture = this.textures.exists('boss-shadow') ? 'boss-shadow' : 'player-idle';
    this.boss = this.physics.add.sprite(bossStartX, bossStartY, bossTexture);
    this.boss.setDepth(5);
    this.boss.setDisplaySize(240, 280);
    this.boss.setImmovable(true);
    this.boss.body.allowGravity = false;

    // Simpan skala dasar sprite agar proporsional dan tidak pernah membesar liar/terdistorsi
    this._bossBaseScaleX = this.boss.scaleX;
    this._bossBaseScaleY = this.boss.scaleY;

    // Denyut Napas Aura Melingkar (Breathing Dark Aura & Ground Shadow)
    this.bossAuraTween = this.tweens.add({
      targets: [this.bossDarkAuraOuter, this.bossDarkAuraInner],
      scaleX: 1.12,
      scaleY: 1.12,
      alpha: { from: 0.45, to: 0.25 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.bossShadowTween = this.tweens.add({
      targets: [this.bossGroundShadow, this.bossGroundShadowCore],
      scaleX: 1.15,
      scaleY: 1.12,
      alpha: { from: 0.8, to: 0.5 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Animasi melayang anggun dengan skala stabil (hanya napas 2% dari skala asli)
    this.bossHoverTween = this.tweens.add({
      targets: this.boss,
      y: bossStartY - 16,
      scaleX: { from: this._bossBaseScaleX * 0.98, to: this._bossBaseScaleX * 1.02 },
      scaleY: { from: this._bossBaseScaleY * 0.98, to: this._bossBaseScaleY * 1.02 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Mote kabut bayangan yang membubung perlahan dari pangkal boss
    this.bossSmokeTimer = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: () => {
        if (!this.boss || !this.boss.active || this.bossState === 'DEFEATED') return;
        const wispX = this.boss.x + Phaser.Math.Between(-60, 60);
        const wispY = this.boss.y + Phaser.Math.Between(40, 110);
        const wisp = this.add.circle(wispX, wispY, Phaser.Math.Between(6, 14), 0x05010a, 0.45).setDepth(4);
        this.tweens.add({
          targets: wisp,
          y: wispY - Phaser.Math.Between(50, 90),
          x: wispX + Phaser.Math.Between(-20, 20),
          alpha: 0,
          scale: 0.3,
          duration: Phaser.Math.Between(900, 1400),
          ease: 'Sine.easeOut',
          onComplete: () => wisp.destroy(),
        });
      },
    });

    // Wadah Proyektil & Objek
    this.projectilesGroup = this.physics.add.group();
    this.orbsGroup = this.physics.add.group();
  }

  // ==============================================================
  // 3. UI & HUD PERTARUNGAN (CLEAN, MODERN & GAMING-GRADE)
  // ==============================================================

  _createBattleHUD() {
    const bounds = getVisibleBounds(this);

    // Sembunyikan elemen bawaan BasePlayerScene yang tidak dipakai di battle ini
    this._profileNameText?.setVisible(false);
    this._questGuideText?.setVisible(false);

    // --- A. ELEMEN BAR DAYA TAHAN BOS (Top Center Epic Boss HUD) ---
    // 1. Ambient Glow di belakang HUD bos
    this.bossHudGlow = this.add.ellipse(0, 0, 100, 48, 0x881337, 0.35)
      .setDepth(34).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);

    // 2. Header Slate Container
    this.bossHudBg = this.add.rectangle(0, 0, 100, 24, 0x090212, 0.96)
      .setDepth(35).setScrollFactor(0).setStrokeStyle(1.5, 0x881337);

    // 3. Ikon Emblem Bos
    this.bossCrest = this.add.text(0, 0, '☠', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#f43f5e',
    }).setOrigin(0.5).setDepth(36).setScrollFactor(0);

    // 4. Nama Bos
    this.bossNameText = this.add.text(0, 0, 'BAYANGAN INTIMIDASI & KEBISUAN', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#fda4af',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0, 0.5).setDepth(36).setScrollFactor(0);

    // 5. Badge Fase Modern (Pill Badge Rapi di Sisi Kanan Header Bar)
    this.phaseBadgeBg = this.add.rectangle(0, 0, 140, 18, 0x1f0714, 0.95)
      .setDepth(36).setScrollFactor(0).setStrokeStyle(1, 0xf43f5e);

    this.phaseText = this.add.text(0, 0, 'FASE 1: SUARA TOKSIK', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fde047',
    }).setOrigin(0.5).setDepth(37).setScrollFactor(0);

    // 6. Track Wadah Health Bar (Menempel rapi persis di bawah Header)
    this.hpBg = this.add.rectangle(0, 0, 100, 18, 0x06010a, 0.98)
      .setDepth(35).setScrollFactor(0).setStrokeStyle(1.5, 0xbe123c);

    // 7. Ghost Fill (draining damage chip effect)
    this.bossHpGhostFill = this.add.rectangle(0, 0, 100, 18, 0xf59e0b, 0.95)
      .setOrigin(0, 0.5).setDepth(35).setScrollFactor(0);

    // 8. Active Fill (vibrant crimson)
    this.bossHpFill = this.add.rectangle(0, 0, 100, 18, 0xe11d48, 1)
      .setOrigin(0, 0.5).setDepth(36).setScrollFactor(0);

    // 9. Gloss Highlight Strip
    this.bossHpHighlight = this.add.rectangle(0, 0, 100, 2.5, 0xffffff, 0.35)
      .setDepth(37).setScrollFactor(0);

    // 10. Angka HP & Persentase
    this.bossHpText = this.add.text(0, 0, '100 / 100 HP  •  100%', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(38).setScrollFactor(0);

    // 11. Pip Pembagi Fase (33% & 66%) dengan aksen emas
    this.phasePips = [
      this.add.rectangle(0, 0, 2, 20, 0xfde047, 0.85).setDepth(37).setScrollFactor(0),
      this.add.rectangle(0, 0, 2, 20, 0xfde047, 0.85).setDepth(37).setScrollFactor(0),
    ];

    // --- B. ELEMEN BAR KETEGASAN DARA (Top Left Hero Frame) ---
    const playerName = getCharacterName() || 'Dara';

    // 1. Kartu Container Ketegasan (Menempel rapi di sisi kanan avatar bulat)
    this.courageCardBg = this.add.rectangle(0, 0, 212, 46, 0x03140e, 0.94)
      .setDepth(29).setScrollFactor(0).setStrokeStyle(1.5, 0x10b981);

    // 2. Baris 1: Judul Kiri ("🛡️ KETEGASAN")
    this.courageLabel = this.add.text(0, 0, `🛡️ KETEGASAN ${playerName.toUpperCase()}`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#6ee7b7',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(35).setScrollFactor(0);

    // 3. Baris 1: Angka Kanan ("100 / 100")
    this.courageText = this.add.text(0, 0, '100 / 100', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#ecfdf5',
      stroke: '#022c22',
      strokeThickness: 2,
    }).setOrigin(1, 0.5).setDepth(35).setScrollFactor(0);

    // 4. Baris 2: Track Bar Ketegasan
    this.cBg = this.add.rectangle(0, 0, 186, 14, 0x021f14, 0.95)
      .setOrigin(0, 0.5).setDepth(35).setScrollFactor(0).setStrokeStyle(1, 0x047857);

    // 5. Baris 2: Ghost Fill (amber chip drain on hit)
    this.courageGhostFill = this.add.rectangle(0, 0, 186, 14, 0xf59e0b, 0.9)
      .setOrigin(0, 0.5).setDepth(35).setScrollFactor(0);

    // 6. Baris 2: Fill Hijau Emerald
    this.courageFill = this.add.rectangle(0, 0, 186, 14, 0x22c55e, 1)
      .setOrigin(0, 0.5).setDepth(36).setScrollFactor(0);

    // 7. Baris 2: Gloss Highlight Strip
    this.courageHighlight = this.add.rectangle(0, 0, 184, 2.5, 0xffffff, 0.35)
      .setOrigin(0, 0.5).setDepth(37).setScrollFactor(0);

    // 8. Baris 3: Badge Tracker Misi (Tersendiri di Bawah Kartu dengan jeda lega)
    this.objectiveBadge = this.add.rectangle(0, 0, 266, 26, 0x0f0c05, 0.94)
      .setOrigin(0, 0.5).setDepth(35).setScrollFactor(0).setStrokeStyle(1.5, 0xd97706);

    this.objectiveStatusText = this.add.text(0, 0, '🎯 Misi: Kumpulkan 3 Bukti [◇ ◇ ◇]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fde047',
      align: 'left',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0, 0.5).setDepth(36).setScrollFactor(0);

    // Tandai HUD telah siap & posisikan seluruh elemen secara aman
    this._hudInitialized = true;
    this._repositionBossHUD(bounds);
  }

  _safeSetRectSize(rect, width, height) {
    if (!rect || !rect.active) return;
    rect.width = width;
    rect.height = height;
    if (rect.geom && typeof rect.geom.setSize === 'function') {
      rect.geom.setSize(width, height);
    }
    if (typeof rect.updateDisplayOrigin === 'function') {
      rect.updateDisplayOrigin();
    }
    if (typeof rect.updateData === 'function') {
      rect.updateData();
    }
  }

  _repositionBossHUD(bounds) {
    if (!bounds || !this._hudInitialized || !this.bossHudBg || !this.bossHudBg.active) return;

    // Pastikan teks profil bawaan tetap tersembunyi agar tidak bentrok
    this._profileNameText?.setVisible(false);
    this._questGuideText?.setVisible(false);

    // A. REPOSISI BOSS HUD (Top Center Panoramic Header)
    const centerX = bounds.centerX;
    const topY = bounds.top + 14;
    const barWidth = Math.min(bounds.width * 0.62, 520);
    const barHeight = 18;
    this._bossBarWidth = barWidth;

    // Ambient glow
    this.bossHudGlow?.setPosition(centerX, topY + 22);
    if (this.bossHudGlow?.active && typeof this.bossHudGlow.setSize === 'function') {
      this.bossHudGlow.setSize(barWidth + 50, 48);
    }

    // Header container
    this.bossHudBg?.setPosition(centerX, topY + 12);
    this._safeSetRectSize(this.bossHudBg, barWidth + 8, 24);

    // Crest & Boss Name (Sisi Kiri Header)
    const leftX = centerX - barWidth / 2;
    this.bossCrest?.setPosition(leftX + 14, topY + 12);
    this.bossNameText?.setPosition(leftX + 28, topY + 12);

    // Phase Badge (Sisi Kanan Header - pas di dalam container tanpa terpotong)
    const badgeW = Math.min(140, barWidth * 0.38);
    const badgeX = centerX + barWidth / 2 - badgeW / 2 - 4;
    this.phaseBadgeBg?.setPosition(badgeX, topY + 12);
    this._safeSetRectSize(this.phaseBadgeBg, badgeW, 18);
    this.phaseText?.setPosition(badgeX, topY + 12);

    // HP Bar Track (Menempel rapi persis di bawah container header)
    const hpY = topY + 33;
    this.hpBg?.setPosition(centerX, hpY);
    this._safeSetRectSize(this.hpBg, barWidth, barHeight);

    const currentBossFillWidth = (this.bossHp / this.bossMaxHp) * barWidth;
    this.bossHpGhostFill?.setPosition(leftX, hpY);
    this._safeSetRectSize(this.bossHpGhostFill, currentBossFillWidth, barHeight);

    this.bossHpFill?.setPosition(leftX, hpY);
    this._safeSetRectSize(this.bossHpFill, currentBossFillWidth, barHeight);

    this.bossHpHighlight?.setPosition(centerX, hpY - 6);
    this._safeSetRectSize(this.bossHpHighlight, barWidth - 4, 2.5);

    this.bossHpText?.setPosition(centerX, hpY);
    const bossPercent = Math.round((this.bossHp / this.bossMaxHp) * 100);
    this.bossHpText?.setText(`${Math.round(this.bossHp)} / ${this.bossMaxHp} HP  •  ${bossPercent}%`);

    const pipSpacing = barWidth / 3;
    if (this.phasePips && this.phasePips.length === 2) {
      this.phasePips[0]?.setPosition(leftX + pipSpacing, hpY);
      this._safeSetRectSize(this.phasePips[0], 2, barHeight + 2);
      this.phasePips[1]?.setPosition(leftX + pipSpacing * 2, hpY);
      this._safeSetRectSize(this.phasePips[1], 2, barHeight + 2);
    }

    // B. REPOSISI DARA COURAGE HUD & OBJECTIVE (Top Left Hero Frame)
    const avatarR = this._profileRadius || 28;
    const avatarCx = bounds.left + avatarR + 14;
    const avatarCy = bounds.top + avatarR + 14;

    const plateX = avatarCx + avatarR - 6;
    const plateW = 212;
    const plateH = 46;
    const innerBarW = plateW - 24;
    this._courageBarWidth = innerBarW;

    // Card background (Tucked neatly behind avatar circle)
    this.courageCardBg?.setPosition(plateX + plateW / 2, avatarCy);
    this._safeSetRectSize(this.courageCardBg, plateW, plateH);

    // Baris 1: Label Kiri & Angka Kanan
    const row1Y = avatarCy - 10;
    this.courageLabel?.setPosition(plateX + 12, row1Y);
    this.courageText?.setPosition(plateX + plateW - 12, row1Y);
    this.courageText?.setText(`${Math.round(this.playerCourage)} / ${this.playerMaxCourage}`);

    // Baris 2: Health Bar Track & Fill
    const row2Y = avatarCy + 10;
    this.cBg?.setPosition(plateX + 12, row2Y);
    this._safeSetRectSize(this.cBg, innerBarW, 14);

    const currentCourageWidth = (this.playerCourage / this.playerMaxCourage) * innerBarW;
    this.courageGhostFill?.setPosition(plateX + 12, row2Y);
    this._safeSetRectSize(this.courageGhostFill, currentCourageWidth, 14);

    this.courageFill?.setPosition(plateX + 12, row2Y);
    this._safeSetRectSize(this.courageFill, currentCourageWidth, 14);

    this.courageHighlight?.setPosition(plateX + 13, row2Y - 5);
    this._safeSetRectSize(this.courageHighlight, innerBarW - 2, 2.5);

    // Baris 3: Objective Badge (Tersendiri di Bawah Unit Frame dengan margin lega 12px)
    const objW = Math.min(270, bounds.width - 32);
    const objH = 26;
    const objCenterY = avatarCy + avatarR + 12 + objH / 2;
    this.objectiveBadge?.setPosition(bounds.left + 14, objCenterY);
    this._safeSetRectSize(this.objectiveBadge, objW, objH);

    this.objectiveStatusText?.setPosition(bounds.left + 22, objCenterY);

    // C. Tombol Aksi Asertif
    this._repositionActionButton(bounds);
  }

  _safeSetCircleRadius(circle, radius) {
    if (!circle || !circle.active) return;
    if (circle.geom && typeof circle.geom.radius !== 'undefined') {
      circle.geom.radius = radius;
    }
    if (typeof circle.updateData === 'function') {
      circle.updateData();
    }
  }

  _repositionActionButton(bounds) {
    if (!bounds || !this.actionBtn || !this.actionBtn.active || !this.actionBtnHalo || !this.actionBtnHalo.active) return;
    const btnRadius = pxToWorld(this, 42);
    const runX = bounds.right - pxToWorld(this, 75);
    const jumpX = runX - pxToWorld(this, 95);
    const btnX = jumpX;
    const btnY = bounds.bottom - pxToWorld(this, 165);

    this.actionBtnHalo.setPosition(btnX, btnY);
    this._safeSetCircleRadius(this.actionBtnHalo, btnRadius + 8);

    this.actionBtn.setPosition(btnX, btnY);
    this._safeSetCircleRadius(this.actionBtn, btnRadius);

    this.actionBtnText?.setPosition(btnX, btnY);
    this.actionBtnText?.setFontSize(pxToWorld(this, 13));
  }

  _repositionUI() {
    super._repositionUI();
    this.setChatButtonVisible(false);
    if (this._hudInitialized) {
      const bounds = getVisibleBounds(this);
      this._repositionBossHUD(bounds);
    }
  }

  _createActionButtons() {
    const bounds = getVisibleBounds(this);

    // Action Button di atas tombol Jump pada kontrol mobile
    const btnRadius = pxToWorld(this, 42);
    const runX = bounds.right - pxToWorld(this, 75);
    const jumpX = runX - pxToWorld(this, 95);
    const btnX = jumpX;
    const btnY = bounds.bottom - pxToWorld(this, 165);

    this.actionBtnHalo = this.add.circle(btnX, btnY, btnRadius + 8, 0xffd700, 0.45)
      .setDepth(24)
      .setScrollFactor(0);

    this.actionBtn = this.add.circle(btnX, btnY, btnRadius, 0xf59e0b, 1)
      .setDepth(25)
      .setScrollFactor(0)
      .setStrokeStyle(3, 0xffffff)
      .setInteractive({ useHandCursor: true });

    this.actionBtnText = this.add.text(btnX, btnY, 'ASERTIF!\n[E]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${pxToWorld(this, 13)}px`,
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      stroke: '#78350f',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(26).setScrollFactor(0);

    this.actionBtnGlow = this.tweens.add({
      targets: [this.actionBtn, this.actionBtnHalo],
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.85,
      duration: 480,
      yoyo: true,
      repeat: -1,
      paused: true,
    });

    this.actionBtn.setVisible(false).setActive(false);
    this.actionBtnHalo.setVisible(false);
    this.actionBtnText.setVisible(false);

    this.actionBtn.on('pointerdown', () => {
      this._triggerAssertiveCounterAttack();
    });

    this.actionKeyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.actionKeyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
  }

  _createCinematicLetterbox() {
    const bounds = getVisibleBounds(this);
    const barHeight = pxToWorld(this, 60);

    this.cinematicTop = this.add.rectangle(
      bounds.centerX,
      bounds.top - barHeight / 2,
      bounds.width * 1.5,
      barHeight,
      0x000000,
      1
    ).setDepth(50).setScrollFactor(0);

    this.cinematicBottom = this.add.rectangle(
      bounds.centerX,
      bounds.bottom + barHeight / 2,
      bounds.width * 1.5,
      barHeight,
      0x000000,
      1
    ).setDepth(50).setScrollFactor(0);
  }

  _showCinematicBars(duration = 400) {
    const bounds = getVisibleBounds(this);
    const barHeight = pxToWorld(this, 60);

    this.tweens.add({
      targets: this.cinematicTop,
      y: bounds.top + barHeight / 2,
      duration,
      ease: 'Cubic.easeOut',
    });

    this.tweens.add({
      targets: this.cinematicBottom,
      y: bounds.bottom - barHeight / 2,
      duration,
      ease: 'Cubic.easeOut',
    });
  }

  _hideCinematicBars(duration = 400) {
    const bounds = getVisibleBounds(this);
    const barHeight = pxToWorld(this, 60);

    this.tweens.add({
      targets: this.cinematicTop,
      y: bounds.top - barHeight / 2,
      duration,
      ease: 'Cubic.easeIn',
    });

    this.tweens.add({
      targets: this.cinematicBottom,
      y: bounds.bottom + barHeight / 2,
      duration,
      ease: 'Cubic.easeIn',
    });
  }

  _setupBossPhysicsColliders() {
    this.physics.add.overlap(
      this.player,
      this.projectilesGroup,
      (player, projectile) => {
        if (!this._isInvulnerable && projectile.active) {
          this._handlePlayerHit(projectile.damage || 15);
          if (projectile.destroyOnImpact !== false) {
            projectile.destroy();
          }
        }
      }
    );

    this.physics.add.overlap(
      this.player,
      this.orbsGroup,
      (player, orb) => {
        if (orb.active) {
          this._collectOrb(orb);
        }
      }
    );
  }

  // ==============================================================
  // 4. INTRO SINEMATIK SEBELUM BATTLE
  // ==============================================================

  _playIntroCinematic() {
    this.bossState = 'INTRO';
    const bounds = getVisibleBounds(this);

    this._showCinematicBars(500);

    this.cameras.main.shake(700, 0.015);
    if (this.audioManager) {
      this.audioManager.playBossRoar();
    }

    this.cameras.main.flash(450, 180, 20, 70);

    const introCard = this.add.container(bounds.centerX, bounds.centerY - pxToWorld(this, 30))
      .setDepth(35)
      .setScrollFactor(0);

    const bannerBg = this.add.rectangle(
      0,
      0,
      bounds.width * 0.88,
      pxToWorld(this, 95),
      0x0a0214,
      0.95
    ).setStrokeStyle(2.5, 0xff2a55);

    const bannerTitle = this.add.text(
      0,
      -pxToWorld(this, 18),
      'UJIAN AKHIR: HADAPI KETAKUTAN!',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 20)}px`,
        fontStyle: '700',
        color: '#ff4d6d',
        stroke: '#000000',
        strokeThickness: 4,
      }
    ).setOrigin(0.5);

    const bannerSub = this.add.text(
      0,
      pxToWorld(this, 16),
      'Satukan seluruh batasan, empati, dan langkah berani dari Episode 1 s/d 6!',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 12)}px`,
        color: '#f8fafc',
      }
    ).setOrigin(0.5);

    introCard.add([bannerBg, bannerTitle, bannerSub]);

    this.time.delayedCall(2400, () => {
      this._hideCinematicBars(400);

      this.tweens.add({
        targets: introCard,
        alpha: 0,
        y: '-=30',
        duration: 450,
        onComplete: () => {
          introCard.destroy();
          this.uiInputLocked = false;
          this._battleStarted = true;
          this._startPhase(1);
        },
      });
    });
  }

  // ==============================================================
  // 5. MANAJEMEN FASE PERTARUNGAN (FASE 1, 2, 3)
  // ==============================================================

  _startPhase(phaseNum) {
    this.currentPhase = phaseNum;
    this.bossState = 'IDLE';
    this._phaseInProgress = true;
    this.collectedOrbs = 0;

    this.projectilesGroup?.clear(true, true);
    this.orbsGroup?.clear(true, true);
    this._clearHazardZones();
    this._hideActionButton();

    if (phaseNum === 1) {
      this.phaseText.setText('FASE 1: SUARA TOKSIK');
      this.objectiveStatusText.setText('🎯 Misi: Kumpulkan 3 Bukti Keberanian [◇ ◇ ◇]');
      this._spawnPhase1Orbs();
      this._startPhase1BossPattern();
    } else if (phaseNum === 2) {
      this.phaseText.setText('FASE 2: INTIMIDASI');
      this.objectiveStatusText.setText('🛡️ Misi: Berlindung di Zona Teman Aman!');
      this._startPhase2BossPattern();
    } else if (phaseNum === 3) {
      this.phaseText.setText('FASE 3: SOLIDARITAS');
      this.objectiveStatusText.setText('⚡ Misi: Aktifkan 3 Pilar Keberanian [◇ ◇ ◇]');
      this._startPhase3BossPattern();
    }
  }

  // ==============================================================
  // FASE 1: PROYEKTIL KATA TOKSIK (ANIMASI MELAYANG DINAMIS)
  // ==============================================================

  _spawnPhase1Orbs() {
    const spawnPoints = [
      { x: this.levelWidth * 0.28, y: this.groundY - 35, title: 'Chat Bukti' },
      { x: this.levelWidth * 0.50, y: this.groundY - 110, title: 'Aturan Sekolah' },
      { x: this.levelWidth * 0.72, y: this.groundY - 45, title: 'Rekaman Suara' },
    ];

    spawnPoints.forEach((pt, i) => {
      const orb = this.orbsGroup.create(pt.x, pt.y, null);
      orb.setDepth(6);
      orb.orbId = i;

      const outerGlow = this.add.circle(pt.x, pt.y, 22, 0xfacc15, 0.45).setDepth(6);
      const innerCore = this.add.circle(pt.x, pt.y, 11, 0xffffff, 1).setDepth(7);
      const orbSpark = this.add.star(pt.x, pt.y, 4, 6, 14, 0xffe066).setDepth(8);

      orb.visuals = [outerGlow, innerCore, orbSpark];

      this.tweens.add({
        targets: [orb, outerGlow, innerCore, orbSpark],
        y: pt.y - 16,
        duration: 850 + i * 200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      this.tweens.add({
        targets: orbSpark,
        angle: 360,
        duration: 3000,
        repeat: -1,
      });
    });
  }

  _startPhase1BossPattern() {
    if (!this._phaseInProgress || this.currentPhase !== 1) return;

    this.phase1AttackTimer = this.time.addEvent({
      delay: 2600,
      loop: true,
      callback: () => {
        if (!this._phaseInProgress || this.currentPhase !== 1 || this.bossState === 'STUNNED') return;
        this._firePhase1WordProjectile();
      },
    });

    this.phase1SpikesTimer = this.time.addEvent({
      delay: 4600,
      loop: true,
      callback: () => {
        if (!this._phaseInProgress || this.currentPhase !== 1 || this.bossState === 'STUNNED') return;
        this._spawnShadowGroundSpikes();
      },
    });
  }

  _firePhase1WordProjectile() {
    this.bossState = 'ATTACKING';
    const words = [
      { text: 'BAPERAN AMAT!', isLow: true },
      { text: 'CUMA BERCANDA!', isLow: true },
      { text: 'JANGAN SOK SUCI!', isLow: false },
      { text: 'DIEM AJA DEH!', isLow: true },
    ];

    const pick = Phaser.Utils.Array.GetRandom(words);
    const startX = this.boss.x - 70;
    const targetY = pick.isLow ? this.groundY - 45 : this.groundY - 118;

    this.audioManager?.playBossProjectile();

    // Animasi Caster Recoil Bos (Badan TIDAK membesar, skala tetap stabil)
    this.tweens.add({
      targets: this.boss,
      x: '+=14',
      duration: 130,
      yoyo: true,
      ease: 'Sine.easeOut',
    });

    // Wadah Proyektil Berenergi Bayangan
    const projContainer = this.add.container(startX, targetY).setDepth(8);

    // Aura bayangan gelap & pendaran ungu di belakang bola energi agar menyatu halus dengan langit sore
    const orbAura = this.add.circle(0, 0, 48, 0x05010a, 0.7);
    const orbGlow = this.add.circle(0, 0, 40, 0x6b21a8, 0.45);

    // 1. Sprite Desain Visual Asli Bola Energi Kutukan (boss-projectile.png)
    const orbSprite = this.add.sprite(0, 0, 'boss-projectile');
    orbSprite.setDisplaySize(82, 82);
    // Orientasi: Kepala komet menghadap ke kiri (menuju Dara) dan ekor api mengalir ke kanan
    orbSprite.setRotation(Math.PI * 0.75);

    // Bloom cahaya magis additive (Phaser.BlendModes.ADD) agar proyektil memancarkan cahaya nyata
    const orbBloom = this.add.sprite(0, 0, 'boss-projectile')
      .setDisplaySize(82, 82)
      .setRotation(Math.PI * 0.75)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.42);

    this.tweens.add({
      targets: [orbSprite, orbBloom],
      angle: { from: 132, to: 138 },
      scaleY: { from: orbSprite.scaleY * 0.95, to: orbSprite.scaleY * 1.05 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 2. Banner Rune Gelap Berisi Kata Toksik di Atas Proyektil (Desain Tag Halus)
    const bannerBg = this.add.rectangle(0, -42, 148, 24, 0x090114, 0.92)
      .setStrokeStyle(1.5, 0xa855f7);
    const label = this.add.text(0, -42, pick.text, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${pxToWorld(this, 11)}px`,
      fontStyle: '700',
      color: '#f3e8ff',
      stroke: '#3b0764',
      strokeThickness: 3,
    }).setOrigin(0.5);

    projContainer.add([orbAura, orbGlow, orbSprite, orbBloom, bannerBg, label]);

    this.physics.world.enable(projContainer);
    projContainer.body.setSize(76, 76);
    projContainer.body.setVelocityX(-320);
    projContainer.damage = 15;
    this.projectilesGroup.add(projContainer);

    // Animasi meliuk di udara (Sinusoidal Bobbing)
    this.tweens.add({
      targets: projContainer,
      y: targetY + (pick.isLow ? -12 : 12),
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Partikel komet bayangan mengekor (Bara Ungu Additive + Asap Gelap)
    const trailTimer = this.time.addEvent({
      delay: 40,
      repeat: 45,
      callback: () => {
        if (!projContainer.active) return;
        const spark = this.add.circle(
          projContainer.x + Phaser.Math.Between(25, 55),
          projContainer.y + Phaser.Math.Between(-10, 10),
          Phaser.Math.Between(3, 7),
          0xc084fc,
          0.85
        ).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          alpha: 0,
          scale: 0.2,
          duration: 320,
          onComplete: () => spark.destroy(),
        });

        // Gumpalan asap hitam mengekor
        if (Math.random() > 0.4) {
          const smoke = this.add.circle(
            projContainer.x + Phaser.Math.Between(30, 60),
            projContainer.y + Phaser.Math.Between(-8, 8),
            Phaser.Math.Between(5, 11),
            0x05010a,
            0.55
          ).setDepth(6);
          this.tweens.add({
            targets: smoke,
            alpha: 0,
            scale: 0.3,
            duration: 450,
            onComplete: () => smoke.destroy(),
          });
        }
      },
    });

    this.time.delayedCall(4500, () => {
      trailTimer.remove();
      if (projContainer?.active) projContainer.destroy();
      if (this.bossState === 'ATTACKING') this.bossState = 'IDLE';
    });
  }

  _spawnShadowGroundSpikes() {
    if (!this._phaseInProgress || this.currentPhase !== 1) return;

    this.bossState = 'ATTACKING';

    // Gerakan merapal bos: Anggun dan intimidatif, badan TETAP stabil tanpa membesar liar!
    this.tweens.add({
      targets: this.boss,
      y: this.boss.y - 12,
      duration: 200,
      yoyo: true,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (this.bossState === 'ATTACKING') this.bossState = 'IDLE';
      },
    });

    if (this.bossDarkAuraInner) {
      this.tweens.add({
        targets: this.bossDarkAuraInner,
        alpha: 0.9,
        duration: 200,
        yoyo: true,
      });
    }

    const hazardX = Phaser.Math.Clamp(
      this.player.x + Phaser.Math.Between(-65, 65),
      200,
      this.levelWidth - 260
    );
    const hazardY = this.groundY;

    // 1. TELEGRAPHING RETAKAN LANTAI & PUDDLE ABISAL (Menyatu Alami dengan Ubin Lantai Kuil)
    const crackGfx = this.add.graphics().setDepth(3);
    const drawCracks = (scale = 1.0) => {
      crackGfx.clear();
      crackGfx.lineStyle(2, 0xa855f7, 0.75);
      // Cabang retakan kiri sepanjang lantai
      crackGfx.beginPath();
      crackGfx.moveTo(hazardX, hazardY + 6);
      crackGfx.lineTo(hazardX - 35 * scale, hazardY + 4);
      crackGfx.lineTo(hazardX - 70 * scale, hazardY + 9);
      crackGfx.lineTo(hazardX - 110 * scale, hazardY + 6);
      crackGfx.strokePath();

      crackGfx.beginPath();
      crackGfx.moveTo(hazardX - 35 * scale, hazardY + 4);
      crackGfx.lineTo(hazardX - 55 * scale, hazardY - 4);
      crackGfx.strokePath();

      // Cabang retakan kanan sepanjang lantai
      crackGfx.beginPath();
      crackGfx.moveTo(hazardX, hazardY + 6);
      crackGfx.lineTo(hazardX + 40 * scale, hazardY + 8);
      crackGfx.lineTo(hazardX + 80 * scale, hazardY + 3);
      crackGfx.lineTo(hazardX + 115 * scale, hazardY + 7);
      crackGfx.strokePath();

      crackGfx.beginPath();
      crackGfx.moveTo(hazardX + 40 * scale, hazardY + 8);
      crackGfx.lineTo(hazardX + 65 * scale, hazardY + 14);
      crackGfx.strokePath();
    };
    drawCracks(0.7);

    const riftShadow = this.add.ellipse(hazardX, hazardY + 6, 260, 60, 0x010003, 0.6).setDepth(3);
    const riftVoid = this.add.ellipse(hazardX, hazardY + 6, 200, 46, 0x090114, 0.85).setDepth(4);
    const riftGlow = this.add.ellipse(hazardX, hazardY + 6, 160, 36, 0x581c87, 0.55).setDepth(4);
    riftGlow.setStrokeStyle(2, 0xa855f7);

    const warnText = this.add.text(hazardX, hazardY - 150, '⚠️ AWAS DURI BAYANGAN!', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${pxToWorld(this, 12)}px`,
      fontStyle: '700',
      color: '#d8b4fe',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(15);

    const warnPulse = this.tweens.add({
      targets: [riftShadow, riftVoid, riftGlow],
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: { from: 0.55, to: 0.9 },
      duration: 220,
      yoyo: true,
      repeat: 2,
      onUpdate: () => {
        if (riftVoid.active) {
          drawCracks(riftVoid.scaleX);
        }
      },
    });

    // Asap halus yang membubung dari retakan selama masa peringatan telegraph
    const telegraphParticles = [];
    for (let i = 0; i < 4; i++) {
      const smokeWisp = this.add.circle(
        hazardX + Phaser.Math.Between(-40, 40),
        hazardY + Phaser.Math.Between(0, 8),
        Phaser.Math.Between(5, 10),
        0x150324,
        0.65
      ).setDepth(4);
      this.tweens.add({
        targets: smokeWisp,
        y: smokeWisp.y - Phaser.Math.Between(30, 60),
        alpha: 0,
        scale: 0.3,
        duration: 650,
        delay: i * 140,
        onComplete: () => smokeWisp.destroy(),
      });
      telegraphParticles.push(smokeWisp);
    }

    const hazardObj = {
      destroy: () => {
        warnPulse.remove();
        crackGfx.destroy();
        riftShadow.destroy();
        riftVoid.destroy();
        riftGlow.destroy();
        warnText.destroy();
        telegraphParticles.forEach(p => p.active && p.destroy());
      },
    };
    this.hazardZones.push(hazardObj);

    this.time.delayedCall(750, () => {
      hazardObj.destroy();
      const idx = this.hazardZones.indexOf(hazardObj);
      if (idx !== -1) this.hazardZones.splice(idx, 1);

      if (!this._phaseInProgress || this.currentPhase !== 1) return;

      // 2. KAWAH ERUPSI ABISAL BERLAPIS (Multi-layered Abyssal Crater)
      // Menutupi dan menenggelamkan pecahan batu rune secara mulus ke lantai paving kuil
      const groundShadowOuter = this.add.ellipse(hazardX, hazardY + 8, 350, 82, 0x010003, 0.65).setDepth(3);
      const groundVoidMid = this.add.ellipse(hazardX, hazardY + 8, 290, 64, 0x070112, 0.92).setDepth(4);
      const groundVoidDeep = this.add.ellipse(hazardX, hazardY + 8, 220, 48, 0x020005, 0.98).setDepth(4);

      // Cahaya Magis Rune Lantai (Additive Floor Light)
      const groundRuneLight = this.add.ellipse(hazardX, hazardY + 8, 270, 58, 0x9333ea, 0.45)
        .setDepth(5)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Retakan permanen di sekeliling kawah erupsi
      const eruptionCracks = this.add.graphics().setDepth(4);
      eruptionCracks.lineStyle(2.5, 0x7e22ce, 0.85);
      eruptionCracks.beginPath();
      eruptionCracks.moveTo(hazardX, hazardY + 8);
      eruptionCracks.lineTo(hazardX - 80, hazardY + 5);
      eruptionCracks.lineTo(hazardX - 145, hazardY + 10);
      eruptionCracks.moveTo(hazardX, hazardY + 8);
      eruptionCracks.lineTo(hazardX + 90, hazardY + 11);
      eruptionCracks.lineTo(hazardX + 155, hazardY + 6);
      eruptionCracks.strokePath();

      // Gelombang kejut erupsi tanah (Additive Shockwave)
      const shockwave = this.add.ellipse(hazardX, hazardY + 8, 50, 16, 0xd8b4fe, 0.95)
        .setDepth(6)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: shockwave,
        scaleX: 5.6,
        scaleY: 2.8,
        alpha: 0,
        duration: 320,
        ease: 'Cubic.easeOut',
        onComplete: () => shockwave.destroy(),
      });

      // 3. ERUPSI SPRITE DURI KRISTAL BAYANGAN ASLI (shadow-spikes.png)
      // Skala menjulang (~270x300) dengan origin 0.82 agar puncak kristal berdiri 245px di atas tanah
      const spikeWidth = 270;
      const spikeHeight = 300;
      const spikes = this.add.sprite(hazardX, hazardY + 8, 'shadow-spikes').setDepth(7);
      spikes.setDisplaySize(spikeWidth, spikeHeight);
      spikes.setOrigin(0.5, 0.82);

      const baseScaleX = spikes.scaleX;
      const baseScaleY = spikes.scaleY;

      // Layer Bloom Cahaya Kristal (Additive Glow) yang menyatukan pantulan magis ke atmosfer sore
      const spikeBloom = this.add.sprite(hazardX, hazardY + 8, 'shadow-spikes')
        .setDepth(8)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.38)
        .setOrigin(0.5, 0.82)
        .setDisplaySize(spikeWidth, spikeHeight);

      // Posisi awal muncul dari kedalaman tanah (bukan dipipihkan kaku)
      spikes.setPosition(hazardX, hazardY + 38);
      spikes.setScale(baseScaleX * 0.9, baseScaleY * 0.22);
      spikes.setAlpha(0.25);

      spikeBloom.setPosition(hazardX, hazardY + 38);
      spikeBloom.setScale(baseScaleX * 0.9, baseScaleY * 0.22);
      spikeBloom.setAlpha(0.1);

      this.physics.world.enable(spikes);
      spikes.body.setSize(135, 175);
      spikes.body.setOffset(65, 30);
      spikes.damage = 18;
      this.projectilesGroup.add(spikes);

      this.audioManager?.playBossRoar();
      this.cameras.main.shake(260, 0.014);

      // Animasi erupsi berbobot: melesat keluar dari tanah dengan momentum kuat
      this.tweens.add({
        targets: [spikes, spikeBloom],
        y: hazardY + 8,
        scaleX: baseScaleX,
        scaleY: baseScaleY,
        duration: 180,
        ease: 'Back.easeOut',
      });
      this.tweens.add({
        targets: spikes,
        alpha: 1,
        duration: 120,
      });
      this.tweens.add({
        targets: spikeBloom,
        alpha: 0.38,
        duration: 120,
      });

      // Denyut halus pada bloom kristal selama aktif
      const bloomPulse = this.tweens.add({
        targets: spikeBloom,
        alpha: { from: 0.45, to: 0.22 },
        duration: 420,
        yoyo: true,
        repeat: 2,
        ease: 'Sine.easeInOut',
      });

      // Partikel asap gelap, bara ungu, & debu reruntuhan tanah
      const spikeSmokeParticles = [];
      for (let p = 0; p < 12; p++) {
        const smoke = this.add.circle(
          hazardX + Phaser.Math.Between(-70, 70),
          hazardY - Phaser.Math.Between(0, 30),
          Phaser.Math.Between(7, 16),
          0x150324,
          0.85
        ).setDepth(6);
        this.tweens.add({
          targets: smoke,
          y: smoke.y - Phaser.Math.Between(45, 95),
          x: smoke.x + Phaser.Math.Between(-25, 25),
          alpha: 0,
          scale: 0.25,
          duration: Phaser.Math.Between(550, 950),
          onComplete: () => smoke.destroy(),
        });
        spikeSmokeParticles.push(smoke);
      }

      const activeSpikeGroup = {
        destroy: () => {
          bloomPulse.remove();
          spikes.destroy();
          spikeBloom.destroy();
          groundShadowOuter.destroy();
          groundVoidMid.destroy();
          groundVoidDeep.destroy();
          groundRuneLight.destroy();
          eruptionCracks.destroy();
          spikeSmokeParticles.forEach(p => p.active && p.destroy());
        },
      };
      this.hazardZones.push(activeSpikeGroup);

      // Duri bertahan di arena lalu tenggelam kembali ke dalam tanah secara anggun
      this.time.delayedCall(1250, () => {
        this.tweens.add({
          targets: [spikes, spikeBloom],
          y: hazardY + 45,
          scaleY: baseScaleY * 0.12,
          alpha: 0,
          duration: 320,
          ease: 'Sine.easeIn',
        });

        this.tweens.add({
          targets: [groundShadowOuter, groundVoidMid, groundVoidDeep, groundRuneLight, eruptionCracks],
          scaleX: 0.05,
          scaleY: 0.05,
          alpha: 0,
          duration: 320,
          ease: 'Sine.easeIn',
          onComplete: () => {
            activeSpikeGroup.destroy();
            const sIdx = this.hazardZones.indexOf(activeSpikeGroup);
            if (sIdx !== -1) this.hazardZones.splice(sIdx, 1);
          },
        });
      });
    });
  }

  // Alias kompatibilitas
  _spawnDigitalGlitchHazard() {
    this._spawnShadowGroundSpikes();
  }

  // ==============================================================
  // FASE 2: TERJANGAN BAYANGAN (DASH) & ZONA AMAN (SAFE HAVEN)
  // ==============================================================

  _startPhase2BossPattern() {
    if (!this._phaseInProgress || this.currentPhase !== 2) return;

    this.phase2AttackTimer = this.time.addEvent({
      delay: 3800,
      loop: true,
      callback: () => {
        if (!this._phaseInProgress || this.currentPhase !== 2 || this.bossState === 'STUNNED') return;
        this._executeShadowDashAttack();
      },
    });

    this.time.delayedCall(4500, () => {
      if (this.currentPhase === 2 && this._phaseInProgress) {
        this._executeIsolationFieldEvent();
      }
    });
  }

  _executeShadowDashAttack() {
    this.bossState = 'ATTACKING';
    const telegraphY = this.groundY - 45;

    // Telegraphing Bayangan Melingkar di Tanah & Teks Peringatan (Tanpa Kotak Merah Kaku!)
    const shadowTrack = this.add.ellipse(
      this.levelWidth / 2,
      this.groundY - 6,
      this.levelWidth,
      28,
      0x05010a,
      0.6
    ).setDepth(4);

    const warnText = this.add.text(
      this.player.x,
      telegraphY - 55,
      '>>> AWAS TERJANGAN BAYANGAN! LOMPAT TINGGI! [W / SPASI] >>>',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 12)}px`,
        fontStyle: '700',
        color: '#f43f5e',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(15);

    this.tweens.add({
      targets: warnText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 200,
      yoyo: true,
      repeat: 3,
    });

    this.time.delayedCall(850, () => {
      shadowTrack.destroy();
      warnText.destroy();

      if (!this._phaseInProgress || this.currentPhase !== 2) return;

      this.audioManager?.playBossDash();
      this.cameras.main.shake(400, 0.012);

      // Hitbox fisika tak terlihat (menghilangkan kotak ungu kaku)
      const dashHitbox = this.add.rectangle(this.boss.x, telegraphY, 150, 75, 0x000000, 0);
      this.physics.world.enable(dashHitbox);
      dashHitbox.damage = 22;
      this.projectilesGroup.add(dashHitbox);

      // Bayangan hantu afterimage yang menyatu dengan partikel gelap & pendaran ungu
      const originalX = this.boss.x;
      const ghostTimer = this.time.addEvent({
        delay: 70,
        repeat: 6,
        callback: () => {
          const ghost = this.add.sprite(this.boss.x, this.boss.y, 'boss-shadow')
            .setDisplaySize(240, 280)
            .setTint(0xa855f7)
            .setAlpha(0.55)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setDepth(4);
          this.tweens.add({
            targets: ghost,
            alpha: 0,
            scale: 0.92,
            duration: 320,
            onComplete: () => ghost.destroy(),
          });
        },
      });

      this.tweens.add({
        targets: [this.boss, dashHitbox],
        x: 120,
        duration: 520,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          dashHitbox.destroy();
          ghostTimer.remove();

          this.tweens.add({
            targets: this.boss,
            x: originalX,
            duration: 750,
            ease: 'Sine.easeOut',
            onComplete: () => {
              this.bossState = 'IDLE';
            },
          });
        },
      });
    });
  }

  _executeIsolationFieldEvent() {
    const safeX = Phaser.Math.Between(260, this.levelWidth - 380);
    const safeRadius = 105;

    // Efek kegelapan isolasi di seluruh arena (Dark Isolation Atmosphere)
    const isolationDim = this.add.rectangle(
      this.levelWidth / 2,
      this.groundY - 150,
      this.levelWidth * 1.4,
      500,
      0x05010a,
      0.35
    ).setDepth(2);

    this.objectiveStatusText?.setText('🛡️ Misi: Segera Masuk Zona Teman Aman!');

    const banner = this.add.text(
      this.cameras.main.midPoint.x,
      this.groundY - 195,
      '🛡️ ZONA ISOLASI GELAP! LARI KE TEMAN AMAN! 🛡️',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 13)}px`,
        fontStyle: '700',
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 3,
      }
    ).setOrigin(0.5).setDepth(15);

    // 1. Bayangan kontak lantai di dasar lingkaran suci (Ground Floor Shadow)
    const floorShadow = this.add.ellipse(safeX, this.groundY - 6, 260, 68, 0x021f0b, 0.7).setDepth(3);

    // 2. Sprite Desain Visual Orisinil Lingkaran Solidaritas (safe-haven.png)
    const safeSprite = this.add.sprite(safeX, this.groundY - 8, 'safe-haven')
      .setDisplaySize(240, 135)
      .setAlpha(0.92)
      .setDepth(4);

    // 3. Layer Bloom Cahaya Hijau Additive (Menyatu Alami dengan Lantai Paving)
    const safeBloom = this.add.sprite(safeX, this.groundY - 8, 'safe-haven')
      .setDisplaySize(240, 135)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.42)
      .setDepth(5);

    const bloomPulse = this.tweens.add({
      targets: safeBloom,
      alpha: { from: 0.65, to: 0.25 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 4. Pilar Berkas Cahaya Hijau Ethereal (Soft Additive Columns — BUKAN Kotak Kaku!)
    const beamOuter = this.add.ellipse(safeX, this.groundY - 160, 160, 340, 0x10b981, 0.2)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamInner = this.add.ellipse(safeX, this.groundY - 160, 80, 340, 0x6ee7b7, 0.25)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamTween = this.tweens.add({
      targets: [beamOuter, beamInner],
      alpha: { from: 0.32, to: 0.14 },
      duration: 450,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 5. Partikel Bara Keberanian & Daun Hijau Melayang Naik
    const moteTimer = this.time.addEvent({
      delay: 95,
      repeat: 34,
      callback: () => {
        if (!safeSprite.active) return;
        const mote = this.add.circle(
          safeX + Phaser.Math.Between(-75, 75),
          this.groundY - 10,
          Phaser.Math.Between(3, 7),
          Phaser.Math.RND.pick([0x34d399, 0x6ee7b7, 0xfde047, 0xa7f3d0]),
          0.85
        ).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: mote,
          y: mote.y - Phaser.Math.Between(75, 175),
          x: mote.x + Phaser.Math.Between(-20, 20),
          alpha: 0,
          scale: 0.2,
          duration: Phaser.Math.Between(700, 1150),
          onComplete: () => mote.destroy(),
        });
      },
    });

    // Label teks penunjuk
    const supportLabel = this.add.text(safeX, this.groundY - 105, '🛡️ TEMAN AMAN\n[Perlindungan Solidaritas]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${pxToWorld(this, 11)}px`,
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      stroke: '#065f46',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(6);

    this.time.delayedCall(3500, () => {
      moteTimer.remove();
      bloomPulse.remove();
      beamTween.remove();
      isolationDim.destroy();
      banner.destroy();
      floorShadow.destroy();
      safeSprite.destroy();
      safeBloom.destroy();
      beamOuter.destroy();
      beamInner.destroy();
      supportLabel.destroy();

      if (!this._phaseInProgress || this.currentPhase !== 2) return;

      const dist = Math.abs(this.player.x - safeX);
      if (dist > safeRadius) {
        this._handlePlayerHit(25);
        this.cameras.main.shake(300, 0.015);
      } else {
        this.audioManager?.playOrbCollect();
        this._showFloatingText(this.player.x, this.player.y - 60, '🛡️ TERLINDUNGI BERSAMA TEMAN!', '#4ade80');
        this.objectiveStatusText?.setText('✨ TERLINDUNGI! TEKAN SOLIDARITAS [E]!');
        this._showActionButton('SOLIDARITAS!\n[E]', () => {
          this._triggerPhase2CounterAttack();
        });
      }
    });
  }

  // ==============================================================
  // FASE 3: PILAR KEBENARAN & KLIMAKS BERSAMA (EPISODE 6)
  // ==============================================================

  _clearPillars() {
    if (this.pillars) {
      this.pillars.forEach((p) => {
        p.sprite?.destroy();
        p.bloom?.destroy();
        p.shadow?.destroy();
        p.floorBeacon?.destroy();
        p.label?.destroy();
        p.prompt?.destroy();
        p.trigger?.destroy();
      });
      this.pillars = [];
    }
  }

  _startPhase3BossPattern() {
    this._clearPillars();
    this.activePillars = [false, false, false];

    const pilarData = [
      {
        id: 0,
        x: this.levelWidth * 0.22,
        spriteKey: 'pillar-satpam',
        title: 'POS SATPAM',
        subtitle: '(Keamanan)',
        w: 80,
        h: 180,
        shadowW: 96,
      },
      {
        id: 1,
        x: this.levelWidth * 0.50,
        spriteKey: 'pillar-bk',
        title: 'BUKTI & BK',
        subtitle: '(Pelaporan)',
        w: 135,
        h: 180,
        shadowW: 140,
      },
      {
        id: 2,
        x: this.levelWidth * 0.76,
        spriteKey: 'pillar-solidaritas',
        title: 'TEMAN AMAN',
        subtitle: '(Solidaritas)',
        w: 105,
        h: 180,
        shadowW: 115,
      },
    ];

    this.pillars = pilarData.map((data) => {
      // 1. Bayangan kontak lantai ubin (Ground Floor Shadow)
      const shadow = this.add.ellipse(data.x, this.groundY - 4, data.shadowW, 26, 0x05010a, 0.75).setDepth(4);

      // 2. Sprite Pilar Orisinil (Pilar batu pos satpam, meja BK & buku kebenaran, obelisk sakura solidaritas)
      const sprite = this.add.sprite(data.x, this.groundY, data.spriteKey)
        .setDisplaySize(data.w, data.h)
        .setOrigin(0.5, 1)
        .setDepth(5);

      // 3. Pendaran Lingkaran Runic Aktif di Permukaan Tanah (Menyatu Alami, Tanpa Kotak)
      const floorBeacon = this.add.ellipse(data.x, this.groundY - 6, data.w * 1.15, 26, 0x6366f1, 0.3)
        .setDepth(4)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: floorBeacon,
        scaleX: 1.15,
        scaleY: 1.15,
        alpha: { from: 0.45, to: 0.15 },
        duration: 800,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 4. Label teks pixel yang anggun
      const label = this.add.text(data.x, this.groundY - data.h - 36, `${data.title}\n${data.subtitle}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 11)}px`,
        color: '#c7d2fe',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5).setDepth(6);

      const prompt = this.add.text(data.x, this.groundY - data.h - 10, '▼ SENTUH ▼', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 9)}px`,
        color: '#facc15',
        stroke: '#000000',
        strokeThickness: 2,
      }).setOrigin(0.5).setDepth(6);

      this.tweens.add({
        targets: prompt,
        y: prompt.y + 4,
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // 5. Trigger fisik tak terlihat (bukan kotak kaku!)
      const trigger = this.add.circle(data.x, this.groundY - 45, 52, 0x000000, 0).setDepth(4);
      this.physics.world.enable(trigger);

      return {
        id: data.id,
        x: data.x,
        sprite,
        shadow,
        floorBeacon,
        label,
        prompt,
        trigger,
        active: false,
        spriteKey: data.spriteKey,
        title: data.title,
        w: data.w,
        h: data.h,
      };
    });

    this.pillars.forEach((pillar) => {
      this.physics.add.overlap(this.player, pillar.trigger, () => {
        if (!pillar.active) {
          this._activatePillar(pillar);
        }
      });
    });

    this.phase3MeteorTimer = this.time.addEvent({
      delay: 1900,
      loop: true,
      callback: () => {
        if (!this._phaseInProgress || this.currentPhase !== 3 || this.bossState === 'STUNNED') return;
        this._spawnMeteorHazard();
      },
    });
  }

  _activatePillar(pillar) {
    if (pillar.active) return;
    pillar.active = true;
    this.activePillars[pillar.id] = true;

    pillar.prompt?.destroy();

    // Layer Bloom Emas Additive pada sprite pilar
    const bloom = this.add.sprite(pillar.x, this.groundY, pillar.spriteKey)
      .setDisplaySize(pillar.w, pillar.h)
      .setOrigin(0.5, 1)
      .setDepth(6)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.65);

    this.tweens.add({
      targets: bloom,
      alpha: { from: 0.75, to: 0.35 },
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    pillar.bloom = bloom;

    // Pendaran lantai emas bersinar
    pillar.floorBeacon.setFillStyle(0xf59e0b, 0.6);
    pillar.label.setText(`✓ ${pillar.title}\n[AKTIF]`).setColor('#fef08a').setStroke('#78350f', 3);

    this.audioManager?.playOrbCollect();
    this.cameras.main.shake(180, 0.008);

    // Sinar Emas Megah Menembus Langit (Additive Beam Column — BUKAN Kotak Kaku!)
    const beamOuter = this.add.ellipse(pillar.x, this.groundY - 260, 48, 520, 0xfde047, 0.32)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);

    const beamCore = this.add.ellipse(pillar.x, this.groundY - 260, 20, 520, 0xfffbeb, 0.55)
      .setDepth(3)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [beamOuter, beamCore],
      alpha: { from: 0.5, to: 0.2 },
      scaleX: { from: 1, to: 1.15 },
      duration: 400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.pillarBeams.push(beamOuter, beamCore);

    // Partikel cahaya emas naik ke angkasa
    this.time.addEvent({
      delay: 110,
      repeat: 18,
      callback: () => {
        if (!pillar.sprite?.active) return;
        const spark = this.add.circle(
          pillar.x + Phaser.Math.Between(-16, 16),
          this.groundY - 10,
          Phaser.Math.Between(3, 6),
          0xfef08a,
          0.9
        ).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: spark,
          y: spark.y - Phaser.Math.Between(120, 280),
          alpha: 0,
          scale: 0.2,
          duration: Phaser.Math.Between(600, 1000),
          onComplete: () => spark.destroy(),
        });
      },
    });

    this._showFloatingText(pillar.x, this.groundY - pillar.h - 55, '✦ PILAR AKTIF! ✦', '#facc15');

    const activeCount = this.activePillars.filter(Boolean).length;
    const pDots = ['◇', '◇', '◇'];
    for (let i = 0; i < activeCount; i++) pDots[i] = '◆';
    this.objectiveStatusText?.setText(`⚡ Misi: Aktifkan 3 Pilar [${pDots.join(' ')}]`);

    const allActive = this.activePillars.every(Boolean);
    if (allActive) {
      this._phaseInProgress = false;
      this.phase3MeteorTimer?.remove();
      this.projectilesGroup?.clear(true, true);

      this.objectiveStatusText?.setText('🌟 SEMUA PILAR AKTIF! TEKAN SERANGAN PAMUNGKAS!');
      this._showActionButton('SUARA KITA!\n[E]', () => {
        this._triggerUltimateVictoryAttack();
      });
    }
  }

  _spawnMeteorHazard() {
    const targetX = Phaser.Math.Between(160, this.levelWidth - 260);
    const targetY = this.groundY - 12;

    // 1. Telegraphing Cincin Kawah Bayangan di Tanah
    const groundRiftOuter = this.add.ellipse(targetX, targetY + 6, 140, 38, 0x05010a, 0.65).setDepth(3);
    const groundRift = this.add.ellipse(targetX, targetY + 6, 110, 30, 0x1a052e, 0.85).setDepth(4);
    groundRift.setStrokeStyle(2, 0xa855f7);

    this.time.delayedCall(700, () => {
      groundRiftOuter.destroy();
      groundRift.destroy();
      if (!this._phaseInProgress || this.currentPhase !== 3) return;

      // 2. Sprite Desain Visual Asli Meteor Bayangan (shadow-meteor.png) dengan Soft Glow & Additive Bloom
      const startMeteorX = targetX + 130;
      const meteorContainer = this.add.container(startMeteorX, 30).setDepth(7);

      const meteorAura = this.add.circle(0, 0, 44, 0x05010a, 0.6);
      const meteorGlow = this.add.circle(0, 0, 38, 0x581c87, 0.45);
      const meteor = this.add.sprite(0, 0, 'shadow-meteor');
      meteor.setDisplaySize(84, 84);

      const meteorBloom = this.add.sprite(0, 0, 'shadow-meteor')
        .setDisplaySize(84, 84)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.42);

      meteorContainer.add([meteorAura, meteorGlow, meteor, meteorBloom]);

      this.physics.world.enable(meteorContainer);
      meteorContainer.body.setSize(55, 55);
      meteorContainer.damage = 18;
      this.projectilesGroup.add(meteorContainer);

      // Partikel jejak ekor meteor (Bara Ungu Additive)
      const meteorTrailTimer = this.time.addEvent({
        delay: 35,
        repeat: 14,
        callback: () => {
          if (!meteorContainer.active) return;
          const spark = this.add.circle(
            meteorContainer.x + Phaser.Math.Between(12, 35),
            meteorContainer.y - Phaser.Math.Between(12, 35),
            Phaser.Math.Between(4, 8),
            0xc084fc,
            0.85
          ).setDepth(6).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: spark,
            alpha: 0,
            scale: 0.2,
            duration: 260,
            onComplete: () => spark.destroy(),
          });
        },
      });

      this.tweens.add({
        targets: meteorContainer,
        x: targetX,
        y: targetY,
        duration: 380,
        ease: 'Quad.easeIn',
        onComplete: () => {
          meteorTrailTimer.remove();
          meteorContainer.destroy();
          this.cameras.main.shake(220, 0.014);
          this.audioManager?.playBossHit();

          // Kawah bayangan gelap berlapis di tanah tempat meteor menghantam
          const craterOuter = this.add.ellipse(targetX, targetY + 6, 170, 44, 0x010003, 0.65).setDepth(3);
          const craterCore = this.add.ellipse(targetX, targetY + 6, 120, 32, 0x05010a, 0.9).setDepth(4);

          // Retakan lantai dari hantaman meteor
          const craterGfx = this.add.graphics().setDepth(4);
          craterGfx.lineStyle(2, 0x9333ea, 0.85);
          craterGfx.beginPath();
          craterGfx.moveTo(targetX, targetY + 6);
          craterGfx.lineTo(targetX - 45, targetY + 3);
          craterGfx.lineTo(targetX - 75, targetY + 8);
          craterGfx.moveTo(targetX, targetY + 6);
          craterGfx.lineTo(targetX + 50, targetY + 9);
          craterGfx.lineTo(targetX + 80, targetY + 4);
          craterGfx.strokePath();

          // Gelombang kejut hantaman
          const shock = this.add.ellipse(targetX, targetY + 6, 30, 12, 0xd8b4fe, 0.95)
            .setDepth(5)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: shock,
            scaleX: 5.5,
            scaleY: 2.8,
            alpha: 0,
            duration: 320,
            ease: 'Cubic.easeOut',
            onComplete: () => shock.destroy(),
          });

          // Pudar halus sisa kawah
          this.tweens.add({
            targets: [craterOuter, craterCore, craterGfx],
            alpha: 0,
            duration: 900,
            delay: 400,
            onComplete: () => {
              craterOuter.destroy();
              craterCore.destroy();
              craterGfx.destroy();
            },
          });
        },
      });
    });
  }

  // ==============================================================
  // 6. MEKANIK SERANGAN BALIK & FINISHER (DARA PASTI MENAPAK TANAH!)
  // ==============================================================

  _collectOrb(orb) {
    orb.visuals?.forEach((v) => v.destroy());
    orb.destroy();

    this.collectedOrbs++;
    this.audioManager?.playOrbCollect();
    this._showFloatingText(this.player.x, this.player.y - 50, `BUKTI +1 (${this.collectedOrbs}/3)`, '#facc15');

    const dots = ['◇', '◇', '◇'];
    for (let i = 0; i < this.collectedOrbs; i++) dots[i] = '◆';
    this.objectiveStatusText.setText(`🎯 Misi: Kumpulkan 3 Bukti [${dots.join(' ')}]`);

    if (this.collectedOrbs >= this.requiredOrbs) {
      this.objectiveStatusText.setText('⚡ BUKTI LENGKAP! TEKAN ASERTIF [E]!');
      this._showActionButton('ASERTIF!\n[E]', () => {
        this._triggerPhase1CounterAttack();
      });
    }
  }

  _showActionButton(label, callback) {
    this.actionBtnText.setText(label);
    this.actionBtn.setVisible(true).setActive(true);
    this.actionBtnHalo.setVisible(true);
    this.actionBtnText.setVisible(true);
    this.actionBtnGlow.resume();
    this._currentActionCallback = callback;
  }

  _hideActionButton() {
    this.actionBtn.setVisible(false).setActive(false);
    this.actionBtnHalo.setVisible(false);
    this.actionBtnText.setVisible(false);
    this.actionBtnGlow.pause();
    this._currentActionCallback = null;
  }

  _triggerAssertiveCounterAttack() {
    if (this._currentActionCallback) {
      const cb = this._currentActionCallback;
      this._hideActionButton();
      cb();
    } else if (!this.uiInputLocked && this.player?.active && !this._isAttacking) {
      // Pukulan defensif asertif cepat kapan pun pemain menekan tombol aksi di luar fase stun
      this._isAttacking = true;
      this.player.play('attack');
      this.audioManager?.playJump();
      const startX = this.player.x;
      const lungeX = this.player.flipX ? startX - 25 : startX + 25;
      this.tweens.add({
        targets: this.player,
        x: lungeX,
        duration: 140,
        yoyo: true,
        onComplete: () => {
          if (this.player?.active && !this.isJumping) {
            this.player.setTexture('player-idle');
          }
          this._isAttacking = false;
        },
      });
    }
  }

  _playDaraAttackAnimation({
    beamColor = 0xfacc15,
    coreColor = 0xffffff,
    textColor = '#fef08a',
    text = '"BATASANKU JELAS & TEGAS!"',
    damage = 34,
    onComplete = null,
  }) {
    if (!this.player || !this.player.active) return;

    this.uiInputLocked = true;
    this.player.setVelocity(0, 0);
    this.player.y = this.groundY;
    this.player.setFlipX(false); // Pastikan menghadap ke kanan ke arah bos

    const startX = this.player.x;
    const lungeTargetX = Math.min(startX + 85, this.boss.x - 130);

    // 1. Fase 1: Windup / Persiapan Serangan (160ms)
    // Dara mengambil kuda-kuda kokoh (attack_1.png) dan mengumpulkan energi keberanian
    this.player.play('attack');

    // Lingkaran aura keberanian di lantai di bawah kaki Dara saat mengumpulkan tenaga
    const chargeAura = this.add.ellipse(startX, this.groundY, 70, 20, beamColor, 0.6)
      .setDepth(11)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: chargeAura,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0.9,
      duration: 160,
      yoyo: true,
    });

    // Partikel bara keberanian menyerap ke kepalan tangan Dara
    for (let i = 0; i < 6; i++) {
      const spark = this.add.circle(
        startX + Phaser.Math.Between(-30, 30),
        this.groundY - Phaser.Math.Between(10, 80),
        Phaser.Math.Between(3, 6),
        beamColor,
        0.8
      ).setDepth(13).setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: spark,
        x: startX + 25,
        y: this.groundY - 55,
        alpha: 0,
        scale: 0.2,
        duration: 160,
        onComplete: () => spark.destroy(),
      });
    }

    // 2. Fase 2: Terjangan Pukulan Telapak Tangan Asertif (Palm Strike) pada 160ms
    this.time.delayedCall(160, () => {
      chargeAura.destroy();
      if (!this.player?.active || !this.boss?.active) return;

      // Terjangan fisik ke depan dengan bobot dan momentum kuat
      this.tweens.add({
        targets: this.player,
        x: lungeTargetX,
        duration: 140,
        ease: 'Quad.easeOut',
      });

      // Bayangan afterimage emas di belakang tubuh Dara saat menerjang
      const ghost = this.add.sprite(this.player.x, this.player.y, 'player-attack-2')
        .setDepth(11)
        .setOrigin(0.5, 1)
        .setScale(this.spriteScale)
        .setTint(beamColor)
        .setAlpha(0.65)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: ghost,
        alpha: 0,
        scaleX: this.spriteScale * 0.92,
        duration: 260,
        onComplete: () => ghost.destroy(),
      });

      // Hentakan debu lantai di kaki Dara
      const dust = this.add.ellipse(this.player.x - 20, this.groundY, 75, 18, 0xffffff, 0.8)
        .setDepth(11)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: dust,
        scaleX: 2.2,
        alpha: 0,
        duration: 280,
        ease: 'Cubic.easeOut',
        onComplete: () => dust.destroy(),
      });

      // Suara tembakan sinar keberanian & getaran kamera
      this.audioManager?.playAssertiveBeam();
      this.cameras.main.shake(380, 0.016);

      // Sinar Keberanian Berbentuk (Shaped Assertive Courage Blast & Vortex Stream)
      const handX = lungeTargetX + 38;
      const handY = this.groundY - 58;
      const beamTargetX = this.boss.x;

      // 1. Mandala Segel Keberanian di Telapak Tangan Dara (Palm Burst Mandala)
      const palmCrest = this.add.sprite(handX, handY, 'courage-crest')
        .setDisplaySize(110, 110)
        .setDepth(14)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(beamColor)
        .setScale(0.2);

      this.tweens.add({
        targets: palmCrest,
        scale: 1.25,
        angle: 180,
        alpha: { from: 1, to: 0.65 },
        duration: 250,
        ease: 'Back.easeOut',
      });

      // 2. Proyektil Gelombang Energi Berbentuk (Shaped Crescent Energy Blast Projectile)
      const blastWave = this.add.sprite(handX + 15, handY, 'courage-blast')
        .setDisplaySize(230, 135)
        .setOrigin(0.25, 0.5)
        .setDepth(15)
        .setTint(beamColor)
        .setBlendMode(Phaser.BlendModes.ADD);

      const blastCore = this.add.sprite(handX + 15, handY, 'courage-blast')
        .setDisplaySize(200, 105)
        .setOrigin(0.25, 0.5)
        .setDepth(16)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: [blastWave, blastCore],
        x: beamTargetX - 10,
        duration: 160,
        ease: 'Quad.easeIn',
      });

      // 3. Aliran Energi Berbentuk / Tapered Vortex Stream (Menggantikan Kotak Persegi Panjang Kaku)
      const beamGfx = this.add.graphics().setDepth(12);
      const drawTaperedBeam = (scale = 1.0) => {
        beamGfx.clear();
        // Outer glowing tapered energy cone
        beamGfx.fillStyle(beamColor, 0.42 * scale);
        beamGfx.beginPath();
        beamGfx.moveTo(handX, handY - 10 * scale);
        beamGfx.lineTo(beamTargetX, handY - 42 * scale);
        beamGfx.lineTo(beamTargetX, handY + 42 * scale);
        beamGfx.lineTo(handX, handY + 10 * scale);
        beamGfx.closePath();
        beamGfx.fillPath();

        // Inner white-hot stream
        beamGfx.fillStyle(coreColor, 0.85 * scale);
        beamGfx.beginPath();
        beamGfx.moveTo(handX, handY - 4 * scale);
        beamGfx.lineTo(beamTargetX, handY - 18 * scale);
        beamGfx.lineTo(beamTargetX, handY + 18 * scale);
        beamGfx.lineTo(handX, handY + 4 * scale);
        beamGfx.closePath();
        beamGfx.fillPath();
        beamGfx.setBlendMode(Phaser.BlendModes.ADD);
      };
      drawTaperedBeam(1.0);

      const beamPulse = this.tweens.add({
        targets: { s: 1.0 },
        s: 1.18,
        duration: 90,
        yoyo: true,
        repeat: 4,
        onUpdate: (tween, target) => {
          if (beamGfx.active) drawTaperedBeam(target.s);
        },
      });

      // 4. Gelombang Kejut Cincin Supersonik Berputar Sepanjang Lintasan
      const rings = [];
      for (let r = 0; r < 4; r++) {
        const ring = this.add.ellipse(handX + 35, handY, 20, 55, beamColor, 0.85)
          .setDepth(14)
          .setBlendMode(Phaser.BlendModes.ADD);
        ring.angle = 15 * (r % 2 === 0 ? 1 : -1);

        this.tweens.add({
          targets: ring,
          x: beamTargetX,
          scaleX: 2.2,
          scaleY: 1.8,
          alpha: 0,
          duration: 220,
          delay: r * 45,
          ease: 'Cubic.easeOut',
          onComplete: () => ring.destroy(),
        });
        rings.push(ring);
      }

      // Teks dialog asertif yang megah di atas kepala Dara
      const speakText = this.add.text(lungeTargetX, this.groundY - 145, text, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 18)}px`,
        fontStyle: '700',
        color: textColor,
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(16);

      // 5. Reaksi Hantaman Bos saat Proyektil Berbentuk Menghantam (160ms)
      this.time.delayedCall(160, () => {
        if (!this.boss?.active) return;

        this.audioManager?.playBossHit();
        this.boss.setTint(0xffffff);

        // Bos terlempar mundur akibat pukulan telapak tangan asertif
        this.tweens.add({
          targets: this.boss,
          x: '+=38',
          duration: 130,
          yoyo: true,
          ease: 'Cubic.easeOut',
          onComplete: () => {
            if (this.boss?.active) this.boss.clearTint();
          },
        });

        // Segel Mandala Hantaman di Tubuh Bos (Impact Crest)
        const impactCrest = this.add.sprite(beamTargetX - 15, handY, 'courage-crest')
          .setDisplaySize(160, 160)
          .setDepth(17)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(beamColor);

        this.tweens.add({
          targets: impactCrest,
          scale: 2.2,
          angle: -140,
          alpha: 0,
          duration: 320,
          ease: 'Cubic.easeOut',
          onComplete: () => impactCrest.destroy(),
        });

        // Gelombang kejut oval di titik benturan
        const impactWave = this.add.ellipse(beamTargetX - 15, handY, 35, 95, 0xffffff, 0.95)
          .setDepth(16)
          .setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: impactWave,
          scaleX: 3.2,
          scaleY: 2.4,
          alpha: 0,
          duration: 300,
          onComplete: () => impactWave.destroy(),
        });

        // Ledakan bintang partikel emas pada titik benturan bos
        const impactStar = this.add.star(beamTargetX - 15, handY, 6, 24, 65, beamColor)
          .setDepth(17)
          .setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: impactStar,
          scale: 2.5,
          rotation: 2.5,
          alpha: 0,
          duration: 350,
          ease: 'Cubic.easeOut',
          onComplete: () => impactStar.destroy(),
        });

        // Serpihan bara keberanian memancar keluar
        for (let s = 0; s < 10; s++) {
          const shard = this.add.circle(
            beamTargetX - 15,
            handY,
            Phaser.Math.Between(3, 7),
            beamColor,
            0.9
          ).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: shard,
            x: shard.x + Phaser.Math.Between(-80, 80),
            y: shard.y + Phaser.Math.Between(-65, 65),
            alpha: 0,
            scale: 0.2,
            duration: Phaser.Math.Between(300, 550),
            onComplete: () => shard.destroy(),
          });
        }

        this._damageBoss(damage);
      });

      // 6. Fase 3: Pemulihan / Recovery ke Posisi Asli & Idle (setelah 800ms)
      this.time.delayedCall(850, () => {
        beamPulse.remove();
        this.tweens.add({
          targets: [palmCrest, blastWave, blastCore],
          alpha: 0,
          duration: 180,
          onComplete: () => {
            palmCrest.destroy();
            blastWave.destroy();
            blastCore.destroy();
            beamGfx.destroy();
          },
        });

        this.tweens.add({
          targets: speakText,
          y: speakText.y - 20,
          alpha: 0,
          duration: 250,
          onComplete: () => speakText.destroy(),
        });

        // Dara melangkah mundur kembali ke posisi semula dan kembali ke pose berdiri idle
        if (this.player?.active) {
          this.tweens.add({
            targets: this.player,
            x: startX,
            duration: 260,
            ease: 'Sine.easeOut',
            onComplete: () => {
              if (this.player?.active) {
                this.player.setTexture('player-idle');
                this.player.y = this.groundY;
                this.player.setVelocity(0, 0);
              }
              this.uiInputLocked = false;
              if (onComplete) onComplete();
            },
          });
        } else {
          this.uiInputLocked = false;
          if (onComplete) onComplete();
        }
      });
    });
  }

  _triggerPhase1CounterAttack() {
    this.bossState = 'STUNNED';
    this.phase1AttackTimer?.remove();
    this.phase1GlitchTimer?.remove();

    this._playDaraAttackAnimation({
      beamColor: 0xfacc15,
      coreColor: 0xffffff,
      textColor: '#fef08a',
      text: '"BATASANKU JELAS & TEGAS!"',
      damage: 34,
      onComplete: () => {
        this._startPhase(2);
      },
    });
  }

  _triggerPhase2CounterAttack() {
    this.bossState = 'STUNNED';
    this.phase2AttackTimer?.remove();

    this._playDaraAttackAnimation({
      beamColor: 0x38bdf8,
      coreColor: 0xe0f2fe,
      textColor: '#38bdf8',
      text: '"KITA HADAPI BERSAMA!"',
      damage: 33,
      onComplete: () => {
        this._startPhase(3);
      },
    });
  }

  _triggerUltimateVictoryAttack() {
    this.bossState = 'DEFEATED';
    this._battleWon = true;
    this.uiInputLocked = true;

    this._showCinematicBars(400);

    this._playDaraAttackAnimation({
      beamColor: 0xfde047,
      coreColor: 0xffffff,
      textColor: '#fde047',
      text: '"SUARA KITA ADALAH KEKUATAN!"',
      damage: 33,
      onComplete: () => {
        this.audioManager?.playBossDefeat();
        this.cameras.main.flash(1100, 255, 245, 180);
        this.cameras.main.shake(800, 0.025);

        // Boss pecah dan larut menjadi partikel emas
        this.bossSmokeTimer?.remove();
        this.tweens.add({
          targets: [
            this.boss,
            this.bossDarkAuraOuter,
            this.bossDarkAuraInner,
            this.bossGroundShadow,
            this.bossGroundShadowCore,
          ],
          alpha: 0,
          scaleX: 0.05,
          scaleY: 0.05,
          duration: 1300,
          ease: 'Power2',
        });

        for (let i = 0; i < 28; i++) {
          const p = this.add.circle(this.boss.x, this.boss.y, Phaser.Math.Between(4, 9), 0xfde047, 0.9).setDepth(15);
          this.tweens.add({
            targets: p,
            x: p.x + Phaser.Math.Between(-200, 200),
            y: p.y + Phaser.Math.Between(-180, 120),
            alpha: 0,
            scale: 0.2,
            duration: Phaser.Math.Between(1000, 1800),
            ease: 'Cubic.easeOut',
            onComplete: () => p.destroy(),
          });
        }

        const bounds = getVisibleBounds(this);
        const victoryText = this.add.text(
          bounds.centerX,
          bounds.centerY - pxToWorld(this, 50),
          'KEBERANIAN KITA ADALAH PERUBAHAN!',
          {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${pxToWorld(this, 23)}px`,
            fontStyle: '700',
            color: '#fde047',
            stroke: '#000000',
            strokeThickness: 5,
          }
        ).setOrigin(0.5).setDepth(35).setScrollFactor(0);

        this.time.delayedCall(3400, () => {
          victoryText.destroy();
          this._hideCinematicBars(350);
          this.time.delayedCall(400, () => {
            this._concludeBattleAndGoToEnding();
          });
        });
      },
    });
  }

  _damageBoss(amount) {
    this.bossHp = Math.max(0, this.bossHp - amount);
    const bounds = getVisibleBounds(this);
    const barWidth = this._bossBarWidth || Math.min(bounds.width * 0.62, 520);
    const currentWidth = (this.bossHp / this.bossMaxHp) * barWidth;

    this.tweens.add({
      targets: this.bossHpFill,
      width: currentWidth,
      duration: 180,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: this.bossHpGhostFill,
      width: currentWidth,
      duration: 550,
      delay: 350,
      ease: 'Quad.easeOut',
    });

    const percent = Math.round((this.bossHp / this.bossMaxHp) * 100);
    this.bossHpText?.setText(`${Math.round(this.bossHp)} / ${this.bossMaxHp} HP  •  ${percent}%`);

    this.boss.setTint(0xffffff);
    this.time.delayedCall(160, () => {
      if (this.boss?.active) this.boss.clearTint();
    });
  }

  // ==============================================================
  // 7. SISTEM DAMAGE & MODAL BANGKIT KEMBALI (RESPONSIF & ANTI-NYANGKUT)
  // ==============================================================

  _handlePlayerHit(damage) {
    if (this._isInvulnerable || this._battleWon || this._isDefeatedModalOpen) return;

    this.playerCourage = Math.max(0, this.playerCourage - damage);
    this._isInvulnerable = true;

    this.audioManager?.playPlayerHurt();
    this.cameras.main.shake(260, 0.012);

    const barWidth = this._courageBarWidth || 186;
    const targetWidth = (this.playerCourage / this.playerMaxCourage) * barWidth;
    this.tweens.add({
      targets: this.courageFill,
      width: targetWidth,
      duration: 180,
      ease: 'Sine.easeOut',
    });

    this.tweens.add({
      targets: this.courageGhostFill,
      width: targetWidth,
      duration: 500,
      delay: 300,
      ease: 'Quad.easeOut',
    });

    this.courageText?.setText(`${Math.round(this.playerCourage)} / ${this.playerMaxCourage}`);
    this._showFloatingText(this.player.x, this.player.y - 45, `-${damage} KETEGASAN!`, '#ef4444');

    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      duration: 90,
      yoyo: true,
      repeat: 6,
      onComplete: () => {
        this.player?.setAlpha(1);
        this._isInvulnerable = false;
      },
    });

    if (this.playerCourage <= 0) {
      this._handlePlayerCourageDepleted();
    }
  }

  _handlePlayerCourageDepleted() {
    if (this._isDefeatedModalOpen) return;
    this._isDefeatedModalOpen = true;

    this.uiInputLocked = true;
    this.player?.setVelocity(0, 0);
    if (this.player) {
      this.player.y = this.groundY;
      this.isJumping = false;
      this.jumpLocksMovement = false;
    }

    // Bersihkan seluruh serangan aktif agar tidak terus mengenai pemain
    this.phase1AttackTimer?.remove();
    this.phase1SpikesTimer?.remove();
    this.phase1GlitchTimer?.remove();
    this.phase2AttackTimer?.remove();
    this.phase3MeteorTimer?.remove();
    this.projectilesGroup?.clear(true, true);

    const bounds = getVisibleBounds(this);
    const modalBg = this.add.rectangle(
      bounds.centerX,
      bounds.centerY,
      bounds.width * 0.76,
      pxToWorld(this, 170),
      0x0f031c,
      0.96
    ).setDepth(45).setScrollFactor(0).setStrokeStyle(3, 0xff2a55);

    const msg = this.add.text(
      bounds.centerX,
      bounds.centerY - pxToWorld(this, 28),
      '"Tarik napas dalam-dalam, Dara.\nKamu tidak sendirian. Bangkit dan coba lagi fase ini!"',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 14)}px`,
        color: '#ffffff',
        align: 'center',
        lineSpacing: 6,
      }
    ).setOrigin(0.5).setDepth(46).setScrollFactor(0);

    const retryBtn = this.add.rectangle(
      bounds.centerX,
      bounds.centerY + pxToWorld(this, 36),
      pxToWorld(this, 220),
      pxToWorld(this, 44),
      0x2563eb,
      1
    ).setDepth(46).setScrollFactor(0).setInteractive({ useHandCursor: true });

    const retryText = this.add.text(
      bounds.centerX,
      bounds.centerY + pxToWorld(this, 36),
      'BANGKIT KEMBALI',
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 13)}px`,
        fontStyle: '700',
        color: '#ffffff',
      }
    ).setOrigin(0.5).setDepth(47).setScrollFactor(0).setInteractive({ useHandCursor: true });

    const doRetry = () => {
      modalBg.destroy();
      msg.destroy();
      retryBtn.destroy();
      retryText.destroy();

      this._isDefeatedModalOpen = false;
      this.playerCourage = 100;
      const barWidth = this._courageBarWidth || 186;
      if (this.courageFill) this.courageFill.width = barWidth;
      if (this.courageGhostFill) this.courageGhostFill.width = barWidth;
      this.courageText?.setText('100 / 100');
      this._isInvulnerable = false;
      this.uiInputLocked = false;
      if (this.player) {
        this.player.setAlpha(1);
        this.player.y = this.groundY;
        this.player.setVelocity(0, 0);
      }
      this._startPhase(this.currentPhase);
    };

    retryBtn.on('pointerdown', doRetry);
    retryText.on('pointerdown', doRetry);
  }

  _showFloatingText(x, y, text, color) {
    const txt = this.add.text(x, y, text, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: `${pxToWorld(this, 13)}px`,
      fontStyle: '700',
      color: color || '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: txt,
      y: y - 35,
      alpha: 0,
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => txt.destroy(),
    });
  }

  _clearHazardZones() {
    this.hazardZones.forEach((h) => h?.destroy());
    this.hazardZones = [];
    this.pillarBeams.forEach((b) => b?.destroy());
    this.pillarBeams = [];
    this._clearPillars();
    if (this.nexusGraphics) this.nexusGraphics.clear();
  }

  _concludeBattleAndGoToEnding() {
    this.finished = true;
    this.audioManager?.stopBGM();

    this.scene.start('EpisodeEndingScene', {
      episodeId: 6,
      isLastEpisode: true,
      choices: this.choices,
    });
  }

  _cleanupBossScene() {
    this._hudInitialized = false;
    this.phase1AttackTimer?.remove();
    this.phase1SpikesTimer?.remove();
    this.phase1GlitchTimer?.remove();
    this.phase2AttackTimer?.remove();
    this.phase3MeteorTimer?.remove();
    this.bossSmokeTimer?.remove();
    this.bossAuraTween?.remove();
    this.bossShadowTween?.remove();
    this.bossHoverTween?.remove();
    this.actionBtnGlow?.remove();
    this._clearHazardZones();
  }

  _onBossSceneResize() {
    this._repositionUI();
  }

  // ==============================================================
  // 8. UPDATE PER-FRAME
  // ==============================================================

  onSceneUpdate() {
    if (!this._battleStarted || this.finished) return;

    // Pastikan posisi aura dan puddle bayangan lantai sinkron dengan gerak hover bos
    if (this.boss) {
      if (this.bossDarkAuraOuter) this.bossDarkAuraOuter.setPosition(this.boss.x, this.boss.y);
      if (this.bossDarkAuraInner) this.bossDarkAuraInner.setPosition(this.boss.x, this.boss.y);
      if (this.bossGroundShadow) this.bossGroundShadow.setPosition(this.boss.x, this.groundY - 6);
      if (this.bossGroundShadowCore) this.bossGroundShadowCore.setPosition(this.boss.x, this.groundY - 6);
    }

    // Pastikan Dara tidak pernah melayang di luar fase melompat
    if (!this.isJumping && this.player && !this.uiInputLocked) {
      if (Math.abs(this.player.y - this.groundY) > 2) {
        this.player.y = this.groundY;
        this.player.setVelocityY(0);
      }
    }

    // Gambar garis laser nexus dari pilar aktif ke Dara di Fase 3
    if (this.currentPhase === 3 && this.nexusGraphics && this.player) {
      this.nexusGraphics.clear();
      this.pillars.forEach((p) => {
        if (p.active) {
          this.nexusGraphics.lineStyle(2.5, 0xfde047, 0.45);
          this.nexusGraphics.lineBetween(p.x, this.groundY - 60, this.player.x, this.player.y - 40);
        }
      });
    }

    // Input aksi keyboard E/F
    if (Phaser.Input.Keyboard.JustDown(this.actionKeyE) || Phaser.Input.Keyboard.JustDown(this.actionKeyF)) {
      if (this.actionBtn?.visible) {
        this._triggerAssertiveCounterAttack();
      }
    }
  }
}
