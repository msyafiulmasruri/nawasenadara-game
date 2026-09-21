import 'dotenv/config';
import server from './server/index.js';
import pool from './config/db.js';

const PORT = process.env.PORT || 8000;

// Retry koneksi DB — beberapa platform hosting butuh beberapa detik
// sebelum DB siap dipakai saat baru saja start.
const connectWithRetry = async (maxRetries = 10, delayMs = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      console.error(
        `DB connection attempt ${attempt}/${maxRetries} failed: ${err.message}`,
      );
      if (attempt === maxRetries) throw err;
      console.log(`Retrying in ${delayMs / 1000}s...`);
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
};

const start = async () => {
  try {
    await connectWithRetry();

    console.log('');
    console.log('Nawasena Dara API');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server : http://localhost:${PORT}`);
      console.log(`Env    : ${process.env.NODE_ENV || 'development'}`);
      console.log('');
    });
  } catch (err) {
    console.error('');
    console.error('Failed to start server:', err.message);
    console.error(
      'Pastikan PostgreSQL berjalan dan konfigurasi PG* / DATABASE_URL sudah benar.',
    );
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('\nSIGTERM received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

start();
