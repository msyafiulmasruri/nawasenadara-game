import Phaser from 'phaser';

/**
 * Gambar background langit hitam + bintang kecil berkedip — dipakai
 * bersama oleh TitleScene, MenuScene, dan SettingsScene supaya
 * konsisten (sebelumnya cuma TitleScene yang punya ini, jadi MenuScene
 * & SettingsScene terasa "mati"/berbeda begitu pemain lewat dari layar
 * judul).
 *
 * Dipanggil di awal create() tiap scene:
 *   const stars = drawStarfieldBackground(this, width, height);
 * Lalu di _reposition() scene tsb, panggil stars.reposition(width, height)
 * supaya background ikut menyesuaikan saat viewport berubah ukuran.
 */
export function drawStarfieldBackground(scene, width, height) {
  const bgRect = scene.add
    .rectangle(width / 2, height / 2, width, height, 0x05050f)
    .setDepth(0);

  const stars = [];
  for (let i = 0; i < 70; i += 1) {
    const x = Phaser.Math.Between(0, width);
    const y = Phaser.Math.Between(0, height);
    const size = Phaser.Math.FloatBetween(1, 2.4);
    const star = scene.add.circle(x, y, size, 0xffffff, Phaser.Math.FloatBetween(0.3, 1));
    star.setDepth(1);
    scene.tweens.add({
      targets: star,
      alpha: Phaser.Math.FloatBetween(0.15, 0.4),
      duration: Phaser.Math.Between(1200, 3200),
      yoyo: true,
      repeat: -1,
      delay: Phaser.Math.Between(0, 2000),
    });
    stars.push(star);
  }

  return {
    bgRect,
    stars,
    reposition(newWidth, newHeight) {
      bgRect.setPosition(newWidth / 2, newHeight / 2);
      bgRect.setSize(newWidth, newHeight);
      // Bintang sengaja TIDAK direposisi ulang satu-satu (posisi acak
      // baru tiap resize akan terasa "berkedip pindah" secara aneh) —
      // cukup background rect-nya yang menutupi area baru sepenuhnya.
    },
  };
}
