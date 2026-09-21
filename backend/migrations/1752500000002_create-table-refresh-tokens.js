/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Tabel ini menyimpan HASH (SHA-256) dari refresh token, bukan token
 * mentahnya — supaya kalau database bocor, refresh token asli tetap
 * tidak bisa dipakai ulang oleh siapa pun. Setiap kali refresh token
 * dipakai untuk minta access token baru, tokennya langsung dirotasi:
 * baris lama ditandai `revoked_at` dan baris baru dibuat, dihubungkan
 * lewat `replaced_by_token_hash`. Kalau ada percobaan memakai refresh
 * token yang sudah di-revoke (tanda-tanda token dicuri/dipakai ulang),
 * seluruh sesi milik user itu bisa langsung dicabut (reuse detection).
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('refresh_tokens', {
    id: {
      type: 'UUID',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    user_id: {
      type: 'UUID',
      notNull: true,
      references: '"users"(id)',
      onDelete: 'CASCADE',
    },
    token_hash: {
      type: 'VARCHAR(255)',
      notNull: true,
      unique: true,
    },
    expires_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
    },
    revoked_at: {
      type: 'TIMESTAMPTZ',
      default: null,
    },
    replaced_by_token_hash: {
      type: 'VARCHAR(255)',
      default: null,
    },
    user_agent: {
      type: 'TEXT',
    },
    ip_address: {
      type: 'VARCHAR(64)',
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('refresh_tokens', 'user_id', {
    name: 'idx_refresh_tokens_user_id',
  });
  pgm.createIndex('refresh_tokens', 'token_hash', {
    name: 'idx_refresh_tokens_token_hash',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('refresh_tokens');
};
