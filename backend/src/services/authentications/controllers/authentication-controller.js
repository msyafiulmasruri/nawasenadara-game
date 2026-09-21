import { OAuth2Client } from 'google-auth-library';
import TokenManager from '../../../security/token-manager.js';
import UserRepositories from '../../users/repositories/user-repositories.js';
import AuthenticationRepositories from '../repositories/authentication-repositories.js';
import { sendPasswordResetEmail } from '../../email/email-service.js';
import { success, created, error } from '../../../utils/response.js';
import InvariantError from '../../../exceptions/invariant-error.js';
import AuthenticationError from '../../../exceptions/authentication-error.js';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

// Refresh token dikirim lewat cookie httpOnly supaya tidak bisa dibaca
// JavaScript di browser (mitigasi XSS) — beda dari access token yang
// memang disimpan di sisi client (mis. di memori/state) dan dikirim
// manual lewat header Authorization.
// Kalau dijalankan lewat tunnel (ngrok/cloudflared) frontend & backend
// selalu beda domain meski sama-sama HTTPS, jadi cookie WAJIB
// SameSite=None + Secure supaya tetap ikut terkirim di request
// cross-site. Set CROSS_SITE_COOKIES=true di .env saat testing lewat
// ngrok. Di production (beda domain juga) ini otomatis true.
const useCrossSiteCookies =
  process.env.NODE_ENV === 'production' ||
  process.env.CROSS_SITE_COOKIES === 'true';

const setRefreshCookie = (res, token) => {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: useCrossSiteCookies,
    sameSite: useCrossSiteCookies ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: TokenManager.getExpiryDate(REFRESH_EXPIRES_IN).getTime() - Date.now(),
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
};

