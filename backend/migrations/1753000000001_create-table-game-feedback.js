/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * Menyimpan penilaian permainan dari siswa. Tabel ini sengaja hanya
 * menghubungkan masukan dengan ID akun yang sudah ada; tidak menyimpan
 * nama, email, alamat IP, atau data pribadi tambahan.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('game_feedback', {
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
    rating: {
      type: 'SMALLINT',
      notNull: true,
    },
    message: {
      type: 'TEXT',
      notNull: true,
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('game_feedback', 'chk_game_feedback_rating', {
    check: 'rating BETWEEN 1 AND 5',
  });
  pgm.addConstraint('game_feedback', 'chk_game_feedback_message_length', {
    check: 'char_length(btrim(message)) BETWEEN 3 AND 1000',
  });

  pgm.createIndex('game_feedback', 'user_id', {
    name: 'idx_game_feedback_user_id',
  });
  pgm.createIndex('game_feedback', 'created_at', {
    name: 'idx_game_feedback_created_at',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropIndex('game_feedback', 'created_at', {
    name: 'idx_game_feedback_created_at',
    ifExists: true,
  });
  pgm.dropIndex('game_feedback', 'user_id', {
    name: 'idx_game_feedback_user_id',
    ifExists: true,
  });
  pgm.dropTable('game_feedback');
};
