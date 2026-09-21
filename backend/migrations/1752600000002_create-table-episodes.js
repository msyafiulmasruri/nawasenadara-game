/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Tabel referensi statis daftar episode — isinya sengaja MENCERMINKAN
 * src/features/game-engine/config/episodes.js di frontend (judul & urutan
 * yang sama). Sumber kebenaran alur cerita/aset tetap di frontend;
 * tabel ini di backend dipakai sebagai target foreign key yang valid
 * untuk user_episode_progress, dan supaya endpoint laporan progres
 * (mis. untuk dashboard guru BK nanti) bisa JOIN judul episode tanpa
 * hardcode ulang di backend.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('episodes', {
    id: {
      type: 'SMALLINT',
      primaryKey: true,
    },
    title: {
      type: 'VARCHAR(150)',
      notNull: true,
    },
    order_index: {
      type: 'SMALLINT',
      notNull: true,
    },
  });

  pgm.addConstraint('episodes', 'uq_episodes_order_index', {
    unique: 'order_index',
  });

  pgm.sql(`
    INSERT INTO episodes (id, title, order_index) VALUES
      (1, 'Awal yang Baru', 1),
      (2, 'Rahasia di Grup Kelas', 2),
      (3, 'Pesan dari Orang Asing', 3),
      (4, 'Candaan yang Tidak Nyaman', 4),
      (5, 'Ketika Sahabat Berubah', 5),
      (6, 'Berani Berkata Tidak', 6),
      (7, 'Mencari Tempat Aman', 7),
      (8, 'Suara untuk Diriku', 8),
      (9, 'Langkah Baru', 9);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('episodes');
};