// Membuat sepasang access + refresh token baru untuk user, lalu
// menyimpan HASH refresh token-nya ke database.
const issueTokenPair = async (req, res, user) => {
  const payload = { id: user.id, email: user.email, name: user.name };
  const accessToken = TokenManager.generateAccessToken(payload);
  const refreshToken = TokenManager.generateRefreshToken(payload);

  await AuthenticationRepositories.storeRefreshToken({
    userId: user.id,
    refreshToken,
    expiresInStr: REFRESH_EXPIRES_IN,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });

  setRefreshCookie(res, refreshToken);

  return {
    access_token: accessToken,
    user: TokenManager.buildUserResponse(user),
  };
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.validated;

    const emailExists = await UserRepositories.verifyEmail(email);
    if (emailExists) {
      return next(new InvariantError('Email sudah terdaftar. Silakan login.'));
    }

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name.trim().split(/\s+/).slice(0, 2).join(' '),
    )}&background=6b3fa0&color=fff&bold=true&size=128`;

    const user = await UserRepositories.createUser({
      name,
      email,
      password,
      avatarUrl,
      role,
    });

    const authData = await issueTokenPair(req, res, user);

    return created(res, authData, 'Registrasi berhasil! Selamat datang di Nawasena Dara.');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password, expected_role: expectedRole } = req.validated;

    const user = await UserRepositories.verifyCredential(email, password);
    if (!user) {
      return next(new AuthenticationError('Email atau password salah.'));
    }

    if (user.provider !== 'local') {
      return next(
        new InvariantError(
          `Akun ini terdaftar via ${user.provider}. Silakan login dengan ${user.provider}.`,
        ),
      );
    }

    // Portal siswa dan guru BK memakai form login terpisah di frontend
    // (/login vs /guru-bk/login). Kalau akun yang dipakai perannya
    // tidak sesuai portal yang diakses, tolak di sini — supaya tidak
    // ada guru BK yang nyasar masuk ke antarmuka permainan siswa, atau
    // sebaliknya, walau kredensialnya sendiri valid.
    if (expectedRole && user.role !== expectedRole) {
      const portalLabel = expectedRole === 'guru_bk' ? 'guru BK' : 'siswa';
      return next(
        new InvariantError(
          `Akun ini bukan akun ${portalLabel}. Gunakan halaman login yang sesuai dengan perananmu.`,
        ),
      );
    }

    const authData = await issueTokenPair(req, res, user);

    return success(res, authData, 'Login berhasil!');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/google
// Menerima ID token (`credential`) dari Google Sign-In di sisi client
// (mis. @react-oauth/google flow 'login', bukan 'implicit'). ID token
// diverifikasi tanda tangan & audience-nya langsung oleh
// google-auth-library, TANPA perlu memanggil endpoint Google lain —
// lebih cepat dan lebih aman dibanding memvalidasi access_token manual.
export const googleAuth = async (req, res, next) => {
  try {
    const { credential, role, expected_role: expectedRole } = req.validated;

    if (!googleClient) {
      return error(res, 'Google OAuth belum dikonfigurasi di server.', 503);
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return error(
        res,
        'Google credential tidak valid atau sudah kedaluwarsa.',
        401,
      );
    }

    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    if (!email) {
      return next(
        new InvariantError('Tidak dapat mengambil email dari akun Google.'),
      );
    }

    let user = await UserRepositories.getUserByGoogleIdOrEmail(googleId, email);

    if (user) {
      user = await UserRepositories.upsertGoogleUser({
        googleId,
        avatarUrl,
        name,
        existingId: user.id,
      });
    } else {
      user = await UserRepositories.insertGoogleUser({
        name,
        email,
        googleId,
        avatarUrl,
        role,
      });
    }

    if (expectedRole && user.role !== expectedRole) {
      const portalLabel = expectedRole === 'guru_bk' ? 'guru BK' : 'siswa';
      return next(
        new InvariantError(
          `Akun ini bukan akun ${portalLabel}. Gunakan halaman login yang sesuai dengan perananmu.`,
        ),
      );
    }

    const authData = await issueTokenPair(req, res, user);

    return success(res, authData, 'Login dengan Google berhasil!');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/refresh
// Menukar refresh token (dari cookie httpOnly, atau body sebagai
// fallback untuk client non-browser) dengan access token baru. Refresh
// token yang lama langsung dirotasi (di-revoke + diganti yang baru)
// supaya satu refresh token cuma bisa dipakai sekali secara berantai —
// kalau ada yang mencoba memakai refresh token yang SUDAH di-revoke,
// itu tanda token dicuri, dan SEMUA sesi user tsb langsung dicabut.
export const refresh = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refresh_token;

    if (!rawToken) {
      return next(new AuthenticationError('Refresh token tidak ditemukan.'));
    }

    const decoded = TokenManager.verifyRefreshToken(rawToken);
    const existing = await AuthenticationRepositories.getActiveRefreshToken(rawToken);

    if (!existing) {
      return next(new AuthenticationError('Refresh token tidak dikenali.'));
    }

    if (existing.revoked_at) {
      // Grace window kecil: kalau token ini BARU SAJA dirotasi (mis. <5
      // detik lalu), kemungkinan besar ini cuma request duplikat yang
      // hampir bersamaan (retry jaringan, beberapa tab, dsb) — bukan
      // pencurian token sungguhan. Untuk kasus itu, cukup keluarkan
      // access+refresh token PENGGANTI yang sudah dibuat oleh request
      // pertama tadi, jangan cabut semua sesi.
      const revokedMsAgo = Date.now() - new Date(existing.revoked_at).getTime();
      if (revokedMsAgo < 5000 && existing.replaced_by_token_hash) {
        const replacement = await AuthenticationRepositories.getActiveRefreshTokenByHash(
          existing.replaced_by_token_hash,
        );
        if (replacement && !replacement.revoked_at) {
          return next(
            new AuthenticationError(
              'Sesi sedang diperbarui, silakan ulangi permintaan.',
              409,
            ),
          );
        }
      }

      // Reuse detection: refresh token yang sudah di-revoke dipakai
      // lagi — kemungkinan besar dicuri. Cabut semua sesi user ini.
      await AuthenticationRepositories.revokeAllUserRefreshTokens(existing.user_id);
      clearRefreshCookie(res);
      return next(
        new AuthenticationError(
          'Sesi terdeteksi tidak valid. Demi keamanan, silakan login kembali.',
        ),
      );
    }

    if (new Date(existing.expires_at) < new Date()) {
      return next(new AuthenticationError('Sesi telah berakhir. Silakan login kembali.'));
    }

    const user = await UserRepositories.getUserById(decoded.id);
    if (!user) {
      return next(new AuthenticationError('User tidak ditemukan.'));
    }

    const payload = { id: user.id, email: user.email, name: user.name };
    const newAccessToken = TokenManager.generateAccessToken(payload);
    const newRefreshToken = TokenManager.generateRefreshToken(payload);

    await AuthenticationRepositories.rotateRefreshToken({
      oldRawToken: rawToken,
      userId: user.id,
      newRawToken: newRefreshToken,
      expiresInStr: REFRESH_EXPIRES_IN,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    setRefreshCookie(res, newRefreshToken);

    return success(
      res,
      { access_token: newAccessToken, user: TokenManager.buildUserResponse(user) },
      'Token berhasil diperbarui.',
    );
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/logout
export const logout = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[REFRESH_COOKIE_NAME] || req.body?.refresh_token;

    if (rawToken) {
      await AuthenticationRepositories.revokeRefreshToken(rawToken);
    }

    clearRefreshCookie(res);

    return success(res, {}, 'Logout berhasil.');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.validated;

    const user = await UserRepositories.getUserByEmailForAuth(email);

    // Respons selalu sama baik email terdaftar maupun tidak, supaya
    // endpoint ini tidak bisa dipakai untuk menebak email mana saja
    // yang sudah terdaftar (email enumeration).
    const genericMessage =
      'Jika email terdaftar, kami akan mengirimkan link reset password.';

    if (!user || user.provider !== 'local') {
      return success(res, {}, genericMessage);
    }

    await AuthenticationRepositories.invalidateOldResetTokens(user.id);
    const token = await AuthenticationRepositories.createResetToken(user.id);

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, user.name, resetLink);

    return success(res, {}, genericMessage);
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/reset-password/verify?token=xxx
export const verifyResetToken = async (req, res, next) => {
  try {
    const { token } = req.validatedQuery;

    const isValid = await AuthenticationRepositories.verifyResetTokenExists(token);
    if (!isValid) {
      return next(new InvariantError('Token tidak valid atau sudah kedaluwarsa.'));
    }

    return success(res, { valid: true }, 'Token valid.');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.validated;

    const row = await AuthenticationRepositories.getValidResetToken(token);
    if (!row) {
      return next(
        new InvariantError(
          'Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.',
        ),
      );
    }

    if (row.provider !== 'local') {
      return next(
        new InvariantError(
          `Akun ini terdaftar via ${row.provider}. Tidak dapat mereset password.`,
        ),
      );
    }

    const client = await AuthenticationRepositories.pool.connect();
    try {
      await client.query('BEGIN');
      await UserRepositories.updatePassword({
        userId: row.user_id,
        password,
        client,
      });
      await client.query(
        'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1',
        [row.id],
      );
      await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK');
      throw txErr;
    } finally {
      client.release();
    }

    // Demi keamanan, cabut semua sesi lama begitu password diganti —
    // memaksa login ulang di semua perangkat dengan password baru.
    await AuthenticationRepositories.revokeAllUserRefreshTokens(row.user_id);

    return success(
      res,
      {},
      'Password berhasil direset. Silakan login dengan password baru kamu.',
    );
  } catch (err) {
    next(err);
  }
};
