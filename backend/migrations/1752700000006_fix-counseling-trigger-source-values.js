/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Episode 7 ("Mencari Tempat Aman") tidak lagi bertema objek telepon —
 * fitur "auto-open chatbot lewat NPC telepon" sudah digantikan desain
 * yang lebih umum: tawaran "ngobrol dengan Kak Dara?" yang muncul
 * setelah dialog quest NPC selesai di episode manapun (lihat
 * `offerCounseling`/`chooseCounseling` di GameUIBridge.jsx, frontend),
 * dikirim dengan trigger_source **'npc_quest'**.
 *
 * Frontend sudah memakai nilai 'npc_quest' ini, tapi validator Joi
 * (backend) dan CHECK constraint (database) masih memuat nilai lama
 * 'episode7_phone' — menyebabkan setiap chat yang dipicu NPC ditolak
 * dengan error 400 "trigger_source must be one of [...]" karena
 * 'npc_quest' belum ada di daftar yang diizinkan. Migration ini
 * menyamakan constraint database dengan validator yang sudah diperbaiki
 * di services/nlp/validator/schema.js.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // Migrasikan dulu baris lama (kalau ada) yang masih memakai nilai
  // 'episode7_phone', SEBELUM constraint baru diterapkan — supaya
  // ALTER constraint di bawah tidak gagal gara-gara data lama yang
  // sudah tidak sesuai daftar yang baru.
  pgm.sql(
    `UPDATE counseling_sessions SET trigger_source = 'npc_quest' WHERE trigger_source = 'episode7_phone'`,
  );

  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check: "trigger_source IN ('manual', 'reflection_flag', 'npc_quest')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(
    `UPDATE counseling_sessions SET trigger_source = 'episode7_phone' WHERE trigger_source = 'npc_quest'`,
  );

  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check: "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone')",
  });
};
