import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getVisibleBounds, syncGameSizeToOrientation } from '../utils/visibleBounds';
import { getRandomCuratedQuestions } from '../data/smpSmaQuestions';

/**
 * RunnerScene.js
 *
 * Game Mode ke-2 (Standalone): Dara: Sprint of Truth (Chrome Dino Style Runner).
 * Fitur:
 * - Dara auto-running dengan animasi lari mulus (tinggi normal 140px).
 * - Mekanik Unik MENGECIL (Mini Mode / Chibi Shrink):
 *     - Bukan sekadar menunduk, melainkan bertransisi mengecil halus (scale tween 0.35 -> 0.15)
 *     - Diiringi efek pendaran partikel sihir pelindung (shrink & grow sparks).
 *     - Memungkinkan Dara meluncur di bawah drone pengintai.
 * - Fisika Lompat (Jump / Space / W / Up / Tap / Tombol Lompat):
 *     - Melompat tinggi melompati kristal duri di tanah.
 * - Rintangan Visual Arcade Asli (Physics Arcade Sprites):
 *     - Rintangan Bawah: Kristal duri gelap neon ('runner-spikes') wajib dilompati.
 *     - Rintangan Atas: Drone kamera pengintai ('runner-drone') melayang dengan sorot merah (wajib mengecil).
 * - Lantai koridor neon ('runner-road') scrolling mulus.
 * - 10 Butir Kebenaran (Truth Shards) melayang di sepanjang lintasan.
 * - Modal Kuis Interaktif Berdaya AI (Groq LLM):
 *     - 10 butir soal edukasi batasan diri & cyber safety disesuaikan untuk usia SMP & SMA.
 *     - Dibuat acak secara dinamis oleh AI agar tidak monoton.
 *     - Dilengkapi fallback bank soal terkurasi jika mode offline/koneksi lambat.
 * - Boss Bayangan Intimidasi (10 HP):
 *     - Jawaban benar: Proyektil asertif Dara melukai boss (-1 HP).
 *     - Jawaban salah / tabrak rintangan: Hati Dara berkurang (-1 Hati).
 * - Checkpoint: Pos Satpam (3.000m) & Ruang BK (7.200m) memulihkan nyawa penuh.
 */

// Bank soal fallback awal teracak untuk usia SMP & SMA
const FALLBACK_QUESTIONS_DATA = getRandomCuratedQuestions(10, 'smp_sma');

// Kalimat Intimidasi & Bullying Psikologis Boss (Sesuai Nilai Edukasi Komunikasi Asertif)
const BOSS_TAUNTS = [
  'Baperan banget sih! Cuma bercanda kok!',
  'Nggak usah lebay! Siapa yang bakal peduli?!',
  'Kalau kamu lapor, teman-teman bakal jauhin kamu!',
  'Kamu itu cuma cari perhatian, sok suci!',
  'Tundukkan kepalamu, terima saja kenyataan!',
  'Siapa yang bakal percaya sama omonganmu?!',
  'Salahmu sendiri! Kenapa nggak diam saja?!',
  'Percuma kamu lari, kamu nggak punya kendali!',
  'Semua orang menertawakanmu di belakang!',
  'Kamu pikir kamu berani menolak kami?!',
  'Batasanmu itu konyol, jangan sok jual mahal!',
  'Tutup mulutmu atau semuanya bakal lebih buruk!',
];

export default class RunnerScene extends Phaser.Scene {
  constructor() {
    super({ key: 'RunnerScene' });

    this.audioManager = null;
    this.player = null;
    this.groundY = 580;
    this.startX = 160;
    this.baseRunSpeed = 360;
    this.runSpeed = 360;
    this.distance = 0;
    this.isJumping = false;
    this.isShrunk = false;
    this.isDucking = false;
    this.playerScale = 0.35; // Tinggi normal 140px (400 * 0.35 = 140px)
    this.shrunkScale = 0.15; // Mode Mini Chibi (400 * 0.15 = 60px)
    this.playerCourage = 3;
    this.maxCourage = 3;
    this.bossHp = 10;
    this.bossMaxHp = 10;

    // Checkpoint
    this.currentCheckpointDistance = 0;
    this.checkpoints = [
      { distance: 3000, name: 'Pos Satpam Sekolah', passed: false },
      { distance: 7200, name: 'Ruang BK & Solidaritas', passed: false },
    ];

    // Status Game
    this.gameState = 'PLAYING'; // PLAYING, QUIZ, GAMEOVER, VICTORY
    this.questionsData = getRandomCuratedQuestions(10, 'smp_sma');
    this.aiQuestionsLoaded = false;
    this.currentQuestionIndex = 0;
    this._isResolvingAnswer = false;
    this.nextShardDistance = 350; // Muncul di 350m agar pemain segera menikmati kuis
    this.shardInterval = 750;
    this._isInvulnerable = false;
    this._scaleTween = null;

    // Grup Fisika
    this.obstaclesGroup = null;
    this.shardsGroup = null;
    this.floorPlatform = null;

    // Visual Parallax
    this.roadBg = null;

    // HUD
    this.heartsText = null;
    this.distanceText = null;
    this.shardsText = null;
    this.bossHpFill = null;
    this.bossHpGhostFill = null;
    this.bossHpText = null;
    this.quizModalContainer = null;

    // Boss Visuals, Animasi & Intimidasi
    this.bossSprite = null;
    this.bossState = 'IDLE'; // 'IDLE', 'ROARING', 'ATTACKING', 'HURT'
    this.bossBaseX = 0;
    this.bossBaseScale = 1;
    this.bossVoidCore = null;
    this.bossAuraDisc = null;
    this.bossAuraLayers = [];
    this.bossRoarTimer = null;
    this.bossTauntTimer = null;
    this.bossSpeechBubble = null;
    this._lastTauntIndex = -1;
    this._nextAfterimageTime = 0;
    this._nextLightningTime = 0;
    this.bossLightningGraphics = null;
    this.bossEyeGlowL = null;
    this.bossEyeGlowR = null;
    this.bossNameTag = null;
    this.bossNameTagText = null;

    // Dara Celestial Combat VFX Graphics
    this.daraLightningGraphics = null;
    this.daraBeamGraphics = null;

    // Boss Enrage State (< 50% HP)
    this.isBossEnraged = false;
    this.enrageDarknessOverlay = null;

    // Episode & Story Mode State
    this.episodeId = 6;
    this.isLastEpisode = true;
    this.choices = [];
  }

  init(data = {}) {
    this.episodeId = data.episodeId || 6;
    this.isLastEpisode = data.isLastEpisode !== undefined ? Boolean(data.isLastEpisode) : true;
    this.choices = Array.isArray(data.choices) ? data.choices : [];

    // Reset status perulangan jika scene restart
    this.distance = 0;
    this.isJumping = false;
    this.isShrunk = false;
    this.isDucking = false;
    this.playerCourage = 3;
    this.bossHp = 10;
    this.currentCheckpointDistance = 0;
    this.gameState = 'PLAYING';
    this.runSpeed = this.baseRunSpeed;
    this.isBossEnraged = false;
    this.questionsData = getRandomCuratedQuestions(10, 'smp_sma');
    this.aiQuestionsLoaded = false;
    this.currentQuestionIndex = 0;
    this._isResolvingAnswer = false;
    this.nextShardDistance = 350;
    this._isInvulnerable = false;
    this.checkpoints = [
      { distance: 3000, name: 'Pos Satpam Sekolah', passed: false },
      { distance: 7200, name: 'Ruang BK & Solidaritas', passed: false },
    ];
  }

