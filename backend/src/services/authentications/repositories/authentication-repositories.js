import { Pool } from 'pg';
import crypto from 'crypto';
import TokenManager from '../../../security/token-manager.js';

class AuthenticationRepositories {
  constructor() {
    this._pool = new Pool();
  }

  // ------------------------------------------------------------------
  // Refresh token
  // ------------------------------------------------------------------

  // Menyimpan HASH dari refresh token yang baru dibuat (bukan token
  // mentahnya) beserta metadata perangkat, supaya nanti bisa dicabut
  // per-sesi (mis. fitur "keluar dari semua perangkat").
  async storeRefreshToken({
    userId,
    refreshToken,
    expiresInStr,
    userAgent,
    ipAddress,
  }) {
    const tokenHash = TokenManager.hashToken(refreshToken);
    const expiresAt = TokenManager.getExpiryDate(expiresInStr);

    await this._pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tokenHash, expiresAt, userAgent || null, ipAddress || null],
    );
  }

  // Mengambil baris refresh token AKTIF (belum revoke & belum expired)
  // berdasarkan hash token mentah yang dikirim client.
  async getActiveRefreshToken(rawToken) {
    const tokenHash = TokenManager.hashToken(rawToken);
    const result = await this._pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  // Sama seperti getActiveRefreshToken, tapi menerima HASH secara
  // langsung (bukan raw token) — dipakai reuse-detection grace window
  // untuk mengecek status token pengganti tanpa raw token-nya di tangan.
  async getActiveRefreshTokenByHash(tokenHash) {
    const result = await this._pool.query(
      `SELECT id, user_id, token_hash, expires_at, revoked_at
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] || null;
  }

  // Rotasi refresh token: baris lama ditandai revoked + dihubungkan ke
  // pengganti barunya, lalu baris baru dibuat. Dilakukan dalam satu
  // transaksi supaya tidak ada celah waktu di mana refresh token lama
  // sudah revoked tapi yang baru belum tersimpan (atau sebaliknya).
  async rotateRefreshToken({
    oldRawToken,
    userId,
    newRawToken,
    expiresInStr,
    userAgent,
    ipAddress,
  }) {
    const oldHash = TokenManager.hashToken(oldRawToken);
    const newHash = TokenManager.hashToken(newRawToken);
    const expiresAt = TokenManager.getExpiryDate(expiresInStr);

    const client = await this._pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE refresh_tokens
         SET revoked_at = NOW(), replaced_by_token_hash = $1
         WHERE token_hash = $2`,
        [newHash, oldHash],
      );
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, newHash, expiresAt, userAgent || null, ipAddress || null],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // Dipanggil saat logout — mencabut satu refresh token spesifik.
  async revokeRefreshToken(rawToken) {
    const tokenHash = TokenManager.hashToken(rawToken);
    await this._pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash],
    );
  }

  // Dipakai untuk reuse detection: kalau refresh token yang SUDAH
  // di-revoke dicoba dipakai lagi, itu indikasi token dicuri — maka
  // seluruh sesi (refresh token aktif) milik user tsb langsung dicabut
  // supaya pencuri tidak bisa lanjut memakai token turunan mana pun.
  async revokeAllUserRefreshTokens(userId) {
    await this._pool.query(
      `UPDATE refresh_tokens SET revoked_at = NOW()
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId],
    );
  }

  // ------------------------------------------------------------------
  // Reset password
  // ------------------------------------------------------------------

  async invalidateOldResetTokens(userId) {
    await this._pool.query(
      `UPDATE password_reset_tokens SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [userId],
    );
  }

  async createResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    await this._pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt],
    );

    return token;
  }

  async getValidResetToken(token) {
    const result = await this._pool.query(
      `SELECT prt.id, prt.user_id, u.name, u.email, u.provider
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1
         AND prt.used_at IS NULL
         AND prt.expires_at > NOW()`,
      [token],
    );
    return result.rows[0] || null;
  }

  async verifyResetTokenExists(token) {
    const result = await this._pool.query(
      `SELECT id FROM password_reset_tokens
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [token],
    );
    return result.rows.length > 0;
  }

  get pool() {
    return this._pool;
  }
}

export default new AuthenticationRepositories();
