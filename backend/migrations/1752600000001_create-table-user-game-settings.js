/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('user_game_settings', {
    user_id: {
      type: 'UUID',
      primaryKey: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    // Disimpan sebagai 0.00 - 1.00, sinkron dengan
    // AudioManager.setSFXVolume/setBGMVolume di frontend.
    sfx_volume: {
      type: 'NUMERIC(3,2)',
      notNull: true,
      default: 0.6,
    },
    bgm_volume: {
      type: 'NUMERIC(3,2)',
      notNull: true,
      default: 0.25,
    },
    muted: {
      type: 'BOOLEAN',
      notNull: true,
      default: false,
    },
    updated_at: {
      type: 'TIMESTAMPTZ',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('user_game_settings', 'chk_sfx_volume_range', {
    check: 'sfx_volume >= 0 AND sfx_volume <= 1',
  });
  pgm.addConstraint('user_game_settings', 'chk_bgm_volume_range', {
    check: 'bgm_volume >= 0 AND bgm_volume <= 1',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('user_game_settings');
};