  create() {
    // 0. Sinkronisasi Ukuran Game dengan Orientasi Layar
    syncGameSizeToOrientation(this);
    const bounds = getVisibleBounds(this);

    // Ground Y referensi persis di jalur neon hijau runner-road.jpg (row 550 diskalakan ke tinggi canvas)
    const bgScale = bounds.height / 768;
    this.groundY = bounds.top + Math.round(550 * bgScale);
    this.startX = bounds.left + 160;

    // Inisialisasi Audio
    this.audioManager = new AudioManager();
    this.audioManager.init();

    // 1. Latar Belakang Parallax (Full Cyber Corridor runner-road.jpg)
    this._createParallaxBackground(bounds);

    // 2. Lantai Fisika Solid & Garis Pendaran Neon
    this._createSolidFloor(bounds);

    // 3. Karakter Dara
    this._createPlayerDara(bounds);

    // 4. Boss Bayangan Melayang (Kanan Atas)
    this._createBossEntity(bounds);

    // 5. Grup Fisika Rintangan & Shards (Arcade Physics Groups)
    this.obstaclesGroup = this.physics.add.group();
    this.obstaclesGroup.defaults = {};
    this.shardsGroup = this.physics.add.group();
    this.shardsGroup.defaults = {};

    // 6. Setup Tabrakan (Colliders & Overlaps)
    this._setupCollisions();

    // 7. Kontrol Keyboard & Layar Sentuh Mobile
    this._setupControls(bounds);

    // 8. HUD Gaming-Grade (Darah Dara, Darah Boss, Jarak, Shards)
    this._createRunnerHUD(bounds);

    // 9. Petunjuk Kontrol Sementara (Tutorial Banner)
    this._showTutorialBanner(bounds);

    // 10. Generator Rintangan Prosedural: Spawn pertama di 800ms
    this.time.delayedCall(800, () => {
      if (this.gameState === 'PLAYING') this._spawnRandomObstacle();
    });

    this.obstacleSpawnTimer = this.time.addEvent({
      delay: 1750,
      loop: true,
      callback: () => this._spawnRandomObstacle(),
    });

    // 11. Handler Resize Layar (Debounced & Safe)
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => {
        if (!this.scene?.isActive()) return;
        syncGameSizeToOrientation(this);
        const b = getVisibleBounds(this);
        const s = b.height / 768;
        this.groundY = b.top + Math.round(550 * s);
        this.startX = b.left + 160;
        this._repositionUI(b);
      }, 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      if (this.bossRoarTimer) this.bossRoarTimer.remove();
      if (this.bossTauntTimer) this.bossTauntTimer.remove();
      if (this.bossSpeechBubble) this.bossSpeechBubble.destroy();
      if (this.bossLightningGraphics) this.bossLightningGraphics.destroy();
      if (this.bossFloorShadow) this.bossFloorShadow.destroy();
      if (this.bossNameTag) this.bossNameTag.destroy();
      if (this.daraLightningGraphics) this.daraLightningGraphics.destroy();
      if (this.daraBeamGraphics) this.daraBeamGraphics.destroy();
    });

    // 12. Panggil AI Generator di background untuk memuat variasi butir soal SMP/SMA
    this._fetchAiQuestionsInBackground();
  }

  update(time, delta) {
    if (this.gameState !== 'PLAYING') return;

    const bounds = getVisibleBounds(this);
    const dtSec = delta / 1000;
    const moveDelta = this.runSpeed * dtSec;

    this.distance += Math.round(this.runSpeed * dtSec * 0.12);

    // Scroll Background Koridor Cyber runner-road.jpg secara penuh sinkron dengan kecepatan objek
    const bgScale = bounds.height / 768;
    if (this.roadBg) this.roadBg.tilePositionX += moveDelta / bgScale;

    // Update Teks Jarak HUD
    this.distanceText?.setText(`🏃 JARAK: ${this.distance} m`);

    // BULLETPROOF PLAYER POSITION & GROUND CLAMPING:
    // Dara selalu terkunci di X posisinya dan TIDAK BISA tembus lantai ke bawah
    if (this.player && this.player.active) {
      this.player.x = this.startX;

      if (this.player.y >= this.groundY) {
        this.player.y = this.groundY;
        if (this.player.body.velocity.y > 0) {
          this.player.setVelocityY(0);
        }
        if (this.isJumping) {
          this.isJumping = false;
          if (!this.isShrunk && this.gameState === 'PLAYING') {
            this.player.play('run', true);
          }
        }
      }
    }

    // Gerakkan semua rintangan ke kiri & sinkronisasi aksesori visualnya
    if (this.obstaclesGroup) {
      this.obstaclesGroup.getChildren().forEach((obs) => {
        if (!obs || !obs.active) return;

        // Gerakkan posisi objek ke kiri sinkron dengan kecepatan jalan
        obs.x -= moveDelta;

        // Sync aksesori kristal duri
        if (obs.glow) obs.glow.setPosition(obs.x, obs.y);

        // Sync aksesori drone
        if (obs.laserBeam) obs.laserBeam.setPosition(obs.x, obs.y + 36);
        if (obs.sensorDot) obs.sensorDot.setPosition(obs.x, obs.y + 14);

        // Hapus jika sudah melewati batas kiri layar
        if (obs.x < bounds.left - 120) {
          this._destroyObstacleVisuals(obs);
          obs.destroy();
        }
      });
    }

    // Gerakkan semua Butir Fakta (shards) ke kiri
    if (this.shardsGroup) {
      this.shardsGroup.getChildren().forEach((shard) => {
        if (!shard || !shard.active) return;

        shard.x -= moveDelta;

        // Magnetis halus ke arah Dara jika dekat (radius 140px)
        if (this.player && this.player.active && this.gameState === 'PLAYING') {
          const pDist = Phaser.Math.Distance.Between(shard.x, shard.y, this.player.x, this.player.y - 40);
          if (pDist < 140) {
            const pullAngle = Phaser.Math.Angle.Between(shard.x, shard.y, this.player.x, this.player.y - 40);
            const pullSpeed = 240 * dtSec;
            shard.x += Math.cos(pullAngle) * pullSpeed;
            shard.y += Math.sin(pullAngle) * pullSpeed;
          }
        }

        if (shard.glow) shard.glow.setPosition(shard.x, shard.y);
        if (shard.label) shard.label.setPosition(shard.x, shard.y - 32);

        // Jika terlewat / tidak diambil pemain (keluar dari batas kiri)
        if (shard.x < bounds.left - 120) {
          if (shard.glow) shard.glow.destroy();
          if (shard.label) shard.label.destroy();
          shard.destroy();

          // PENTING: Jangan skip pertanyaan! Segera hadirkan kembali butiran dalam jarak dekat (~160m)
          this.nextShardDistance = this.distance + 160;
        }
      });
    }

    // Cek Spawn Butir Kebenaran (pastikan tidak ada butir aktif lain agar tidak tumpang tindih)
    const hasActiveShard = this.shardsGroup && this.shardsGroup.getChildren().some((s) => s && s.active);
    if (!hasActiveShard && this.distance >= this.nextShardDistance && this.currentQuestionIndex < (this.questionsData?.length || 10)) {
      this._spawnTruthShard();
      this.nextShardDistance = this.distance + this.shardInterval;
    }

    // Cek Checkpoint
    this.checkpoints.forEach((cp) => {
      if (!cp.passed && this.distance >= cp.distance) {
        cp.passed = true;
        this._reachCheckpoint(cp);
      }
    });

    // Boss Melayang Serpentine 2D, Ghost Afterimages, Embers & Sinkronisasi Aura
    if (this.bossSprite && this.bossSprite.active) {
      if (this.bossState === 'IDLE') {
        // 1. Serpentine 2D Figure-8 Hover (Gerak melayang dinamis multi-frekuensi, bukan sekadar kembang kempis)
        const hoverX = Math.sin(time * 0.0016) * 18 + Math.cos(time * 0.0009) * 8;
        const hoverY = Math.sin(time * 0.0032) * 14 + Math.cos(time * 0.0018) * 6;
        this.bossSprite.x = this.bossBaseX + hoverX;
        this.bossSprite.y = this.bossBaseY + hoverY;

        // 2. Kemiringan Badan Organik (Dynamic banking tilt)
        this.bossSprite.rotation = Math.sin(time * 0.0016) * 0.055;

        // 3. Denyut skala sangat halus dan natural (variasi hanya 1.8%, tidak kaku kembang-kempis)
        const breath = 1 + Math.sin(time * 0.0022) * 0.018;
        this.bossSprite.setScale(this.bossBaseScale * breath);

        // 4. Ghost Shadow Afterimages (Jejak bayangan berhantu ungu melayang di udara)
        if (time > (this._nextAfterimageTime || 0)) {
          this._nextAfterimageTime = time + 190;
          this._spawnBossAfterimage();
        }

        // 5. Sambaran Petir Void Berkala antar cakar
        if (time > (this._nextLightningTime || 0)) {
          this._nextLightningTime = time + Phaser.Math.Between(2600, 3900);
          this._triggerBossLightning(this.bossSprite.x, this.bossSprite.y);
        }

        // 6. Spectral Chromatic Glitch / Phase-Shift (Ketidakstabilan wujud bayangan intimidasi)
        if (time > (this._nextGlitchTime || 0)) {
          this._nextGlitchTime = time + Phaser.Math.Between(4200, 6200);
          this._triggerBossSpectralGlitch();
        }

        // 7. Percikan Hawa Hitam & Bara Ungu membubung ke atas tertiup angin koridor
        if (Math.random() < 0.38) {
          this._emitBossEmbers(this.bossSprite.x, this.bossSprite.y);
        }
      }

      const bx = this.bossSprite.x;
      const by = this.bossSprite.y;

      // 8. Ground Corruption Shadow Pool (Bayangan Miasma di Lantai yang bergerak sinkron)
      if (this.bossFloorShadow && this.bossFloorShadow.active) {
        this.bossFloorShadow.x = bx;
        this.bossFloorShadow.scaleX = 1 + Math.sin(time * 0.002) * 0.08;
        this.bossFloorShadow.alpha = 0.55 + Math.sin(time * 0.0025) * 0.15;
      }

      // 10. Sorotan Titik Mata Merah dengan Target Tracking ke arah Dara
      const lookOffset = (this.player && this.player.y < this.groundY - 30) ? -3 : 0;
      if (this.bossEyeGlowL && this.bossEyeGlowL.active) {
        this.bossEyeGlowL.setPosition(bx - 14, by - 48 + lookOffset);
        this.bossEyeGlowL.setAlpha(0.65 + Math.sin(time * 0.012) * 0.35);
      }
      if (this.bossEyeGlowR && this.bossEyeGlowR.active) {
        this.bossEyeGlowR.setPosition(bx + 14, by - 48 + lookOffset);
        this.bossEyeGlowR.setAlpha(0.65 + Math.sin(time * 0.012) * 0.35);
      }

      if (this.bossAuraLayers) {
        this.bossAuraLayers.forEach((layer) => {
          if (layer && layer.active) layer.setPosition(bx, by);
        });
      }

      if (this.bossNameTag && this.bossNameTag.active) {
        this.bossNameTag.setPosition(bx, by - 146);
      }
    }
  }

  // ==============================================================
  // A. VISUAL, LATAR BELAKANG & LANTAI SOLID
  // ==============================================================

  _createParallaxBackground(bounds) {
    // 1. Full-screen scrolling Cyber School Corridor (runner-road.jpg)
    // Menampilkan koridor sekolah neon lengkap (pintu kelas, loker, lampu, dan jalan)
    const roadKey = this.textures.exists('runner-road') ? 'runner-road' : null;
    const bgScale = bounds.height / 768;
    if (roadKey) {
      this.roadBg = this.add.tileSprite(bounds.centerX, bounds.centerY, bounds.width * 1.5, bounds.height, roadKey)
        .setDepth(2).setScrollFactor(0).setTileScale(bgScale, bgScale);
    } else {
      this.roadBg = this.add.rectangle(bounds.centerX, bounds.centerY, bounds.width * 1.5, bounds.height, 0x07020f, 1)
        .setDepth(2).setScrollFactor(0);
    }

    // Pendaran magis atmosfer di bagian atas koridor
    this.add.ellipse(bounds.centerX, bounds.top + 160, bounds.width * 1.2, 180, 0x1e1b4b, 0.35)
      .setScrollFactor(0).setDepth(3).setBlendMode(Phaser.BlendModes.ADD);

    // Layer Miasma Kegelapan Kemarahan Boss (< 50% HP)
    this.enrageDarknessOverlay = this.add.rectangle(
      bounds.centerX,
      bounds.centerY,
      bounds.width * 2,
      bounds.height * 2,
      0x05000a,
      0
    ).setDepth(26).setScrollFactor(0);
  }

  _createSolidFloor(bounds) {
    const floorH = bounds.height - (this.groundY - bounds.top);
    const floorY = this.groundY + floorH / 2;

    // Fisika Lantai Platform Statis (Arcade Physics Static Body pada GameObject Nyata)
    this.floorPlatform = this.add.rectangle(bounds.centerX, floorY, bounds.width * 2, floorH, 0x000000, 0);
    this.physics.add.existing(this.floorPlatform, true);

    // Garis neon pendaran halus tepat di jalur lari Dara
    this.floorNeonLine = this.add.rectangle(bounds.centerX, this.groundY, bounds.width * 1.6, 2, 0x10b981, 0.8)
      .setDepth(4).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
  }

  _createPlayerDara(bounds) {
    this.player = this.physics.add.sprite(this.startX, this.groundY, 'player-run-1');
    this.player.setDepth(10);
    this.player.setOrigin(0.5, 1);
    this.player.setScale(this.playerScale); // 0.35 -> Tinggi 140px

    // Gravitasi & Hitbox Fisika
    this.player.setGravityY(1500);
    this.player.body.setSize(140, 360);
    this.player.body.setOffset(65, 30);
    this.player.setCollideWorldBounds(true);

    this.player.play('run');

    // Graphics Efek Petir & Meriam Laser Keberanian Dara
    this.daraLightningGraphics = this.add.graphics().setDepth(24).setScrollFactor(0);
    this.daraBeamGraphics = this.add.graphics().setDepth(20).setScrollFactor(0);
  }

  _createBossEntity(bounds) {
    const bossX = bounds.right - 180;
    this.bossBaseX = bossX;
    this.bossBaseY = bounds.top + 185;
    this.bossState = 'IDLE';

    // Inisialisasi timestamp efek dinamis agar tidak undefined
    this._nextAfterimageTime = 0;
    this._nextLightningTime = 0;
    this._nextGlitchTime = 0;

    // 0. Bayangan Miasma di Tanah Koridor (Ground Corruption Shadow Pool)
    this.bossFloorShadow = this.add.ellipse(bossX, this.groundY - 6, 170, 26, 0x07010e, 0.72)
      .setDepth(4).setScrollFactor(0);

    // 1. Lapisan Void Inti Gelap (Dark Silhouette Halo Organik)
    this.bossVoidCore = this.add.ellipse(bossX, this.bossBaseY, 210, 240, 0x05010d, 0.65)
      .setDepth(5).setScrollFactor(0);

    // 2. Cakram Hawa Miasma Ungu Gelap Pekat (Atmospheric Vapor Disc)
    this.bossAuraDisc = this.add.ellipse(bossX, this.bossBaseY, 175, 205, 0x2e1065, 0.45)
      .setDepth(6).setScrollFactor(0).setBlendMode(Phaser.BlendModes.SCREEN);

    this.bossAuraLayers = [this.bossVoidCore, this.bossAuraDisc];

    // Denyut halus hawa miasma gelap (menyatu organik dengan sprite pixel art)
    this.tweens.add({
      targets: [this.bossAuraDisc],
      scaleX: 1.14,
      scaleY: 1.14,
      alpha: 0.6,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Sprite Boss Asli 'boss-shadow.png' (Ukuran Besar & Perkasa: 280x280)
    const spriteKey = this.textures.exists('boss-shadow') ? 'boss-shadow' : 'player-idle';
    this.bossSprite = this.add.sprite(bossX, this.bossBaseY, spriteKey)
      .setDisplaySize(280, 280)
      .setDepth(7)
      .setScrollFactor(0);
    this.bossBaseScale = this.bossSprite.scaleX;

    // Overhead Boss Name Badge (Jelas & Tajam di atas kepala Boss)
    this.bossNameTag = this.add.container(bossX, this.bossBaseY - 146).setDepth(12).setScrollFactor(0);
    const tagGlow = this.add.rectangle(0, 0, 154, 30, 0xe11d48, 0.28)
      .setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);
    const tagBg = this.add.rectangle(0, 0, 150, 26, 0x08010f, 0.94)
      .setStrokeStyle(2, 0xf43f5e);
    this.bossNameTagText = this.add.text(0, 0, '☠️ MINI BOSS ☠️', {
      fontFamily: '"Jersey 15", "Pixelify Sans", sans-serif',
      fontSize: '14px',
      fontStyle: '700',
      color: '#ffe4e6',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true },
    }).setOrigin(0.5);
    this.bossNameTag.add([tagGlow, tagBg, this.bossNameTagText]);

    // 6. Sorotan Titik Mata Merah Menyala di Balik Tudung
    this.bossEyeGlowL = this.add.circle(bossX - 14, this.bossBaseY - 48, 5, 0xef4444, 0.95)
      .setDepth(8).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
    this.bossEyeGlowR = this.add.circle(bossX + 14, this.bossBaseY - 48, 5, 0xef4444, 0.95)
      .setDepth(8).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);

    // 7. Graphics Petir Void
    this.bossLightningGraphics = this.add.graphics().setDepth(8).setScrollFactor(0);

    // 8. Timer Raungan / Intimidasi Gerak Berkala setiap 9 detik
    this.bossRoarTimer = this.time.addEvent({
      delay: 9000,
      loop: true,
      callback: () => {
        if (this.gameState === 'PLAYING' && this.bossState === 'IDLE') {
          this._triggerBossRoar(false);
        }
      },
    });

    // 9. Timer Intimidasi Suara & Balon Kata Manipulasi (Taunt Harassment)
    // Muncul setiap 6.8 detik untuk mengganggu konsentrasi Dara saat melewati obstakel
    this.bossTauntTimer = this.time.addEvent({
      delay: 6800,
      loop: true,
      callback: () => {
        if (this.gameState === 'PLAYING' && this.bossState === 'IDLE') {
          this._showBossTaunt();
        }
      },
    });

    // Taunt pembuka setelah 2.4 detik permainan dimulai
    this.time.delayedCall(2400, () => {
      if (this.gameState === 'PLAYING' && this.bossState === 'IDLE') {
        this._showBossTaunt('Kamu pikir kamu punya hak menolak kami?!');
      }
    });
  }

  _spawnBossAfterimage() {
    if (!this.bossSprite || !this.bossSprite.active) return;
    const ghost = this.add.sprite(this.bossSprite.x, this.bossSprite.y, this.bossSprite.texture.key)
      .setScale(this.bossSprite.scaleX * 1.02, this.bossSprite.scaleY * 1.02)
      .setRotation(this.bossSprite.rotation)
      .setDepth(6)
      .setScrollFactor(0)
      .setTint(0x581c87)
      .setAlpha(0.32)
      .setBlendMode(Phaser.BlendModes.SCREEN);

    this.tweens.add({
      targets: ghost,
      alpha: 0,
      scaleX: this.bossSprite.scaleX * 1.14,
      scaleY: this.bossSprite.scaleY * 1.14,
      duration: 380,
      ease: 'Sine.easeOut',
      onComplete: () => ghost.destroy(),
    });
  }

  _triggerBossSpectralGlitch() {
    if (!this.bossSprite || !this.bossSprite.active) return;
    if (this.bossState !== 'IDLE') return;

    const bx = this.bossSprite.x;
    const by = this.bossSprite.y;
    const scale = this.bossSprite.scaleX;

    const ghostCyan = this.add.sprite(bx - 10, by, this.bossSprite.texture.key)
      .setScale(scale).setDepth(6).setScrollFactor(0)
      .setTint(0x06b6d4).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);

    const ghostMagenta = this.add.sprite(bx + 10, by, this.bossSprite.texture.key)
      .setScale(scale).setDepth(6).setScrollFactor(0)
      .setTint(0xf43f5e).setAlpha(0.55).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [ghostCyan, ghostMagenta],
      alpha: 0,
      scaleX: scale * 1.1,
      scaleY: scale * 1.1,
      duration: 120,
      onComplete: () => {
        ghostCyan.destroy();
        ghostMagenta.destroy();
      },
    });
  }

  _emitBossEmbers(bx, by) {
    const spawnX = bx + Phaser.Math.Between(-80, 80);
    const spawnY = by + Phaser.Math.Between(20, 85);
    const colors = [0x9333ea, 0xa855f7, 0xf43f5e, 0x4c0519, 0x7c3aed];
    const color = Phaser.Utils.Array.GetRandom(colors);
    const radius = Phaser.Math.Between(3, 6);

    const ember = this.add.circle(spawnX, spawnY, radius, color, 0.8)
      .setDepth(6)
      .setScrollFactor(0)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: ember,
      x: spawnX - Phaser.Math.Between(25, 65), // tersapu angin koridor ke kiri
      y: spawnY - Phaser.Math.Between(45, 95),  // melayang membubung ke atas
      scale: 0.15,
      alpha: 0,
      duration: Phaser.Math.Between(500, 750),
      ease: 'Quad.easeOut',
      onComplete: () => ember.destroy(),
    });
  }

  _triggerBossLightning(bx, by) {
    if (!this.bossLightningGraphics) return;
    this.bossLightningGraphics.clear();

    const startX = bx - 55 + Phaser.Math.Between(-15, 15);
    const startY = by - 35 + Phaser.Math.Between(-15, 15);
    const targetX = bx + 55 + Phaser.Math.Between(-15, 15);
    const targetY = by - 15 + Phaser.Math.Between(-15, 15);

    // Garis luar ungu terang
    this.bossLightningGraphics.lineStyle(2.5, 0xd946ef, 0.85);
    this.bossLightningGraphics.beginPath();
    this.bossLightningGraphics.moveTo(startX, startY);

    let curX = startX;
    let curY = startY;
    const steps = 4;
    for (let i = 1; i <= steps; i++) {
      const nextX = startX + ((targetX - startX) / steps) * i + Phaser.Math.Between(-12, 12);
      const nextY = startY + ((targetY - startY) / steps) * i + Phaser.Math.Between(-12, 12);
      this.bossLightningGraphics.lineTo(nextX, nextY);
      curX = nextX;
      curY = nextY;
    }
    this.bossLightningGraphics.strokePath();

    // Inti putih petir
    this.bossLightningGraphics.lineStyle(1.2, 0xffffff, 0.95);
    this.bossLightningGraphics.beginPath();
    this.bossLightningGraphics.moveTo(startX, startY);
    this.bossLightningGraphics.lineTo(curX, curY);
    this.bossLightningGraphics.strokePath();

    // Hapus petir setelah 85ms
    this.time.delayedCall(85, () => {
      this.bossLightningGraphics?.clear();
    });
  }

  _triggerDaraLightning(dx, dy) {
    if (!this.daraLightningGraphics) return;
    this.daraLightningGraphics.clear();

    for (let bolt = 0; bolt < 2; bolt++) {
      const startX = dx - 35 + Phaser.Math.Between(-15, 15);
      const startY = dy - 60 + Phaser.Math.Between(-15, 15);
      const targetX = dx + 35 + Phaser.Math.Between(-15, 15);
      const targetY = dy + 15 + Phaser.Math.Between(-15, 15);

      // Garis luar cyan/gold bercahaya
      this.daraLightningGraphics.lineStyle(3.2, Phaser.Utils.Array.GetRandom([0x38bdf8, 0xfacc15, 0x67e8f9]), 0.95);
      this.daraLightningGraphics.beginPath();
      this.daraLightningGraphics.moveTo(startX, startY);

      let curX = startX;
      let curY = startY;
      const steps = 4;
      for (let i = 1; i <= steps; i++) {
        const nextX = startX + ((targetX - startX) / steps) * i + Phaser.Math.Between(-14, 14);
        const nextY = startY + ((targetY - startY) / steps) * i + Phaser.Math.Between(-14, 14);
        this.daraLightningGraphics.lineTo(nextX, nextY);
        curX = nextX;
        curY = nextY;
      }
      this.daraLightningGraphics.strokePath();

      // Inti putih cemerlang
      this.daraLightningGraphics.lineStyle(1.4, 0xffffff, 1.0);
      this.daraLightningGraphics.beginPath();
      this.daraLightningGraphics.moveTo(startX, startY);
      this.daraLightningGraphics.lineTo(curX, curY);
      this.daraLightningGraphics.strokePath();
    }

    this.time.delayedCall(75, () => {
      this.daraLightningGraphics?.clear();
    });
  }

  _drawContinuousLaserBeam(x1, y1, x2, y2, isSustained = false) {
    if (!this.daraBeamGraphics) return;
    this.daraBeamGraphics.clear();

    // 1. Lapisan Aura Terluar (Atmospheric Cyan Bloom)
    this.daraBeamGraphics.lineStyle(isSustained ? 54 : 38, 0x0284c7, 0.42);
    this.daraBeamGraphics.beginPath();
    this.daraBeamGraphics.moveTo(x1, y1);
    this.daraBeamGraphics.lineTo(x2, y2);
    this.daraBeamGraphics.strokePath();

    // 2. Lapisan Korona Emas Mentari (Solar Flare Ribbon)
    this.daraBeamGraphics.lineStyle(isSustained ? 32 : 22, 0xfacc15, 0.68);
    this.daraBeamGraphics.beginPath();
    this.daraBeamGraphics.moveTo(x1, y1);
    this.daraBeamGraphics.lineTo(x2, y2);
    this.daraBeamGraphics.strokePath();

    // 3. Lapisan Plasma Inti (High-Intensity Cyan Laser)
    this.daraBeamGraphics.lineStyle(isSustained ? 18 : 11, 0x38bdf8, 0.95);
    this.daraBeamGraphics.beginPath();
    this.daraBeamGraphics.moveTo(x1, y1);
    this.daraBeamGraphics.lineTo(x2, y2);
    this.daraBeamGraphics.strokePath();

    // 4. Inti Hyper-Laser Putih Bersih (Pure White Core)
    this.daraBeamGraphics.lineStyle(isSustained ? 7 : 4.5, 0xffffff, 1.0);
    this.daraBeamGraphics.beginPath();
    this.daraBeamGraphics.moveTo(x1, y1);
    this.daraBeamGraphics.lineTo(x2, y2);
    this.daraBeamGraphics.strokePath();

    // 5. Sambaran Kilatan Listrik Dinamis di Sepanjang Jalur Laser
    for (let j = 0; j < 2; j++) {
      const midX = (x1 + x2) * 0.5 + Phaser.Math.Between(-18, 18);
      const midY = (y1 + y2) * 0.5 + Phaser.Math.Between(-14, 14);
      this.daraBeamGraphics.lineStyle(2.0, 0xfde047, 0.85);
      this.daraBeamGraphics.beginPath();
      this.daraBeamGraphics.moveTo(x1, y1);
      this.daraBeamGraphics.lineTo(midX, midY);
      this.daraBeamGraphics.lineTo(x2, y2);
      this.daraBeamGraphics.strokePath();
    }
  }

  _showBossTaunt(customText = null) {
    if (!this.bossSprite || !this.bossSprite.active) return;
    if (this.gameState !== 'PLAYING') return;

    // Bersihkan balon kata sebelumnya jika ada
    if (this.bossSpeechBubble) {
      this.bossSpeechBubble.destroy();
      this.bossSpeechBubble = null;
    }

    let text = customText;
    if (!text) {
      let idx;
      do {
        idx = Phaser.Math.Between(0, BOSS_TAUNTS.length - 1);
      } while (idx === this._lastTauntIndex && BOSS_TAUNTS.length > 1);
      this._lastTauntIndex = idx;
      text = BOSS_TAUNTS[idx];
    }

    // Audio cue: Chilling psychological harassment chime (dissonant tritone drop)
    this.audioManager?.playMessageReceived?.(true);

    const bx = this.bossSprite.x;
    const by = this.bossSprite.y;

    // 1. Kilatan mata merah menyala tajam saat bicara
    if (this.bossEyeGlowL && this.bossEyeGlowR) {
      this.tweens.add({
        targets: [this.bossEyeGlowL, this.bossEyeGlowR],
        scale: 1.8,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    }

    // 2. Gelombang kejut akustik / intimidasi psikologis melesat ke arah pemain
    const waveRing = this.add.arc(bx - 30, by - 10, 24, 0, 360, false, 0x000000, 0)
      .setStrokeStyle(3, 0xf43f5e, 0.9).setDepth(20).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: waveRing,
      scaleX: 3.5,
      scaleY: 2.2,
      x: bx - 160,
      alpha: 0,
      duration: 650,
      ease: 'Cubic.easeOut',
      onComplete: () => waveRing.destroy(),
    });

    // 3. Boss condong maju seakan membisikkan intimidasi langsung ke kepala Dara
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX - 16,
      rotation: -0.065,
      duration: 160,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // 4. Balon Kata Obsidian Cyber Intimidation
    const bubbleX = bx - 165;
    const bubbleY = by + 26;

    const container = this.add.container(bubbleX, bubbleY).setDepth(25).setScrollFactor(0);

    const paddingX = 16;
    const isEnraged = (this.bossHp <= 5) || this.isBossEnraged;
    const tagText = isEnraged ? '🔥 KEMURKAAN BAYANGAN' : '☠ BISIKAN INTIMIDASI';
    const tagColor = isEnraged ? '#fca5a5' : '#fda4af';

    // Header Tag Intimidasi (Lebar & Jelas)
    const tagObj = this.add.text(0, -22, tagText, {
      fontFamily: '"Jersey 15", "Pixelify Sans", sans-serif',
      fontSize: '12px',
      fontStyle: '700',
      color: tagColor,
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Teks Intimidasi Utama (Jelas, Kontras Tinggi & Anti-Blur)
    const textObj = this.add.text(0, 6, `"${text}"`, {
      fontFamily: '"Pixelify Sans", -apple-system, sans-serif',
      fontSize: '13px',
      fontStyle: '700',
      color: '#ffffff',
      align: 'center',
      wordWrap: { width: 260 },
      lineSpacing: 4,
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true },
    }).setOrigin(0.5);

    const boxW = Math.max(220, Math.max(textObj.width, tagObj.width) + paddingX * 2);
    const boxH = Math.max(58, textObj.height + 38);

    tagObj.y = -boxH / 2 + 14;
    textObj.y = 8;

    // Ekor balon dialog mengarah ke boss di kanan atas
    const tail = this.add.triangle(boxW / 2 - 10, -boxH / 2 + 10, 0, 0, 16, -12, 18, 10, 0x14020f, 0.98)
      .setStrokeStyle(2, isEnraged ? 0xef4444 : 0xf43f5e);

    // Box gelap obsidian dengan border crimson menyala
    const bg = this.add.rectangle(0, 0, boxW, boxH, 0x11020d, 0.96)
      .setStrokeStyle(2, isEnraged ? 0xef4444 : 0xe11d48);

    // Aura pendaran tipis ungu/crimson
    const glow = this.add.rectangle(0, 0, boxW + 6, boxH + 6, isEnraged ? 0xef4444 : 0x9333ea, 0.3)
      .setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);

    container.add([glow, bg, tail, tagObj, textObj]);
    container.setScale(0.7);
    container.setAlpha(0);

    // Animasi pop-in dinamis
    this.tweens.add({
      targets: container,
      scale: 1,
      alpha: 1,
      y: bubbleY - 10,
      duration: 220,
      ease: 'Back.easeOut',
    });

    // Menghilang perlahan setelah 2.8 detik
    this.tweens.add({
      targets: container,
      alpha: 0,
      y: bubbleY - 24,
      duration: 500,
      delay: 2800,
      ease: 'Quad.easeIn',
      onComplete: () => {
        container.destroy();
        if (this.bossSpeechBubble === container) {
          this.bossSpeechBubble = null;
        }
      },
    });

    this.bossSpeechBubble = container;
  }

  _triggerBossRoar(isAttack = false, isEnrageTransition = false) {
    if (!this.bossSprite || !this.bossSprite.active) return;
    if (this.bossState !== 'IDLE' && !isAttack && !isEnrageTransition) return;

    const isEnraged = (this.bossHp <= 5) || isEnrageTransition;
    this.bossState = isAttack ? 'ATTACKING' : 'ROARING';

    // Pastikan memakai pose boss-shadow-roar.png saat meraung
    const roarTex = this.textures.exists('boss-shadow-roar')
      ? 'boss-shadow-roar'
      : (this.textures.exists('boss-shadow-attack') ? 'boss-shadow-attack' : 'boss-shadow');
    this.bossSprite.setTexture(roarTex);
    this.audioManager?.playBossRoar?.();

    if (isEnraged) {
      this.bossNameTagText?.setText('🔥 ENRAGED BOSS 🔥');
      this.bossNameTagText?.setColor('#fecdd3');
    }

    // 1. GETARAN PADA LAYAR
    // Jika Enraged (< 50% HP), getaran layar dibuat sangat dahsyat dan bergetar hebat
    const shakeDuration = isEnraged ? (isEnrageTransition ? 950 : 750) : (isAttack ? 250 : 160);
    const shakeIntensity = isEnraged ? (isEnrageTransition ? 0.025 : 0.018) : (isAttack ? 0.009 : 0.005);
    this.cameras.main.shake(shakeDuration, shakeIntensity);

    // 2. EFEK GELAP KARENA KEMARAHAN SI BOS (< 50% HP)
    if (isEnraged && this.enrageDarknessOverlay) {
      // Kilatan kegelapan memuncak saat meraung (alpha hingga 0.85)
      this.tweens.add({
        targets: this.enrageDarknessOverlay,
        alpha: 0.82,
        duration: 350,
        yoyo: true,
        hold: 250,
        onComplete: () => {
          if (this.enrageDarknessOverlay) {
            // Settle di ambient kegelapan permanen selama HP < 50%
            this.tweens.add({
              targets: this.enrageDarknessOverlay,
              alpha: 0.58,
              duration: 400,
            });
          }
        },
      });

      // Gelombang kejut kegelapan dari mulut boss yang meluas ke seluruh layar
      const roarShockwave = this.add.circle(this.bossSprite.x - 45, this.bossSprite.y - 20, 25, 0xef4444, 0)
        .setStrokeStyle(6, 0xdc2626, 0.95).setDepth(28).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: roarShockwave,
        radius: 400,
        alpha: 0,
        duration: 700,
        ease: 'Quad.easeOut',
        onComplete: () => roarShockwave.destroy(),
      });

      // Kilatan petir merah gelap
      this._triggerBossLightning(this.bossSprite.x - 30, this.bossSprite.y - 10);
    }

    // 3. MEMPERCEPAT OBSTAKEL YANG ADA (< 50% HP)
    if (isEnraged) {
      this.runSpeed = 480; // Kecepatan lari dan rintangan meningkat dari 360 ke 480!
      if (this.obstacleSpawnTimer) {
        this.obstacleSpawnTimer.delay = 1200; // Spawn rintangan lebih cepat & rapat!
      }
      if (this.obstaclesGroup) {
        this.obstaclesGroup.setVelocityX(-this.runSpeed);
      }
      if (this.shardsGroup) {
        this.shardsGroup.setVelocityX(-this.runSpeed);
      }
    }

    // 4. ANIMASI BOSS MENERJANG KE DEPAN SAAT MERAUNG
    const forwardOffset = isEnraged ? 75 : (isAttack ? 55 : 35);
    const scaleUp = isEnraged ? 1.35 : (isAttack ? 1.25 : 1.15);
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX - forwardOffset,
      scaleX: this.bossBaseScale * scaleUp,
      scaleY: this.bossBaseScale * scaleUp,
      duration: isEnraged ? 520 : (isAttack ? 480 : 560),
      hold: isEnraged ? 380 : 260,
      yoyo: true,
      ease: 'Back.easeOut',
      onComplete: () => {
        if (this.bossSprite && this.bossSprite.active) {
          this.bossSprite.setTexture('boss-shadow');
          this.bossSprite.x = this.bossBaseX;
          this.bossSprite.setScale(this.bossBaseScale);
          this.bossState = 'IDLE';
        }
      },
    });

    // Embers membubung dari raungan boss
    const emberCount = isEnraged ? 18 : (isAttack ? 12 : 7);
    for (let i = 0; i < emberCount; i++) {
      this.time.delayedCall(i * 35, () => {
        if (this.bossSprite && this.bossSprite.active) {
          this._emitBossEmbers(this.bossSprite.x - 35, this.bossSprite.y + 10);
        }
      });
    }

    // 5. BANNER PERINGATAN KEMARAHAN SAAT TRANSISI PERTAMA
    if (isEnrageTransition) {
      const bounds = getVisibleBounds(this);
      const enrageBanner = this.add.text(
        bounds.centerX,
        bounds.top + 72,
        '⚠ BOSS ENRAGED (<50% HP) ⚠\n[KEMARAHAN MEMUNCAK • KORIDOR GELAP & OBSTAKEL DIPERCEPAT!]',
        {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: '12px',
          fontStyle: '700',
          color: '#ff2255',
          align: 'center',
          backgroundColor: '#1f000d',
          stroke: '#000000',
          strokeThickness: 3.5,
          padding: { x: 18, y: 8 },
        }
      ).setOrigin(0.5).setDepth(35).setScrollFactor(0);

      this.tweens.add({
        targets: enrageBanner,
        scale: 1.08,
        duration: 250,
        yoyo: true,
        repeat: 3,
        onComplete: () => {
          this.time.delayedCall(1600, () => {
            this.tweens.add({
              targets: enrageBanner,
              alpha: 0,
              duration: 500,
              onComplete: () => enrageBanner.destroy(),
            });
          });
        },
      });
    }
  }

  // ==============================================================
  // B. KONTROL GERAK (LOMPAT & MENGECIL / MINI MODE)
  // ==============================================================

  _setupControls(bounds) {
    // Keyboard
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyUp = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Jump triggers (Space, W, Up Arrow)
    this.keySpace.on('down', () => this._handleJump());
    this.keyW.on('down', () => this._handleJump());
    this.keyUp.on('down', () => this._handleJump());

    // Shrink triggers (S, Down Arrow) - Tahan untuk mengecil, lepas untuk kembali normal
    this.keyS.on('down', () => this._handleShrinkStart());
    this.keyS.on('up', () => this._handleShrinkEnd());
    this.keyDown.on('down', () => this._handleShrinkStart());
    this.keyDown.on('up', () => this._handleShrinkEnd());

    // Tap layar atas untuk lompat (gaya Chrome Dino)
    this.input.on('pointerdown', (pointer) => {
      if (this.gameState === 'PLAYING' && pointer.y < bounds.bottom - 110) {
        this._handleJump();
      }
    });

    // Tombol Sentuh Layar Mobile
    this._createTouchButtons(bounds);
  }

  _createTouchButtons(bounds) {
    const btnY = bounds.bottom - 46;

    // Tombol Mengecil / Mini Mode (Kiri Bawah) - Translucent Cyber Action Pad
    const shrinkX = bounds.left + 88;
    this.shrinkBtn = this.add.rectangle(shrinkX, btnY, 116, 44, 0x07111a, 0.68)
      .setDepth(35).setScrollFactor(0).setStrokeStyle(1.5, 0x38bdf8, 0.85).setInteractive({ useHandCursor: true });
    this.shrinkBtnText = this.add.text(shrinkX, btnY, '▼ SLIDE', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      align: 'center',
      color: '#38bdf8',
    }).setOrigin(0.5).setDepth(36).setScrollFactor(0);

    this.shrinkBtn.on('pointerdown', () => {
      this.shrinkBtn.setFillStyle(0x0284c7, 0.9);
      this._handleShrinkStart();
    });
    const resetShrinkBtn = () => {
      this.shrinkBtn.setFillStyle(0x07111a, 0.68);
      this._handleShrinkEnd();
    };
    this.shrinkBtn.on('pointerup', resetShrinkBtn);
    this.shrinkBtn.on('pointerout', resetShrinkBtn);

    // Tombol Lompat (Kanan Bawah) - Translucent Cyber Action Pad
    const jumpX = bounds.right - 88;
    this.jumpBtn = this.add.rectangle(jumpX, btnY, 116, 44, 0x051610, 0.68)
      .setDepth(35).setScrollFactor(0).setStrokeStyle(1.5, 0x10b981, 0.85).setInteractive({ useHandCursor: true });
    this.jumpBtnText = this.add.text(jumpX, btnY, '▲ JUMP', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      align: 'center',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(36).setScrollFactor(0);

    this.jumpBtn.on('pointerdown', () => {
      this.jumpBtn.setFillStyle(0x059669, 0.9);
      this._handleJump();
      this.time.delayedCall(160, () => {
        if (this.jumpBtn?.active) this.jumpBtn.setFillStyle(0x051610, 0.68);
      });
    });
  }

  _handleJump() {
    if (this.gameState !== 'PLAYING' || !this.player || !this.player.active) return;

    // Hanya bisa melompat jika menyentuh lantai
    const onFloor = !this.isJumping && (
      this.player.y >= this.groundY - 5 ||
      this.player.body.blocked.down ||
      this.player.body.touching.down
    );

    if (onFloor) {
      this.isJumping = true;
      this.player.setVelocityY(-640);
      this.player.play('jump', true);
      this.audioManager?.playJump?.();

      if (this.isShrunk) {
        this._handleShrinkEnd();
      }
    }
  }

  /**
   * Animasi MENGECIL HALUS (Mini Chibi Mode):
   * Berbeda dengan menunduk kaku, Dara bertransisi mengecil halus (scale tween 0.35 -> 0.15).
   * Kaki tetap menapak tanah (origin 0.5, 1) dan tinggi tubuh menyusut dari 140px menjadi 60px.
   */
  _handleShrinkStart() {
    if (this.gameState !== 'PLAYING' || !this.player || !this.player.active || this.isShrunk) return;

    this.isShrunk = true;
    this.isDucking = true;

    if (this._scaleTween) this._scaleTween.stop();

    this._scaleTween = this.tweens.add({
      targets: this.player,
      scaleX: this.shrunkScale,
      scaleY: this.shrunkScale,
      duration: 120,
      ease: 'Cubic.easeOut',
    });

    this._spawnShrinkSpark();
    this.audioManager?.playTypewriterBlip?.();
  }

  /**
   * Animasi KEMBALI NORMAL HALUS:
   * Dara kembali mengembang ke ukuran normal 140px dengan sedikit sentuhan pantulan ceria (Back.easeOut).
   */
  _handleShrinkEnd() {
    if (!this.player || !this.player.active || !this.isShrunk) return;

    this.isShrunk = false;
    this.isDucking = false;

    if (this._scaleTween) this._scaleTween.stop();

    this._scaleTween = this.tweens.add({
      targets: this.player,
      scaleX: this.playerScale,
      scaleY: this.playerScale,
      duration: 150,
      ease: 'Back.easeOut',
    });

    this._spawnGrowSpark();

    const onFloor = this.player.y >= this.groundY - 5 || this.player.body.blocked.down || this.player.body.touching.down;
    if (onFloor && !this.isJumping && this.gameState === 'PLAYING') {
      this.player.play('run', true);
    }
  }

  _spawnShrinkSpark() {
    if (!this.player) return;
    for (let i = 0; i < 4; i++) {
      const ring = this.add.circle(this.player.x, this.player.y - 30, 20 - i * 4, 0x38bdf8, 0.7)
        .setDepth(11);
      this.tweens.add({
        targets: ring,
        scale: 0.1,
        alpha: 0,
        y: this.player.y - 8,
        duration: 180,
        onComplete: () => ring.destroy(),
      });
    }
  }

  _spawnGrowSpark() {
    if (!this.player) return;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const spark = this.add.circle(this.player.x, this.player.y - 45, 4, 0x4ade80, 0.9).setDepth(11);
      this.tweens.add({
        targets: spark,
        x: this.player.x + Math.cos(angle) * 32,
        y: this.player.y - 45 + Math.sin(angle) * 24,
        alpha: 0,
        scale: 0.2,
        duration: 220,
        onComplete: () => spark.destroy(),
      });
    }
  }

  // ==============================================================
  // C. RINTANGAN (DURI KRISTAL & DRONE PENGINTAI)
  // ==============================================================

  _spawnRandomObstacle() {
    if (this.gameState !== 'PLAYING') return;

    const bounds = getVisibleBounds(this);
    const spawnX = bounds.right + 70;

    // 55% Rintangan Bawah (Duri Spikes - Wajib Lompat)
    // 45% Rintangan Atas (Drone Pengintai - Wajib Mengecil)
    const isAirborne = Phaser.Math.Between(1, 10) > 5;

    if (isAirborne) {
      this._spawnAirborneObstacle(spawnX);
    } else {
      this._spawnGroundObstacle(spawnX);
    }
  }

  _spawnGroundObstacle(x) {
    const y = this.groundY;
    const texts = ['BAPERAN!', 'CUMA BERCANDA!', 'LEBAY!', 'GOSIP!'];
    const chosenText = Phaser.Utils.Array.GetRandom(texts);

    // Spikes dinamis berdasarkan Darah Boss:
    // Darah Boss > 50% (> 5 HP) -> runner-spikes.png
    // Darah Boss <= 50% (<= 5 HP) -> shadow-spikes.png
    const isEnraged = (this.bossHp <= 5 || this.isBossEnraged);
    const spikeKey = isEnraged ? 'shadow-spikes' : 'runner-spikes';
    const chosenKey = this.textures.exists(spikeKey) ? spikeKey : 'runner-spikes';

    const spike = this.physics.add.sprite(x, y, chosenKey);
    spike.setOrigin(0.5, 1);
    spike.setDisplaySize(72, 72);
    spike.setDepth(8);

    this.obstaclesGroup.add(spike);
    spike.body.allowGravity = false;
    spike.body.setImmovable(true);
    spike.body.setVelocityX(-this.runSpeed);
    spike.body.setSize(48, 55);
    spike.body.setOffset(12, 17);

    // Aura pendaran sesuai fase (merah api jika HP <= 50%, ungu jika HP > 50%)
    const glowTint = isEnraged ? 0xef4444 : 0x7c3aed;
    const glow = this.add.sprite(x, y, chosenKey)
      .setDisplaySize(72, 72)
      .setOrigin(0.5, 1)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(glowTint)
      .setAlpha(0.35);

    spike.glow = glow;
  }

  _spawnAirborneObstacle(x) {
    const droneY = this.groundY - 86;

    const drone = this.physics.add.sprite(x, droneY, 'runner-drone');
    drone.setOrigin(0.5, 0.5);
    drone.setDisplaySize(72, 72);
    drone.setDepth(8);

    this.obstaclesGroup.add(drone);
    drone.body.allowGravity = false;
    drone.body.setImmovable(true);
    drone.body.setVelocityX(-this.runSpeed);
    drone.body.setSize(56, 44);
    drone.body.setOffset(8, 14);

    // Sorotan Lampu Sensor Merah ke Bawah
    const laserBeam = this.add.triangle(
      x, droneY + 36,
      0, 0,
      -20, 52,
      20, 52,
      0xef4444,
      0.35
    ).setDepth(7).setBlendMode(Phaser.BlendModes.ADD);

    // Titik sensor merah pendaran halus
    const sensorDot = this.add.circle(x, droneY + 14, 4, 0xef4444, 0.95)
      .setDepth(9).setBlendMode(Phaser.BlendModes.ADD);

    drone.laserBeam = laserBeam;
    drone.sensorDot = sensorDot;
  }

  _spawnTruthShard() {
    if (this.gameState !== 'PLAYING') return;

    const bounds = getVisibleBounds(this);
    const spawnX = bounds.right + 70;
    const spawnY = this.groundY - 65;

    const crestKey = this.textures.exists('courage-crest') ? 'courage-crest' : 'player-idle';
    const shard = this.physics.add.sprite(spawnX, spawnY, crestKey);
    shard.setOrigin(0.5, 0.5);
    shard.setDisplaySize(40, 40);
    shard.setDepth(9);

    this.shardsGroup.add(shard);
    shard.body.allowGravity = false;
    shard.body.setVelocityX(0);
    shard.body.setSize(44, 44);

    // Kristal Butir Kebenaran Emas Bersinar
    const glow = this.add.circle(spawnX, spawnY, 28, 0xfacc15, 0.45)
      .setDepth(8).setBlendMode(Phaser.BlendModes.ADD);

    const questionNum = this.currentQuestionIndex + 1;
    const label = this.add.text(spawnX, spawnY - 32, `✦ BUTIR FAKTA ${questionNum} ✦`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10);

    shard.glow = glow;
    shard.label = label;
  }

  _destroyObstacleVisuals(obs) {
    if (!obs) return;
    if (obs.glow) obs.glow.destroy();
    if (obs.laserBeam) obs.laserBeam.destroy();
    if (obs.sensorDot) obs.sensorDot.destroy();
  }

  // ==============================================================
  // D. COLLISION & OVERLAPS
  // ==============================================================

  _setupCollisions() {
    // 1. Dara menapak di lantai platform
    this.physics.add.collider(this.player, this.floorPlatform, () => {
      if (this.isJumping) {
        this.isJumping = false;
        if (!this.isShrunk && this.gameState === 'PLAYING') {
          this.player.play('run', true);
        }
      }
    });

    // 2. Dara menabrak rintangan
    this.physics.add.overlap(this.player, this.obstaclesGroup, (player, obs) => {
      if (this.gameState !== 'PLAYING' || this._isInvulnerable) return;

      this._destroyObstacleVisuals(obs);
      obs.destroy();
      this._handlePlayerHurt();
    });

    // 3. Dara mengambil Butir Fakta (Kuis)
    this.physics.add.overlap(this.player, this.shardsGroup, (player, shard) => {
      if (this.gameState !== 'PLAYING') return;

      if (shard.glow) shard.glow.destroy();
      if (shard.label) shard.label.destroy();
      shard.destroy();
      this._triggerQuizModal();
    });
  }

  _handlePlayerHurt() {
    this.playerCourage = Math.max(0, this.playerCourage - 1);
    this._isInvulnerable = true;

    this.audioManager?.playPlayerHurt?.();
    this.cameras.main.shake(240, 0.016);

    // Floating text "-1 NYAWA" di atas kepala Dara
    if (this.player && this.player.active) {
      const hurtText = this.add.text(this.player.x, this.player.y - 85, '💔 -1 NYAWA', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '14px',
        fontStyle: '700',
        color: '#f87171',
        stroke: '#450a0a',
        strokeThickness: 3.5,
      }).setOrigin(0.5).setDepth(30);

      this.tweens.add({
        targets: hurtText,
        y: hurtText.y - 35,
        alpha: 0,
        duration: 850,
        ease: 'Quad.easeOut',
        onComplete: () => hurtText.destroy(),
      });
    }

    // Red horror screen flash
    const bounds = getVisibleBounds(this);
    const redFlash = this.add.rectangle(bounds.centerX, bounds.centerY, bounds.width, bounds.height, 0xdc2626, 0.28)
      .setDepth(29).setScrollFactor(0);
    this.tweens.add({
      targets: redFlash,
      alpha: 0,
      duration: 350,
      ease: 'Quad.easeOut',
      onComplete: () => redFlash.destroy(),
    });

    this._updateHeartsUI();

    // Efek flicker kebal
    this.tweens.add({
      targets: this.player,
      alpha: 0.25,
      duration: 80,
      yoyo: true,
      repeat: 7,
      onComplete: () => {
        if (this.player) this.player.setAlpha(1);
        this._isInvulnerable = false;
      },
    });

    if (this.playerCourage <= 0) {
      this._handlePlayerDefeat();
    }
  }

  // ==============================================================
  // E. MODAL KUIS INTERAKTIF & SERANGAN BOSS
  // ==============================================================

  async _fetchAiQuestionsInBackground() {
    try {
      const nlp = typeof window !== 'undefined' ? window.__nawasenadaraNlp : null;
      if (!nlp || typeof nlp.getRunnerQuestions !== 'function') return;

      const res = await nlp.getRunnerQuestions({
        count: 10,
        targetAudience: 'smp_sma',
      });

      const questions = res?.data?.questions || res?.questions;
      if (Array.isArray(questions) && questions.length > 0) {
        const nextIdx = this.currentQuestionIndex;
        if (nextIdx < this.questionsData.length) {
          const answered = this.questionsData.slice(0, nextIdx);
          const needed = this.questionsData.length - nextIdx;
          const aiSlice = questions.slice(0, needed).map((q, i) => ({
            ...q,
            id: nextIdx + i + 1,
            source: res?.data?.source || res?.source || 'ai_generated',
          }));
          this.questionsData = [...answered, ...aiSlice];
          this.aiQuestionsLoaded = true;
          console.log('[RunnerScene] AI Runner Questions loaded successfully:', this.questionsData.length);
        }
      }
    } catch (err) {
      console.warn('[RunnerScene] Background AI questions fetch fallback to curated bank:', err);
    }
  }

  _triggerQuizModal() {
    this._isResolvingAnswer = false;
    this.gameState = 'QUIZ';
    this.audioManager?.playOrbCollect?.();

    // Hapus balon kata intimidasi jika sedang aktif agar tidak menghalangi pertanyaan
    if (this.bossSpeechBubble) {
      this.bossSpeechBubble.destroy();
      this.bossSpeechBubble = null;
    }

    // Hentikan sementara laju rintangan & lari
    this.obstaclesGroup.setVelocityX(0);
    this.shardsGroup.setVelocityX(0);
    this.player.stop();
    this.player.setTexture('player-idle');

    const q = (this.questionsData && this.questionsData[this.currentQuestionIndex]) || FALLBACK_QUESTIONS_DATA[0];
    const bounds = getVisibleBounds(this);

    this.quizModalContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(45).setScrollFactor(0);

    // Kartu Glassmorphism Kuis Cyber-Noir
    const modalW = Math.min(bounds.width * 0.88, 620);
    const modalH = 390;
    const isAi = q.source === 'ai_generated';
    const glowColor = isAi ? 0x059669 : 0x0284c7;
    const borderColor = isAi ? 0x10b981 : 0x06b6d4;

    const modalGlow = this.add.rectangle(0, 0, modalW + 4, modalH + 4, glowColor, 0.25)
      .setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);
    const modalBg = this.add.rectangle(0, 0, modalW, modalH, 0x07111a, 0.96)
      .setStrokeStyle(1.5, borderColor);
    this.quizModalContainer.add([modalGlow, modalBg]);

    // Badge Topik & Indikator AI / Kasus Nyata Remaja SMP/SMA
    const sourceBadge = isAi ? '🤖 AI-GENERATED' : '✦ KASUS NYATA';
    const topicStr = (q.topic || 'BATASAN DIRI').toUpperCase();
    const badgeText = this.add.text(
      0,
      -156,
      `✦ BUTIR ${this.currentQuestionIndex + 1} / 10 • ${topicStr} • ${sourceBadge} (SMP/SMA) ✦`,
      {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        fontStyle: '700',
        color: isAi ? '#6ee7b7' : '#67e8f9',
        backgroundColor: isAi ? '#064e3b' : '#0c2338',
        padding: { x: 12, y: 5 },
      }
    ).setOrigin(0.5);
    this.quizModalContainer.add(badgeText);

    // Teks Soal
    const questionText = this.add.text(0, -92, q.question, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      color: '#f8fafc',
      align: 'center',
      wordWrap: { width: modalW - 60 },
      lineSpacing: 5,
    }).setOrigin(0.5);
    this.quizModalContainer.add(questionText);

    // Opsi Pilihan A, B, C
    const startY = -20;
    const btnHeight = 44;
    const btnGap = 12;

    q.options.forEach((opt, idx) => {
      const btnY = startY + idx * (btnHeight + btnGap);

      const btnBg = this.add.rectangle(0, btnY, modalW - 60, btnHeight, 0x0c1626, 0.92)
        .setStrokeStyle(1.5, 0x1e3a5f)
        .setInteractive({ useHandCursor: true });

      const optText = this.add.text(0, btnY, opt.text, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        color: '#e2e8f0',
        align: 'center',
        wordWrap: { width: modalW - 90 },
      }).setOrigin(0.5);

      btnBg.on('pointerover', () => btnBg.setFillStyle(0x162c4a, 1).setStrokeStyle(2, 0x38bdf8));
      btnBg.on('pointerout', () => btnBg.setFillStyle(0x0c1626, 0.92).setStrokeStyle(1.5, 0x1e3a5f));

      btnBg.on('pointerdown', () => {
        this._resolveQuizAnswer(opt, q, btnBg);
      });

      this.quizModalContainer.add([btnBg, optText]);
    });
  }

  _resolveQuizAnswer(selectedOption, questionData, btnBg) {
    if (this._isResolvingAnswer) return;
    this._isResolvingAnswer = true;

    if (!this.quizModalContainer) return;

    this.quizModalContainer.iterate((child) => {
      child.disableInteractive?.();
      if (child.input) child.input.enabled = false;
    });

    if (selectedOption.isCorrect) {
      // JAWABAN BENAR
      btnBg.setFillStyle(0x065f46, 1).setStrokeStyle(2, 0x10b981);
      this.audioManager?.playOrbCollect?.();

      const feedback = this.add.text(0, 146, `✓ BENAR! ${questionData.explanation}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        color: '#4ade80',
        align: 'center',
        wordWrap: { width: 540 },
      }).setOrigin(0.5);
      this.quizModalContainer.add(feedback);

      this.time.delayedCall(1600, () => {
        this.quizModalContainer?.destroy();
        this.quizModalContainer = null;
        this._executePlayerCounterAttack();
      });
    } else {
      // JAWABAN SALAH
      btnBg.setFillStyle(0x881337, 1).setStrokeStyle(2, 0xef4444);
      this.audioManager?.playPlayerHurt?.();

      const feedback = this.add.text(0, 146, `✗ KURANG TEPAT! Pelajaran: ${questionData.explanation}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        color: '#f87171',
        align: 'center',
        wordWrap: { width: 540 },
      }).setOrigin(0.5);
      this.quizModalContainer.add(feedback);

      this.time.delayedCall(2200, () => {
        this.quizModalContainer?.destroy();
        this.quizModalContainer = null;
        this._executeBossCounterAttack();
      });
    }
  }

  _executePlayerCounterAttack() {
    if (!this.player || !this.player.active) return;

    // -------------------------------------------------------------
    // FASE 1: WIND-UP / KONSENTRASI KEBERANIAN ASERTIF (650ms)
    // Dara langsung masuk pose kuda-kuda beladiri (player-attack-1),
    // pilar cahaya fajar menyembur, rune keberanian berputar ganda,
    // dan kilatan petir surya mengelilingi tubuhnya.
    // -------------------------------------------------------------
    this.audioManager?.playAssertiveBeam?.();

    // Hentikan animasi lari & ganti instan ke pose charging martial stance
    this.player.stop();
    this.player.setTexture('player-attack-1');
    this.player.setOrigin(0.5, 1);
    this.player.setScale(this.playerScale);
    this.player.setTint(0xfffbeb); // Kilauan putih fajar bercahaya

    // Dara ancang-ancang mundur sedikit & getaran konsentrasi
    this.tweens.add({
      targets: this.player,
      x: this.startX - 34,
      scaleY: this.playerScale * 0.94,
      duration: 650,
      ease: 'Back.easeIn',
    });

    // Kamera bergetar lembut mengumpulkan tenaga
    this.cameras.main.shake(650, 0.006);

    const bounds = getVisibleBounds(this);

    // 1. Pilar Cahaya Fajar (Pillar of Truth) membubung vertikal dari tanah ke langit
    const lightPillar = this.add.rectangle(this.player.x, bounds.centerY, 125, bounds.height, 0x38bdf8, 0.22)
      .setDepth(11).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);
    const lightPillarCore = this.add.rectangle(this.player.x, bounds.centerY, 48, bounds.height, 0xfef08a, 0.42)
      .setDepth(12).setScrollFactor(0).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: [lightPillar, lightPillarCore],
      scaleX: 1.35,
      alpha: { from: 0.2, to: 0.8 },
      yoyo: true,
      repeat: 3,
      duration: 150,
    });

    // 2. Runic Dual Concentric Magic Crests berputar di bawah kaki Dara
    const crestKey = this.textures.exists('courage-crest') ? 'courage-crest' : null;
    let crestInner = null;
    if (crestKey) {
      crestInner = this.add.image(this.player.x, this.player.y - 15, crestKey)
        .setScale(0.22).setAlpha(0.95).setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: crestInner,
        scale: 0.85,
        alpha: 0,
        rotation: 1.6,
        duration: 650,
        ease: 'Cubic.easeOut',
        onComplete: () => crestInner.destroy(),
      });
    }

    const crestOuterRing = this.add.circle(this.player.x, this.player.y - 15, 24, 0x38bdf8, 0)
      .setStrokeStyle(3.5, 0x38bdf8, 0.95).setDepth(13).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({
      targets: crestOuterRing,
      radius: 72,
      alpha: 0,
      duration: 650,
      ease: 'Quad.easeOut',
      onComplete: () => crestOuterRing.destroy(),
    });

    // 3. Sambaran Petir Surya Keberanian (Solar Lightning Arcs)
    const lightningTimer = this.time.addEvent({
      delay: 75,
      repeat: 7,
      callback: () => {
        if (!this.player || !this.player.active) return;
        this._triggerDaraLightning(this.player.x, this.player.y - 45);
      },
    });

    // 4. Suction particles: Butiran cahaya emas & cyan terhisap masuk melengkung ke dada & telapak Dara
    const courageSuctionTimer = this.time.addEvent({
      delay: 35,
      repeat: 18,
      callback: () => {
        if (!this.player || !this.player.active) return;
        const targetX = this.player.x + 24;
        const targetY = this.player.y - 48;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const dist = Phaser.Math.Between(75, 140);
        const p = this.add.circle(
          targetX + Math.cos(angle) * dist,
          targetY + Math.sin(angle) * dist,
          Phaser.Math.Between(4, 9),
          Phaser.Utils.Array.GetRandom([0xfde047, 0x38bdf8, 0xffffff, 0xfacc15, 0x10b981]),
          0.92
        ).setDepth(14).setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: p,
          x: targetX,
          y: targetY,
          scale: 0.15,
          alpha: 0,
          duration: 260,
          ease: 'Cubic.easeIn',
          onComplete: () => p.destroy(),
        });
      },
    });

    // 5. High-Impact Anime Battle Banner: "⚡ RESONANSI KEBERANIAN: ASERTIF! ⚡"
    const bannerContainer = this.add.container(this.player.x + 35, this.player.y - 165)
      .setDepth(35).setScrollFactor(0);
    const bannerBg = this.add.rectangle(0, 0, 290, 36, 0x0f172a, 0.88)
      .setStrokeStyle(2.5, 0x38bdf8, 1);
    const bannerGlow = this.add.rectangle(0, 0, 296, 42, 0x0284c7, 0.3)
      .setBlendMode(Phaser.BlendModes.ADD);
    const bannerText = this.add.text(0, 0, '⚡ SUARA KEBENARAN: ASERTIF! ⚡', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '13px',
      fontStyle: '700',
      color: '#fef08a',
    }).setOrigin(0.5);

    bannerContainer.add([bannerGlow, bannerBg, bannerText]);
    bannerContainer.setScale(0.5).setAlpha(0);
    this.tweens.add({
      targets: bannerContainer,
      scale: 1.0,
      alpha: 1,
      y: bannerContainer.y - 12,
      duration: 320,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(450, () => {
          this.tweens.add({
            targets: bannerContainer,
            alpha: 0,
            y: bannerContainer.y - 18,
            duration: 250,
            onComplete: () => bannerContainer.destroy(),
          });
        });
      },
    });

    // -------------------------------------------------------------
    // FASE 2: EXPLOSIVE FORWARD DASH & STRIKE THRUST (di 650ms)
    // Dara menerjang maju cepat, berganti ke pose serang (attack_2 -> attack_3),
    // melepaskan dentuman suara komet dan kilatan fajar!
    // -------------------------------------------------------------
    this.time.delayedCall(650, () => {
      courageSuctionTimer.remove();
      lightningTimer.remove();
      lightPillar.destroy();
      lightPillarCore.destroy();
      if (!this.player || !this.player.active) return;

      this.audioManager?.playCourageBlastFire?.();

      // Kamera menghentak tajam & kilatan cahaya emas fajar
      this.cameras.main.shake(300, 0.022);
      this.cameras.main.flash(140, 255, 248, 220, 0.5);

      // 1. Transisi Pose Gerak Cepat: attack_2 (dorongan lunge)
      this.player.setTexture('player-attack-2');
      this.player.setScale(this.playerScale);
      this.player.clearTint();

      const lungeTargetX = this.startX + 120;

      // Terjangan maju eksplosif (Forward Dash Lunge)
      this.tweens.add({
        targets: this.player,
        x: lungeTargetX,
        duration: 150,
        ease: 'Expo.easeOut',
        onComplete: () => {
          if (!this.player || !this.player.active) return;
          // 2. Kunci Kokoh Pose Puncak: attack_3 (Tebasan Telapak Meriam Energi)
          this.player.setTexture('player-attack-3');
          this.player.setScale(this.playerScale);
        },
      });

      // 5 Bayangan Hantu Prismatik (Prismatic Afterimages) membentang di belakang terjangan Dara
      const ghostColors = [0xfacc15, 0x38bdf8, 0x10b981, 0xa855f7, 0xffffff];
      for (let i = 1; i <= 5; i++) {
        const ghost = this.add.sprite(
          this.player.x - (i * 24),
          this.player.y,
          'player-attack-2'
        )
          .setScale(this.player.scaleX, this.player.scaleY)
          .setOrigin(0.5, 1)
          .setTint(ghostColors[i - 1] || 0x38bdf8)
          .setAlpha(0.75 / i)
          .setDepth(9)
          .setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: ghost,
          alpha: 0,
          x: ghost.x - 35,
          duration: 420,
          onComplete: () => ghost.destroy(),
        });
      }

      // Gelombang cincin kejut peluncuran (Sonic Boom Shockwaves)
      for (let s = 1; s <= 2; s++) {
        const ring = this.add.circle(this.player.x + 45, this.player.y - 48, 16 * s, 0xfde047, 0)
          .setStrokeStyle(4, s === 1 ? 0x38bdf8 : 0xfacc15, 0.95).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
          targets: ring,
          radius: 80 * s,
          alpha: 0,
          duration: 450 + s * 60,
          onComplete: () => ring.destroy(),
        });
      }

      // -------------------------------------------------------------
      // FASE 3: SURGE BLAST & FLYING IMPACT BURST (650ms - 1200ms)
      // Dara melepaskan gelombang keberanian 'courage-blast-surge.png' di depan telapaknya,
      // lalu proyektil 'courage-impact-burst.png' melayang menembus koridor menuju Boss,
      // dan saat mengenai Boss, proyektil membesar dahsyat!
      // -------------------------------------------------------------
      const surgeKey = this.textures.exists('courage-blast-surge')
        ? 'courage-blast-surge'
        : 'player-idle';

      const flyingBurstKey = this.textures.exists('courage-impact-burst')
        ? 'courage-impact-burst'
        : surgeKey;

      const handX = lungeTargetX + 48;
      const handY = this.player.y - 48;
      const targetX = this.bossSprite ? this.bossSprite.x : 680;
      const targetY = this.bossSprite ? this.bossSprite.y : 280;

      // 1. Tembakan gelombang pendorong di depan telapak Dara (courage-blast-surge.png)
      const surgeWave = this.add.sprite(handX, handY, surgeKey)
        .setScale(0.24)
        .setDepth(22)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.audioManager?.playCourageBlastFire?.() || this.audioManager?.playAssertiveBeam?.();

      this.tweens.add({
        targets: surgeWave,
        x: handX + 85,
        scaleX: 0.58,
        scaleY: 0.48,
        alpha: 0,
        duration: 480,
        ease: 'Cubic.easeOut',
        onComplete: () => surgeWave.destroy(),
      });

      // 2. Proyektil inti yang melayang ke Boss (courage-impact-burst.png)
      const flyingBurst = this.add.sprite(handX + 24, handY, flyingBurstKey)
        .setScale(0.24)
        .setDepth(25)
        .setBlendMode(Phaser.BlendModes.ADD);

      // Micro-recoil vibration pada tubuh Dara saat menembakkan gelombang keberanian
      const recoilTimer = this.time.addEvent({
        delay: 35,
        repeat: 14,
        callback: () => {
          if (!this.player || !this.player.active) return;
          this.player.x = lungeTargetX + Phaser.Math.Between(-2, 2);
          // Percikan api surya keluar dari telapak tangan
          const spark = this.add.circle(
            handX + Phaser.Math.Between(-6, 6),
            handY + Phaser.Math.Between(-6, 6),
            Phaser.Math.Between(4, 7),
            0xfde047,
            0.9
          ).setDepth(23).setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: spark,
            x: handX - Phaser.Math.Between(15, 35),
            y: handY + Phaser.Math.Between(-15, 15),
            alpha: 0,
            scale: 0.2,
            duration: 220,
            onComplete: () => spark.destroy(),
          });
        },
      });

      // Helical particles: Butiran cahaya berputar memilin (double-helix) di sekitar laser
      let helixAngle = 0;
      const helixTimer = this.time.addEvent({
        delay: 24,
        repeat: 22,
        callback: () => {
          if (!flyingBurst || !flyingBurst.active) return;
          helixAngle += 0.45;
          const sampleT = Phaser.Math.FloatBetween(0.1, 0.9);
          const curX = handX + (flyingBurst.x - handX) * sampleT;
          const curY = handY + (flyingBurst.y - handY) * sampleT;
          const offset = Math.sin(helixAngle) * 22;

          const hp = this.add.circle(
            curX,
            curY + offset,
            Phaser.Math.Between(4, 8),
            Phaser.Utils.Array.GetRandom([0xfde047, 0x38bdf8, 0xffffff]),
            0.9
          ).setDepth(21).setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: hp,
            scale: 0.1,
            alpha: 0,
            duration: 280,
            onComplete: () => hp.destroy(),
          });
        },
      });

      // Peluncuran proyektil melayang ke arah Boss dengan pengikatan laser real-time
      this.tweens.add({
        targets: flyingBurst,
        x: targetX,
        y: targetY,
        rotation: Math.PI * 4,
        duration: 540,
        ease: 'Cubic.easeIn',
        onUpdate: (tween, target) => {
          if (!this.daraBeamGraphics || !flyingBurst.active) return;
          this._drawContinuousLaserBeam(handX, handY, target.x, target.y, false);
        },
        onComplete: () => {
          helixTimer.remove();
          recoilTimer.remove();

          // Sorotan laser bertahan menusuk badan Boss selama 110ms
          this._drawContinuousLaserBeam(handX, handY, targetX, targetY, true);
          this.time.delayedCall(110, () => {
            this.daraBeamGraphics?.clear();
          });

          // SAAT MENGENAI BOSS: MEMBESAR SECARA DRAMATIS!
          this.tweens.add({
            targets: flyingBurst,
            scale: 1.85,
            rotation: Math.PI * 6.5,
            duration: 380,
            ease: 'Back.easeOut',
            onComplete: () => {
              this.tweens.add({
                targets: flyingBurst,
                alpha: 0,
                scale: 2.25,
                duration: 220,
                ease: 'Quad.easeOut',
                onComplete: () => flyingBurst.destroy(),
              });
            },
          });

          // -------------------------------------------------------------
          // FASE 4: IMPACT LEDAKAN SEISMIK & HIT-STOP (di 1180ms)
          // -------------------------------------------------------------
          this._createAttackImpactVisual(targetX, targetY);
          this._damageBoss();

          // -------------------------------------------------------------
          // FASE 5: DARA BERSLUNCUR MUNDUR KE POSISI LARI (Recovery Slide)
          // -------------------------------------------------------------
          this.time.delayedCall(240, () => {
            if (this.player && this.player.active) {
              // Ganti ke pose meluncur rem anggun (player-attack-4)
              this.player.setTexture('player-attack-4');
              this.player.setScale(this.playerScale);

              // Percikan gesekan kaki di lantai
              const slideDustTimer = this.time.addEvent({
                delay: 40,
                repeat: 8,
                callback: () => {
                  if (!this.player || !this.player.active) return;
                  const spark = this.add.circle(
                    this.player.x + Phaser.Math.Between(-10, 10),
                    this.groundY - 4,
                    Phaser.Math.Between(3, 6),
                    0x38bdf8,
                    0.85
                  ).setDepth(11).setBlendMode(Phaser.BlendModes.ADD);
                  this.tweens.add({
                    targets: spark,
                    y: spark.y - 16,
                    x: spark.x + 20,
                    alpha: 0,
                    duration: 220,
                    onComplete: () => spark.destroy(),
                  });
                },
              });

              this.tweens.add({
                targets: this.player,
                x: this.startX,
                duration: 440,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  slideDustTimer.remove();
                  if (this.player && this.player.active) {
                    this.player.clearTint();
                  }
                  if (this.bossHp > 0 && this.gameState === 'QUIZ') {
                    this._resumeRunner();
                  }
                },
              });
            }
          });
        },
      });
    });
  }

  _createAttackImpactVisual(x, y) {
    this.audioManager?.playBossHit?.();

    // 1. Hit-Stop Micro Freeze Frame: Jeda 90ms sensasi bobot pukulan anime
    const originalTimeScale = this.time.timeScale;
    this.time.timeScale = 0.12;
    this.time.delayedCall(90, () => {
      this.time.timeScale = originalTimeScale;
    });

    // 2. Guncangan Kamera Seismik & Kilatan Layar Fajar Pemurnian
    this.cameras.main.shake(450, 0.026);
    this.cameras.main.flash(200, 255, 242, 190, 0.72);

    // 4. Tebasan Salib Bintang 4-Titik (Celestial Cross-Slash Star)
    const crossGraphics = this.add.graphics().setDepth(27).setBlendMode(Phaser.BlendModes.ADD);
    crossGraphics.lineStyle(6, 0xffffff, 1.0);
    crossGraphics.beginPath();
    crossGraphics.moveTo(x - 90, y);
    crossGraphics.lineTo(x + 90, y);
    crossGraphics.moveTo(x, y - 90);
    crossGraphics.lineTo(x, y + 90);
    crossGraphics.strokePath();

    this.tweens.add({
      targets: crossGraphics,
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      duration: 380,
      onComplete: () => crossGraphics.destroy(),
    });

    // 5. Triple Concentric Shockwave Rings (Emas, Cyan, Putih)
    const shockwaves = [
      { r: 24, maxR: 140, color: 0xfacc15, width: 5 },
      { r: 18, maxR: 110, color: 0x38bdf8, width: 4 },
      { r: 12, maxR: 80, color: 0xffffff, width: 3 },
    ];
    shockwaves.forEach((sw) => {
      const ring = this.add.circle(x, y, sw.r, sw.color, 0)
        .setStrokeStyle(sw.width, sw.color, 0.95).setDepth(25).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({
        targets: ring,
        radius: sw.maxR,
        alpha: 0,
        duration: 520,
        ease: 'Quad.easeOut',
        onComplete: () => ring.destroy(),
      });
    });

    // 6. Radiant Diamond Hit Sparks (24 butiran cahaya berkecepatan tinggi)
    for (let i = 0; i < 24; i++) {
      const angle = (Math.PI * 2 / 24) * i;
      const speed = Phaser.Math.Between(160, 340);
      const spark = this.add.circle(
        x,
        y,
        Phaser.Math.Between(4, 9),
        Phaser.Utils.Array.GetRandom([0xfef08a, 0x67e8f9, 0xffffff, 0xf59e0b, 0x10b981]),
        0.95
      ).setDepth(28).setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed,
        scale: 0.1,
        alpha: 0,
        duration: Phaser.Math.Between(550, 850),
        ease: 'Cubic.easeOut',
        onComplete: () => spark.destroy(),
      });
    }

    // 7. Floating High-Impact Combat Banner
    const dmgBanner = this.add.container(x, y - 65).setDepth(34);
    const badgeBg = this.add.rectangle(0, 0, 220, 36, 0x090d16, 0.94)
      .setStrokeStyle(2, 0xfde047, 1);
    const badgeText = this.add.text(0, 0, '💥 SUARA KEBENARAN! -1 HP', {
      fontFamily: '"Jersey 15", "Pixelify Sans", sans-serif',
      fontSize: '15px',
      fontStyle: '700',
      color: '#fef08a',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true },
    }).setOrigin(0.5);
    dmgBanner.add([badgeBg, badgeText]);

    this.tweens.add({
      targets: dmgBanner,
      y: dmgBanner.y - 55,
      alpha: 0,
      scale: 1.25,
      duration: 1100,
      ease: 'Back.easeOut',
      onComplete: () => dmgBanner.destroy(),
    });
  }

  _damageBoss() {
    this.bossHp = Math.max(0, this.bossHp - 1);
    this.currentQuestionIndex++;
    this._updateShardsHUD();

    this.bossState = 'HURT';
    const hurtTex = this.textures.exists('boss-shadow-hurt') ? 'boss-shadow-hurt' : 'boss-shadow';
    this.bossSprite.setTexture(hurtTex);
    this.audioManager?.playBossRoar?.();

    // Kilatan sakit multi-fase (Putih -> Emas -> Merah)
    this.bossSprite.setTint(0xffffff);
    this.time.delayedCall(80, () => {
      if (this.bossSprite?.active) this.bossSprite.setTint(0xfde047);
    });
    this.time.delayedCall(160, () => {
      if (this.bossSprite?.active) this.bossSprite.setTint(0xef4444);
    });

    // Animasi terpental dahsyat ke belakang karena ledakan meriam laser
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX + 68,
      y: this.bossBaseY - 32,
      rotation: 0.22,
      duration: 320,
      hold: 240,
      yoyo: true,
      onComplete: () => {
        if (this.bossSprite && this.bossSprite.active) {
          this.bossSprite.clearTint();
          this.bossSprite.setTexture('boss-shadow');
          this.bossSprite.x = this.bossBaseX;
          this.bossSprite.rotation = 0;
          this.bossState = 'IDLE';
        }
      },
    });

    // Shadow puffs bleeding off boss body (16 partikel miasma keluar dari tubuh boss)
    for (let i = 0; i < 16; i++) {
      const puff = this.add.circle(
        this.bossSprite.x + Phaser.Math.Between(-45, 45),
        this.bossSprite.y + Phaser.Math.Between(-45, 45),
        Phaser.Math.Between(14, 28),
        0x3b0764,
        0.85
      ).setDepth(8).setBlendMode(Phaser.BlendModes.SCREEN);
      this.tweens.add({
        targets: puff,
        scale: 2.2,
        alpha: 0,
        x: puff.x + Phaser.Math.Between(-30, 30),
        y: puff.y - 55,
        duration: 580,
        onComplete: () => puff.destroy(),
      });
    }

    // Distorsi hawa miasma saat boss terkena serangan
    if (this.bossAuraDisc) {
      this.tweens.add({
        targets: [this.bossAuraDisc],
        scaleX: 1.8,
        scaleY: 1.8,
        alpha: 0.95,
        duration: 260,
        yoyo: true,
      });
    }

    this._updateBossHPUI();

    if (this.bossHp <= 0) {
      this._handleVictory();
    } else if (this.bossHp <= 5 && !this.isBossEnraged) {
      this.isBossEnraged = true;
      // Picu transisi Enrage Roar seketika saat animasi hurt selesai!
      this.time.delayedCall(450, () => {
        if (this.gameState === 'PLAYING') {
          this._triggerBossRoar(false, true);
        }
      });
    }
  }

  _executeBossCounterAttack() {
    this.currentQuestionIndex++;
    this._updateShardsHUD();

    if (!this.bossSprite || !this.bossSprite.active) {
      this._resumeRunner();
      return;
    }

    // Proyektil Boss dinamis sesuai Darah Boss:
    // Darah Boss > 50% (> 5 HP) -> boss-projectile.png
    // Darah Boss <= 50% (<= 5 HP / enraged) -> shadow-meteor.png
    const isEnraged = (this.bossHp <= 5 || this.isBossEnraged);
    const desiredProjKey = isEnraged ? 'shadow-meteor' : 'boss-projectile';
    const projKey = this.textures.exists(desiredProjKey)
      ? desiredProjKey
      : (this.textures.exists('boss-projectile') ? 'boss-projectile' : null);

    this.bossState = 'ATTACKING';

    // -------------------------------------------------------------
    // FASE 1: WIND-UP / CHARGING MANA GELAP (720ms)
    // Boss menarik badan ke belakang & melayang naik, menyerap energi miasma
    // -------------------------------------------------------------
    const castTex = this.textures.exists('boss-shadow-cast') ? 'boss-shadow-cast' : 'boss-shadow-attack';
    this.bossSprite.setTexture(castTex);
    this.bossSprite.setTint(isEnraged ? 0xf87171 : 0xc084fc);
    this.audioManager?.playBossRoar?.();

    // Kamera bergetar halus menunjukkan konsentrasi kekuatan gelap
    this.cameras.main.shake(700, isEnraged ? 0.008 : 0.005);

    // Animasi boss menarik badan ke belakang dan mengangkat kedua cakar
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX + 45,
      y: this.bossBaseY - 32,
      rotation: 0.14,
      scaleX: this.bossBaseScale * 1.16,
      scaleY: this.bossBaseScale * 1.16,
      duration: 700,
      ease: 'Back.easeIn',
    });

    // Swirling Void Gathering Vortex di tangan Boss
    const chargeOrbKey = projKey;
    let chargeVfx = null;
    if (chargeOrbKey) {
      chargeVfx = this.add.image(this.bossSprite.x - 48, this.bossSprite.y - 50, chargeOrbKey)
        .setScale(0.08)
        .setAlpha(0.2)
        .setDepth(15)
        .setBlendMode(Phaser.BlendModes.SCREEN);

      this.tweens.add({
        targets: chargeVfx,
        scale: isEnraged ? 0.26 : 0.22,
        alpha: 0.95,
        rotation: -Math.PI * 3,
        duration: 700,
        ease: 'Cubic.easeIn',
      });
    }

    // Sambaran petir gelap di sekitar cakar saat charging
    this._triggerBossLightning(this.bossSprite.x - 20, this.bossSprite.y - 40);

    // Partikel hisap (suction particles) miasma ke tangan boss
    const suctionColors = isEnraged
      ? [0xef4444, 0x991b1b, 0x450a0a, 0x000000]
      : [0x7c3aed, 0x9333ea, 0x3b0764, 0x000000];

    const suctionTimer = this.time.addEvent({
      delay: 50,
      repeat: 12,
      callback: () => {
        if (!this.bossSprite || !this.bossSprite.active) return;
        const targetX = this.bossSprite.x - 48;
        const targetY = this.bossSprite.y - 50;
        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const dist = Phaser.Math.Between(70, 130);
        const p = this.add.circle(
          targetX + Math.cos(angle) * dist,
          targetY + Math.sin(angle) * dist,
          Phaser.Math.Between(4, 8),
          Phaser.Utils.Array.GetRandom(suctionColors),
          0.85
        ).setDepth(14).setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
          targets: p,
          x: targetX,
          y: targetY,
          scale: 0.2,
          alpha: 0,
          duration: 280,
          onComplete: () => p.destroy(),
        });
      },
    });

    // -------------------------------------------------------------
    // FASE 2: EXPLOSIVE STRIKE & FORWARD LUNGE (720ms)
    // Boss menghempaskan cakar dan menerjang maju ke arah Dara!
    // -------------------------------------------------------------
    this.time.delayedCall(720, () => {
      suctionTimer.remove();
      if (chargeVfx) chargeVfx.destroy();
      if (!this.bossSprite || !this.bossSprite.active) return;

      const attackTex = this.textures.exists('boss-shadow-attack') ? 'boss-shadow-attack' : 'boss-shadow-roar';
      this.bossSprite.setTexture(attackTex);
      this.bossSprite.setTint(0xffffff);

      // Kamera menghentak kuat saat serangan diluncurkan
      this.cameras.main.shake(260, isEnraged ? 0.018 : 0.014);

      // Terjangan dahsyat ke depan (Forward Lunge Strike Tween)
      this.tweens.add({
        targets: this.bossSprite,
        x: this.bossBaseX - 85,
        y: this.bossBaseY + 18,
        rotation: -0.22,
        scaleX: this.bossBaseScale * 1.32,
        scaleY: this.bossBaseScale * 1.32,
        duration: 200,
        ease: 'Expo.easeOut',
      });

      // Bayangan hantu blur (Ghost afterimages) membentang di belakang terjangan boss
      for (let i = 1; i <= 3; i++) {
        const ghost = this.add.sprite(
          this.bossSprite.x + (i * 28),
          this.bossSprite.y - (i * 6),
          attackTex
        )
          .setScale(this.bossBaseScale * 1.2)
          .setRotation(-0.2)
          .setTint(isEnraged ? 0xef4444 : 0x7c3aed)
          .setAlpha(0.6 / i)
          .setDepth(6)
          .setBlendMode(Phaser.BlendModes.SCREEN);

        this.tweens.add({
          targets: ghost,
          alpha: 0,
          x: ghost.x + 35,
          duration: 380,
          onComplete: () => ghost.destroy(),
        });
      }

      // -------------------------------------------------------------
      // FASE 3: PELURU KOMET / METEOR BOSS
      // HP > 50%: boss-projectile.png (komet void ungu)
      // HP <= 50%: shadow-meteor.png (meteor bayangan merah berkobar)
      // -------------------------------------------------------------
      const startX = this.bossSprite.x - 70;
      const startY = this.bossSprite.y - 10;
      const targetX = this.player ? this.player.x + 10 : 160;
      const targetY = this.player ? this.player.y - 40 : this.groundY - 50;

      let projectile = null;
      if (projKey) {
        projectile = this.add.image(startX, startY, projKey)
          .setScale(isEnraged ? 0.22 : 0.18)
          .setDepth(18)
          .setBlendMode(Phaser.BlendModes.SCREEN);
      } else {
        projectile = this.add.circle(startX, startY, 32, isEnraged ? 0xef4444 : 0x9333ea, 0.95)
          .setStrokeStyle(3, 0xf43f5e)
          .setDepth(18)
          .setBlendMode(Phaser.BlendModes.ADD);
      }

      // Trail jejak api void & percikan bara gelap di sepanjang lintasan komet
      const cometColors = isEnraged
        ? [0xef4444, 0xb91c1c, 0x7f1d1d, 0x000000]
        : [0x7c3aed, 0xa855f7, 0x2e1065, 0xef4444];

      const cometTrail = this.time.addEvent({
        delay: 35,
        repeat: 16,
        callback: () => {
          if (!projectile || !projectile.active) return;
          const puff = this.add.circle(
            projectile.x + Phaser.Math.Between(-10, 10),
            projectile.y + Phaser.Math.Between(-10, 10),
            Phaser.Math.Between(8, 18),
            Phaser.Utils.Array.GetRandom(cometColors),
            0.8
          ).setDepth(17).setBlendMode(Phaser.BlendModes.ADD);

          this.tweens.add({
            targets: puff,
            scale: 2.2,
            alpha: 0,
            duration: 350,
            onComplete: () => puff.destroy(),
          });
        },
      });

      // Rotasi dan pembesaran proyektil saat mendekati pemain
      this.tweens.add({
        targets: projectile,
        rotation: 0.6,
        scale: 0.38,
        duration: 520,
      });

      // Lintasan melesat menuju Dara
      this.tweens.add({
        targets: projectile,
        x: targetX,
        y: targetY,
        duration: 520,
        ease: 'Quad.easeIn',
        onComplete: () => {
          cometTrail.remove();
          projectile.destroy();

          // -------------------------------------------------------------
          // FASE 4: DAMPAK LEDAKAN KE DARA (Dark Impact Blast)
          // -------------------------------------------------------------
          this.audioManager?.playPlayerHurt?.();
          this.cameras.main.shake(320, 0.022);

          // Efek benturan ledakan miasma gelap
          const burstKey = this.textures.exists('courage-impact-burst') ? 'courage-impact-burst' : null;
          if (burstKey) {
            const burst = this.add.image(targetX, targetY, burstKey)
              .setScale(0.3)
              .setTint(0x9333ea)
              .setDepth(20)
              .setBlendMode(Phaser.BlendModes.ADD);

            this.tweens.add({
              targets: burst,
              scale: 1.4,
              alpha: 0,
              rotation: -0.8,
              duration: 550,
              onComplete: () => burst.destroy(),
            });
          }

          // Cincin gelombang kejut void
          const wave = this.add.circle(targetX, targetY, 20, 0x7c3aed, 0)
            .setStrokeStyle(5, 0xa855f7, 0.95)
            .setDepth(19)
            .setBlendMode(Phaser.BlendModes.ADD);
          this.tweens.add({
            targets: wave,
            radius: 120,
            alpha: 0,
            duration: 480,
            ease: 'Quad.easeOut',
            onComplete: () => wave.destroy(),
          });

          // Panggil logic nyawa berkurang & animasi terpental Dara
          this._handlePlayerHurt();

          // -------------------------------------------------------------
          // FASE 5: RECOVERY & RETURN TO BASE
          // Boss kembali melayang anggun ke posisi semula
          // -------------------------------------------------------------
          this.time.delayedCall(350, () => {
            if (this.bossSprite && this.bossSprite.active) {
              this.tweens.add({
                targets: this.bossSprite,
                x: this.bossBaseX,
                y: this.bossBaseY,
                rotation: 0,
                scaleX: this.bossBaseScale,
                scaleY: this.bossBaseScale,
                duration: 480,
                ease: 'Sine.easeInOut',
                onComplete: () => {
                  if (this.bossSprite && this.bossSprite.active) {
                    this.bossSprite.setTexture('boss-shadow');
                    this.bossSprite.clearTint();
                    this.bossState = 'IDLE';
                  }
                },
              });
            }
          });

          // Lanjutkan berlari setelah pemain pulih
          this.time.delayedCall(700, () => {
            if (this.playerCourage > 0) {
              this._resumeRunner();
            }
          });
        },
      });
    });
  }

  _resumeRunner() {
    this._isResolvingAnswer = false;
    this.gameState = 'PLAYING';
    this.player.play('run');

    this.obstaclesGroup.setVelocityX(-this.runSpeed);
    this.shardsGroup.setVelocityX(0);
  }

  // ==============================================================
  // F. CHECKPOINT SISTEM (ZONA AMAN)
  // ==============================================================

  _reachCheckpoint(checkpoint) {
    this.currentCheckpointDistance = checkpoint.distance;
    this.playerCourage = this.maxCourage;
    this._updateHeartsUI();

    this.audioManager?.playOrbCollect?.();
    this.cameras.main.shake(160, 0.009);

    const bounds = getVisibleBounds(this);
    const pilar = this.add.rectangle(bounds.centerX, this.groundY - 140, 24, 280, 0xfde047, 0.45)
      .setDepth(6).setBlendMode(Phaser.BlendModes.ADD);

    const banner = this.add.text(bounds.centerX, this.groundY - 180, `✦ CHECKPOINT: ${checkpoint.name.toUpperCase()} ✦\n[HATI DIPULIHKAN PENUH!]`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#facc15',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: [pilar, banner],
      alpha: 0,
      duration: 2400,
      delay: 1000,
      onComplete: () => {
        pilar.destroy();
        banner.destroy();
      },
    });
  }

  // ==============================================================
  // G. GAME OVER & VICTORY
  // ==============================================================

  _handlePlayerDefeat() {
    this.gameState = 'GAMEOVER';
    this.player.setVelocity(0, 0);
    this.player.stop();
    this.player.setTexture('player-idle');
    this.obstaclesGroup.setVelocityX(0);

    if (this.bossSpeechBubble) {
      this.bossSpeechBubble.destroy();
      this.bossSpeechBubble = null;
    }
    if (this.bossLightningGraphics) {
      this.bossLightningGraphics.clear();
    }

    const bounds = getVisibleBounds(this);

    const modal = this.add.rectangle(bounds.centerX, bounds.centerY, Math.min(bounds.width * 0.82, 480), 220, 0x07111a, 0.96)
      .setStrokeStyle(1.5, 0xf43f5e).setDepth(50).setScrollFactor(0);

    const title = this.add.text(bounds.centerX, bounds.centerY - 50, 'KETEGASAN TERGUNCANG!', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '16px',
      fontStyle: '700',
      color: '#fb7185',
    }).setOrigin(0.5).setDepth(51);

    const msg = this.add.text(bounds.centerX, bounds.centerY - 10, 'Tarik napas dalam-dalam. Bangkit kembali dari checkpoint!', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      color: '#f8fafc',
      align: 'center',
    }).setOrigin(0.5).setDepth(51);

    const btnY = bounds.centerY + 45;
    const respawnBtn = this.add.rectangle(bounds.centerX - 100, btnY, 170, 40, 0x0c1626, 0.95)
      .setStrokeStyle(1.5, 0x38bdf8).setDepth(51).setInteractive({ useHandCursor: true });
    const respawnText = this.add.text(bounds.centerX - 100, btnY, '🔄 RESPAWN', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5).setDepth(52);

    const epSelectBtn = this.add.rectangle(bounds.centerX + 100, btnY, 170, 40, 0x0c1626, 0.95)
      .setStrokeStyle(1.2, 0xa855f7).setDepth(51).setInteractive({ useHandCursor: true });
    const epSelectText = this.add.text(bounds.centerX + 100, btnY, '📋 PILIH EPISODE', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#c084fc',
    }).setOrigin(0.5).setDepth(52);

    respawnBtn.on('pointerdown', () => {
      modal.destroy();
      title.destroy();
      msg.destroy();
      respawnBtn.destroy();
      respawnText.destroy();
      epSelectBtn.destroy();
      epSelectText.destroy();

      this.distance = this.currentCheckpointDistance;
      this.playerCourage = this.maxCourage;
      this._updateHeartsUI();

      this.obstaclesGroup.getChildren().forEach((obs) => this._destroyObstacleVisuals(obs));
      this.obstaclesGroup.clear(true, true);
      this._resumeRunner();
    });
    respawnBtn.on('pointerover', () => respawnBtn.setFillStyle(0x1e293b, 1));
    respawnBtn.on('pointerout', () => respawnBtn.setFillStyle(0x0c1626, 0.95));

    epSelectBtn.on('pointerdown', () => {
      this.audioManager?.stopBGM?.();
      this.scene.start('EpisodeSelectScene');
    });
    epSelectBtn.on('pointerover', () => epSelectBtn.setFillStyle(0x1e293b, 1));
    epSelectBtn.on('pointerout', () => epSelectBtn.setFillStyle(0x0c1626, 0.95));
  }

  _handleVictory() {
    this.gameState = 'VICTORY';
    this.obstaclesGroup.getChildren().forEach((obs) => this._destroyObstacleVisuals(obs));
    this.obstaclesGroup.clear(true, true);

    if (this.bossSpeechBubble) {
      this.bossSpeechBubble.destroy();
      this.bossSpeechBubble = null;
    }
    if (this.bossLightningGraphics) {
      this.bossLightningGraphics.clear();
    }
    if (this.bossFloorShadow) {
      this.bossFloorShadow.destroy();
    }

    const defeatTargets = [
      this.bossSprite,
      ...(this.bossAuraLayers || []),
    ].filter(Boolean);

    this.tweens.add({
      targets: defeatTargets,
      scale: 2.2,
      alpha: 0,
      duration: 850,
      ease: 'Cubic.easeOut',
    });

    const bounds = getVisibleBounds(this);

    const modalH = this.isLastEpisode ? 260 : 230;
    const modal = this.add.rectangle(bounds.centerX, bounds.centerY, Math.min(bounds.width * 0.88, 540), modalH, 0x07111a, 0.96)
      .setStrokeStyle(1.5, 0x10b981).setDepth(50).setScrollFactor(0);

    const title = this.add.text(bounds.centerX, bounds.centerY - (modalH / 2 - 32), '🏆 KEMENANGAN ASERTIF! 🏆', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '18px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(51);

    const msg = this.add.text(bounds.centerX, bounds.centerY - (modalH / 2 - 76), `Luar biasa! Dara berhasil menembus 10 intimidasi dengan batasan yang kokoh!\nTotal Jarak: ${this.distance} Meter`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5).setDepth(51);

    if (this.isLastEpisode) {
      // Tombol 1: Evaluasi & Rapor Akhir (Menuju EpisodeEndingScene)
      const evalBtn = this.add.rectangle(bounds.centerX, bounds.centerY + 10, 280, 38, 0x064e3b, 1)
        .setStrokeStyle(1.5, 0x10b981).setDepth(51).setInteractive({ useHandCursor: true });
      const evalBtnText = this.add.text(bounds.centerX, bounds.centerY + 10, '📜 LIHAT EVALUASI & RAPOR', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '12px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(52);

      evalBtn.on('pointerdown', () => {
        this.audioManager?.stopBGM?.();
        this.scene.start('EpisodeEndingScene', {
          episodeId: this.episodeId || 6,
          isLastEpisode: true,
          choices: this.choices || [],
        });
      });
      evalBtn.on('pointerover', () => evalBtn.setFillStyle(0x047857, 1));
      evalBtn.on('pointerout', () => evalBtn.setFillStyle(0x064e3b, 1));

      // Tombol 2: Main Lagi (Kiri) & Tombol 3: Pilih Episode (Kanan)
      const subBtnY = bounds.centerY + 62;
      const replayBtn = this.add.rectangle(bounds.centerX - 110, subBtnY, 150, 36, 0x0f172a, 0.95)
        .setStrokeStyle(1.2, 0x38bdf8).setDepth(51).setInteractive({ useHandCursor: true });
      const replayBtnText = this.add.text(bounds.centerX - 110, subBtnY, '🔄 MAIN LAGI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        fontStyle: '700',
        color: '#38bdf8',
      }).setOrigin(0.5).setDepth(52);

      replayBtn.on('pointerdown', () => this.scene.restart());
      replayBtn.on('pointerover', () => replayBtn.setFillStyle(0x1e293b, 1));
      replayBtn.on('pointerout', () => replayBtn.setFillStyle(0x0f172a, 0.95));

      const epSelectBtn = this.add.rectangle(bounds.centerX + 110, subBtnY, 150, 36, 0x0f172a, 0.95)
        .setStrokeStyle(1.2, 0xa855f7).setDepth(51).setInteractive({ useHandCursor: true });
      const epSelectBtnText = this.add.text(bounds.centerX + 110, subBtnY, '📋 PILIH EPISODE', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '11px',
        fontStyle: '700',
        color: '#c084fc',
      }).setOrigin(0.5).setDepth(52);

      epSelectBtn.on('pointerdown', () => {
        this.audioManager?.stopBGM?.();
        this.scene.start('EpisodeSelectScene');
      });
      epSelectBtn.on('pointerover', () => epSelectBtn.setFillStyle(0x1e293b, 1));
      epSelectBtn.on('pointerout', () => epSelectBtn.setFillStyle(0x0f172a, 0.95));
    } else {
      const subBtnY = bounds.centerY + 35;
      const replayBtn = this.add.rectangle(bounds.centerX - 100, subBtnY, 160, 40, 0x064e3b, 1)
        .setStrokeStyle(1.5, 0x10b981).setDepth(51).setInteractive({ useHandCursor: true });
      const replayBtnText = this.add.text(bounds.centerX - 100, subBtnY, '🔄 MAIN LAGI', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '12px',
        fontStyle: '700',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(52);
      replayBtn.on('pointerdown', () => this.scene.restart());

      const epSelectBtn = this.add.rectangle(bounds.centerX + 100, subBtnY, 160, 40, 0x0f172a, 0.95)
        .setStrokeStyle(1.2, 0xa855f7).setDepth(51).setInteractive({ useHandCursor: true });
      const epSelectBtnText = this.add.text(bounds.centerX + 100, subBtnY, '📋 PILIH EPISODE', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: '12px',
        fontStyle: '700',
        color: '#c084fc',
      }).setOrigin(0.5).setDepth(52);
      epSelectBtn.on('pointerdown', () => {
        this.audioManager?.stopBGM?.();
        this.scene.start('EpisodeSelectScene');
      });
    }
  }

  // ==============================================================
  // H. HUD GAMING-GRADE
  // ==============================================================

  _createRunnerHUD(bounds) {
    // 1. HUD Dara (Kiri Atas) - Cyberpunk Glass Card (Anti-Ketumpuk & Nyawa Jelas)
    const cardX = bounds.left + 16;
    const cardY = bounds.top + 16;
    const cardW = 252;
    const cardH = 78;

    // Glass panel with glowing cyan stroke & corner chamfer
    this.daraHudBg = this.add.rectangle(cardX + cardW / 2, cardY + cardH / 2, cardW, cardH, 0x050e17, 0.92)
      .setStrokeStyle(1.8, 0x06b6d4).setDepth(30).setScrollFactor(0);

    // Subtle cyan corner tag & status
    this.daraTagText = this.add.text(cardX + 12, cardY + 9, 'DARA // KETEGASAN DIRI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#67e8f9',
    }).setDepth(31).setScrollFactor(0);

    this.daraStatusText = this.add.text(cardX + cardW - 14, cardY + 9, '● SIAP', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(1, 0).setDepth(31).setScrollFactor(0);

    // NYAWA DARAH (Baris 2) - Hati Merah Menyala & Jelas
    this.daraNyawaLabel = this.add.text(cardX + 12, cardY + 28, 'NYAWA:', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      fontStyle: '700',
      color: '#94a3b8',
    }).setDepth(31).setScrollFactor(0);

    this.heartsText = this.add.text(cardX + 62, cardY + 24, '❤️ ❤️ ❤️', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '15px',
      color: '#f43f5e',
      stroke: '#4c0519',
      strokeThickness: 2,
    }).setDepth(31).setScrollFactor(0);

    this.heartsCountText = this.add.text(cardX + cardW - 14, cardY + 28, '3 / 3', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fda4af',
    }).setOrigin(1, 0).setDepth(31).setScrollFactor(0);

    // STATS ROW (Baris 3) - Dua Kotak Badge Mandiri (Jarak & Fakta Terpisah Total)
    const badgeW = 108;
    const badgeH = 20;
    const badgeY = cardY + 52;

    // Badge Jarak (Kiri)
    this.distPillBg = this.add.rectangle(cardX + 12 + badgeW / 2, badgeY + badgeH / 2, badgeW, badgeH, 0x042426, 0.9)
      .setStrokeStyle(1, 0x0d9488).setDepth(31).setScrollFactor(0);
    this.distanceText = this.add.text(cardX + 12 + badgeW / 2, badgeY + badgeH / 2, '🏃 JARAK: 0 m', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9.5px',
      fontStyle: '700',
      color: '#6ee7b7',
    }).setOrigin(0.5).setDepth(32).setScrollFactor(0);

    // Badge Fakta (Kanan)
    const faktaX = cardX + 12 + badgeW + 8;
    const faktaW = cardW - (12 + badgeW + 8 + 12);
    this.faktaPillBg = this.add.rectangle(faktaX + faktaW / 2, badgeY + badgeH / 2, faktaW, badgeH, 0x271904, 0.9)
      .setStrokeStyle(1, 0xb45309).setDepth(31).setScrollFactor(0);
    this.shardsText = this.add.text(faktaX + faktaW / 2, badgeY + badgeH / 2, '✨ FAKTA: 0/10', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9.5px',
      fontStyle: '700',
      color: '#fde047',
    }).setOrigin(0.5).setDepth(32).setScrollFactor(0);

    // 2. HUD Boss Health Bar (Tengah Atas) - Epic Dark Souls / Cyberpunk Boss Frame
    const centerX = bounds.centerX;
    const barW = Math.min(bounds.width * 0.54, 450);
    const barY = bounds.top + 40; // Posisi nyaman & proporsional

    // Header Frame Boss
    this.bossHeaderFrame = this.add.rectangle(centerX, barY - 17, barW + 12, 28, 0x090111, 0.96)
      .setStrokeStyle(2, 0xf43f5e).setDepth(30).setScrollFactor(0);

    this.bossTitleText = this.add.text(centerX, barY - 17, '⚔️ BOSS: BAYANGAN INTIMIDASI & KEBISUAN', {
      fontFamily: '"Jersey 15", "Pixelify Sans", sans-serif',
      fontSize: '15px',
      fontStyle: '700',
      color: '#ffe4e6',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 2, color: '#000000', blur: 3, fill: true },
    }).setOrigin(0.5).setDepth(31).setScrollFactor(0);

    // Track Bar Housing HP Boss
    this.bossBarContainer = this.add.rectangle(centerX, barY + 11, barW + 12, 24, 0x07010e, 0.98)
      .setStrokeStyle(2, 0xbe123c).setDepth(30).setScrollFactor(0);

    const leftX = centerX - barW / 2;
    // Track background
    this.bossTrackBg = this.add.rectangle(leftX, barY + 11, barW, 20, 0x1a0212, 1)
      .setOrigin(0, 0.5).setDepth(31).setScrollFactor(0);

    // Segmented Grid Lines (Indikator 10 HP terpisah)
    this.bossHpDividers = [];
    for (let i = 1; i < 10; i++) {
      const divX = leftX + (barW / 10) * i;
      const div = this.add.line(0, 0, divX, barY + 1, divX, barY + 21, 0x4c0519, 0.75)
        .setOrigin(0).setDepth(34).setScrollFactor(0);
      this.bossHpDividers.push(div);
    }

    // Ghost Lag Fill (kuning/oranye menyala saat darah berkurang)
    this.bossHpGhostFill = this.add.rectangle(leftX, barY + 11, barW, 20, 0xf59e0b, 0.9)
      .setOrigin(0, 0.5).setDepth(32).setScrollFactor(0);

    // Main HP Fill (Crimson Neon)
    this.bossHpFill = this.add.rectangle(leftX, barY + 11, barW, 20, 0xff1744, 1)
      .setOrigin(0, 0.5).setDepth(33).setScrollFactor(0);

    // Glossy Top Highlight
    this.bossGlossHighlight = this.add.rectangle(leftX, barY + 5, barW, 8, 0xffffff, 0.22)
      .setOrigin(0, 0.5).setDepth(34).setScrollFactor(0);

    // HP Text Besar & Tebal di tengah bar (Font Jelas, Kontras Tinggi & Anti-Blur)
    this.bossHpText = this.add.text(centerX, barY + 11, '10 / 10 HP (100%)', {
      fontFamily: '"Jersey 15", "Pixelify Sans", sans-serif',
      fontSize: '13px',
      fontStyle: '700',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
      shadow: { offsetX: 1, offsetY: 1, color: '#000000', blur: 2, fill: true },
    }).setOrigin(0.5).setDepth(35).setScrollFactor(0);

    this._bossBarWidth = barW;
    this._bossBarLeftX = leftX;
    this._bossBarY = barY;
  }

  _showTutorialBanner(bounds) {
    const banner = this.add.rectangle(bounds.centerX, bounds.centerY - 90, Math.min(bounds.width * 0.84, 540), 38, 0x07111a, 0.92)
      .setStrokeStyle(1.5, 0x06b6d4).setDepth(28).setScrollFactor(0);

    const text = this.add.text(bounds.centerX, bounds.centerY - 90, 'LOMPAT: [SPASI / W / ▲ / TAP]  •  MENGECIL: [S / ▼ TAHAN]', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#67e8f9',
    }).setOrigin(0.5).setDepth(29).setScrollFactor(0);

    this.tweens.add({
      targets: [banner, text],
      alpha: 0,
      duration: 1000,
      delay: 3800,
      onComplete: () => {
        banner.destroy();
        text.destroy();
      },
    });
  }

  _updateHeartsUI() {
    const hearts = [];
    for (let i = 0; i < this.maxCourage; i++) {
      hearts.push(i < this.playerCourage ? '❤️' : '🖤');
    }
    this.heartsText?.setText(hearts.join(' '));
    this.heartsCountText?.setText(`${this.playerCourage} / ${this.maxCourage}`);

    // Denyut merah halus ketika sisa 1 nyawa
    if (this.playerCourage <= 1 && this.heartsText) {
      this.tweens.add({
        targets: this.heartsText,
        scale: 1.15,
        duration: 220,
        yoyo: true,
      });
    }
  }

  _updateShardsHUD() {
    this.shardsText?.setText(`✨ FAKTA: ${this.currentQuestionIndex}/10`);
  }

  _updateBossHPUI() {
    if (!this._bossBarWidth) return;

    const targetW = (this.bossHp / this.bossMaxHp) * this._bossBarWidth;
    const percent = Math.round((this.bossHp / this.bossMaxHp) * 100);

    // Flash Bar putih saat kena hit
    if (this.bossBarContainer) {
      this.tweens.add({
        targets: this.bossBarContainer,
        alpha: 0.5,
        duration: 80,
        yoyo: true,
      });
    }

    this.tweens.add({
      targets: this.bossHpFill,
      width: targetW,
      duration: 160,
      ease: 'Quad.easeOut',
    });

    this.tweens.add({
      targets: this.bossHpGhostFill,
      width: targetW,
      duration: 500,
      delay: 200,
      ease: 'Quad.easeOut',
    });

    this.bossHpText?.setText(`${this.bossHp} / ${this.bossMaxHp} HP (${percent}%)`);

    // Perbarui judul & border jika mode Enraged (<= 50% HP)
    if (this.bossHp <= 5 || this.isBossEnraged) {
      this.bossTitleText?.setText('🔥 ENRAGED BOSS: BAYANGAN KEMURKAAN (FASE 2)');
      this.bossTitleText?.setColor('#fecdd3');
      this.bossHeaderFrame?.setStrokeStyle(2.2, 0xef4444);
      this.bossNameTagText?.setText('🔥 ENRAGED BOSS 🔥');
      this.bossNameTagText?.setColor('#fecdd3');
    } else {
      this.bossTitleText?.setText('⚔️ BOSS: BAYANGAN INTIMIDASI & KEBISUAN');
      this.bossTitleText?.setColor('#ffe4e6');
      this.bossHeaderFrame?.setStrokeStyle(2, 0xf43f5e);
      this.bossNameTagText?.setText('☠️ MINI BOSS ☠️');
      this.bossNameTagText?.setColor('#ffe4e6');
    }
  }

  _repositionUI(bounds) {
    const bgScale = bounds.height / 768;
    if (this.roadBg) {
      this.roadBg.setPosition(bounds.centerX, bounds.centerY);
      this.roadBg.setSize(bounds.width * 1.5, bounds.height);
      this.roadBg.setTileScale(bgScale, bgScale);
    }
    if (this.enrageDarknessOverlay) {
      this.enrageDarknessOverlay.setPosition(bounds.centerX, bounds.centerY);
      this.enrageDarknessOverlay.setSize(bounds.width * 2, bounds.height * 2);
    }
    if (this.floorPlatform) {
      const floorH = bounds.height - (this.groundY - bounds.top);
      this.floorPlatform.setPosition(bounds.centerX, this.groundY + floorH / 2);
      this.floorPlatform.setSize(bounds.width * 2, floorH);
      if (this.floorPlatform.body) {
        this.floorPlatform.body.updateFromGameObject();
      }
    }
    if (this.floorNeonLine) {
      this.floorNeonLine.setPosition(bounds.centerX, this.groundY);
      this.floorNeonLine.setSize(bounds.width * 1.6, 2);
    }
    if (this.shrinkBtn) {
      this.shrinkBtn.setPosition(bounds.left + 88, bounds.bottom - 46);
      this.shrinkBtnText?.setPosition(bounds.left + 88, bounds.bottom - 46);
    }
    if (this.jumpBtn) {
      this.jumpBtn.setPosition(bounds.right - 88, bounds.bottom - 46);
      this.jumpBtnText?.setPosition(bounds.right - 88, bounds.bottom - 46);
    }

    // Reposisi Dara HUD (Kiri Atas)
    const cardX = bounds.left + 16;
    const cardY = bounds.top + 16;
    const cardW = 252;
    const cardH = 78;

    this.daraHudBg?.setPosition(cardX + cardW / 2, cardY + cardH / 2);
    this.daraTagText?.setPosition(cardX + 12, cardY + 9);
    this.daraStatusText?.setPosition(cardX + cardW - 14, cardY + 9);
    this.daraNyawaLabel?.setPosition(cardX + 12, cardY + 28);
    this.heartsText?.setPosition(cardX + 62, cardY + 24);
    this.heartsCountText?.setPosition(cardX + cardW - 14, cardY + 28);

    const badgeW = 108;
    const badgeH = 20;
    const badgeY = cardY + 52;
    this.distPillBg?.setPosition(cardX + 12 + badgeW / 2, badgeY + badgeH / 2);
    this.distanceText?.setPosition(cardX + 12 + badgeW / 2, badgeY + badgeH / 2);

    const faktaX = cardX + 12 + badgeW + 8;
    const faktaW = cardW - (12 + badgeW + 8 + 12);
    this.faktaPillBg?.setPosition(faktaX + faktaW / 2, badgeY + badgeH / 2);
    this.shardsText?.setPosition(faktaX + faktaW / 2, badgeY + badgeH / 2);

    // Reposisi Boss Health Bar (Tengah Atas)
    const centerX = bounds.centerX;
    const barW = Math.min(bounds.width * 0.54, 450);
    const barY = bounds.top + 40;
    const leftX = centerX - barW / 2;

    this.bossHeaderFrame?.setPosition(centerX, barY - 17);
    this.bossHeaderFrame?.setSize(barW + 12, 28);
    this.bossTitleText?.setPosition(centerX, barY - 17);

    this.bossBarContainer?.setPosition(centerX, barY + 11);
    this.bossBarContainer?.setSize(barW + 12, 24);

    this.bossTrackBg?.setPosition(leftX, barY + 11);
    this.bossTrackBg?.setSize(barW, 20);

    this._bossBarWidth = barW;
    this._bossBarLeftX = leftX;
    this._bossBarY = barY;

    if (this.bossHpDividers) {
      for (let i = 0; i < this.bossHpDividers.length; i++) {
        const divX = leftX + (barW / 10) * (i + 1);
        this.bossHpDividers[i]?.setTo(divX, barY + 1, divX, barY + 21);
      }
    }

    const targetW = (this.bossHp / this.bossMaxHp) * barW;
    this.bossHpGhostFill?.setPosition(leftX, barY + 11);
    this.bossHpGhostFill?.setSize(targetW, 20);
    this.bossHpFill?.setPosition(leftX, barY + 11);
    this.bossHpFill?.setSize(targetW, 20);

    this.bossGlossHighlight?.setPosition(leftX, barY + 5);
    this.bossGlossHighlight?.setSize(barW, 8);

    this.bossHpText?.setPosition(centerX, barY + 11);

    if (this.bossSprite) {
      this.bossBaseX = bounds.right - 180;
      this.bossBaseY = bounds.top + 185;
      this.bossSprite.setPosition(this.bossBaseX, this.bossBaseY);
      if (this.bossFloorShadow) {
        this.bossFloorShadow.setPosition(this.bossBaseX, this.groundY - 6);
      }
      if (this.bossAuraLayers) {
        this.bossAuraLayers.forEach((layer) => layer?.setPosition(this.bossBaseX, this.bossBaseY));
      }
      if (this.bossNameTag) {
        this.bossNameTag.setPosition(this.bossBaseX, this.bossBaseY - 146);
      }
    }
  }
}
