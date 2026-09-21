import UserRepositories from '../repositories/user-repositories.js';
import { success } from '../../../utils/response.js';
import NotFoundError from '../../../exceptions/not-found-error.js';

// GET /api/auth/me
export const getMe = async (req, res) => {
  return success(res, { user: req.user }, 'Profil pengguna');
};

// PUT /api/auth/me
export const updateMe = async (req, res, next) => {
  try {
    const { name } = req.validated;
    const user = await UserRepositories.updateName({ id: req.user.id, name });

    if (!user) {
      return next(new NotFoundError('User tidak ditemukan.'));
    }

    return success(res, { user }, 'Profil berhasil diperbarui.');
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/character-name
// Menyimpan nama TOKOH dalam game (users.character_name) — dipanggil
// GameProfileBridge.jsx.saveCharacterName() lewat prompt "Mulai
// Petualangan" (lihat GameUIBridge.jsx), BUKAN endpoint yang sama
// dengan updateMe() di atas (itu untuk nama akun).
export const updateCharacterName = async (req, res, next) => {
  try {
    const { character_name: characterName } = req.validated;
    const user = await UserRepositories.updateCharacterName({
      id: req.user.id,
      characterName,
    });

    if (!user) {
      return next(new NotFoundError('User tidak ditemukan.'));
    }

    return success(res, { user }, 'Nama tokoh berhasil disimpan.');
  } catch (err) {
    next(err);
  }
};
