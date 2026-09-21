import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import AuthenticationError from '../exceptions/authentication-error.js';

// Access token: umur pendek (default 15 menit), dipakai untuk otorisasi
// tiap request ke endpoint terproteksi (dikirim di header
// Authorization: Bearer <token>).
//
// Refresh token: umur panjang (default 30 hari), DITANDATANGANI DENGAN
// SECRET TERPISAH dari access token (supaya kebocoran satu secret tidak
// otomatis membocorkan yang lain), dan HANYA dipakai untuk menukar
// access token baru lewat endpoint /api/auth/refresh. Hash SHA-256 dari
// refresh token disimpan di tabel refresh_tokens supaya bisa dicabut
// (revoke) atau dideteksi kalau dipakai ulang (reuse detection) tanpa
// perlu menyimpan token mentahnya di database.
const TokenManager = {
  generateAccessToken: (payload) =>
    jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    }),

  generateRefreshToken: (payload) =>
    jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    }),

  verifyAccessToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError(
          'Sesi telah kedaluwarsa. Silakan login kembali.',
        );
      }
      throw new AuthenticationError('Token tidak valid.');
    }
  },

  verifyRefreshToken: (token) => {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new AuthenticationError(
          'Sesi telah berakhir. Silakan login kembali.',
        );
      }
      throw new AuthenticationError('Refresh token tidak valid.');
    }
  },

  // Refresh token TIDAK PERNAH disimpan mentah di database — hanya
  // hash SHA-256-nya. Fungsi ini juga dipakai untuk mencocokkan token
  // yang dikirim client dengan hash yang tersimpan.
  hashToken: (token) =>
    crypto.createHash('sha256').update(token).digest('hex'),

  // Menghitung tanggal expiry sebagai objek Date, dipakai saat insert
  // baris baru ke tabel refresh_tokens. Menerima string durasi ala JWT
  // (mis. '30d', '15m', '1h').
  getExpiryDate: (durationStr) => {
    const match = /^(\d+)([smhd])$/.exec(durationStr);
    if (!match) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const value = parseInt(match[1], 10);
    const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
    return new Date(Date.now() + value * unitMs);
  },

  buildUserResponse: (user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    avatar_url: user.avatar_url,
    provider: user.provider,
    role: user.role,
    character_name: user.character_name,
  }),
};

export default TokenManager;
