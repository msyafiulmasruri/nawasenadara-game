import TokenManager from '../security/token-manager.js';
import { error } from '../utils/response.js';
import UserRepositories from '../services/users/repositories/user-repositories.js';

// Memverifikasi access token yang dikirim lewat header
// `Authorization: Bearer <token>`. TIDAK menyentuh database refresh
// token sama sekali — ini murni pengecekan access token jangka pendek
// supaya cepat dan tidak membebani DB di setiap request.
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return error(
        res,
        'Token tidak ditemukan. Silakan login terlebih dahulu.',
        401,
      );
    }

    const token = authHeader.split(' ')[1];
    const decoded = TokenManager.verifyAccessToken(token);

    const user = await UserRepositories.getUserById(decoded.id);
    if (!user) {
      return error(res, 'User tidak ditemukan.', 401);
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.statusCode) {
      return error(res, err.message, err.statusCode);
    }
    return error(res, 'Token tidak valid.', 401);
  }
};

// Membatasi akses endpoint tertentu berdasarkan role (mis. dashboard
// guru BK hanya boleh diakses role 'guru_bk'). Dipakai setelah
// `authenticate` supaya req.user sudah tersedia.
const authorize =
  (...allowedRoles) =>
  (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return error(
        res,
        'Anda tidak memiliki akses untuk melakukan aksi ini.',
        403,
      );
    }
    next();
  };

export { authenticate, authorize };
