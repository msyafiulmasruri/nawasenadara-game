import { Pool } from 'pg';

const poolConfig = {
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// Kalau DATABASE_URL tersedia (umum di platform hosting seperti
// Railway/Render), pakai itu. Kalau tidak, pg akan otomatis membaca
// env var standar PGHOST/PGUSER/PGPASSWORD/PGDATABASE/PGPORT.
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

const pool = new Pool(poolConfig);

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'test') {
    console.log('PostgreSQL connected');
  }
});

pool.on('error', (err) => {
  console.error('PostgreSQL pool error:', err.message);
});

export default pool;
