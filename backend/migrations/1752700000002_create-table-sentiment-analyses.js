/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Menyimpan SETIAP hasil panggilan ke NLP service (`POST /analyze` di
 * nawasenadara-nlp-service) yang dipicu dari input teks bebas pemain.
 *
 * Dua sumber teks yang dianalisis (lihat kolom `source`):
 *  - 'reflection'  : jurnal refleksi singkat di akhir SETIAP episode
 *                    (lihat proposal Gambar 3.2 — "Refleksi Hasil" ->
 *                    "NLP Analisis Emosi"). Ini pemicu WAJIB & otomatis
 *                    di semua 9 episode, bukan cuma episode tertentu.
 *  - 'counseling'  : setiap pesan yang pemain ketik SENDIRI di dalam
 *                    Chatbot Konseling Virtual (selain hasil analisis
 *                    ini juga dicatat terpisah di counseling_messages
 *                    untuk konteks percakapan, baris di sini murni
 *                    catatan hasil analisis emosinya saja, dipakai
 *                    untuk dashboard/tren guru BK).
 *
 * `episode_id` NULLABLE karena analisis dari dalam sesi chatbot
 * konseling (source='counseling') tidak selalu terjadi dalam konteks
 * episode tertentu (chatbot bisa diakses bebas kapan saja, bukan cuma
 * saat sedang main episode).
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('sentiment_analyses', {
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
    episode_id: {
      type: 'SMALLINT',
      references: 'episodes',
      onDelete: 'SET NULL',
    },
    source: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    // Teks asli pemain DISIMPAN (bukan cuma hasil labelnya) supaya
    // guru BK punya konteks nyata saat meninjau notifikasi risiko
    // tinggi (lihat proposal 3.1.1 poin 2 tentang dashboard guru BK).
    // Ini data sensitif — WAJIB diperlakukan seperti PII/data kesehatan
    // mental: akses hanya lewat endpoint ber-autentikasi role guru_bk,
    // dan idealnya kolom ini dienkripsi at-rest di production (lihat
    // catatan proposal 3.1.2 soal penyimpanan terenkripsi).
    input_text: {
      type: 'TEXT',
      notNull: true,
    },
    label: {
      type: 'VARCHAR(20)',
      notNull: true,
    },
    confidence: {
      type: 'NUMERIC(5,4)',
      notNull: true,
    },
    // Skor probabilitas SEMUA label (bukan cuma yang tertinggi) — dari
    // field `scores` di AnalyzeResponse (schemas.py NLP service).
    // Berguna untuk analisis tren lebih halus di dashboard nanti
    // (mis. grafik distribusi emosi per siswa dari waktu ke waktu).
    scores: {
      type: 'JSONB',
      notNull: true,
    },
    // Heuristik tingkat risiko (lihat schemas.py RiskLevel di NLP
    // service: rendah/sedang/tinggi), dihitung backend saat menyimpan
    // baris ini — lihat app/services/counseling.py di nlp-service utk
    // pemetaan label->risiko yang jadi rujukan.
    risk_level: {
      type: 'VARCHAR(10)',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('sentiment_analyses', 'chk_sentiment_source', {
    check: "source IN ('reflection', 'counseling')",
  });

  pgm.addConstraint('sentiment_analyses', 'chk_sentiment_label', {
    check:
      "label IN ('aman', 'menyinggung', 'takut', 'marah', 'netral', 'sedih')",
  });

  pgm.addConstraint('sentiment_analyses', 'chk_sentiment_risk_level', {
    check: "risk_level IN ('rendah', 'sedang', 'tinggi')",
  });

  pgm.createIndex('sentiment_analyses', 'user_id', {
    name: 'idx_sentiment_analyses_user_id',
  });
  pgm.createIndex('sentiment_analyses', ['user_id', 'created_at'], {
    name: 'idx_sentiment_analyses_user_created',
  });
  // Dipakai dashboard guru BK untuk query cepat "siapa saja yang
  // risikonya tinggi baru-baru ini", lintas semua siswa.
  pgm.createIndex('sentiment_analyses', ['risk_level', 'created_at'], {
    name: 'idx_sentiment_analyses_risk_created',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('sentiment_analyses');
};
