// Episode 2 dan 3 memakai artwork kamar yang sama (2750 x 1536).
// Koordinat berikut mengacu pada ruang kosong di permukaan meja, tepat
// di kanan laptop dan sebelum tempat pensil. Posisi dihitung dari lebar
// artwork asli yang sudah diskalakan, bukan dari lebar level tambahan.
export const DESK_PHONE_X_RATIO = 0.59;
export const DESK_PHONE_Y_RATIO = 0.572;

// Satu sumber ukuran/rotasi untuk Episode 2 dan 3. Dengan memakai
// konfigurasi yang sama, kedua ponsel tidak dapat bergeser visual hanya
// karena salah satu scene mengubah angka lokalnya sendiri.
export const DESK_PHONE_STYLE = Object.freeze({
  scale: 0.28,
  angle: 86,
  hitWidth: 104,
  hitHeight: 78,
  hitDepth: 4,
  haloWidth: 52,
  haloHeight: 14,
  promptFontPx: 15,
  promptOffsetY: 42,
});

export function getDeskPhonePosition(artworkWidth, worldHeight) {
  return {
    x: artworkWidth * DESK_PHONE_X_RATIO,
    y: worldHeight * DESK_PHONE_Y_RATIO,
  };
}
