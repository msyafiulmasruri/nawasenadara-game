/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Feed notifikasi darurat untuk dashboard guru BK (proposal 2.2.6 /
 * 3.1.1 poin 2: "notifikasi kondisi darurat yang muncul secara
 * real-time apabila sistem mendeteksi indikasi risiko tinggi").
 *
 * Satu baris dibuat OTOMATIS oleh backend setiap kali:
 *  - sebuah sentiment_analyses baru punya risk_level = 'tinggi', ATAU
 *  - sebuah counseling_messages baru punya escalated = true.
 * (lihat src/services/nlp/controllers/nlp-controller.js).
 *
 * Guru BK menandai `acknowledged_at` setelah menindaklanjuti (mis.
 * "mendatangi siswa tersebut", sesuai skenario proposal 3.2.2b) — ini
 * BUKAN untuk menghapus riwayat, cuma menandai sudah ditinjau, supaya
 * dashboard bisa membedakan alert baru vs yang sudah ditangani.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('risk_alerts', {
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
    // Sumber pemicu alert ini, dan id baris terkait di tabel asalnya —
    // union longgar (bukan FK ganda) supaya satu tabel alert bisa
    // menunjuk ke dua sumber berbeda tanpa dua kolom FK nullable yang
    // membingungkan.
    source_type: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    source_id: {
      type: 'UUID',
      notNull: true,
    },
    episode_id: {
      type: 'SMALLINT',
      references: 'episodes',
      onDelete: 'SET NULL',
    },
    risk_level: {
      type: 'VARCHAR(10)',
      notNull: true,
    },
    // Cuplikan singkat teks pemicu (bukan seluruh isi) supaya daftar
    // notifikasi di dashboard bisa langsung menampilkan konteks tanpa
    // JOIN tambahan — teks lengkapnya tetap ada di
    // sentiment_analyses.input_text / counseling_messages.content lewat
    // source_id kalau guru BK perlu meninjau detail penuh.
    snippet: {
      type: 'TEXT',
      notNull: true,
    },
    acknowledged_by: {
      type: 'UUID',
      references: 'users',
      onDelete: 'SET NULL',
    },
    acknowledged_at: {
      type: 'TIMESTAMPTZ',
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('risk_alerts', 'chk_risk_alerts_source_type', {
    check: "source_type IN ('sentiment_analysis', 'counseling_message')",
  });
  pgm.addConstraint('risk_alerts', 'chk_risk_alerts_risk_level', {
    check: "risk_level IN ('sedang', 'tinggi')",
  });

  pgm.createIndex('risk_alerts', 'user_id', {
    name: 'idx_risk_alerts_user_id',
  });
  // Query utama dashboard: "alert yang BELUM ditinjau, terbaru dulu".
  pgm.createIndex('risk_alerts', ['acknowledged_at', 'created_at'], {
    name: 'idx_risk_alerts_unacknowledged',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('risk_alerts');
};
