// Definisi seluruh animasi player, dipanggil SEKALI saja dari
// BootScene.create() — bukan dari tiap scene episode.
//
// PENTING soal frameRate: this.anims di Phaser bersifat GLOBAL untuk satu
// instance game, bukan per-scene. Kalau anims.create() dipanggil lagi
// dengan `key` yang sama (misalnya karena tiap scene episode ikut
// memanggilnya di create()), Phaser akan DIAM-DIAM mengabaikan
// pemanggilan itu (key sudah ada), jadi perubahan frameRate di kode
// tidak pernah benar-benar terpasang setelah animasi pertama kali dibuat
// di sesi itu — persis gejala "sudah diubah kok tidak berpengaruh".
//
// Untuk mengubah kecepatan animasi (frameRate), edit angkanya di sini.
// Setelah edit, WAJIB full reload browser (bukan cuma pindah
// episode/scene di dalam game), karena BootScene -> create() cuma
// jalan sekali di awal sesi; kalau sedang `npm run dev`, kadang Fast
// Refresh Next.js juga mempertahankan instance Phaser Game yang lama,
// jadi kalau masih terlihat belum berubah, coba hard refresh
// (Ctrl+Shift+R) atau restart dev server-nya.
export function createPlayerAnimations(scene) {
  scene.anims.create({
    key: 'walk',
    frames: [
      { key: 'player-walk-1' },
      { key: 'player-walk-2' },
      { key: 'player-walk-3' },
      { key: 'player-walk-4' },
      { key: 'player-walk-5' },
    ],
    frameRate: 8,
    repeat: -1,
  });

  scene.anims.create({
    key: 'run',
    frames: [
      { key: 'player-run-1' },
      { key: 'player-run-2' },
      { key: 'player-run-3' },
      { key: 'player-run-4' },
    ],
    frameRate: 8,
    repeat: -1,
  });

  scene.anims.create({
    key: 'jump',
    frames: [
      { key: 'player-jump-1' },
      { key: 'player-jump-2' },
      { key: 'player-jump-3' },
    ],
    frameRate: 8,
    repeat: -1,
  });
}
