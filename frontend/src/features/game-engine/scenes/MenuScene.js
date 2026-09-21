import Phaser from 'phaser';
import { startMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';
import { drawStarfieldBackground } from '../utils/starfieldBackground';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';
import { hasCharacterName } from '../utils/characterName';

// Ada progres tersimpan (episode manapun sudah 'in_progress' atau
// 'completed') kalau ada minimal satu baris di cache server yang
// statusnya bukan 'locked'/'unlocked' murni default. Episode 1 selalu
// dipaksa 'unlocked' oleh backend meski belum pernah disentuh sama
// sekali (lihat progress-controller.js) — jadi status 'unlocked' PADA
// EPISODE 1 SAJA tidak dihitung sebagai "sudah pernah main".
function hasExistingProgress() {
  if (typeof window === 'undefined') return false;
  const cache = window.__nawasenadaraProgressCache;
  if (!Array.isArray(cache)) return false;
  return cache.some((row) => {
    if (row.episode_id === 1 && row.status === 'unlocked') return false;
    return row.status === 'in_progress' || row.status === 'completed' || row.status === 'unlocked';
  });
}

export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // WAJIB di awal — lihat dokumentasi di syncGameSizeToOrientation()
    // (utils/visibleBounds.js). Scene ini tidak menggambar rectangle
    // background sendiri, tapi posisi/hit-area menu tetap bergantung
    // pada getVisibleBounds() yang baca gameSize — kalau gameSize basi
    // (bekas scene episode landscape sebelumnya), menu bisa muncul
    // sedikit tidak center.
    const { width, height } = syncGameSizeToOrientation(this);
    const bounds0 = getVisibleBounds(this);

    // Background langit + bintang berkedip — konsisten dengan
    // TitleScene (sebelumnya scene ini benar-benar polos/hitam).
    this._starfield = drawStarfieldBackground(this, width, height);

    // Musik tema menu: idempotent (kalau sudah jalan dari TitleScene,
    // panggilan ini no-op). Kalau pemain baru saja KEMBALI dari
    // gameplay episode (di mana musik menu sempat dihentikan lewat
    // stopMenuBGM() di BasePlayerScene), panggilan ini yang menyalakannya
    // lagi.
    startMenuBGM(getSettings());
    const menuFont = pxToWorld(this, 26);
    const options = ['Start Story', 'Settings', 'Exit'];
    let selectedIndex = 0;
    this._menuLocked = false;

    const confirmSelection = () => {
      // FIX: sebelumnya menu item lain (Settings/Exit) masih bisa
      // di-hover/diklik SAAT overlay Lanjutkan/Mulai Baru terbuka,
      // karena listener pointerover/pointerdown teks menu tidak
      // pernah dicek terhadap status overlay. Sekarang semua input
      // menu diblokir total selagi `this._menuLocked` true.
      if (this._menuLocked) return;
      if (options[selectedIndex] === 'Start Story') {
        this._handleStartStory();
      } else if (options[selectedIndex] === 'Settings') {
        this.scene.start('SettingsScene');
      } else if (options[selectedIndex] === 'Exit') {
        this._handleExit();
      }
    };

    const updateSelection = () => {
      if (this._menuLocked) return;
      this._menuTexts.forEach((text, i) => {
        text.setColor(i === selectedIndex ? '#ffdd57' : '#ffffff');
      });
    };

    // Ukuran font pakai pxToWorld() (px fisik) + wordWrap jaga-jaga —
    // lihat catatan lengkap soal ini di EpisodeIntroScene.create().
    this._menuTexts = options.map((label, i) =>
      this.add
        .text(width / 2, height / 2 + i * 40, label, {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${menuFont}px`,
          fontStyle: '600',
          color: i === 0 ? '#ffdd57' : '#ffffff',
          align: 'center',
          wordWrap: { width: bounds0.width * 0.9 },
        })
        .setOrigin(0.5)
        .setDepth(2)
        // Supaya tiap opsi bisa di-tap langsung lewat HP (atau diklik
        // mouse), bukan cuma dipilih lewat panah keyboard.
        .setInteractive({ useHandCursor: true })
        .on('pointerover', () => {
          selectedIndex = i;
          updateSelection();
        })
        .on('pointerdown', () => {
          selectedIndex = i;
          updateSelection();
          confirmSelection();
        }),
    );

    this.input.keyboard.on('keydown-DOWN', () => {
      if (this._menuLocked) return;
      selectedIndex = (selectedIndex + 1) % options.length;
      updateSelection();
    });

    this.input.keyboard.on('keydown-UP', () => {
      if (this._menuLocked) return;
      selectedIndex = (selectedIndex - 1 + options.length) % options.length;
      updateSelection();
    });

    this.input.keyboard.on('keydown-ENTER', confirmSelection);

    // Sebelumnya scene ini sama sekali tidak punya listener resize.
    // Item menu ditaruh di tengah dunia (width/2), yang secara
    // horizontal biasanya tetap aman dari crop mode ENVELOP karena
    // selalu berada di centerX — TAPI hit area interaktif teks tidak
    // ikut di-refresh setelah rotasi/resize, dan posisi vertikal
    // idealnya tetap mengacu ke centerY area yang benar-benar
    // terlihat, bukan height/2 dunia mentah. Ditambahkan supaya
    // konsisten dengan scene lain dan mencegah tombol "tidak
    // terklik" setelah ganti orientasi.
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
    });

    this._reposition();
  }

  // "Exit" di game web bukan menutup aplikasi (tidak ada konsep itu di
  // browser), tapi keluar dari SESI AKUN — logout, lalu kembali ke
  // halaman login. Logout sebenarnya (hapus cookie refresh token +
  // panggil POST /api/auth/logout) dilakukan lewat AuthContext di sisi
  // React, dijembatani ke Phaser lewat window.__nawasenadaraAuth (lihat
  // features/auth/components/GameAuthBridge.jsx yang dipasang di
  // app/game/page.js).
  // "Start Story" ditekan. Kalau pemain BELUM PERNAH mengisi nama
  // tokoh (character_name masih kosong di server — lihat
  // GameProfileBridge.jsx), tampilkan overlay pengisian nama dulu
  // (window.__nawasenadaraUI.promptCharacterName(), lihat
  // GameUIBridge.jsx) dan TUNGGU sampai disubmit sebelum lanjut ke
  // EpisodeSelectScene. Pemain lama yang sudah punya nama tersimpan
  // langsung lanjut seperti biasa, tidak ditanya ulang.
  async _handleStartStory() {
    if (this._startingStory) return;
    this._startingStory = true;
    this._menuLocked = true;

    // FIX: sebelumnya status "Menyiapkan…"/"Mereset progres…" ditulis
    // dengan MENIMPA teks tombol "Start Story" itu sendiri
    // (startLabel.setText(...)), lalu dikembalikan lagi ke "Start
    // Story" setelah selesai. Ini berisiko: hit area interaktif Phaser
    // untuk sebuah Text object adalah SNAPSHOT ukuran saat
    // setInteractive() pertama dipanggil — tidak otomatis menyesuaikan
    // kalau lebar teksnya berubah belakangan. Kalau ukurannya sempat
    // mismatch, tombolnya bisa jadi "kadang tidak bisa diklik" di
    // percobaan berikutnya. Sekarang teks tombol TIDAK PERNAH diubah
    // sama sekali — status ditampilkan di teks terpisah di bawahnya.
    const statusText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 90, '', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${pxToWorld(this, 15)}px`,
        color: '#aaaaaa',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    try {
      if (!hasCharacterName()) {
        const profile = window.__nawasenadaraProfile;
        // Cek sekali lagi ke server (bukan cuma cache lokal) —
        // menangani kasus pemain login dari device lain yang sudah
        // pernah mengisi nama sebelumnya.
        const serverName = profile?.fetchProfile ? await profile.fetchProfile() : null;

        if (!serverName) {
          statusText.setText('Menyiapkan…');
          const ui = window.__nawasenadaraUI;
          if (ui?.promptCharacterName) {
            await ui.promptCharacterName();
          }
        }
      }

      // FIX: "Mulai Ulang dari Awal" di menu jeda (BasePlayerScene)
      // DIHAPUS — sebelumnya cuma reset tampilan LOKAL tanpa
      // menyentuh server sama sekali, jadi progres lama "hidup lagi"
      // begitu cache di-refresh, DAN scene Episode1 yang dibuka ulang
      // dari situ memicu crash (referensi GameObject basi — lihat
      // fix di BasePlayerScene.create()). Sekarang titik keputusannya
      // dipindah ke SINI, satu-satunya tempat pemain mulai bermain:
      // kalau terdeteksi ada progres tersimpan, tanya dulu mau
      // lanjut atau mulai baru (yang benar-benar mereset di server).
      if (hasExistingProgress()) {
        const choice = await this._promptContinueOrNewGame();
        if (choice === 'new') {
          statusText.setText('Mereset progres…');
          try {
            await window.__nawasenadaraProgress?.resetAll();
          } catch (err) {
            console.warn('Gagal mereset progres di server:', err);
          }
        }
        // choice === 'continue' -> lanjut apa adanya, tidak perlu
        // aksi tambahan.
      }

      this.scene.start('EpisodeSelectScene');
    } finally {
      this._startingStory = false;
      this._menuLocked = false;
      statusText.destroy();
    }
  }

  // Overlay pilihan 2 tombol sederhana — dipakai HANYA saat pemain
  // punya progres tersimpan dan menekan "Start Story". Mengembalikan
  // Promise yang resolve 'continue' atau 'new' sesuai pilihan.
  _promptContinueOrNewGame() {
    return new Promise((resolve) => {
      const { width, height } = getVisibleBounds(this);
      const centerX = width / 2;
      const centerY = height / 2;

      const overlayDepth = 10;
      const dim = this.add
        .rectangle(centerX, centerY, width, height, 0x000000, 0.75)
        .setDepth(overlayDepth)
        // FIX: sebelumnya rectangle ini TIDAK interaktif, jadi cuma
        // gelap secara visual — klik masih bisa "tembus" ke tombol
        // menu (Start Story/Settings/Exit) di depth lebih rendah di
        // baliknya. Phaser hanya mengirim event pointer ke objek
        // interaktif PALING ATAS (berdasar depth) di bawah kursor;
        // dengan dim ini interaktif & depth-nya di atas semua menu
        // item, klik ke area manapun di belakangnya otomatis
        // terblokir total, bahkan tanpa perlu handler apa pun di sini.
        .setInteractive();

      const titleText = this.add
        .text(centerX, centerY - 70, 'Kamu punya progres permainan sebelumnya', {
          fontFamily: '"Pixelify Sans", monospace',
          fontSize: `${pxToWorld(this, 19)}px`,
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: width * 0.8 },
        })
        .setOrigin(0.5)
        .setDepth(overlayDepth + 1);

      const makeButton = (y, label, color) =>
        this.add
          .text(centerX, y, label, {
            fontFamily: '"Pixelify Sans", monospace',
            fontSize: `${pxToWorld(this, 21)}px`,
            fontStyle: '600',
            color,
            backgroundColor: '#00000000',
          })
          .setOrigin(0.5)
          .setDepth(overlayDepth + 1)
          .setInteractive({ useHandCursor: true });

      const continueBtn = makeButton(centerY, 'Lanjutkan Permainan Lama', '#ffdd57');
      const newGameBtn = makeButton(centerY + 44, 'Mulai Permainan Baru', '#ff6b6b');

      const cleanup = () => {
        dim.destroy();
        titleText.destroy();
        continueBtn.destroy();
        newGameBtn.destroy();
      };

      continueBtn.on('pointerdown', () => {
        cleanup();
        resolve('continue');
      });
      newGameBtn.on('pointerdown', () => {
        cleanup();
        resolve('new');
      });
    });
  }

  _handleExit() {
    if (this._exiting) return;
    this._exiting = true;

    const exitLabel = this._menuTexts[2];
    exitLabel?.setText('Logging out…');
    exitLabel?.setColor('#ffdd57');

    const bridge = typeof window !== 'undefined' ? window.__nawasenadaraAuth : null;
    const goToLogin = () => {
      if (typeof window !== 'undefined') window.location.href = '/login';
    };

    if (bridge?.logout) {
      bridge
        .logout()
        .catch(() => {
          // Tetap arahkan ke /login walau request logout ke server
          // gagal (mis. jaringan putus) — sesi lokal (access token di
          // memori React) tetap dibersihkan oleh AuthContext.logout().
        })
        .finally(goToLogin);
    } else {
      // Bridge belum siap (kasus langka) — tetap arahkan ke /login,
      // yang otomatis akan minta login ulang.
      goToLogin();
    }
  }

  _reposition() {
    const { width, height } = syncGameSizeToOrientation(this);
    this._starfield?.reposition(width, height);
    const bounds = getVisibleBounds(this);
    const font = pxToWorld(this, 22);
    this._menuTexts?.forEach((text, i) => {
      text.setPosition(bounds.centerX, bounds.centerY + (i - (this._menuTexts.length - 1) / 2) * 44);
      text.setFontSize(font);
      text.setWordWrapWidth(bounds.width * 0.9);
      // Refresh hit area setiap resize — sama seperti tombol sentuh di
      // BasePlayerScene, Phaser tidak otomatis mensinkronkan hit area
      // lama dengan posisi/ukuran baru objek setelah scale berubah.
      text.disableInteractive();
      text.setInteractive({ useHandCursor: true });
    });
  }
}
