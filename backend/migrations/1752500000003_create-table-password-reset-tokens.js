/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('password_reset_tokens', {
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
    token: {
      type: 'VARCHAR(255)',
      notNull: true,
      unique: true,
    },
    expires_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
    },
    used_at: {
      type: 'TIMESTAMPTZ',
      default: null,
    },
    created_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('password_reset_tokens', 'user_id', {
    name: 'idx_password_reset_tokens_user_id',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('password_reset_tokens');
};
