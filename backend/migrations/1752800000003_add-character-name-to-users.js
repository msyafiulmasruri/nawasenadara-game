/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Nama TOKOH dalam game (bukan nama akun/user.name) — diisi pemain
 * sekali lewat prompt "Mulai Petualangan" sebelum episode pertama
 * dimulai (lihat GameUIBridge.jsx promptCharacterName & MenuScene.js),
 * dipakai buat substitusi `{PLAYER_NAME}` di naskah dialog
 * (episode1Dialogue.js dst) dan ditampilkan di HUD profil
 * (BasePlayerScene.createProfileHud). Nullable karena user lama /
 * yang belum pernah main belum tentu sudah mengisinya.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.addColumn('users', {
    character_name: {
      type: 'VARCHAR(50)',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropColumn('users', ['character_name']);
};
