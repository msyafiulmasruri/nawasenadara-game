import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  refresh,
  logout,
  forgotPassword,
  verifyResetToken,
  resetPassword,
} from '../controllers/authentication-controller.js';
import { getMe, updateMe, updateCharacterName } from '../../users/controllers/user-controller.js';
import { authenticate } from '../../../middlewares/auth.js';
import validate, { validateQuery } from '../../../middlewares/validate.js';
import {
  registerPayloadSchema,
  loginPayloadSchema,
  googleAuthPayloadSchema,
  forgotPasswordPayloadSchema,
  resetPasswordPayloadSchema,
  verifyResetTokenQuerySchema,
} from '../validator/schema.js';
import { updateMePayloadSchema, updateCharacterNamePayloadSchema } from '../../users/validator/schema.js';

const router = Router();

// POST /api/auth/register
router.post('/register', validate(registerPayloadSchema), register);

// POST /api/auth/login
router.post('/login', validate(loginPayloadSchema), login);

// POST /api/auth/google
router.post('/google', validate(googleAuthPayloadSchema), googleAuth);

// POST /api/auth/refresh
router.post('/refresh', refresh);

// POST /api/auth/logout
router.post('/logout', logout);

// GET /api/auth/me (protected)
router.get('/me', authenticate, getMe);

// PUT /api/auth/me (protected)
router.put('/me', authenticate, validate(updateMePayloadSchema), updateMe);

// PUT /api/auth/character-name (protected)
// Endpoint yang tadinya dipanggil GameProfileBridge.jsx tapi belum
// pernah ada rute-nya di backend — inilah rutenya.
router.put(
  '/character-name',
  authenticate,
  validate(updateCharacterNamePayloadSchema),
  updateCharacterName,
);

// POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  validate(forgotPasswordPayloadSchema),
  forgotPassword,
);

// GET /api/auth/reset-password/verify?token=xxx
router.get(
  '/reset-password/verify',
  validateQuery(verifyResetTokenQuerySchema),
  verifyResetToken,
);

// POST /api/auth/reset-password
router.post(
  '/reset-password',
  validate(resetPasswordPayloadSchema),
  resetPassword,
);

export default router;
