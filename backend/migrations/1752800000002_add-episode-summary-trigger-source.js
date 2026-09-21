/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Menambah 'episode_summary' sebagai trigger_source valid —
 * dipakai giliran pembuka OTOMATIS chatbot Kak Dara berisi ringkasan
 * obrolan NPC episode ybs (dikirim frontend sendiri, tanpa pemain
 * mengetik apa pun sama sekali, lihat GameUIBridge.jsx openChatbot()
 * & features/game-engine/dialogue/episode1Dialogue.js
 * buildEpisode1CounselingContext()). Beda dari 'reflection_flag' (ajakan
 * SETELAH jurnal refleksi, masih perlu pemain pilih "mau ngobrol") —
 * 'episode_summary' sudah langsung berisi pesan & balasannya begitu
 * sesi chat dibuka.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check:
      "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone', 'episode_summary')",
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropConstraint('counseling_sessions', 'chk_counseling_trigger_source');
  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check: "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone')",
  });
};
