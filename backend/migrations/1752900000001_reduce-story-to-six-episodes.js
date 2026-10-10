/**
 * Menyesuaikan tabel referensi dengan alur final enam episode.
 *
 * Foreign key progres memakai ON DELETE CASCADE, sehingga progres lama
 * Episode 7-9 yang tidak lagi kompatibel ikut dibersihkan. Referensi pada
 * analisis/konseling/notifikasi memakai ON DELETE SET NULL sehingga catatan
 * keselamatan tetap tersimpan tanpa menunjuk episode yang sudah dihapus.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE episodes
    SET title = 'Langkah Berani Bersama'
    WHERE id = 6;

    DELETE FROM episodes
    WHERE id BETWEEN 7 AND 9;
  `);
};

/**
 * Mengembalikan daftar referensi lama. Data progres yang sudah dibersihkan
 * pada saat up tidak dapat direkonstruksi oleh migrasi turun.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    UPDATE episodes
    SET title = 'Berani Berkata Tidak'
    WHERE id = 6;

    INSERT INTO episodes (id, title, order_index) VALUES
      (7, 'Mencari Tempat Aman', 7),
      (8, 'Suara untuk Diriku', 8),
      (9, 'Langkah Baru', 9)
    ON CONFLICT (id) DO NOTHING;
  `);
};
