import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import routes from '../routes/index.js';
import { errorHandler, notFound } from '../middlewares/error.js';
import { success } from '../utils/response.js';

const app = express();

app.use(helmet());

// Trust proxy — perlu kalau di-deploy di belakang reverse proxy
// (Railway/Render/Vercel dll) supaya req.ip & rate limit akurat.
app.set('trust proxy', 1);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.endsWith('.netlify.app') || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (process.env.NODE_ENV === 'development') return callback(null, true);
      return callback(new Error('Not allowed by CORS'));
    },
    // WAJIB true — refresh token dikirim lewat cookie httpOnly, jadi
    // browser hanya mau mengirim/menyimpan cookie cross-origin kalau
    // request-nya pakai credentials.
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Terlalu banyak permintaan. Coba lagi nanti.',
  },
});

// Limiter lebih ketat khusus endpoint auth sensitif (login/register/
// forgot-password) supaya tidak gampang di-brute-force.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.',
  },
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  return success(
    res,
    {
      status: 'ok',
      app: 'Nawasena Dara API',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
    'Server is running',
  );
});

app.get('/', (req, res) => {
  return success(
    res,
    {
      app: 'Nawasena Dara API',
      version: '1.0.0',
      description: 'REST API Nawasena Dara — sistem autentikasi',
      endpoints: {
        health: 'GET /health',
        auth: {
          register: 'POST /api/auth/register',
          login: 'POST /api/auth/login',
          google: 'POST /api/auth/google',
          refresh: 'POST /api/auth/refresh',
          logout: 'POST /api/auth/logout',
          me: 'GET /api/auth/me',
          update_me: 'PUT /api/auth/me',
          forgot_password: 'POST /api/auth/forgot-password',
          verify_reset_token: 'GET /api/auth/reset-password/verify',
          reset_password: 'POST /api/auth/reset-password',
        },
      },
    },
    'Nawasena Dara API',
  );
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
