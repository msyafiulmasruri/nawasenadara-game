import Phaser from 'phaser';
import { createPlayerAnimations } from '../config/playerAnimations';
import { EPISODES } from '../config/episodes';
import { NPCS } from '../config/npcs';

export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // --- Loading bar ---
    // Sebelumnya scene ini tidak menggambar apa-apa selama preload()
    // berjalan — canvas cuma hitam polos sampai semua aset (background
    // tiap episode, sprite pemain, dll.) selesai dimuat. Di koneksi
    // lambat ini terasa seperti "macet"/tidak merespons. Sekarang
    // ditambah UI loading sederhana: judul + bar progres + persentase,
    // di-update lewat event 'progress' bawaan Phaser Loader, dan
    // dibersihkan otomatis di 'complete'.
    const { width, height } = this.scale;
    const barWidth = Math.min(width * 0.6, 360);
    const barHeight = 14;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    this.add.rectangle(width / 2, height / 2, width, height, 0x05050f).setDepth(0);

    const loadingText = this.add
      .text(width / 2, barY - 40, 'NAWASENA DARA', {
        fontFamily: 'monospace', // font pixel custom belum tentu siap dimuat browser di titik ini
        fontSize: '20px',
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(1);

    const percentText = this.add
      .text(width / 2, barY + barHeight + 18, '0%', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(1);

    const barBg = this.add
      .rectangle(width / 2, barY, barWidth, barHeight, 0x1a1a2e)
      .setStrokeStyle(2, 0x3a3a44)
      .setDepth(1);

    const barFill = this.add
      .rectangle(barX, barY, 1, barHeight - 4, 0xffdd57)
      .setOrigin(0, 0.5)
      .setDepth(1);

    this.load.on('progress', (value) => {
      barFill.width = Math.max(1, (barWidth - 4) * value);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      loadingText.destroy();
      percentText.destroy();
      barBg.destroy();
      barFill.destroy();
    });


    // Catatan: title-logo.png belum ada di aset proyek. TitleScene sudah
    // punya fallback teks pixel kalau texture ini tidak ditemukan, jadi
    // baris load-nya sengaja tidak diaktifkan sampai asetnya tersedia.
    // Kalau logo sudah siap, taruh filenya di public/ui/title-logo.png lalu
    // aktifkan lagi baris di bawah ini:
    // this.load.image('title-logo', '/ui/title-logo.png');

    this.load.image('press-start-bg', '/ui/press-start-bg.png');

    // --- Background semua episode, di-load dari satu sumber data ---
    // (config/episodes.js) supaya menambah episode baru tidak perlu
    // sentuh file ini lagi sama sekali.
    //
    // PENTING: file yang belum ada (episode 2-9 belum punya art asli)
    // TIDAK menggagalkan proses loading keseluruhan. Phaser's Loader
    // menembakkan event 'loaderror' PER FILE yang gagal lalu tetap
    // lanjut memuat sisanya — makanya aman untuk selalu mencoba
    // me-load SEMUA path di bawah dari sekarang, walau sebagian besar
    // filenya belum ada. PlaceholderEpisodeScene lalu mengecek
    // `this.textures.exists(bgKey)` saat runtime: kalau berhasil
    // dimuat (artinya file sudah ditaruh di public/scenes/), otomatis
    // dipakai sebagai background asli dengan logika portrait/landscape
    // yang sama persis seperti Episode1Scene; kalau belum ada, otomatis
    // fallback ke warna polos seperti sekarang. Jadi menambah art
    // episode baru nanti benar-benar cuma "taruh file, selesai" — tidak
    // perlu sentuh BootScene atau PlaceholderEpisodeScene sama sekali.
    this.load.on('loaderror', (file) => {
      // Diam-diam saja di console (bukan error UI) — ini kondisi yang
      // DIHARAPKAN terjadi untuk episode yang art-nya belum ada.
      console.info(`[BootScene] Aset opsional belum tersedia: ${file.key} (${file.src})`);
    });

    EPISODES.forEach((ep) => {
      if (ep.bgKey && ep.bgImagePath) {
        this.load.image(ep.bgKey, ep.bgImagePath);
      }
    });

    // --- Potret NPC pendukung cerita, satu per episode (config/npcs.js) ---
    // Sama seperti background episode: kalau suatu episode belum punya
    // NPC terdaftar di sana, ya tidak ada apa pun yang di-load untuk
    // episode itu — aman, tidak menggagalkan loading keseluruhan.
    Object.values(NPCS).forEach((npc) => {
      if (npc.portraitKey && npc.portraitPath) {
        this.load.image(npc.portraitKey, npc.portraitPath);
      }
    });

    // Sprite karakter: setiap pose disimpan sebagai file gambar terpisah,
    // dikelompokkan per folder animasi (idle/, walk/), bukan satu
    // spritesheet gabungan. Supaya gampang diganti/ditambah pose satu-satu
    // tanpa perlu re-export spritesheet, dan gampang nambah folder baru
    // (mis. talk/, blink/) mengikuti pola yang sama nanti.
    this.load.image('player-idle', '/sprites/player/idle/idle.png');

    // Foto wajah untuk avatar HUD profil (pojok kiri atas) — OPSIONAL.
    // Belum ada asetnya di public/characters/ saat ini, jadi baris ini
    // akan memicu 'loaderror' yang diam-diam diabaikan (lihat handler
    // di atas) dan BasePlayerScene.createProfileHud() otomatis fallback
    // ke crop sprite 'player-idle'. Begitu file
    // public/characters/player-face.png ditaruh, HUD otomatis memakainya
    // tanpa perlu ubah kode apa pun lagi.
    this.load.image('player-face', '/characters/player-face.png');

    this.load.image('player-walk-1', '/sprites/player/walk/walk_1.png');
    this.load.image('player-walk-2', '/sprites/player/walk/walk_2.png');
    this.load.image('player-walk-3', '/sprites/player/walk/walk_3.png');
    this.load.image('player-walk-4', '/sprites/player/walk/walk_4.png');
    this.load.image('player-walk-5', '/sprites/player/walk/walk_5.png');

    this.load.image('player-run-1', '/sprites/player/run/run_1.png');
    this.load.image('player-run-2', '/sprites/player/run/run_2.png');
    this.load.image('player-run-3', '/sprites/player/run/run_3.png');
    this.load.image('player-run-4', '/sprites/player/run/run_4.png');

    this.load.image('player-jump-1', '/sprites/player/jump/jump_1.png');
    this.load.image('player-jump-2', '/sprites/player/jump/jump_2.png');
    this.load.image('player-jump-3', '/sprites/player/jump/jump_3.png');

    this.load.image('player-jump-run-1', '/sprites/player/jump_run/jump_run_1.png');
    this.load.image('player-jump-run-2', '/sprites/player/jump_run/jump_run_2.png');

    // Catatan: sound effect & BGM TIDAK di-load sebagai file di sini.
    // Sekarang dipakai AudioManager (src/features/game-engine/audio/AudioManager.js)
    // yang generate suara secara real-time via Web Audio API langsung
    // di browser, jadi tidak butuh file audio sama sekali.
  }

  async create() {
    // Animasi player dibuat SEKALI di sini, bukan di tiap scene episode
    // (lihat catatan lengkap di config/playerAnimations.js soal kenapa).
    createPlayerAnimations(this);

    // Pastikan font pixel (Jersey 15, Pixelify Sans) sudah dimuat browser
    // sebelum scene teks dibuat, supaya tidak fallback ke font default sesaat.
    try {
      await Promise.all([
        document.fonts.load('16px "Jersey 15"'),
        document.fonts.load('16px "Pixelify Sans"'),
      ]);
      await document.fonts.ready;
    } catch (e) {
      // Kalau gagal load (mis. offline), tetap lanjut dengan fallback monospace
      console.warn('Pixel font gagal dimuat, pakai fallback.', e);
    }

    this.scene.start('TitleScene');
  }
}
