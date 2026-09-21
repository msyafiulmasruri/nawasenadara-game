import Joi from 'joi';

export const registerPayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Nama diperlukan.',
    'string.empty': 'Nama tidak boleh kosong.',
  }),
  email: Joi.string().email().required().messages({
    'any.required': 'Email diperlukan.',
    'string.email': 'Email tidak valid.',
    'string.empty': 'Email tidak boleh kosong.',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password diperlukan.',
    'string.min': 'Password minimal 6 karakter.',
    'string.empty': 'Password tidak boleh kosong.',
  }),
  // Opsional — dipakai kalau alur pendaftaran nanti membedakan siswa
  // atau guru BK sejak awal. Default 'siswa' kalau tidak dikirim
  // (kasus paling umum: siswa mendaftar sendiri).
  role: Joi.string()
    .valid('siswa', 'guru_bk')
    .default('siswa')
    .messages({
      'any.only': 'Peran tidak valid.',
    }),
});

export const loginPayloadSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email diperlukan.',
    'string.email': 'Email tidak valid.',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password diperlukan.',
  }),
  // Dikirim oleh portal login BERBEDA yang dipakai (lihat frontend:
  // /login untuk siswa, /guru-bk/login untuk guru BK) — kalau diisi,
  // backend menolak login jika role akun sebenarnya tidak sama, supaya
  // siswa tidak bisa nyasar masuk ke portal guru BK lewat form yang
  // salah (dan sebaliknya), meski kredensialnya valid.
  expected_role: Joi.string().valid('siswa', 'guru_bk').optional(),
});

export const googleAuthPayloadSchema = Joi.object({
  // ID token dari Google Sign-In (bukan access_token) — diverifikasi
  // signature & audience-nya lewat google-auth-library, jadi server
  // tidak perlu memanggil endpoint Google lain untuk memastikan
  // keasliannya.
  credential: Joi.string().required().messages({
    'any.required': 'Google credential diperlukan.',
  }),
  role: Joi.string().valid('siswa', 'guru_bk').default('siswa'),
  expected_role: Joi.string().valid('siswa', 'guru_bk').optional(),
});

export const refreshTokenPayloadSchema = Joi.object({
  // Opsional di body — kalau tidak dikirim di body, akan dicoba baca
  // dari cookie httpOnly `refresh_token` (lihat authentication-controller.js).
  refresh_token: Joi.string().optional(),
});

export const forgotPasswordPayloadSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'any.required': 'Email diperlukan.',
    'string.email': 'Email tidak valid.',
  }),
});

export const resetPasswordPayloadSchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token diperlukan.',
  }),
  password: Joi.string().min(6).required().messages({
    'any.required': 'Password baru diperlukan.',
    'string.min': 'Password baru minimal 6 karakter.',
  }),
});

export const verifyResetTokenQuerySchema = Joi.object({
  token: Joi.string().required().messages({
    'any.required': 'Token diperlukan.',
  }),
});
