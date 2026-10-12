/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Memperbarui CHECK constraint chk_counseling_trigger_source agar
 * mengizinkan 'npc_quest' di samping 'manual', 'reflection_flag',
 * 'episode7_phone', dan 'episode_summary'.
 * Nilai 'npc_quest' dikirim frontend saat pemain menerima tawaran
 * konseling Kak Dara setelah menyelesaikan dialog quest NPC di tiap episode.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check:
      "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone', 'episode_summary', 'npc_quest')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check:
      "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone', 'episode_summary')",
  });
};
