/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createExtension('pgcrypto', { ifNotExists: true });

  pgm.createTable('user_episode_progress', {
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
      notNull: true,
      references: 'episodes',
      onDelete: 'CASCADE',
    },
    // 'locked' -> 'unlocked' -> 'in_progress' -> 'completed'
    status: {
      type: 'VARCHAR(20)',
      notNull: true,
      default: "'locked'",
    },
    // Riwayat pilihan pemain di sepanjang episode ini (dialog choice
    // per titik percabangan cerita) — dipakai untuk mempersonalisasi
    // dialog NPC & rekomendasi pendampingan di episode berikutnya,
    // sesuai proposal Bab 2.2.3/2.2.4.
    choices: {
      type: 'JSONB',
      notNull: true,
      default: pgm.func("'[]'::jsonb"),
    },
    started_at: {
      type: 'TIMESTAMPTZ',
    },
    completed_at: {
      type: 'TIMESTAMPTZ',
    },
    updated_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('user_episode_progress', 'uq_user_episode', {
    unique: ['user_id', 'episode_id'],
  });

  pgm.addConstraint('user_episode_progress', 'chk_progress_status', {
    check: "status IN ('locked', 'unlocked', 'in_progress', 'completed')",
  });

  pgm.createIndex('user_episode_progress', 'user_id', {
    name: 'idx_user_episode_progress_user_id',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropIndex('user_episode_progress', 'user_id', {
    name: 'idx_user_episode_progress_user_id',
    ifExists: true,
  });
  pgm.dropTable('user_episode_progress');
};
