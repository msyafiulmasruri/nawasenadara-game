/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Chatbot Konseling Virtual (persona "Kak Dara", lihat proposal 2.2.6)
 * disimpan sebagai sesi + pesan, mirip pola percakapan chat pada
 * umumnya:
 *  - counseling_sessions : satu "percakapan" — dibuka otomatis saat
 *    pemain pertama kali kirim pesan (baik dibuka manual lewat ikon
 *    akses cepat, MAUPUN saat auto-muncul sebagai NPC telepon di
 *    Episode 7 ketika distres tinggi terdeteksi dari episode
 *    sebelumnya — lihat kolom `trigger_source`).
 *  - counseling_messages : tiap giliran chat (pesan siswa & balasan
 *    "Kak Dara"), termasuk hasil analisis emosi PER PESAN siswa (dari
 *    field emotion_detected/emotion_confidence/risk_level/escalated
 *    di CounselingChatResponse, app/schemas.py nlp-service).
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('counseling_sessions', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    // 'manual'         : siswa membuka sendiri lewat ikon akses cepat
    //                    (tersedia kapan pun, lihat proposal 3.1.1).
    // 'reflection_flag' : dibuka lewat ajakan halus setelah jurnal
    //                    refleksi akhir episode terdeteksi distres.
    // 'episode7_phone'  : auto-muncul sebagai NPC telepon di Episode 7
    //                    karena akumulasi risiko tinggi dari episode
    //                    sebelumnya (lihat catatan alur di
    //                    NLP_INTEGRATION_DESIGN.md).
    trigger_source: {
      type: 'VARCHAR(30)',
      notNull: true,
      default: "'manual'",
    },
    episode_id: {
      type: 'SMALLINT',
      references: 'episodes',
      onDelete: 'SET NULL',
    },
    // Level risiko TERTINGGI yang pernah tercatat di sesi ini —
    // di-update tiap ada pesan baru, dipakai untuk sorting/filter cepat
    // di dashboard guru BK tanpa perlu JOIN+MAX ke counseling_messages
    // tiap kali.
    highest_risk_level: {
      type: 'VARCHAR(10)',
      notNull: true,
      default: "'rendah'",
    },
    escalated: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
    started_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    last_message_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    closed_at: {
      type: 'TIMESTAMPTZ',
    },
  });

  pgm.addConstraint('counseling_sessions', 'chk_counseling_trigger_source', {
    check:
      "trigger_source IN ('manual', 'reflection_flag', 'episode7_phone')",
  });
  pgm.addConstraint('counseling_sessions', 'chk_counseling_highest_risk', {
    check: "highest_risk_level IN ('rendah', 'sedang', 'tinggi')",
  });

  pgm.createIndex('counseling_sessions', 'user_id', {
    name: 'idx_counseling_sessions_user_id',
  });

  pgm.createTable('counseling_messages', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    session_id: {
      type: 'UUID',
      notNull: true,
      references: 'counseling_sessions',
      onDelete: 'CASCADE',
    },
    role: {
      type: 'VARCHAR(10)',
      notNull: true,
    },
    content: {
      type: 'TEXT',
      notNull: true,
    },
    // Kolom di bawah ini NULL untuk pesan role='assistant' (balasan
    // "Kak Dara") — analisis emosi cuma dihitung dari pesan SISWA.
    emotion_label: {
      type: 'VARCHAR(20)',
    },
    emotion_confidence: {
      type: 'NUMERIC(5,4)',
    },
    risk_level: {
      type: 'VARCHAR(10)',
    },
    escalated: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('counseling_messages', 'chk_counseling_msg_role', {
    check: "role IN ('user', 'assistant')",
  });
  pgm.addConstraint('counseling_messages', 'chk_counseling_msg_risk', {
    check: "risk_level IS NULL OR risk_level IN ('rendah', 'sedang', 'tinggi')",
  });

  pgm.createIndex('counseling_messages', 'session_id', {
    name: 'idx_counseling_messages_session_id',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('counseling_messages');
  pgm.dropTable('counseling_sessions');
};
