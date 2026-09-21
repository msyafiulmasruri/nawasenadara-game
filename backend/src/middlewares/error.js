import { error } from '../utils/response.js';
import { ClientError } from '../exceptions/index.js';

const errorHandler = (err, req, res, _next) => {
  if (err instanceof ClientError) {
    return error(res, err.message, err.statusCode);
  }

  if (err.isJoi) {
    return error(res, err.details[0].message, 400);
  }

  // Kode error unique constraint PostgreSQL (mis. email/google_id sudah
  // terdaftar).
  if (err.code === '23505') {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || 'field';
    return error(res, `${field} sudah terdaftar.`, 409);
  }

  if (err.code === '23503') {
    return error(res, 'Data referensi tidak ditemukan.', 400);
  }

  // Kode error CHECK CONSTRAINT PostgreSQL — sebelumnya jatuh ke
  // fallback generic di bawah yang membocorkan pesan mentah Postgres
  // (termasuk nama constraint & nama tabel internal) langsung ke
  // response JSON. Sekarang dicatat lengkap di log server (untuk
  // debugging), tapi pemain cuma melihat pesan yang aman & tidak
  // membocorkan detail skema database.
  if (err.code === '23514') {
    console.error(
      `Check constraint violation: ${err.constraint} pada tabel ${err.table}. Detail:`,
      err.message,
    );
    return error(
      res,
      'Data yang dikirim tidak valid untuk disimpan. Coba lagi, atau hubungi admin kalau terus berulang.',
      500,
    );
  }

  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Token tidak valid.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Token kedaluwarsa.', 401);
  }

  console.error('Unhandled error:', err.message);

  // Kode SQLSTATE PostgreSQL selalu berupa 5 karakter (huruf/angka).
  // Kalau errornya berasal dari Postgres tapi belum ditangani secara
  // spesifik di atas, JANGAN teruskan err.message mentah ke pemain —
  // pesan itu sering menyebut nama tabel/kolom/constraint internal.
  // Dicatat lengkap di log server, pemain cukup lihat pesan generic.
  const looksLikePostgresError = /^[0-9A-Z]{5}$/.test(err.code || '');
  const statusCode = err.statusCode || err.status || 500;
  const message = looksLikePostgresError
    ? 'Terjadi kesalahan saat menyimpan data. Coba lagi sebentar lagi.'
    : err.message || 'Terjadi kesalahan pada server.';
  return error(res, message, statusCode);
};

const notFound = (req, res) => {
  return error(res, `Route ${req.originalUrl} tidak ditemukan.`, 404);
};

export { errorHandler, notFound };
