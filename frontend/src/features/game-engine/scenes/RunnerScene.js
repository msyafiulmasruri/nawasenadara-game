import Phaser from 'phaser';
import AudioManager from '../audio/AudioManager';
import { getVisibleBounds, syncGameSizeToOrientation } from '../utils/visibleBounds';

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
 * - Modal Kuis Interaktif: 10 soal edukasi batasan diri & perlindungan siber.
 * - Boss Bayangan Intimidasi (10 HP):
 *     - Jawaban benar: Proyektil asertif Dara melukai boss (-1 HP).
 *     - Jawaban salah / tabrak rintangan: Hati Dara berkurang (-1 Hati).
 * - Checkpoint: Pos Satpam (3.000m) & Ruang BK (7.200m) memulihkan nyawa penuh.
 */

const QUESTIONS_DATA = [
  {
    id: 1,
    topic: 'Privasi Digital',
    question: 'Seseorang di grup chat membagikan foto pribadi temanmu tanpa izin untuk bahan lelucon. Tindakan paling tepat adalah...',
    options: [
      { text: 'A. Ikut tertawa agar tidak dianggap baperan atau kaku.', isCorrect: false },
      { text: 'B. Tidak menyebarkannya, ingatkan bahwa itu pelanggaran privasi, dan dampingi melapor.', isCorrect: true },
      { text: 'C. Menyimpan fotonya diam-diam di galeri ponsel.', isCorrect: false },
    ],
    explanation: 'Foto pribadi adalah hak privasi mutlak. Jangan ikut menyebarkan dan jadilah pendukung yang aman.',
  },
  {
    id: 2,
    topic: 'Batasan Fisik (Boundaries)',
    question: 'Senior di sekolah merangkul pundakmu dengan cara yang membuatmu risih dan tidak nyaman. Reaksi terbaikmu adalah...',
    options: [
      { text: 'A. Membiarkannya karena menganggap itu wajar sesama warga sekolah.', isCorrect: false },
      { text: 'B. Menghindar dengan tenang dan berkata tegas: "Maaf, tolong jangan sentuh, aku tidak nyaman."', isCorrect: true },
      { text: 'C. Tersenyum terpaksa karena takut senior merasa tersinggung.', isCorrect: false },
    ],
    explanation: 'Tubuhmu adalah otoritasmu. Kamu berhak menetapkan batasan fisik dengan suara tenang dan asertif.',
  },
  {
    id: 3,
    topic: 'Manipulasi Consent',
    question: 'Temanmu mendesak meminta password media sosialmu dengan dalih "kalau percaya harus saling terbuka". Sebaiknya...',
    options: [
      { text: 'A. Menolak tegas karena password adalah hak privasi dan kunci keamanan pribadi.', isCorrect: true },
      { text: 'B. Memberikannya asalkan dia berjanji tidak membaca isi pesan pribadi.', isCorrect: false },
      { text: 'C. Memberikan password akun cadangan saja.', isCorrect: false },
    ],
    explanation: 'Kepercayaan tidak diukur dari penyerahan privasi. Menolak membagikan password adalah tanda kewaspadaan sehat.',
  },
  {
    id: 4,
    topic: 'Pelecehan Verbal',
    question: 'Saat berjalan di koridor sekolah, sekelompok siswa bersiul dan melontarkan komentar sensual tentang tubuhmu. Ini adalah...',
    options: [
      { text: 'A. Pujian spontan yang patut disyukuri.', isCorrect: false },
      { text: 'B. Candaan wajar anak remaja laki-laki.', isCorrect: false },
      { text: 'C. Pelecehan verbal (catcalling) yang melanggar rasa aman di ruang publik.', isCorrect: true },
    ],
    explanation: 'Komentar bernada seksual tanpa persetujuan adalah bentuk pelecehan verbal (catcalling), bukan sekadar candaan.',
  },
  {
    id: 5,
    topic: 'Gaslighting',
    question: 'Saat kamu menegur pelaku pelecehan verbal, dia membalas: "Gitu aja tersinggung, baperan amat!". Taktik ini disebut...',
    options: [
      { text: 'A. Gaslighting (memanipulasi agar korban meragukan perasaannya sendiri).', isCorrect: true },
      { text: 'B. Komunikasi terbuka dan jujur.', isCorrect: false },
      { text: 'C. Bentuk humor yang membangun mental.', isCorrect: false },
    ],
    explanation: 'Pelaku sering memakai label "baperan" untuk mengalihkan rasa bersalah dan membatalkan perasaan tidak nyamanmu.',
  },
  {
    id: 6,
    topic: 'Bukti Digital',
    question: 'Jika kamu menerima pesan chat intimidasi atau pelecehan via direct message, langkah pertama yang krusial adalah...',
    options: [
      { text: 'A. Langsung menghapus chat dan mematikan ponsel.', isCorrect: false },
      { text: 'B. Ambil tangkapan layar (screenshot) lengkap dengan waktu & akun pelaku sebagai bukti otentik.', isCorrect: true },
      { text: 'C. Membalas dengan kata-kata kasar yang sama.', isCorrect: false },
    ],
    explanation: 'Tangkapan layar otentik adalah bukti terkuat sebelum pelaku menghapus pesan atau akunnya.',
  },
  {
    id: 7,
    topic: 'Layanan Bantuan',
    question: 'Siapakah pihak resmi di sekolah yang memegang kode etik kerahasiaan untuk konseling dan pendampingan siswa?',
    options: [
      { text: 'A. Guru Bimbingan dan Konseling (BK) / Tim Pencegahan Kekerasan (TPPK).', isCorrect: true },
      { text: 'B. Akun anonim menfess media sosial sekolah.', isCorrect: false },
      { text: 'C. Grup gosip obrolan kelas.', isCorrect: false },
    ],
    explanation: 'Guru BK dan Satgas TPPK memiliki kewajiban menjaga kerahasiaan serta mendampingi pemulihan siswa.',
  },
  {
    id: 8,
    topic: 'Pelecehan Non-Fisik',
    question: 'Seseorang sengaja memperlihatkan gestur tidak senonoh atau gambar porno kepadamu secara mendadak di kelas. Ini termasuk...',
    options: [
      { text: 'A. Keisengan biasa tanpa konsekuensi etis.', isCorrect: false },
      { text: 'B. Pelecehan seksual non-fisik / visual yang melanggar aturan.', isCorrect: true },
      { text: 'C. Lelucon seni grafis bebas.', isCorrect: false },
    ],
    explanation: 'Memperlihatkan materi pornografi tanpa persetujuan adalah pelanggaran berat dalam perlindungan anak dan siswa.',
  },
  {
    id: 9,
    topic: 'Solidaritas Teman',
    question: 'Kamu melihat seorang temanmu sedang dipojokkan dan digoda secara tidak pantas oleh orang lain. Tindakan terbaikmu adalah...',
    options: [
      { text: 'A. Diam saja pura-pura tidak melihat agar tidak jadi sasaran berikutnya.', isCorrect: false },
      { text: 'B. Merekam diam-diam lalu mempostingnya ke media sosial demi konten.', isCorrect: false },
      { text: 'C. Mendekat, alihkan perhatian situasi (bystander aktif), lalu dampingi temanmu melapor.', isCorrect: true },
    ],
    explanation: 'Intervensi pengalihan dari teman sebaya adalah salah satu cara paling efektif untuk memutus rantai intimidasi.',
  },
  {
    id: 10,
    topic: 'Hak Korban',
    question: 'Jika kamu atau siapa pun mengalami pelecehan, prinsip utama yang harus selalu dipegang teguh adalah...',
    options: [
      { text: 'A. Pakaian atau caramu berbicara adalah penyebab utama kejadian tersebut.', isCorrect: false },
      { text: 'B. Kejadian itu BUKAN kesalahanmu; tanggung jawab penuh selalu berada pada pelaku.', isCorrect: true },
      { text: 'C. Sebaiknya bungkam selamanya demi menjaga nama baik lingkungan.', isCorrect: false },
    ],
    explanation: 'Korban tidak pernah bersalah atas tindakan pelecehan yang dilakukan orang lain. Kamu berhak didengar dan dilindungi.',
  },
];

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
    this.currentQuestionIndex = 0;
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
    });
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

        if (shard.glow) shard.glow.setPosition(shard.x, shard.y);
        if (shard.label) shard.label.setPosition(shard.x, shard.y - 32);

        if (shard.x < bounds.left - 120) {
          if (shard.glow) shard.glow.destroy();
          if (shard.label) shard.label.destroy();
          shard.destroy();
        }
      });
    }

    // Cek Spawn Butir Kebenaran
    if (this.distance >= this.nextShardDistance && this.currentQuestionIndex < QUESTIONS_DATA.length) {
      this._spawnTruthShard();
      this.nextShardDistance += this.shardInterval;
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
    this.audioManager?.playMessageReceived(true);

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
    const bubbleX = bx - 150;
    const bubbleY = by + 32;

    const container = this.add.container(bubbleX, bubbleY).setDepth(25).setScrollFactor(0);

    const paddingX = 14;

    // Header Tag Intimidasi
    const tagObj = this.add.text(0, -18, '☠ BISIKAN INTIMIDASI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      fontStyle: '700',
      color: '#fb7185',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    // Teks Intimidasi Utama
    const textObj = this.add.text(0, 4, `"${text}"`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#fff1f2',
      align: 'center',
      wordWrap: { width: 230 },
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const boxW = Math.max(180, Math.max(textObj.width, tagObj.width) + paddingX * 2);
    const boxH = Math.max(48, textObj.height + 32);

    tagObj.y = -boxH / 2 + 10;
    textObj.y = 5;

    // Ekor balon dialog mengarah ke boss di kanan atas
    const tail = this.add.triangle(boxW / 2 - 10, -boxH / 2 + 8, 0, 0, 14, -10, 16, 8, 0x14020f, 0.98)
      .setStrokeStyle(1.8, 0xf43f5e);

    // Box gelap obsidian dengan border crimson menyala
    const bg = this.add.rectangle(0, 0, boxW, boxH, 0x11020d, 0.96)
      .setStrokeStyle(1.8, 0xe11d48);

    // Aura pendaran tipis ungu/crimson
    const glow = this.add.rectangle(0, 0, boxW + 4, boxH + 4, 0x9333ea, 0.28)
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

  _triggerBossRoar(isAttack = false) {
    if (!this.bossSprite || !this.bossSprite.active) return;
    if (this.bossState !== 'IDLE' && !isAttack) return;

    this.bossState = isAttack ? 'ATTACKING' : 'ROARING';
    const attackTex = this.textures.exists('boss-shadow-attack') ? 'boss-shadow-attack' : 'boss-shadow';
    this.bossSprite.setTexture(attackTex);
    this.audioManager?.playBossRoar();

    // Kamera bergetar saat boss meraung
    this.cameras.main.shake(isAttack ? 250 : 160, isAttack ? 0.009 : 0.005);

    // Animasi menerjang ke depan & membesar
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX - (isAttack ? 45 : 25),
      scaleX: this.bossBaseScale * (isAttack ? 1.2 : 1.12),
      scaleY: this.bossBaseScale * (isAttack ? 1.2 : 1.12),
      duration: isAttack ? 350 : 450,
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

    // Hawa miasma gelap bergejolak dahsyat
    if (this.bossAuraDisc) {
      this.tweens.add({
        targets: [this.bossAuraDisc],
        scaleX: 1.45,
        scaleY: 1.45,
        alpha: 0.85,
        duration: 300,
        yoyo: true,
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
      this.audioManager?.playJump();

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
    this.audioManager?.playTypewriterBlip();
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

    const spike = this.physics.add.sprite(x, y, 'runner-spikes');
    spike.setOrigin(0.5, 1);
    spike.setDisplaySize(72, 72);
    spike.setDepth(8);

    this.obstaclesGroup.add(spike);
    spike.body.allowGravity = false;
    spike.body.setImmovable(true);
    spike.body.setVelocityX(-this.runSpeed);
    spike.body.setSize(48, 55);
    spike.body.setOffset(12, 17);

    // Aura pendaran ungu
    const glow = this.add.sprite(x, y, 'runner-spikes')
      .setDisplaySize(72, 72)
      .setOrigin(0.5, 1)
      .setDepth(7)
      .setBlendMode(Phaser.BlendModes.ADD)
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
    shard.body.setVelocityX(-this.runSpeed);
    shard.body.setSize(44, 44);

    // Kristal Butir Kebenaran Emas Bersinar
    const glow = this.add.circle(spawnX, spawnY, 28, 0xfacc15, 0.45)
      .setDepth(8).setBlendMode(Phaser.BlendModes.ADD);

    const label = this.add.text(spawnX, spawnY - 32, '✦ BUTIR FAKTA ✦', {
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

    this.audioManager?.playPlayerHurt();
    this.cameras.main.shake(220, 0.014);

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

  _triggerQuizModal() {
    this.gameState = 'QUIZ';
    this.audioManager?.playOrbCollect();

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

    const q = QUESTIONS_DATA[this.currentQuestionIndex];
    const bounds = getVisibleBounds(this);

    this.quizModalContainer = this.add.container(bounds.centerX, bounds.centerY).setDepth(45).setScrollFactor(0);

    // Kartu Glassmorphism Kuis Cyber-Noir
    const modalW = Math.min(bounds.width * 0.88, 620);
    const modalH = 380;
    const modalGlow = this.add.rectangle(0, 0, modalW + 4, modalH + 4, 0x0284c7, 0.22)
      .setDepth(-1).setBlendMode(Phaser.BlendModes.ADD);
    const modalBg = this.add.rectangle(0, 0, modalW, modalH, 0x07111a, 0.96)
      .setStrokeStyle(1.5, 0x06b6d4);
    this.quizModalContainer.add([modalGlow, modalBg]);

    // Badge Topik
    const badgeText = this.add.text(0, -152, `✦ BUTIR KEBENARAN ${this.currentQuestionIndex + 1} / 10 • ${q.topic.toUpperCase()} ✦`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '11px',
      fontStyle: '700',
      color: '#67e8f9',
      backgroundColor: '#0c2338',
      padding: { x: 12, y: 5 },
    }).setOrigin(0.5);
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
    if (!this.quizModalContainer) return;

    this.quizModalContainer.iterate((child) => child.disableInteractive?.());

    if (selectedOption.isCorrect) {
      // JAWABAN BENAR
      btnBg.setFillStyle(0x065f46, 1).setStrokeStyle(2, 0x10b981);
      this.audioManager?.playOrbCollect();

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
      this.audioManager?.playPlayerHurt();

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
    this.player.play('attack');

    // Tembakan proyektil energi asertif Dara ke Boss
    const blastKey = this.textures.exists('courage-blast') ? 'courage-blast' : 'player-idle';
    const blast = this.add.sprite(this.player.x + 30, this.player.y - 45, blastKey)
      .setDisplaySize(110, 60).setDepth(15).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: blast,
      x: this.bossSprite.x,
      y: this.bossSprite.y,
      duration: 320,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        blast.destroy();
        this._damageBoss();
        this._resumeRunner();
      },
    });
  }

  _damageBoss() {
    this.bossHp = Math.max(0, this.bossHp - 1);
    this.currentQuestionIndex++;
    this._updateShardsHUD();

    this.bossState = 'HURT';
    const hurtTex = this.textures.exists('boss-shadow-hurt') ? 'boss-shadow-hurt' : 'boss-shadow';
    this.bossSprite.setTexture(hurtTex);
    this.audioManager?.playBossRoar();
    this.cameras.main.shake(180, 0.012);

    this.bossSprite.setTint(0xffffff);

    // Animasi terpental ke belakang karena terkena peluru asertif Dara
    this.tweens.add({
      targets: this.bossSprite,
      x: this.bossBaseX + 30,
      y: this.bossBaseY - 15,
      duration: 130,
      yoyo: true,
      onComplete: () => {
        if (this.bossSprite && this.bossSprite.active) {
          this.bossSprite.clearTint();
          this.bossSprite.setTexture('boss-shadow');
          this.bossSprite.x = this.bossBaseX;
          this.bossState = 'IDLE';
        }
      },
    });

    // Distorsi hawa miasma saat boss terkena serangan
    if (this.bossAuraDisc) {
      this.tweens.add({
        targets: [this.bossAuraDisc],
        scaleX: 1.45,
        scaleY: 1.45,
        alpha: 0.9,
        duration: 140,
        yoyo: true,
      });
    }

    this._updateBossHPUI();

    if (this.bossHp <= 0) {
      this._handleVictory();
    }
  }

  _executeBossCounterAttack() {
    this.currentQuestionIndex++;
    this._updateShardsHUD();

    // Trigger visual serangan & raungan penuh boss
    this._triggerBossRoar(true);

    const wave = this.add.circle(this.bossSprite.x, this.bossSprite.y, 28, 0x9333ea, 0.8)
      .setDepth(15).setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: wave,
      x: this.player.x,
      y: this.player.y - 35,
      scale: 3.2,
      duration: 380,
      ease: 'Quad.easeIn',
      onComplete: () => {
        wave.destroy();
        this._handlePlayerHurt();
        this._resumeRunner();
      },
    });
  }

  _resumeRunner() {
    this.gameState = 'PLAYING';
    this.player.play('run');

    this.obstaclesGroup.setVelocityX(-this.runSpeed);
    this.shardsGroup.setVelocityX(-this.runSpeed);
  }

  // ==============================================================
  // F. CHECKPOINT SISTEM (ZONA AMAN)
  // ==============================================================

  _reachCheckpoint(checkpoint) {
    this.currentCheckpointDistance = checkpoint.distance;
    this.playerCourage = this.maxCourage;
    this._updateHeartsUI();

    this.audioManager?.playOrbCollect();
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

    const btn = this.add.rectangle(bounds.centerX, bounds.centerY + 45, 230, 42, 0x0c1626, 0.95)
      .setStrokeStyle(1.5, 0x38bdf8).setDepth(51).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(bounds.centerX, bounds.centerY + 45, 'RESPAWN CHECKPOINT', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#38bdf8',
    }).setOrigin(0.5).setDepth(52);

    btn.on('pointerdown', () => {
      modal.destroy();
      title.destroy();
      msg.destroy();
      btn.destroy();
      btnText.destroy();

      this.distance = this.currentCheckpointDistance;
      this.playerCourage = this.maxCourage;
      this._updateHeartsUI();

      this.obstaclesGroup.getChildren().forEach((obs) => this._destroyObstacleVisuals(obs));
      this.obstaclesGroup.clear(true, true);
      this._resumeRunner();
    });
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

    const modal = this.add.rectangle(bounds.centerX, bounds.centerY, Math.min(bounds.width * 0.84, 520), 240, 0x07111a, 0.96)
      .setStrokeStyle(1.5, 0x10b981).setDepth(50).setScrollFactor(0);

    const title = this.add.text(bounds.centerX, bounds.centerY - 60, '🏆 KEMENANGAN ASERTIF! 🏆', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '16px',
      fontStyle: '700',
      color: '#34d399',
    }).setOrigin(0.5).setDepth(51);

    const msg = this.add.text(bounds.centerX, bounds.centerY - 10, `Luar biasa! Dara berhasil menembus 10 intimidasi dengan batasan yang kokoh!\nTotal Jarak: ${this.distance} Meter`, {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      color: '#f8fafc',
      align: 'center',
      lineSpacing: 5,
    }).setOrigin(0.5).setDepth(51);

    const btn = this.add.rectangle(bounds.centerX, bounds.centerY + 55, 200, 42, 0x064e3b, 1)
      .setStrokeStyle(1.5, 0x10b981).setDepth(51).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(bounds.centerX, bounds.centerY + 55, 'MAIN LAGI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '12px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(52);

    btn.on('pointerdown', () => {
      this.scene.restart();
    });
  }

  // ==============================================================
  // H. HUD GAMING-GRADE
  // ==============================================================

  _createRunnerHUD(bounds) {
    // 1. HUD Dara (Kiri Atas) - Cyberpunk Glass Card
    const cardX = bounds.left + 16;
    const cardY = bounds.top + 16;

    // Glass panel with glowing cyan stroke & corner chamfer
    this.add.rectangle(cardX + 95, cardY + 30, 190, 60, 0x07111a, 0.88)
      .setStrokeStyle(1.5, 0x06b6d4).setDepth(30).setScrollFactor(0);

    // Subtle cyan corner tag
    this.add.text(cardX + 16, cardY + 8, 'DARA // KETEGASAN DIRI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '9px',
      fontStyle: '700',
      color: '#67e8f9',
    }).setDepth(31).setScrollFactor(0);

    // Courage Crystals (◆  ◆  ◆)
    this.heartsText = this.add.text(cardX + 16, cardY + 22, '◆  ◆  ◆', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '17px',
      fontStyle: '700',
      color: '#34d399',
      stroke: '#064e3b',
      strokeThickness: 3,
    }).setDepth(31).setScrollFactor(0);

    // Distance in Cyber Mint & Facts in Cyber Gold
    this.distanceText = this.add.text(cardX + 16, cardY + 44, '🏃 0 m', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#a7f3d0',
    }).setDepth(31).setScrollFactor(0);

    this.shardsText = this.add.text(cardX + 92, cardY + 44, '✦ FAKTA: 0/10', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fde047',
    }).setDepth(31).setScrollFactor(0);

    // 2. HUD Boss Health Bar (Tengah Atas) - Dark Carbon Armor Housing
    const centerX = bounds.centerX;
    const barW = Math.min(bounds.width * 0.44, 380);
    const barY = bounds.top + 24;

    // Header Frame Boss
    this.add.rectangle(centerX, barY - 12, barW + 8, 20, 0x0a010d, 0.95)
      .setStrokeStyle(1.5, 0xbe123c).setDepth(30).setScrollFactor(0);

    this.add.text(centerX, barY - 12, '☠ BAYANGAN INTIMIDASI', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#fda4af',
      align: 'center',
    }).setOrigin(0.5, 0.5).setDepth(31).setScrollFactor(0);

    // Track Bar HP Boss
    this.add.rectangle(centerX, barY + 6, barW, 14, 0x09010e, 0.98)
      .setStrokeStyle(1.5, 0x881337).setDepth(30).setScrollFactor(0);

    const leftX = centerX - barW / 2;
    this.bossHpGhostFill = this.add.rectangle(leftX, barY + 6, barW, 14, 0xf59e0b, 0.85)
      .setOrigin(0, 0.5).setDepth(31).setScrollFactor(0);

    this.bossHpFill = this.add.rectangle(leftX, barY + 6, barW, 14, 0xe11d48, 1)
      .setOrigin(0, 0.5).setDepth(32).setScrollFactor(0);

    this.bossHpText = this.add.text(centerX, barY + 6, '10 / 10 HP', {
      fontFamily: '"Pixelify Sans", monospace',
      fontSize: '10px',
      fontStyle: '700',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(33).setScrollFactor(0);

    this._bossBarWidth = barW;
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
      hearts.push(i < this.playerCourage ? '◆' : '◇');
    }
    this.heartsText?.setText(hearts.join('  '));
  }

  _updateShardsHUD() {
    this.shardsText?.setText(`✦ FAKTA: ${this.currentQuestionIndex}/10`);
  }

  _updateBossHPUI() {
    if (!this._bossBarWidth) return;

    const targetW = (this.bossHp / this.bossMaxHp) * this._bossBarWidth;

    this.tweens.add({
      targets: this.bossHpFill,
      width: targetW,
      duration: 160,
    });

    this.tweens.add({
      targets: this.bossHpGhostFill,
      width: targetW,
      duration: 500,
      delay: 250,
    });

    this.bossHpText?.setText(`${this.bossHp} / ${this.bossMaxHp} HP`);
  }

  _repositionUI(bounds) {
    const bgScale = bounds.height / 768;
    if (this.roadBg) {
      this.roadBg.setPosition(bounds.centerX, bounds.centerY);
      this.roadBg.setSize(bounds.width * 1.5, bounds.height);
      this.roadBg.setTileScale(bgScale, bgScale);
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
    }
  }
}
