import Phaser from 'phaser';
import {
  WORLD_WIDTH,
  WORLD_HEIGHT,
  LEVEL_WIDTH,
  LEVEL_EDGE_MARGIN,
  PLAYER_DISPLAY_HEIGHT,
} from '../config/gameConfig';
import { completeEpisode, getCompletedEpisodes, markEpisodeInProgress } from '../utils/progressStore';
import { getSettings, setMuted } from '../utils/settingsStore';
import {
  getVisibleBounds,
  pxToWorld,
  isPortrait,
  syncGameSizeToOrientation,
} from '../utils/visibleBounds';
import AudioManager from '../audio/AudioManager';
import { stopMenuBGM } from '../audio/menuAudio';
import { getCharacterName } from '../utils/characterName';
import { getMood, onMoodChange } from '../utils/moodStore';

const WALK_SPEED = 150;
const RUN_SPEED = 260;
const JUMP_HEIGHT = 90;
const JUMP_DURATION = 480;

// Scene dasar berisi seluruh logic gerakan karakter (walk/run/jump,
// keyboard + touch control) yang dipakai bersama oleh Episode1Scene dan
// PlaceholderEpisodeScene, supaya tidak ada kode gerakan yang
// dobel-tulis di banyak file. Episode/scene turunan cukup meng-override
// `createBackground()` untuk menentukan tampilan latar masing-masing,
// dan boleh menambah logic sendiri di `onSceneUpdate()` (dipanggil tiap
// frame dari update() bawaan kelas ini).
export default class BasePlayerScene extends Phaser.Scene {
  // Default untuk scene yang TIDAK mendefinisikan init() sendiri
  // (Episode1Scene). PlaceholderEpisodeScene punya init() sendiri yang
  // menimpa ini sepenuhnya (tetap menghasilkan this.episodeId juga).
  init(data) {
    this.episodeId = data?.episodeId ?? this.episodeId ?? 1;
  }

