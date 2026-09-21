/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Menyimpan hasil analisis emosi dialog (bukan jurnal — jurnal tetap
 * lewat NLP service/tabel sentiment_analyses seperti sebelumnya) yang
 * dikirim frontend sebagai bagian `choices` (JSONB, tiap item sekarang
 * ikut bawa field `emotion`, lihat episode1Dialogue.js). Backend
 * menghitung `emotion_tally` (rekap 6 label) dan `ending_key` (ending
 * dominan) saat status di-set 'completed' — lihat
 * services/progress/controllers/progress-controller.js.
 *
 * Dipakai juga sebagai bahan agregasi ending akhir di Episode 9 nanti
 * (jumlah tally lintas semua episode user ybs).
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.addColumn('user_episode_progress', {
    emotion_tally: {
      type: 'JSONB',
      notNull: true,
      default: pgm.func(
        `'{"aman":0,"netral":0,"sedih":0,"takut":0,"marah":0,"menyinggung":0}'::jsonb`,
      ),
    },
    ending_key: {
      type: 'VARCHAR(30)',
    },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropColumn('user_episode_progress', ['emotion_tally', 'ending_key']);
};
