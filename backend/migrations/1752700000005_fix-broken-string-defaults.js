/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * FIX: beberapa migrasi sebelumnya menulis DEFAULT kolom string sebagai
 * `default: "'rendah'"` (string JS yang SUDAH mengandung tanda kutip di
 * dalamnya). node-pg-migrate memperlakukan itu sebagai "nilai literal
 * apa adanya" dan men-dollar-quote SELURUH isinya termasuk tanda
 * kutipnya — hasilnya kolom itu defaultnya jadi string 10 karakter
 * `'rendah'` (tanda kutip ikut tersimpan sebagai karakter), BUKAN
 * string 6 karakter `rendah` yang dimaksud. Efeknya baru ketahuan saat
 * ada INSERT yang BENAR-BENAR mengandalkan default itu (tidak mengirim
 * kolomnya secara eksplisit) — Postgres lalu menolak baris itu karena
 * nilai defaultnya sendiri tidak lolos CHECK constraint (mis.
 * chk_counseling_highest_risk), persis seperti dilaporkan error
 * "POST /api/nlp/counseling 500" saat sesi konseling pertama kali
 * dibuat.
 *
 * `users.provider`/`users.role` & `counseling_sessions.trigger_source`
 * kebetulan "selamat" sejauh ini karena kode repository-nya SELALU
 * mengirim nilai eksplisit (lihat user-repositories.js:
 * `role || 'siswa'`), jadi defaultnya tidak pernah benar-benar
 * terpakai — tapi tetap diperbaiki di sini supaya tidak jadi jebakan
 * di masa depan kalau ada kode baru yang lupa mengirim kolom itu.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`ALTER TABLE users ALTER COLUMN provider SET DEFAULT 'local';`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'siswa';`);
  pgm.sql(`ALTER TABLE counseling_sessions ALTER COLUMN trigger_source SET DEFAULT 'manual';`);
  pgm.sql(`ALTER TABLE counseling_sessions ALTER COLUMN highest_risk_level SET DEFAULT 'rendah';`);
  pgm.sql(`ALTER TABLE user_episode_progress ALTER COLUMN status SET DEFAULT 'locked';`);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  // Kembalikan ke default lama (rusak) hanya untuk simetri rollback —
  // TIDAK disarankan benar-benar di-down kecuali memang mau reproduksi
  // bug ini.
  pgm.sql(`ALTER TABLE users ALTER COLUMN provider SET DEFAULT $$'local'$$;`);
  pgm.sql(`ALTER TABLE users ALTER COLUMN role SET DEFAULT $$'siswa'$$;`);
  pgm.sql(`ALTER TABLE counseling_sessions ALTER COLUMN trigger_source SET DEFAULT $$'manual'$$;`);
  pgm.sql(`ALTER TABLE counseling_sessions ALTER COLUMN highest_risk_level SET DEFAULT $$'rendah'$$;`);
  pgm.sql(`ALTER TABLE user_episode_progress ALTER COLUMN status SET DEFAULT $$'locked'$$;`);
};