  create(data) {
    const height = WORLD_HEIGHT;

    // Tandai episode ini 'in_progress' di server begitu scene-nya
    // dimuat (bukan menunggu sampai selesai) — supaya dashboard guru BK
    // bisa membedakan "belum pernah dicoba" vs "sedang dijalani".
    // Fire-and-forget, tidak pernah memblokir gameplay.
    if (this.episodeId) {
      markEpisodeInProgress(this.episodeId);
    }

    this.groundY = height - 120;

    // FIX: Phaser TIDAK membuat instance Scene baru tiap scene.start()
    // dipanggil ulang (mis. pemain mengulang dari Episode 1 lewat
    // "mulai permainan baru") — instance lama DIPAKAI ULANG, cuma
    // create() dijalankan lagi. Semua GameObject yang dibuat run
    // sebelumnya (this._chatBtn, dst.) sudah di-destroy otomatis oleh
    // Phaser saat scene shutdown, TAPI referensi JS-nya di `this` tidak
    // ikut ter-reset ke null. Akibatnya properti seperti `this._chatBtn`
    // masih "truthy" (menunjuk ke objek yang sudah mati), jadi guard
    // `if (!this._chatBtn) return` di setChatButtonVisible() gagal
    // mendeteksinya — lalu crash ("Cannot read properties of undefined
    // (reading 'sys')") begitu ada kode yang memanggil method di objek
    // mati itu (mis. disableInteractive()), yang bisa terjadi SANGAT
    // AWAL di createBackground() → _createNpc() → setChatButtonVisible()
    // — jauh sebelum createChatButton() sempat membuat ulang objeknya.
    // Fix: reset eksplisit ke null di awal create(), SEBELUM
    // createBackground() dipanggil.
    this._chatBtn = null;
    this._chatBtnGlow = null;
    this._chatBtnText = null;
    this._chatButtonVisible = undefined;

    // FIX: diinisialisasi DI SINI (sebelum createBackground() di bawah
    // dipanggil), bukan belakangan dekat createTouchControls() —
    // createBackground() Episode1Scene memanggil _createNpc() yang
    // butuh registerLockable() sudah siap dipakai untuk mendaftarkan
    // sprite & prompt NPC-nya (supaya keduanya ikut terkunci saat
    // overlay React terbuka). Kalau diinisialisasi belakangan, array
    // ini akan me-reset (menghapus) entri NPC yang sudah didaftarkan
    // lebih dulu.
    this._lockableInteractives = [];
    this._buttonsLocked = false;

    // Orientasi ditentukan SEKALI di awal scene ini dibuat (bukan tiap
    // frame), lalu dipakai untuk memutuskan mode background & scrolling:
    // - Portrait -> level lebar (LEVEL_WIDTH), background tile berulang,
    //   kamera mengikuti karakter (side-scroll).
    // - Landscape -> level = satu layar, background statis penuh satu
    //   gambar (tanpa diulang), kamera diam di tempat.
    // Kalau device diputar di tengah permainan (orientasi kategori
    // berubah), scene ini di-restart otomatis supaya seluruh bounds,
    // background, dan posisi kamera dibangun ulang dengan benar —
    // lebih aman & sederhana daripada mencoba re-hitung semuanya secara
    // live sambil tetap berjalan.
    this._isPortraitMode = isPortrait(this);

    // --- Fix crop atas/bawah di landscape ---
    // Lihat dokumentasi lengkap di syncGameSizeToOrientation()
    // (utils/visibleBounds.js) — intinya: di landscape, lebar dunia
    // game dihitung ulang supaya PERSIS menyamai rasio aspek layar saat
    // ini (tinggi tetap WORLD_HEIGHT=720, jadi posisi vertikal karakter
    // groundY di bawah TIDAK terpengaruh sama sekali), sehingga ENVELOP
    // tidak perlu meng-crop sisi manapun. Portrait dikembalikan ke
    // ukuran referensi baku 1280x720 (crop kiri-kanan di sana memang
    // disengaja untuk level yang di-pan kamera, lihat
    // _updatePortraitCamera() di bawah).
    const { width } = syncGameSizeToOrientation(this);

    // Dipakai oleh _onResize untuk mendeteksi perubahan rasio aspek
    // landscape yang TIDAK mengubah kategori orientasi (masih sama-sama
    // landscape) — misalnya saat masuk/keluar fullscreen. Address bar
    // browser hilang saat fullscreen mengubah tinggi viewport tanpa
    // mengubah orientasi, jadi rasio aspek bergeser padahal kategori
    // "landscape" tetap sama. Tanpa deteksi ini, dunia game tetap
    // memakai rasio LAMA (dari sebelum fullscreen) sehingga crop
    // atas/bawah/kiri/kanan muncul lagi persis seperti sebelum di-fix.
    this._lastAspect =
      this.scale.parentSize.width / this.scale.parentSize.height;

    this.levelWidth = this._isPortraitMode ? LEVEL_WIDTH : width;

    // Latar belakang: ditentukan oleh scene turunan (Episode1Scene pakai
    // gambar asli, PlaceholderEpisodeScene pakai warna polos + label).
    //
    // PENTING (portrait): scene turunan BOLEH menimpa this.levelWidth di
    // dalam createBackground() kalau punya art asli — lihat catatan
    // panjang di Episode1Scene.createBackground() soal kenapa lebar
    // level portrait untuk Episode1 dihitung dari lebar ASLI gambar
    // (non-distorsi), bukan konstanta LEVEL_WIDTH sembarang. Makanya
    // createBackground() dipanggil DULU di sini, SEBELUM physics/camera
    // bounds di bawah dibuat — supaya bounds itu memakai this.levelWidth
    // yang sudah final (baik dari override scene turunan, atau default
    // LEVEL_WIDTH kalau tidak ada art asli, mis. PlaceholderEpisodeScene).
    // Tinggi tampil pemain HARUS sudah tersedia SEBELUM createBackground()
    // dipanggil, karena Episode1Scene._createNpc() (dipanggil dari dalam
    // createBackground()) perlu mencocokkan tinggi NPC ke tinggi ini —
    // this.player sendiri belum ada di titik ini (baru dibuat di bawah),
    // makanya nilainya dipisah jadi this.playerDisplayHeight, bukan
    // dibaca dari this.player.displayHeight yang masih undefined.
    this.playerDisplayHeight = PLAYER_DISPLAY_HEIGHT;

    // HUD profil (avatar + nama + progress bar mood + slot quest guide)
    // dibuat SEBELUM createBackground() — Episode1Scene._createNpc()
    // (dipanggil dari DALAM createBackground()) langsung memanggil
    // this.setQuestGuide()/this.updateQuestGuide() untuk menampilkan
    // penanda quest di bawah HUD ini sejak awal episode, jadi slot teks
    // quest guide-nya (this._questGuideText) harus sudah ada duluan.
    this.createProfileHud(width, height);

    this.createBackground(width, height);

    // Dunia fisika dibuat selebar level (karakter tidak bisa jalan
    // keluar dari 0..levelWidth).
    this.physics.world.setBounds(0, 0, this.levelWidth, height);

    // Spawn TIDAK di x=0 — pakai margin aman yang sama dengan titik
    // "selesai episode" di ujung satunya, supaya karakter dari awal
    // muncul sudah berada di area yang pasti terlihat, bukan mepet ke
    // tepi persis.
    //
    // Kalau ada data.preservePlayer (dikirim oleh scene.restart() saat
    // device diputar), pakai posisi X itu supaya karakter tidak
    // "meloncat" balik ke titik spawn tiap kali orientasi berubah.
    // Diclamp ke batas level yang BARU, karena lebar level portrait
    // (LEVEL_WIDTH, side-scroll) dan landscape (WORLD_WIDTH, satu
    // layar) berbeda — kalau karakter sedang jauh di tengah level lebar
    // portrait lalu diputar ke landscape (level jadi satu layar penuh),
    // posisi X-nya perlu disesuaikan supaya tetap berada di dalam level
    // baru yang lebih sempit, bukan malah keluar batas dunia.
    const preserved = data?.preservePlayer;
    const maxSpawnX = this.levelWidth - LEVEL_EDGE_MARGIN;
    const spawnX =
      preserved != null
        ? Phaser.Math.Clamp(preserved.x, LEVEL_EDGE_MARGIN, maxSpawnX)
        : LEVEL_EDGE_MARGIN;

    this.player = this.physics.add.sprite(spawnX, this.groundY, 'player-idle');
    this.player.setOrigin(0.5, 1);
    this.player.setDepth(1);
    this.player.setCollideWorldBounds(true);
    if (preserved?.facingLeft) {
      this.player.setFlipX(true);
    }

    // --- Kamera portrait: PAN MANUAL, bukan Camera.startFollow() ---
    // startFollow() bawaan Phaser meng-clamp scroll berdasarkan lebar
    // VIEWPORT KAMERA PENUH (WORLD_WIDTH/lebar dunia, 1280), bukan
    // lebar area yang BENAR-BENAR terlihat di layar setelah di-crop
    // ENVELOP (visBounds.width, jauh lebih sempit di portrait). Kalau
    // dipaksa pakai startFollow, kamera butuh "ruang gerak" ekstra
    // (dulu coba diatasi dengan _cameraPad, lalu meregangkan/tile
    // background) — TAPI solusi itu semua berujung merusak/mendistorsi
    // gambar asli.
    //
    // Solusi yang benar: background TETAP natural, tidak direntangkan/
    // di-tile sama sekali (lihat this.levelWidth override di
    // Episode1Scene). Kamera di-scroll MANUAL tiap frame di update(),
    // Kamera pan (_updatePortraitCamera, lihat method di bawah) sekarang
    // dipakai UNIVERSAL untuk semua orientasi, bukan cuma portrait —
    // kalau this.levelWidth <= lebar area yang terlihat (kasus umum di
    // landscape ketika background natural lebih sempit/sama dengan
    // layar), rumus clamp di dalamnya otomatis membuat minScroll ==
    // maxScroll == 0, sehingga kamera diam sendiri tanpa perlu kode
    // khusus di sini. Kalau levelWidth lebih lebar dari layar (baik
    // karena artwork memang lebar, atau karena ekstensi tile kecil di
    // sisa kanan — lihat Episode1Scene.createBackground), kamera akan
    // otomatis mulai mem-pan begitu karakter mendekati tepi yang
    // terlihat, persis skema yang tadinya cuma berlaku di portrait.
    this.cameras.main.scrollX = 0;

    this.spriteScale = this.playerDisplayHeight / 400;
    this.player.setScale(this.spriteScale);


    // Catatan: animasi walk/run/jump TIDAK dibuat di sini lagi. Kalau
    // dulu dibuat ulang tiap scene episode create(), Phaser cuma
    // menerima pembuatan pertama karena this.anims itu global satu
    // instance game — perubahan frameRate jadi terasa "tidak
    // berpengaruh". Sekarang animasinya dibuat SEKALI di
    // BootScene.create() lewat config/playerAnimations.js — kalau mau
    // ubah kecepatan animasi, edit frameRate di file itu.

    // --- Audio Manager (procedural, tanpa file eksternal) ---
    // init() harus dipanggil dari konteks yang dipicu user interaction
    // (klik/tap Start Story sebelumnya), supaya AudioContext tidak kena
    // blokir kebijakan autoplay browser.
    // Hentikan musik tema menu (kalau masih jalan dari Title/Menu/
    // Settings) SEBELUM mulai BGM gameplay episode ini — supaya
    // keduanya tidak pernah bertumpuk/terdengar bersamaan. Musik menu
    // akan otomatis menyala lagi begitu pemain kembali ke MenuScene.
    stopMenuBGM();

    this.audioManager = new AudioManager();
    this.audioManager.init();

    // Terapkan preferensi volume SFX/BGM yang diatur pemain lewat
    // SettingsScene (tersimpan di localStorage — lihat
    // utils/settingsStore.js). Kalau pemain belum pernah membuka
    // Settings, ini otomatis jatuh ke nilai default AudioManager.
    const savedSettings = getSettings();
    this.audioManager.setSFXVolume(savedSettings.sfxVolume);
    this.audioManager.setBGMVolume(savedSettings.bgmVolume);

    // Mulai BGM scene — subclass bisa meng-override _startSceneBGM()
    // untuk memainkan tema berbeda (misalnya Episode3Scene menggunakan
    // tema suspense, bukan lo-fi chill default).
    this._startSceneBGM();
    this.isMuted = data?.preserveMuted ?? savedSettings.muted;
    if (this.isMuted) {
      this.audioManager.setMasterVolume(0);
    }

    // Daftarkan listener animasi footstep berbasis frame animasi Phaser.
    // Dengan cara ini, SFX bunyi langkah kaki selalu sinkron dengan
    // frame animasi — tidak tergantung frame rate game sama sekali.
    // Frame "kaki turun" pada walk: frame ke-1 dan ke-3 (index 0 & 2).
    // Frame "kaki turun" pada run : frame ke-1 dan ke-3 (index 0 & 2).
    this._registerFootstepListeners();

    // Pastikan AudioManager benar-benar berhenti & AudioContext ditutup
    // saat pindah scene (episode lain / balik ke menu), supaya tidak ada
    // BGM dobel menumpuk dan tidak menyisakan AudioContext yang terus
    // hidup di background.
    this.events.once('shutdown', () => {
      this.audioManager?.destroy();
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
      document.removeEventListener(
        'fullscreenchange',
        this._onFullscreenChange,
      );
      document.removeEventListener(
        'webkitfullscreenchange',
        this._onFullscreenChange,
      );
      // Pastikan keyboard game tidak "nyangkut" mati kalau scene ini
      // hancur persis saat overlay masih terbuka (edge case), dan hapus
      // bridge-nya supaya scene berikutnya yang bikin ulang dari nol.
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      if (window.__nawasenadaraInput?.disableGameKeyboard) {
        delete window.__nawasenadaraInput;
      }
    });

    // --- Input keyboard: Arrow keys + WASD + Space untuk lompat ---
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keysWASD = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    });
    this.jumpKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    this.shiftKeyLeft = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SHIFT,
    );

    // Bridge supaya overlay React (jurnal refleksi & chatbot konseling
    // di GameUIBridge.jsx) bisa MEMATIKAN keyboard Phaser sementara.
    // Tanpa ini, huruf W/A/S/D yang diketik ke textarea/input HTML
    // tetap "ditangkap" duluan oleh Phaser (dianggap perintah gerak
    // karakter), jadi tidak pernah benar-benar masuk ke kotak teksnya.
    window.__nawasenadaraInput = {
      disableGameKeyboard: () => {
        this.input.keyboard.enabled = false;
        // FIX: enabled=false SAJA tidak cukup. Phaser tetap melakukan
        // preventDefault() di level global untuk tombol yang sudah
        // di-capture (W/A/S/D/panah/Space) TERLEPAS dari flag enabled
        // scene ini — itu sebabnya huruf W/A/S/D yang diketik ke
        // textarea overlay React (jurnal/chatbot) tidak pernah benar-
        // benar sampai ke elemen HTML-nya. disableGlobalCapture()
        // mematikan preventDefault itu sepenuhnya selama overlay
        // terbuka.
        this.input.keyboard.disableGlobalCapture();
        // FIX kedua: kalau pemain sedang menekan tombol gerak PERSIS
        // saat overlay dibuka, key.isDown bisa "nyangkut" true (event
        // keyup-nya tidak pernah diproses karena keyboard plugin sudah
        // nonaktif) — karakter jalan sendiri terus meski overlay
        // terbuka. `uiInputLocked` di bawah adalah early-return
        // eksplisit di update() (sama polanya dengan this.isPaused),
        // jadi movement dijamin berhenti apapun state isDown-nya.
        this.uiInputLocked = true;
        this.player?.setVelocityX(0);
      },
      enableGameKeyboard: () => {
        this.input.keyboard.enabled = true;
        this.input.keyboard.enableGlobalCapture();
        this.uiInputLocked = false;
      },
      // FIX: overlay React (jurnal/chatbot/prompt nama/tawaran
      // konseling) dulu HANYA mematikan keyboard game — tombol Phaser
      // lain (pause, fullscreen, kontrol sentuh, tap ke NPC) tetap bisa
      // ditekan karena overlay itu tidak selalu menutupi seluruh layar
      // secara visual (mis. kartu chat cuma di pojok). Dua fungsi ini
      // mematikan/menyalakan interaktivitas tombol Phaser tsb secara
      // eksplisit, dipanggil bersamaan dengan disable/enableGameKeyboard
      // dari GameUIBridge.jsx setiap kali status overlay berubah.
      lockGameButtons: (opts) => this.lockGameButtons(opts),
      unlockGameButtons: () => this.unlockGameButtons(),
    };

    this.touchState = {
      left: false,
      right: false,
      runToggle: false,
      jumpRequested: false,
    };
    this.isJumping = false;
    this.jumpLocksMovement = false;

    this.createTouchControls(width, height);

    // --- Menu jeda (pause) ---
    this.isPaused = false;
    // Dikunci true selama overlay React (jurnal refleksi/chatbot
    // konseling) terbuka — lihat window.__nawasenadaraInput di atas.
    this.uiInputLocked = false;
    this.pauseKey = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ESC,
    );
    this.createPauseButton(width, height);
    this.createFullscreenButton(width, height);
    this.createChatButton(width, height);
    this.createPauseMenu();

    // Update ikon tombol fullscreen setiap kali status fullscreen browser
    // berubah — baik lewat tombol ini, tombol Esc browser, atau gesture lain.
    this._onFullscreenChange = () => {
      this._updateFullscreenIcon();
      // Tunggu jeda singkat agar browser selesai reflow viewport fullscreen
      setTimeout(() => {
        if (!this.scene?.isActive()) return;
        this.scale.refresh();
        this._repositionUI();
        if (this.scale.parentSize?.height > 0) {
          this._lastAspect =
            this.scale.parentSize.width / this.scale.parentSize.height;
        }
      }, 100);
    };
    document.addEventListener('fullscreenchange', this._onFullscreenChange);
    document.addEventListener(
      'webkitfullscreenchange',
      this._onFullscreenChange,
    );

    // Posisikan elemen UI ke area yang benar-benar terlihat di layar
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) {
        clearTimeout(this._resizeDebounceTimer);
      }
      this._resizeDebounceTimer = setTimeout(() => {
        this._resizeDebounceTimer = null;
        const nowPortrait = isPortrait(this);
        const nowAspect =
          this.scale.parentSize?.height > 0
            ? this.scale.parentSize.width / this.scale.parentSize.height
            : this._lastAspect;

        // Hanya restart scene jika TERJADI ROTASI FISIK (portrait <-> landscape)
        // dan pemain TIDAK sedang di tengah percakapan dialog/cutscene.
        if (nowPortrait !== this._isPortraitMode && !this.npcInDialogue) {
          this.scene.restart({
            episodeId: this.episodeId,
            preserveMuted: this.isMuted,
            preservePlayer: {
              x: this.player?.x,
              facingLeft: this.player?.flipX,
            },
          });
          return;
        }

        // Untuk perubahan aspect ratio (masuk/keluar fullscreen atau address bar toggle):
        // Cukup refresh transformasi skala & reposisi elemen UI secara aman tanpa restart game!
        this.scale.refresh();
        this._repositionUI();
        this._lastAspect = nowAspect;
      }, 150);
    };
    this._repositionUI();
    this.scale.on('resize', this._onResize);
  }

  // BGM default yang dimainkan saat scene dimulai.
  // Subclass bisa meng-override method ini untuk memainkan tema berbeda
  // (misal Episode3Scene memainkan tema suspense mencekam, bukan lo-fi chill).
  _startSceneBGM() {
    this.audioManager.startBGM();
  }

  // Ditimpa oleh scene turunan.
  createBackground(_width, _height) {
    // no-op default
  }

  // Ditimpa oleh scene turunan yang butuh logic tambahan tiap frame
  // (mis. cek zona finish episode). Dipanggil di akhir update().
  onSceneUpdate(_time, _delta) {
    // no-op default
  }

  /** Daftarkan sebuah Game Object interaktif supaya ikut terkunci
   * (disableInteractive) selama overlay React di atas kanvas terbuka.
   * Dipanggil BasePlayerScene sendiri untuk tombol bawaannya (gerak
   * sentuh, pause, fullscreen), dan boleh dipanggil scene turunan
   * untuk objek lain (mis. Episode1Scene untuk sprite/prompt NPC). */
  registerLockable(gameObject) {
    if (!gameObject) return;
    this._lockableInteractives = this._lockableInteractives || [];
    this._lockableInteractives.push(gameObject);
  }

  /** Matikan interaktivitas semua tombol terdaftar — dipanggil dari
   * window.__nawasenadaraInput.lockGameButtons() setiap kali ada
   * overlay React (jurnal/chatbot/prompt nama/tawaran konseling) yang
   * terbuka, supaya tombol menu/pause/gerak di BALIK overlay itu tidak
   * bisa "tembus" ditekan. Ikon chat DIKECUALIKAN kalau keepChatButton
   * true (dipakai saat chatbot itu sendiri satu-satunya overlay yang
   * terbuka, supaya ikonnya tetap bisa ditekan untuk menutup dirinya
   * sendiri — lihat createChatButton() di atas). */
  lockGameButtons({ keepChatButton = false } = {}) {
    this._buttonsLocked = true;
    (this._lockableInteractives || []).forEach((obj) => {
      if (obj?.input?.enabled) obj.disableInteractive();
    });
    if (!keepChatButton) {
      this._chatBtn?.disableInteractive();
    }
  }

  /** Kebalikan lockGameButtons() — dipanggil begitu semua overlay
   * React sudah tertutup lagi. */
  unlockGameButtons() {
    this._buttonsLocked = false;
    (this._lockableInteractives || []).forEach((obj) => {
      if (!obj || obj.input?.enabled) return;
      obj.setInteractive({ useHandCursor: true });
    });
    // Ikon chat hanya dinyalakan ulang kalau memang sedang tidak
    // sengaja disembunyikan (mis. Episode1Scene sebelum quest NPC
    // selesai — lihat setChatButtonVisible()).
    if (this._chatButtonVisible !== false && this._chatBtn && !this._chatBtn.input?.enabled) {
      this._chatBtn.setInteractive({ useHandCursor: true, draggable: true });
    }
  }

  /**
   * Alur "selesai episode" BERSAMA untuk semua episode (1-9) — dipanggil
   * dari onSceneUpdate() scene turunan begitu kondisi selesai terpenuhi
   * (mis. karakter sampai ujung level). Lihat NLP_INTEGRATION_DESIGN.md
   * §3: jurnal refleksi + POST /api/nlp/analyze WAJIB di ujung SETIAP
   * episode tanpa kecuali, termasuk Episode 1 yang tidak punya diving —
   * diving (mekanik visual) dan analisis NLP adalah dua hal berbeda.
   *
   * `choices` (opsional) = akumulasi pilihan dialog sepanjang episode
   * ini, dikirim ke backend sebagai bagian riwayat progres (JSONB) —
   * BUKAN dikirim ke NLP (lihat §2 dokumen: pilihan terstruktur beda
   * dari teks bebas jurnal).
   */
  async finishEpisode({ episodeId, isLastEpisode = false, choices = [] } = {}) {
    const id = episodeId ?? this.episodeId ?? 1;

    // FIX: sebelumnya ada jeda antara trigger "episode selesai" ini
    // dan React BENAR-BENAR mengunci keyboard (lewat useEffect di
    // GameUIBridge.jsx yang baru jalan setelah re-render) — selama
    // jeda itu (bisa beberapa frame), karakter masih kelihatan
    // berjalan/animasi jalan terus walau form jurnal sudah muncul di
    // atasnya. Sekarang dikunci & disembunyikan SEKETIKA di sini, di
    // frame yang sama saat kondisi selesai terpenuhi — tidak menunggu
    // React sama sekali.
    this.uiInputLocked = true;
    if (this.player) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.tweens.add({
        targets: this.player,
        alpha: 0,
        duration: 250,
        ease: 'Sine.easeOut',
      });
    }

    // Tunggu sampai pemain submit jurnal refleksi (atau menutup ajakan
    // konseling kalau risk_level sedang/tinggi) sebelum benar-benar
    // pindah scene. Kalau overlay UI belum sempat terpasang (race
    // condition yang sangat jarang), lewati saja supaya pemain tidak
    // terjebak tidak bisa lanjut.
    //
    // FIX: pemain yang MENGULANG episode yang sudah pernah dituntaskan
    // sebelumnya (mis. lewat "Lanjutkan Permainan Lama" atau sengaja
    // main ulang dari EpisodeSelectScene) boleh melewati jurnal —
    // refleksinya sudah pernah diisi & dianalisis di playthrough
    // pertama, tidak perlu dipaksa mengisi ulang tiap kali replay.
    // Pemain yang BELUM PERNAH menuntaskan episode ini (progres
    // baru/belum ada) tetap WAJIB mengisi seperti biasa — lihat
    // allowSkip di GameUIBridge.jsx untuk bagaimana opsi ini dirender.
    const alreadyCompletedBefore = getCompletedEpisodes().includes(id);
    const ui = window.__nawasenadaraUI;
    if (ui?.openJournal) {
      await ui.openJournal(id, { allowSkip: alreadyCompletedBefore });
    }

    completeEpisode(id, choices);

    if (isLastEpisode) {
      this.scene.start('EpisodeSelectScene');
    } else {
      this.scene.start('EpisodeIntroScene', { episodeId: id + 1 });
    }
  }

  /**
   * Daftarkan listener Phaser `animationupdate` pada sprite player.
   * SFX footstep hanya di-trigger pada frame tertentu (frame "kaki turun")
   * sehingga ritme bunyi selalu selaras dengan animasi,
   * tanpa bergantung pada frame rate game.
   */
  _registerFootstepListeners() {
    // Frame index kaki menyentuh tanah (0-based):
    //   walk (5 frame): index 1 dan 3  → kaki kiri & kanan turun
    //   run  (4 frame): index 1 dan 3  → kaki kiri & kanan turun
    const WALK_FOOT_FRAMES = new Set([1, 3]);
    const RUN_FOOT_FRAMES = new Set([1, 3]);

    this.player.on('animationupdate', (anim, frame) => {
      const idx = frame.index - 1; // Phaser frame.index dimulai dari 1
      if (anim.key === 'walk' && WALK_FOOT_FRAMES.has(idx)) {
        this.audioManager?.playFootstepWalk();
      } else if (anim.key === 'run' && RUN_FOOT_FRAMES.has(idx)) {
        this.audioManager?.playFootstepRun();
      }
    });
  }

  /**
   * Hitung ukuran tombol sentuh (radius, jarak antar tombol, margin ke
   * tepi layar, ukuran font) dalam CSS px yang konsisten, lalu
   * dikonversi ke world unit lewat pxToWorld(). Dengan ini ukuran
   * FISIK tombol di layar kira-kira sama besar di HP kecil, tablet,
   * maupun desktop raksasa — tidak ikut menyusut/membesar mengikuti
   * skala ENVELOP seperti sebelumnya (radius tetap 42 world unit yang
   * jadi sangat kecil di layar HP landscape sempit).
   *
   * Breakpoint berdasarkan lebar viewport CSS px sebenarnya
   * (this.scale.parentSize.width), supaya tetap responsif walau HP
   * diputar antara portrait <-> landscape, termasuk HP landscape
   * sekecil ~450px lebar.
   */
  _getButtonMetrics() {
    const parentWidth = this.scale.parentSize.width;
    let diameterPx;
    let gapPx;
    let marginPx;
    let fontPx;

    if (parentWidth <= 480) {
      // HP landscape sempit (turun sampai ~450px)
      diameterPx = 60;
      gapPx = 10;
      marginPx = 16;
      fontPx = 14;
    } else if (parentWidth <= 720) {
      // HP landscape umum / tablet kecil
      diameterPx = 72;
      gapPx = 14;
      marginPx = 22;
      fontPx = 16;
    } else {
      // Tablet besar / desktop
      diameterPx = 84;
      gapPx = 18;
      marginPx = 30;
      fontPx = 18;
    }

    return {
      radiusWorld: pxToWorld(this, diameterPx / 2),
      gapWorld: pxToWorld(this, gapPx),
      marginWorld: pxToWorld(this, marginPx),
      fontWorld: pxToWorld(this, fontPx),
    };
  }

  createTouchControls(width, height) {
    const { radiusWorld, gapWorld, marginWorld, fontWorld } =
      this._getButtonMetrics();
    this._buttonMetrics = { radiusWorld, gapWorld, marginWorld, fontWorld };

    const buttonY = height - marginWorld - radiusWorld;
    const leftX = marginWorld + radiusWorld;
    const rightX = leftX + radiusWorld * 2 + gapWorld;
    const runX = width - marginWorld - radiusWorld;
    const jumpX = runX - radiusWorld * 2 - gapWorld;

    const makeButton = (x, y, label, onDown, onUp) => {
      const circle = this.add.circle(x, y, radiusWorld, 0x1a1a2e, 0.55);
      circle.setStrokeStyle(2, 0xffffff, 0.6);
      circle.setScrollFactor(0);
      circle.setDepth(10);
      circle.setInteractive({ useHandCursor: true });

      const text = this.add
        .text(x, y, label, {
          fontFamily: 'Silkscreen, monospace',
          fontSize: `${fontWorld}px`,
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(11);

      if (onDown) circle.on('pointerdown', onDown);
      if (onUp) {
        circle.on('pointerup', onUp);
        circle.on('pointerout', onUp);
      }

      return { circle, text };
    };

    this.btnLeft = makeButton(
      leftX,
      buttonY,
      '<',
      () => {
        this.touchState.left = true;
      },
      () => {
        this.touchState.left = false;
      },
    );

    this.btnRight = makeButton(
      rightX,
      buttonY,
      '>',
      () => {
        this.touchState.right = true;
      },
      () => {
        this.touchState.right = false;
      },
    );

    this.btnRun = makeButton(runX, buttonY, 'RUN', () => {
      this.touchState.runToggle = !this.touchState.runToggle;
    });

    this.btnJump = makeButton(jumpX, buttonY, 'JUMP', () => {
      this.touchState.jumpRequested = true;
    });

    // Daftarkan keempat tombol gerak sentuh ini supaya ikut terkunci
    // saat overlay React (jurnal/chatbot/dst) terbuka.
    [this.btnLeft, this.btnRight, this.btnRun, this.btnJump].forEach((b) =>
      this.registerLockable(b.circle),
    );
  }

  // Ikon akses cepat Chatbot Konseling Virtual. Bisa DITARIK/dipindah
  // ke posisi mana pun di layar (mirip AssistiveTouch di iOS),
  // posisinya diingat lewat localStorage supaya tetap di tempat yang
  // sama walau reload/pindah episode.
  //
  // FIX: dulu ikon ini SELALU tampil sejak episode dimuat. Sekarang
  // defaultnya TAMPIL (dipakai episode yang tidak punya quest NPC
  // wajib, mis. placeholder episode 2-9), TAPI scene turunan yang
  // punya quest NPC (mis. Episode1Scene) bisa menyembunyikannya dulu
  // dengan memanggil `this.setChatButtonVisible(false)` SEGERA setelah
  // createChatButton() dipanggil (lihat urutan create() di bawah),
  // lalu menampilkannya lagi lewat setChatButtonVisible(true) persis
  // setelah dialog NPC itu selesai — lihat Episode1Scene._createNpc()
  // & onClose dialog-nya.
  createChatButton() {
    // FIX (urutan eksekusi): createBackground() — yang untuk
    // Episode1Scene memanggil _createNpc() dan bisa langsung memanggil
    // this.setChatButtonVisible(false) — dijalankan LEBIH DULU daripada
    // createChatButton() ini (lihat urutan pemanggilan di create()).
    // Kalau baris ini menimpa this._chatButtonVisible jadi true tanpa
    // syarat, keputusan "sembunyikan dulu" dari Episode1Scene akan
    // hilang begitu saja. Makanya nilai default HANYA dipasang kalau
    // belum ada nilai sama sekali.
    if (this._chatButtonVisible === undefined) {
      this._chatButtonVisible = true;
    }
    const radiusPx = 26;
    const fontPx = 22;
    this._chatBtnRadius = pxToWorld(this, radiusPx);
    this._chatBtnFont = pxToWorld(this, fontPx);

    // Lingkaran luar (glow lembut) + lingkaran utama, supaya terlihat
    // lebih "hidup" daripada kotak polos — dua Game Object ini SELALU
    // digerakkan bersamaan sebagai satu kesatuan visual.
    this._chatBtnGlow = this.add.circle(
      0,
      0,
      this._chatBtnRadius + 6,
      0xffdd57,
      0.18,
    );
    this._chatBtnGlow.setScrollFactor(0).setDepth(19);

    this._chatBtn = this.add.circle(
      0,
      0,
      this._chatBtnRadius,
      0x2a3f66,
      0.92,
    );
    this._chatBtn.setStrokeStyle(2.5, 0xffdd57, 0.95);
    this._chatBtn.setScrollFactor(0);
    this._chatBtn.setDepth(20);

    this._chatBtnText = this.add
      .text(0, 0, '💬', {
        fontFamily: 'monospace',
        fontSize: `${this._chatBtnFont}px`,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    // Posisi awal: pakai yang tersimpan di localStorage kalau ada
    // (pemain pernah menggeser tombol ini sebelumnya), atau default
    // pojok kiri atas kalau belum pernah.
    const bounds = getVisibleBounds(this);
    const saved = this._loadChatBtnFraction();
    const startX = bounds.left + (saved?.xFrac ?? 0.08) * bounds.width;
    const startY = bounds.top + (saved?.yFrac ?? 0.24) * bounds.height;
    this._setChatBtnPosition(startX, startY);

    // --- Drag & drop, dengan pembeda TAP vs GESER ---
    // Kalau pointer bergerak kurang dari CLICK_THRESHOLD_PX sejak
    // pointerdown sampai pointerup, dianggap TAP (buka chatbot).
    // Kalau lebih dari itu, dianggap sedang DIGESER — begitu
    // dilepas, posisi barunya disimpan, TIDAK membuka chatbot.
    const CLICK_THRESHOLD_PX = 10;
    this._chatBtn.setInteractive({ useHandCursor: true, draggable: true });

    let downX = 0;
    let downY = 0;

    this._chatBtn.on('dragstart', (pointer) => {
      downX = pointer.x;
      downY = pointer.y;
    });

    this._chatBtn.on('drag', (pointer, dragX, dragY) => {
      const b = getVisibleBounds(this);
      const r = this._chatBtnRadius;
      // Clamp supaya tombol tidak bisa ditarik keluar dari area yang
      // benar-benar terlihat di layar.
      const clampedX = Phaser.Math.Clamp(dragX, b.left + r, b.right - r);
      const clampedY = Phaser.Math.Clamp(dragY, b.top + r, b.bottom - r);
      this._setChatBtnPosition(clampedX, clampedY);
    });

    this._chatBtn.on('dragend', (pointer) => {
      const moved =
        Math.abs(pointer.x - downX) + Math.abs(pointer.y - downY);
      if (moved < CLICK_THRESHOLD_PX) {
        // Gerakan sangat kecil -> anggap TAP, bukan geser.
        // FIX: ikon ini sekarang berfungsi sebagai TOGGLE — kalau
        // jendela chat sedang terbuka, tap lagi akan MENUTUPnya (tidak
        // cuma bisa lewat tombol ✕ di dalam kartu chat). Kalau
        // tertutup, tap membukanya seperti biasa.
        const ui = window.__nawasenadaraUI;
        if (ui?.isChatbotOpen?.()) {
          ui.closeChatbot();
        } else {
          ui?.openChatbot({
            triggerSource: 'manual',
            episodeId: this.episodeId,
            // Kalau scene episode ini punya konteks obrolan NPC yang
            // sudah tercatat (lihat Episode1Scene.getCounselingAutoContext,
            // dipanggil lewat optional chaining supaya scene lain yang
            // BELUM override method ini — mis. PlaceholderEpisodeScene —
            // tidak error), Kak Dara tetap otomatis tahu ceritanya
            // walau dibuka manual lewat ikon, bukan lewat tawaran
            // setelah dialog NPC.
            autoContext: this.getCounselingAutoContext?.(),
          });
        }
        return;
      }
      // Simpan posisi baru sebagai FRAKSI dari area terlihat (bukan
      // koordinat absolut), supaya tetap valid walau ukuran layar
      // berubah (resize/rotasi) di sesi berikutnya.
      const b = getVisibleBounds(this);
      const xFrac = (this._chatBtn.x - b.left) / b.width;
      const yFrac = (this._chatBtn.y - b.top) / b.height;
      this._saveChatBtnFraction(xFrac, yFrac);
    });

    // FIX: terapkan status visible/interactive yang benar SEKARANG —
    // kalau this._chatButtonVisible sudah di-set false lebih dulu
    // (mis. oleh Episode1Scene._createNpc() sebelum method ini
    // dipanggil), objek yang baru saja dibuat di atas perlu langsung
    // disembunyikan & dimatikan interaktivitasnya, bukan menunggu
    // event lain.
    this.setChatButtonVisible(this._chatButtonVisible);
  }

  _setChatBtnPosition(x, y) {
    this._chatBtnGlow?.setPosition(x, y);
    this._chatBtn?.setPosition(x, y);
    this._chatBtnText?.setPosition(x, y);
  }

  _loadChatBtnFraction() {
    try {
      const raw = window.localStorage.getItem('nawasenadara_chatbtn_pos_v1');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  _saveChatBtnFraction(xFrac, yFrac) {
    try {
      window.localStorage.setItem(
        'nawasenadara_chatbtn_pos_v1',
        JSON.stringify({ xFrac, yFrac }),
      );
    } catch (e) {
      // localStorage penuh/diblokir browser — abaikan, posisi cuma
      // tidak tersimpan lintas sesi, tidak fatal.
    }
  }

  /**
   * Tampilkan/sembunyikan ikon chat "Kak Dara". Dipakai Episode1Scene
   * untuk menyembunyikannya sampai quest dialog dengan NPC selesai.
   * Saat disembunyikan, interaksinya juga dimatikan (bukan cuma alpha)
   * supaya tidak bisa di-tap "diam-diam" walau tidak terlihat.
   */
  setChatButtonVisible(visible) {
    this._chatButtonVisible = visible;
    this._chatBtnGlow?.setVisible(visible);
    this._chatBtn?.setVisible(visible);
    this._chatBtnText?.setVisible(visible);
    // `.scene` dicek juga (bukan cuma truthiness) — GameObject yang
    // sudah di-destroy scene sebelumnya tetap "truthy" sebagai objek
    // JS, tapi `.scene`-nya sudah null. Memanggil disableInteractive()
    // pada objek begitu akan crash di internal Phaser.
    if (!this._chatBtn || !this._chatBtn.scene) return;
    this._chatBtn.disableInteractive();
    if (visible) {
      this._chatBtn.setInteractive({ useHandCursor: true, draggable: true });
    }
  }

  // --- HUD Profil Pemain (pojok kiri atas) -------------------------
  // Menampilkan: (1) avatar bulat wajah karakter pemain, (2) nama tokoh
  // yang diisi pemain di awal permainan (getCharacterName()), dan
  // (3) progress bar mood terkini hasil deteksi AI (moodStore.js,
  // diperbarui GameUIBridge.jsx setiap kali ada hasil analisis jurnal
  // refleksi atau chat konseling baru) — BUKAN cuma emotikon lagi.
  //
  // Avatar: kalau aset foto wajah asli ('player-face', lihat
  // BootScene.preload()) sudah tersedia, itu yang dipakai (di-cover-fit
  // penuh ke lingkaran). Kalau belum ada asetnya (loaderror, silent),
  // fallback ke crop bagian atas sprite 'player-idle' seperti sebelumnya
  // supaya HUD tetap tidak kosong.
  createProfileHud(width, height) {
    const radiusPx = 30;
    this._profileRadius = pxToWorld(this, radiusPx);
    const r = this._profileRadius;
    const cx = r + pxToWorld(this, 14);
    const cy = r + pxToWorld(this, 14);

    this._profileRing = this.add
      .circle(cx, cy, r, 0x1a1a2e, 0.9)
      .setStrokeStyle(3, 0xffdd57, 0.95)
      .setScrollFactor(0)
      .setDepth(30);

    this._drawProfileFace(cx, cy, r);

    // --- Nama tokoh, di sebelah kanan avatar (baris atas) ---
    const nameFont = pxToWorld(this, 17);
    this._profileNameText = this.add
      .text(cx + r + pxToWorld(this, 10), cy - r * 0.55, getCharacterName(), {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${nameFont}px`,
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(31);

    // --- Mood (hasil deteksi AI): label singkat + emotikon, baris
    // tengah ---
    const moodFont = pxToWorld(this, 13);
    const initialMood = getMood();
    this._profileMoodText = this.add
      .text(cx + r + pxToWorld(this, 10), cy, `${initialMood.emoji} ${initialMood.label}`, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${moodFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(31);

    // --- Progress bar mood, baris bawah — panjang batang = intensitas
    // (confidence) hasil deteksi AI, warnanya berubah sesuai kategori
    // mood. Ini yang menggantikan "cuma emotikon" sebelumnya.
    const barWidthPx = 110;
    const barHeightPx = 7;
    this._moodBarMaxWidth = pxToWorld(this, barWidthPx);
    this._moodBarHeight = pxToWorld(this, barHeightPx);
    const barX = cx + r + pxToWorld(this, 10);
    const barY = cy + r * 0.62;

    this._moodBarBg = this.add
      .rectangle(barX, barY, this._moodBarMaxWidth, this._moodBarHeight, 0x0f0f22, 0.9)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.25)
      .setScrollFactor(0)
      .setDepth(31);

    this._moodBarFill = this.add
      .rectangle(
        barX,
        barY,
        Math.max(2, this._moodBarMaxWidth * Phaser.Math.Clamp(initialMood.value, 0, 1)),
        this._moodBarHeight,
        initialMood.color,
        0.95,
      )
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(32);

    // Perbarui teks + bar mood otomatis setiap kali moodStore berubah
    // (dipicu GameUIBridge.jsx setelah hasil analisis NLP baru masuk).
    // Listener ini WAJIB dilepas saat scene dihancurkan supaya tidak
    // menumpuk / mencoba menulis ke game object yang sudah destroy.
    this._unsubscribeMood = onMoodChange((mood) => {
      this._profileMoodText?.setText(`${mood.emoji} ${mood.label}`);
      if (this._moodBarFill) {
        const w = Math.max(2, this._moodBarMaxWidth * Phaser.Math.Clamp(mood.value, 0, 1));
        this._moodBarFill.setSize(w, this._moodBarHeight);
        this._moodBarFill.setFillStyle(mood.color, 0.95);
      }
    });
    this.events.once('shutdown', () => {
      this._unsubscribeMood?.();
    });

    // --- Quest guide (dipakai episode dengan NPC quest, lihat
    // setQuestGuide()/clearQuestGuide()) — ditaruh TEPAT di bawah blok
    // profil ini, bukan lagi menempel di atas kepala NPC. Dibuat
    // tersembunyi sampai scene turunan memanggil setQuestGuide().
    const questFont = pxToWorld(this, 15);
    this._questGuideText = this.add
      .text(0, 0, '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${questFont}px`,
        color: '#ffdd57',
        backgroundColor: '#1a1a2ecc',
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);
  }

  /** Gambar/ganti avatar wajah di dalam ring profil — dipanggil saat HUD
   * dibuat & setiap resize (lewat _repositionProfileHud). */
  _drawProfileFace(cx, cy, r) {
    // Prioritas 1: aset foto wajah asli kalau sudah ada di public/
    // (lihat BootScene.preload(), key 'player-face'). Di-cover-fit
    // penuh ke lingkaran (bukan cuma crop bagian atas sprite gerak).
    const hasRealFace = this.textures.exists('player-face');
    const faceKey = hasRealFace ? 'player-face' : 'player-idle';
    if (!this.textures.exists(faceKey)) return;

    const source = this.textures.get(faceKey).getSourceImage();
    // Foto wajah asli: cover-fit penuh (isi seluruh lingkaran, sisi
    // terpendek menyentuh diameter). Fallback sprite idle: cuma crop
    // ~22% teratas (area kepala) seperti sebelumnya, karena sprite itu
    // full-body, bukan potret wajah.
    const cropH = hasRealFace ? source.height : Math.round(source.height * 0.22);
    const faceScale = hasRealFace
      ? (r * 2) / Math.min(source.width, cropH)
      : (r * 1.7) / source.width;

    if (this._profileFace) {
      this._profileFace.destroy();
    }
    this._profileFace = this.add
      .image(cx, hasRealFace ? cy : cy - (cropH * faceScale) / 2, faceKey)
      .setOrigin(0.5, hasRealFace ? 0.5 : 0)
      .setScrollFactor(0)
      .setDepth(31);
    this._profileFace.setCrop(0, 0, source.width, cropH);
    this._profileFace.setScale(faceScale);

    if (this._profileMask) this._profileMask.destroy();
    this._profileMask = this.make.graphics({ x: 0, y: 0, add: false });
    // FIX (bug utama): GeometryMask di Phaser membaca transform objek
    // Graphics-nya sendiri saat merender mask — dan Graphics BARU
    // (default) punya scrollFactor (1,1), BUKAN ikut scrollFactor(0)
    // milik this._profileFace yang di-mask-nya. Akibatnya waktu kamera
    // mulai pan (karakter jalan ke kanan, lihat _updatePortraitCamera),
    // lingkaran mask ini "diam" di world-space sementara wajah profil
    // (scrollFactor 0) tetap diam di LAYAR — dua-duanya sama-sama
    // "diam" tapi terhadap acuan yang beda, sehingga makin jauh jalan
    // ke kanan, mask makin geser relatif ke layar dan progresif
    // menutupi/menghapus wajah profilnya sendiri. Fix-nya: samakan
    // scrollFactor mask dengan objek yang di-mask (0 juga).
    this._profileMask.setScrollFactor(0);
    this._profileMask.fillStyle(0xffffff);
    this._profileMask.fillCircle(cx, cy, r - 2);
    this._profileFace.setMask(this._profileMask.createGeometryMask());
  }

  /** Dipanggil dari _repositionUI() setiap resize/rotasi. */
  _repositionProfileHud(bounds) {
    if (!this._profileRing) return;
    const r = this._profileRadius;
    const cx = bounds.left + r + pxToWorld(this, 14);
    const cy = bounds.top + r + pxToWorld(this, 14);

    this._profileRing.setPosition(cx, cy);
    this._profileRing.setRadius(r);

    this._drawProfileFace(cx, cy, r);

    const nameFont = pxToWorld(this, 17);
    const moodFont = pxToWorld(this, 13);
    const textX = cx + r + pxToWorld(this, 10);
    if (this._profileNameText) {
      this._profileNameText.setPosition(textX, cy - r * 0.55);
      this._profileNameText.setFontSize(nameFont);
    }
    if (this._profileMoodText) {
      this._profileMoodText.setPosition(textX, cy);
      this._profileMoodText.setFontSize(moodFont);
    }

    const barWidthPx = 110;
    const barHeightPx = 7;
    this._moodBarMaxWidth = pxToWorld(this, barWidthPx);
    this._moodBarHeight = pxToWorld(this, barHeightPx);
    const barY = cy + r * 0.62;
    const currentMood = getMood();
    if (this._moodBarBg) {
      this._moodBarBg.setPosition(textX, barY);
      this._moodBarBg.setSize(this._moodBarMaxWidth, this._moodBarHeight);
    }
    if (this._moodBarFill) {
      this._moodBarFill.setPosition(textX, barY);
      this._moodBarFill.setSize(
        Math.max(2, this._moodBarMaxWidth * Phaser.Math.Clamp(currentMood.value, 0, 1)),
        this._moodBarHeight,
      );
    }

    // Quest guide: tepat di bawah blok profil (avatar + teks), rata
    // kiri dengan tepi kiri avatar.
    if (this._questGuideText) {
      const questX = bounds.left + pxToWorld(this, 14);
      const questY = bounds.top + pxToWorld(this, 14) + r * 2 + pxToWorld(this, 10);
      this._questGuideText.setPosition(questX, questY);
      this._questGuideText.setFontSize(pxToWorld(this, 15));
    }
  }

  /** Tampilkan penanda quest singkat di bawah HUD profil, mis.
   * "○ ── Ajak bicara Rafi ──". Dipanggil scene turunan yang punya NPC
   * quest (lihat Episode1Scene). */
  setQuestGuide(text) {
    if (!this._questGuideText) return;
    this._questGuideText.setText(text);
    this._questGuideText.setVisible(true);
  }

  /** Sembunyikan penanda quest (dipanggil setelah quest selesai). */
  clearQuestGuide() {
    this._questGuideText?.setVisible(false);
  }

  createPauseButton(width) {
    // Tombol jeda kecil di pojok kanan atas — selalu terlihat, terpisah
    // dari tombol gerak di bawah supaya tidak tertekan tidak sengaja.
    // Ukuran & posisi dihitung dari CSS px yang konsisten (sama seperti
    // tombol gerak), supaya tidak jadi terlalu kecil/besar di layar
    // sempit maupun raksasa. Posisi awal di koordinat dunia game;
    // _repositionUI() akan memindahkannya ke area yang benar-benar
    // terlihat setiap resize/rotasi layar.
    const pauseWPx = 52;
    const pauseHPx = 40;
    const pauseFontPx = 20;
    this._pauseBtnSize = {
      w: pxToWorld(this, pauseWPx),
      h: pxToWorld(this, pauseHPx),
      font: pxToWorld(this, pauseFontPx),
    };

    this._pauseBtn = this.add.rectangle(
      width - 40,
      36,
      this._pauseBtnSize.w,
      this._pauseBtnSize.h,
      0x1a1a2e,
      0.6,
    );
    const btn = this._pauseBtn;
    btn.setStrokeStyle(2, 0xffffff, 0.6);
    btn.setScrollFactor(0);
    btn.setDepth(20);
    btn.setInteractive({ useHandCursor: true });

    this._pauseBtnText = this.add
      .text(width - 40, 36, '☰', {
        fontFamily: 'monospace',
        fontSize: `${this._pauseBtnSize.font}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21);

    btn.on('pointerdown', () => this.togglePause());
    this.registerLockable(btn);
  }

  /**
   * Tombol fullscreen di samping tombol pause. Pakai Fullscreen API
   * native (document.documentElement) supaya konsisten dengan
   * auto-fullscreen di tap pertama (lihat PhaserGame.jsx) — jadi
   * status fullscreen selalu sinkron dari sumber manapun ia dipicu.
   * Catatan: Safari iOS tidak mendukung Fullscreen API sama sekali,
   * jadi tombol ini otomatis tidak akan terlihat berefek di sana
   * (browser diam-diam mengabaikan requestFullscreen) — solusi untuk
   * iOS adalah lewat "Add to Home Screen" (lihat manifest.json).
   */
  createFullscreenButton(width) {
    const wPx = 52;
    const hPx = 40;
    const fontPx = 18;
    this._fsBtnSize = {
      w: pxToWorld(this, wPx),
      h: pxToWorld(this, hPx),
      font: pxToWorld(this, fontPx),
    };

    // Diposisikan di sebelah kiri tombol pause; posisi akurat diatur
    // ulang oleh _repositionUI() setiap create/resize.
    this._fsBtn = this.add.rectangle(
      width - 100,
      36,
      this._fsBtnSize.w,
      this._fsBtnSize.h,
      0x1a1a2e,
      0.6,
    );
    this._fsBtn.setStrokeStyle(2, 0xffffff, 0.6);
    this._fsBtn.setScrollFactor(0);
    this._fsBtn.setDepth(20);
    this._fsBtn.setInteractive({ useHandCursor: true });

    this._fsBtnText = this.add
      .text(width - 100, 36, '⛶', {
        fontFamily: 'monospace',
        fontSize: `${this._fsBtnSize.font}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21)
      .setInteractive({ useHandCursor: true });

    this._fsBtn.on('pointerdown', () => this.toggleFullscreen());
    this._fsBtnText.on('pointerdown', () => this.toggleFullscreen());
    this._updateFullscreenIcon();
    // Jangan lock tombol fullscreen agar tetap bisa diperlebar kapan saja
  }

  toggleFullscreen() {
    const isFs = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    if (!isFs) {
      const el = document.documentElement;
      const req =
        el.requestFullscreen ??
        el.webkitRequestFullscreen ??
        el.msRequestFullscreen;
      req
        ?.call(el)
        .then(() => {
          this._updateFullscreenIcon();
          setTimeout(() => {
            if (this.scale) {
              this.scale.refresh();
              this._repositionUI();
            }
          }, 100);
          try {
            const orientation = window.screen?.orientation;
            const type = orientation?.type?.startsWith('portrait')
              ? 'portrait'
              : 'landscape';
            orientation?.lock?.(type)?.catch(() => {});
          } catch {
            // abaikan
          }
        })
        .catch(() => {});
    } else {
      const exit =
        document.exitFullscreen ??
        document.webkitExitFullscreen ??
        document.msExitFullscreen;
      exit
        ?.call(document)
        .then(() => {
          this._updateFullscreenIcon();
          setTimeout(() => {
            if (this.scale) {
              this.scale.refresh();
              this._repositionUI();
            }
          }, 100);
        })
        .catch(() => {});
      try {
        window.screen?.orientation?.unlock?.();
      } catch {
        // abaikan
      }
    }
  }

  /** Ganti ikon & warna tombol fullscreen sesuai status saat ini. */
  _updateFullscreenIcon() {
    if (!this._fsBtn || !this._fsBtnText) return;
    const isFs = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    this._fsBtnText.setText(isFs ? '⤢' : '⛶');
    this._fsBtn.setFillStyle(isFs ? 0xffdd57 : 0x1a1a2e, isFs ? 0.85 : 0.6);
    this._fsBtnText.setColor(isFs ? '#1a1a2e' : '#ffffff');
  }

  createPauseMenu() {
    // setScrollFactor(0): wajib sekarang karena kamera mengikuti
    // karakter (side-scroll) — tanpa ini menu jeda akan ikut bergeser
    // mengikuti posisi kamera alih-alih diam di tengah layar.
    //
    // Sebelumnya seluruh isi menu ini dibangun SEKALI di world-space
    // mentah (width/height = 1280x720) dan TIDAK PERNAH di-reposisi
    // ulang saat resize/rotasi. Di layar portrait yang lebar area
    // terlihatnya (visible bounds) jauh lebih sempit dari 1280 world
    // unit, panel & tombol-tombol menu bisa terdorong ke luar area
    // yang benar-benar terlihat/tersentuh — persis gejala "menu jeda
    // tidak bisa diklik di portrait". Sekarang seluruh isi menu
    // dibangun dari getVisibleBounds() dan dibangun ULANG (destroy +
    // rebuild) setiap kali viewport berubah, sama seperti pola yang
    // dipakai EpisodeSelectScene.
    const container = this.add
      .container(0, 0)
      .setDepth(100)
      .setVisible(false)
      .setScrollFactor(0);
    this.pauseMenuContainer = container;
    this._buildPauseMenuContents();
  }

  _buildPauseMenuContents() {
    const container = this.pauseMenuContainer;
    if (!container) return;

    // Hapus isi lama sebelum membangun ulang (dipakai saat resize).
    container.removeAll(true);

    const bounds = getVisibleBounds(this);
    const cx = bounds.centerX;
    const cy = bounds.centerY;

    // Panel tidak boleh lebih lebar dari area yang benar-benar
    // terlihat, supaya di portrait sempit sekalipun panel (dan semua
    // tombol di dalamnya) tetap berada di dalam area yang bisa
    // disentuh — bukan cuma di dalam area yang kelihatan.
    const panelWidth = Math.min(420, bounds.width * 0.92);
    const panelHeight = Math.min(400, bounds.height * 0.88);

    const overlay = this.add
      .rectangle(cx, cy, bounds.width, bounds.height, 0x000000, 0.7)
      .setScrollFactor(0);
    container.add(overlay);

    const panel = this.add
      .rectangle(cx, cy, panelWidth, panelHeight, 0x1a1a2e, 0.95)
      .setScrollFactor(0);
    panel.setStrokeStyle(2, 0xffdd57, 0.8);
    container.add(panel);

    const title = this.add
      .text(cx, cy - panelHeight * 0.4, 'JEDA', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${pxToWorld(this, 28)}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    container.add(title);

    // Label mute disimpan sebagai properti supaya teksnya bisa
    // diperbarui setiap kali status mute berubah.
    this.muteLabelText = this.add
      .text(cx, cy + panelHeight * 0.325, this.getMuteLabel(), {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 17)}px`,
        color: '#ffffff',
        wordWrap: { width: panelWidth * 0.85 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setInteractive({ useHandCursor: true });
    this.muteLabelText.on('pointerdown', () => this.toggleMute());
    container.add(this.muteLabelText);

    const options = [
      { label: 'Lanjutkan', action: () => this.togglePause() },
      { label: 'Pilih Episode', action: () => this.goToEpisodeSelect() },
      { label: 'Menu Utama (Lobby)', action: () => this.goToMainMenu() },
    ];

    const optionsTop = cy - panelHeight * 0.225;
    const optionGap = panelHeight * 0.125;

    options.forEach((opt, i) => {
      const y = optionsTop + i * optionGap;
      const optText = this.add
        .text(cx, y, opt.label, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 19)}px`,
          color: '#ffffff',
          wordWrap: { width: panelWidth * 0.85 },
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true });

      optText.on('pointerover', () => optText.setColor('#ffdd57'));
      optText.on('pointerout', () => optText.setColor('#ffffff'));
      optText.on('pointerdown', opt.action);

      container.add(optText);
    });

    // PENTING: container.setScrollFactor(0) (dipanggil sekali di
    // createPauseMenu()) HANYA mengubah scrollFactor container itu
    // sendiri, BUKAN anak-anaknya di dalamnya — ini perilaku resmi
    // Phaser (lihat docs Container#scrollFactorX). Anak-anak yang baru
    // dibuat di atas (overlay, panel, title, muteLabelText, tiap
    // optText) masih scrollFactor 1 secara default.
    //
    // Akibatnya: RENDER tetap kelihatan benar (diam di tengah layar,
    // karena posisi digambar lewat matrix container yang sudah
    // dibekukan), TAPI hit-test input Phaser mengecek scrollFactor
    // milik masing-masing child sendiri (bukan milik container induk)
    // untuk memutuskan apakah posisi tap perlu dikurangi
    // camera.scrollX. Karena child masih dianggap scrollFactor 1, area
    // yang bisa disentuh bergeser sejauh camera.scrollX saat menu
    // dibuka — makin jauh karakter sudah berjalan, makin jauh pula
    // list menu ini "meleset" dari yang terlihat di layar. Tombol
    // pause tidak kena masalah ini karena dia bukan child container.
    //
    // updateChildren=true di sini men-cascade scrollFactor 0 ke semua
    // child yang baru saja ditambahkan, menyamakan hit-test dengan
    // hasil render.
    container.setScrollFactor(0, 0, true);
  }

  /** Dipanggil dari _repositionUI() setiap resize/rotasi. */
  _repositionPauseMenu() {
    if (!this.pauseMenuContainer) return;
    this._buildPauseMenuContents();
  }

  /**
   * Posisikan ulang semua elemen UI (tombol sentuh, tombol pause) ke
   * dalam area game yang benar-benar terlihat di layar. Diperlukan
   * karena mode ENVELOP bisa memotong tepi dunia game jika rasio
   * aspek viewport berbeda dari 16:9.
   */
  _repositionUI() {
    const bounds = getVisibleBounds(this);
    // Hitung ulang metrics (bukan pakai angka tetap) supaya saat layar
    // di-resize/rotasi (mis. portrait -> landscape atau sebaliknya),
    // ukuran tombol ikut menyesuaikan breakpoint lebar layar yang baru
    // — bukan cuma posisinya yang dipindah tapi ukurannya tetap sama.
    const { radiusWorld, gapWorld, marginWorld, fontWorld } =
      this._getButtonMetrics();
    this._buttonMetrics = { radiusWorld, gapWorld, marginWorld, fontWorld };

    const buttonY = bounds.bottom - marginWorld - radiusWorld;
    const leftX = bounds.left + marginWorld + radiusWorld;
    const rightX = leftX + radiusWorld * 2 + gapWorld;
    const runX = bounds.right - marginWorld - radiusWorld;
    const jumpX = runX - radiusWorld * 2 - gapWorld;

    this._repositionButton(
      this.btnLeft,
      leftX,
      buttonY,
      radiusWorld,
      fontWorld,
    );
    this._repositionButton(
      this.btnRight,
      rightX,
      buttonY,
      radiusWorld,
      fontWorld,
    );
    this._repositionButton(this.btnRun, runX, buttonY, radiusWorld, fontWorld);
    this._repositionButton(
      this.btnJump,
      jumpX,
      buttonY,
      radiusWorld,
      fontWorld,
    );

    // Pause button: pojok kanan atas area yang terlihat, ukurannya juga
    // dihitung ulang dari CSS px supaya konsisten di semua layar.
    const pauseWPx = 52;
    const pauseHPx = 40;
    const pauseFontPx = 20;
    const pauseW = pxToWorld(this, pauseWPx);
    const pauseH = pxToWorld(this, pauseHPx);
    const pauseFont = pxToWorld(this, pauseFontPx);
    const pauseX = bounds.right - marginWorld - pauseW / 2;
    const pauseY = bounds.top + marginWorld + pauseH / 2;

    if (this._pauseBtn) {
      this._pauseBtn.setPosition(pauseX, pauseY);
      this._pauseBtn.setSize(pauseW, pauseH);
      // Sama seperti tombol sentuh lingkaran: hit area rectangle juga
      // perlu di-refresh manual setelah setSize(), kalau tidak area
      // klik tombol pause ini tetap memakai ukuran/posisi lama.
      this._pauseBtn.disableInteractive();
      this._pauseBtn.setInteractive({ useHandCursor: true });
    }
    if (this._pauseBtnText) {
      this._pauseBtnText.setPosition(pauseX, pauseY);
      this._pauseBtnText.setFontSize(pauseFont);
    }

    // Tombol fullscreen: persis di sebelah kiri tombol pause, dengan
    // jarak antar tombol (gapWorld) yang sama seperti tombol gerak.
    const fsW = pxToWorld(this, pauseWPx);
    const fsH = pxToWorld(this, pauseHPx);
    const fsFont = pxToWorld(this, 21);
    const fsX = pauseX - pauseW / 2 - gapWorld - fsW / 2;
    const fsY = pauseY;

    if (this._fsBtn) {
      this._fsBtn.setPosition(fsX, fsY);
      this._fsBtn.setSize(fsW, fsH);
      this._fsBtn.disableInteractive();
      this._fsBtn.setInteractive({ useHandCursor: true });
    }
    if (this._fsBtnText) {
      this._fsBtnText.setPosition(fsX, fsY);
      this._fsBtnText.setFontSize(fsFont);
    }

    this._repositionPauseMenu();

    // Tombol chat: kembalikan ke posisi FRAKSI yang tersimpan (kalau
    // pemain pernah menggesernya), atau default pojok kiri atas.
    // Radius & font juga dihitung ulang dari CSS px yang sama supaya
    // ukurannya konsisten di layar manapun.
    const chatRadiusPx = 26;
    const chatFontPx = 22;
    const chatRadius = pxToWorld(this, chatRadiusPx);
    const chatFont = pxToWorld(this, chatFontPx);
    const savedChatPos = this._loadChatBtnFraction();
    const chatX = bounds.left + (savedChatPos?.xFrac ?? 0.08) * bounds.width;
    const chatY = bounds.top + (savedChatPos?.yFrac ?? 0.24) * bounds.height;

    this._chatBtnRadius = chatRadius;
    this._chatBtnFont = chatFont;
    this._setChatBtnPosition(chatX, chatY);
    if (this._chatBtnGlow) this._chatBtnGlow.setRadius(chatRadius + 6);
    if (this._chatBtn) {
      this._chatBtn.setRadius(chatRadius);
      this._chatBtn.disableInteractive();
      // FIX: jangan nyalakan ulang interaktivitas kalau ikon ini sedang
      // sengaja disembunyikan (this._chatButtonVisible === false, mis.
      // Episode1Scene sebelum quest NPC selesai) — kalau tidak, resize/
      // rotasi layar akan diam-diam mengaktifkannya lagi walau masih
      // tidak seharusnya bisa ditekan.
      if (this._chatButtonVisible !== false) {
        this._chatBtn.setInteractive({ useHandCursor: true, draggable: true });
      }
    }
    if (this._chatBtnText) this._chatBtnText.setFontSize(chatFont);

    this._repositionProfileHud(bounds);
  }

  /** Pindahkan + resize ulang tombol sentuh (circle + text) ke posisi/ukuran baru. */
  _repositionButton(btn, x, y, radius, fontSize) {
    if (!btn) return;
    btn.circle.setPosition(x, y);
    btn.circle.setRadius(radius);
    // PENTING: setRadius() TIDAK otomatis memperbarui hit area interaktif
    // — Phaser menyimpan hit area sebagai snapshot geometri pada saat
    // setInteractive() pertama kali dipanggil. Kalau ini tidak
    // di-refresh, area yang benar-benar bisa di-tap jadi tidak sinkron
    // dengan ukuran visual tombol setelah resize/rotasi (gejala persis
    // "tombol kelihatan tapi tidak bisa diklik" setelah ganti orientasi).
    // Solusi paling aman: matikan lalu aktifkan ulang interactive supaya
    // hit area dihitung ulang dari ukuran barunya.
    btn.circle.disableInteractive();
    btn.circle.setInteractive({ useHandCursor: true });
    btn.text.setPosition(x, y);
    if (fontSize) btn.text.setFontSize(fontSize);
  }

  getMuteLabel() {
    return this.isMuted
      ? '🔇 Suara: Mati (tap untuk nyalakan)'
      : '🔊 Suara: Nyala (tap untuk matikan)';
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    this.audioManager?.setMasterVolume(this.isMuted ? 0 : 1);
    this.muteLabelText?.setText(this.getMuteLabel());
    setMuted(this.isMuted);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    this.pauseMenuContainer.setVisible(this.isPaused);

    if (this.isPaused) {
      // Hentikan dulu suara langkah kaki yang mungkin sedang berbunyi,
      // dan bekukan fisika supaya karakter tidak diam-diam terus
      // bergerak/lompat di belakang menu jeda.
      // (Listener animationupdate otomatis berhenti saat animasi berhenti.)
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  goToEpisodeSelect() {
    this.isPaused = false;
    this.scene.start('EpisodeSelectScene');
  }

  goToMainMenu() {
    this.isPaused = false;
    this.scene.start('MenuScene');
  }

  update(time, delta) {
    // ESC selalu dicek duluan, baik untuk membuka maupun menutup menu
    // jeda — TAPI khusus untuk MEMBUKA menu jeda (belum isPaused),
    // sekarang diblokir selama uiInputLocked (dialog NPC atau overlay
    // React lain sedang aktif). FIX: dulu ESC tetap bisa membuka menu
    // jeda kapan pun, termasuk di tengah dialog dengan NPC — dari sana
    // pemain bisa pilih "Mulai Ulang dari Awal"/"Pilih Episode" dan
    // scene langsung pindah TANPA dialog box sempat menutup dirinya
    // sendiri secara normal, meninggalkan listener resize/keyboard
    // yang nyangkut dan memicu crash "reading 'sys' of undefined" saat
    // scene lain dibuka berikutnya (lihat juga jaring pengaman kedua
    // di DialogueBox.js). Menutup menu jeda yang SUDAH terbuka (ESC
    // kedua) tetap selalu diizinkan.
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) {
      if (this.isPaused || !this.uiInputLocked) {
        this.togglePause();
      }
    }
    if (this.isPaused) {
      return;
    }
    if (this.uiInputLocked) {
      return;
    }

    const jumpJustPressed =
      Phaser.Input.Keyboard.JustDown(this.jumpKey) ||
      this.touchState.jumpRequested;
    this.touchState.jumpRequested = false;

    const goLeftInput =
      this.cursors.left.isDown ||
      this.keysWASD.left.isDown ||
      this.touchState.left;
    const goRightInput =
      this.cursors.right.isDown ||
      this.keysWASD.right.isDown ||
      this.touchState.right;
    const currentDirection = goLeftInput ? -1 : goRightInput ? 1 : 0;

    if (Phaser.Input.Keyboard.JustDown(this.shiftKeyLeft)) {
      this.touchState.runToggle = !this.touchState.runToggle;
    }
    const isRunning = this.touchState.runToggle;
    const speed = isRunning ? RUN_SPEED : WALK_SPEED;

    if (this.btnRun && this.lastRunVisual !== isRunning) {
      this.lastRunVisual = isRunning;
      this.btnRun.circle.setFillStyle(
        isRunning ? 0xffdd57 : 0x1a1a2e,
        isRunning ? 0.85 : 0.55,
      );
      this.btnRun.text.setColor(isRunning ? '#1a1a2e' : '#ffffff');
    }

    if (jumpJustPressed && !this.isJumping) {
      this.isJumping = true;
      this.jumpLocksMovement = currentDirection === 0;
      this.audioManager?.playJump();

      if (this.jumpLocksMovement) {
        this.player.play('jump', true);
      } else {
        this.player.anims.stop();
        this.player.setTexture('player-jump-run-1');
      }

      this.tweens.add({
        targets: this.player,
        y: this.groundY - JUMP_HEIGHT,
        duration: JUMP_DURATION / 2,
        ease: 'Sine.easeOut',
        yoyo: true,
        onYoyo: () => {
          if (!this.jumpLocksMovement) {
            this.player.setTexture('player-jump-run-2');
          }
        },
        onComplete: () => {
          this.isJumping = false;
          this.jumpLocksMovement = false;
          this.player.y = this.groundY;
          // Catatan: AudioManager belum punya bunyi khusus "mendarat",
          // cuma playJump() untuk lepas landas. Kalau nanti mau
          // ditambah, tinggal buat method playLand() baru di
          // AudioManager.js lalu panggil di sini.
        },
      });
    }

    if (this.isJumping) {
      if (this.jumpLocksMovement) {
        this.player.setVelocityX(0);
      } else {
        if (goLeftInput) {
          this.player.setVelocityX(-speed);
          this.player.setFlipX(true);
        } else if (goRightInput) {
          this.player.setVelocityX(speed);
          this.player.setFlipX(false);
        } else {
          this.player.setVelocityX(0);
        }
      }
      this.player.setScale(this.spriteScale);
      this._updatePortraitCamera();
      this.onSceneUpdate(time, delta);
      return;
    }

    const animKey = isRunning ? 'run' : 'walk';

    if (currentDirection === -1) {
      this.player.setVelocityX(-speed);
      this.player.setFlipX(true);
      this.player.setScale(this.spriteScale);
      // SFX footstep di-trigger oleh listener animationupdate di
      // _registerFootstepListeners(), bukan di sini — jadi ritme bunyi
      // selalu selaras dengan frame animasi, bukan frame rate game.
      this.player.play(animKey, true);
    } else if (currentDirection === 1) {
      this.player.setVelocityX(speed);
      this.player.setFlipX(false);
      this.player.setScale(this.spriteScale);
      this.player.play(animKey, true);
    } else {
      this.player.setVelocityX(0);
      this.player.stop();
      this.player.setTexture('player-idle');
      this.player.setScale(this.spriteScale);
    }

    this._updatePortraitCamera();
    this.onSceneUpdate(time, delta);
  }

  /**
   * Geser kamera secara MANUAL tiap frame — dipakai UNIVERSAL untuk
   * semua orientasi (dulu cuma portrait, sekarang landscape juga pakai
   * skema yang sama persis, sesuai permintaan supaya landscape ikut
   * bisa "mentok baru kamera follow"). Clamp di sini pakai LEBAR AREA
   * YANG BENAR-BENAR TERLIHAT (visBounds.width, hasil crop ENVELOP kalau
   * ada), bukan lebar viewport kamera penuh seperti Camera.startFollow()
   * bawaan Phaser.
   *
   * Kalau this.levelWidth <= visBounds.width (level sudah muat penuh di
   * layar — kasus umum landscape dengan background natural yang pas/
   * lebih sempit dari layar), minScroll & maxScroll di bawah otomatis
   * sama-sama 0, jadi kamera otomatis diam — PERSIS seperti perilaku
   * statis yang dulu di-hardcode khusus landscape, tapi sekarang
   * didapat "gratis" dari rumus yang sama tanpa percabangan kode.
   */
  _updatePortraitCamera() {
    if (!this.player) return;

    const visBounds = getVisibleBounds(this);

    // Batas scroll minimum & maksimum supaya jendela yang BENAR-BENAR
    // terlihat (bukan lebar dunia game penuh) tidak pernah menampilkan
    // area di luar level (kosong di kiri sebelum x=0, atau kosong di
    // kanan setelah x=levelWidth). Kedua batas ini WAJIB ikut
    // memperhitungkan visBounds.left (offset crop) — lihat penjelasan
    // panjang di bawah pada targetScroll kalau masih bingung kenapa.
    const minScroll = -visBounds.left;
    const maxScroll = Math.max(
      minScroll,
      this.levelWidth - visBounds.left - visBounds.width,
    );

    // PENTING: target scroll harus memperhitungkan visBounds.left
    // (offset crop ENVELOP), bukan cuma visBounds.width saja.
    // Kalau ada crop tersisa (mis. dari pembulatan dynamicWidth di
    // syncGameSizeToOrientation), world x=0 TIDAK berada di tepi kiri
    // layar — ia berada visBounds.left unit di sebelah kiri area yang
    // benar-benar terlihat. Rumus lama (`player.x - visBounds.width/2`)
    // mengabaikan offset ini sama sekali, sehingga saat crop cukup
    // besar, jendela kamera yang benar-benar tampil di layar bisa
    // sama sekali tidak menyentuh posisi karakter — karakter jadi
    // "hilang" (dirender di luar area yang ke-crop, walau clamp scroll
    // itu sendiri terlihat masuk akal di atas kertas).
    const targetScroll = Phaser.Math.Clamp(
      this.player.x - visBounds.left - visBounds.width / 2,
      minScroll,
      maxScroll,
    );

    // Sedikit smoothing (lerp) supaya kamera tidak "nempel kaku" ke
    // karakter — nilai 0.1 dipilih senada dengan lerp startFollow yang
    // dipakai sebelumnya, terasa halus tapi tetap responsif.
    const cam = this.cameras.main;
    cam.scrollX = Phaser.Math.Linear(cam.scrollX, targetScroll, 0.1);
  }
}
