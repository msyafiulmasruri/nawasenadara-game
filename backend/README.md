# Nawasena Dara — Backend API (Sistem Autentikasi + NLP + Dashboard Guru BK)

Backend Node.js/Express untuk Nawasena Dara, berisi:
- Sistem autentikasi lengkap: JWT access + refresh token (dengan rotasi
  & reuse detection), login email/password, Google OAuth, dan
  lupa/reset password lewat email (Nodemailer). Login siswa dan guru BK
  dipisah lewat dua portal berbeda (lihat `expected_role` di
  `POST /api/auth/login`).
- Proxy ke `nawasenadara-nlp-service` (FastAPI) untuk analisis
  emosi jurnal refleksi (`/api/nlp/analyze`) & chatbot konseling
  virtual (`/api/nlp/counseling`), dengan hasilnya disimpan permanen ke
  PostgreSQL. Juga meneruskan `/api/nlp/npc-dialogue` — parafrase baris
  dialog NPC yang sudah diplot naskah episode (dipakai DialogueBox.js
  di frontend supaya redaksinya bervariasi tanpa mengubah plot; ini
  murni bantuan penulisan ulang teks, TIDAK disimpan ke DB). Lihat
  `NLP_INTEGRATION_DESIGN.md` di root repo untuk peta
  lengkap kapan tiap endpoint ini dipanggil di sepanjang 9 episode.
- Dashboard guru BK (`/api/bk/*`): daftar siswa + ringkasan progres,
  notifikasi risiko real-time, tren emosi teragregasi per siswa.

Polanya meniru struktur backend DepreScan (controller → repository →
routes per-service, error handling terpusat, response format
konsisten), dengan tambahan refresh token yang belum ada di referensi.

## Tech Stack

- Node.js + Express.js
- PostgreSQL (`pg` + `node-pg-migrate`)
- JWT (`jsonwebtoken`) — access & refresh token dengan secret terpisah
- Google OAuth (`google-auth-library`) — verifikasi ID token
- Nodemailer (SMTP) — email reset password
- Joi — validasi payload
- bcryptjs — hash password
- `fetch` bawaan Node 18+ — panggil nlp-service server-to-server (tidak
  perlu axios/dependency tambahan)

## Setup

```bash
npm install
cp .env.example .env
# isi .env sesuai environment kamu (lihat komentar di dalamnya) —
# termasuk NLP_SERVICE_URL kalau nlp-service tidak jalan di
# localhost:8001

# jalankan migrasi (butuh PostgreSQL sudah menyala & database sudah dibuat)
npm run migrate:up

npm run dev   # development (nodemon)
npm start     # production
```

## Struktur

```
src/
  config/db.js                     # koneksi PostgreSQL (pg Pool)
  security/token-manager.js        # generate/verify JWT, hash refresh token
  middlewares/
    auth.js                        # authenticate (access token) + authorize (role)
    validate.js                    # validasi body/query pakai Joi
    error.js                       # error handler global
  exceptions/                      # ClientError & turunannya (401/403/404/400)
  services/
    authentications/
      controllers/                 # register, login, google, refresh, logout, reset password
      repositories/                # query refresh_tokens & password_reset_tokens
      routes/
      validator/
    users/
      controllers/                 # getMe, updateMe
      repositories/                # query tabel users
      validator/
    email/email-service.js         # kirim email reset password via Nodemailer
  routes/index.js                  # gabungan semua route service
  server/index.js                  # setup Express app (CORS, helmet, rate limit)
  server.js                        # entry point + retry koneksi DB
migrations/                        # node-pg-migrate — users, refresh_tokens, password_reset_tokens
```

## Alur Refresh Token

1. **Login/Register/Google** → server generate **access token** (15
   menit, dikirim di body response, disimpan client di memori/state)
   dan **refresh token** (30 hari, dikirim lewat cookie `httpOnly`,
   tidak bisa dibaca JavaScript di browser).
2. Refresh token **tidak disimpan mentah** di database — hanya hash
   SHA-256-nya (tabel `refresh_tokens`), supaya kalau database bocor
   token asli tetap tidak bisa dipakai ulang.
3. Saat access token kedaluwarsa (401), client memanggil
   `POST /api/auth/refresh` (cookie refresh token otomatis ikut
   terkirim browser) → server **merotasi** token: refresh token lama
   ditandai `revoked_at`, refresh token baru dibuat & disimpan, access
   token baru dikembalikan.
4. Kalau ada yang mencoba memakai refresh token yang **sudah pernah
   dirotasi/di-revoke** (indikasi token dicuri), server langsung
   mencabut **semua** sesi milik user itu (reuse detection) dan
   memaksa login ulang.
5. **Logout** mencabut refresh token yang sedang dipakai. Ganti
   password lewat reset-password juga otomatis mencabut semua sesi
   lama di semua perangkat.

## Kontrak Endpoint

Semua response berbentuk `{ status, message, data }` (sukses) atau
`{ status: 'error', message }` (gagal).

| Method | Endpoint | Auth | Keterangan |
|---|---|---|---|
| POST | `/api/auth/register` | - | `{ name, email, password, role? }` → `role` opsional: `siswa` (default) / `guru_bk` / `orang_tua` |
| POST | `/api/auth/login` | - | `{ email, password }` |
| POST | `/api/auth/google` | - | `{ credential, role? }` — `credential` = ID token dari Google Sign-In |
| POST | `/api/auth/refresh` | cookie refresh token | Tukar refresh token dengan access token baru |
| POST | `/api/auth/logout` | cookie refresh token | Cabut sesi saat ini |
| GET | `/api/auth/me` | Bearer access token | Profil user login |
| PUT | `/api/auth/me` | Bearer access token | `{ name }` |
| POST | `/api/auth/forgot-password` | - | `{ email }` → kirim email link reset |
| GET | `/api/auth/reset-password/verify?token=` | - | Cek token reset masih valid |
| POST | `/api/auth/reset-password` | - | `{ token, password }` |
| POST | `/api/feedback` | Bearer access token siswa | `{ rating: 1-5, message: string }` — simpan masukan permainan tanpa PII tambahan |

Endpoint yang butuh access token kirim header:
`Authorization: Bearer <access_token>`.

## Integrasi Google OAuth (Frontend)

Pakai `@react-oauth/google` dengan flow **`login`** (bukan
`implicit`), supaya library mengembalikan `credential` (ID token),
sesuai yang divalidasi endpoint `/api/auth/google` di sini:

```jsx
import { GoogleLogin } from '@react-oauth/google';

<GoogleLogin
  onSuccess={(res) => {
    // res.credential -> kirim ke POST /api/auth/google
  }}
/>
```

## Catatan Keamanan

- Refresh token WAJIB dikirim lewat cookie `httpOnly` + `secure` (di
  production) — jangan simpan refresh token di `localStorage`.
- Access token boleh disimpan di memori (state React/Context), hindari
  `localStorage` kalau memungkinkan untuk mengurangi risiko XSS.
- `JWT_ACCESS_SECRET` dan `JWT_REFRESH_SECRET` **harus berbeda**.
- Untuk SMTP Gmail, wajib pakai **App Password** (2FA aktif), bukan
  password akun Google biasa.

## Troubleshooting: `violates check constraint "chk_counseling_highest_risk"`

Kalau pernah menemui error 500 di `POST /api/nlp/counseling` dengan
pesan constraint seperti ini di log server, penyebabnya BUKAN salah
kode/env — definisi constraint di migration selalu benar
(`rendah`/`sedang`/`tinggi`). Penyebabnya adalah **baris lama yang
sempat tersimpan di tabel `counseling_sessions` dengan nilai tidak
valid** (mis. dari percobaan manual/testing sebelum constraint ini ada,
atau sebelum kode sanitasi ditambahkan) — Postgres memvalidasi ULANG
SELURUH baris pada setiap `UPDATE`, jadi baris lama yang sudah
"kotor" itu bikin update berikutnya (menaikkan `highest_risk_level`
tiap ada pesan chat baru) selalu gagal.

Dua lapis penanganan sudah ditambahkan:

1. **Self-healing di kode** (`nlp-repositories.js` →
   `getOrCreateActiveSession`): sebelum sesi lama dipakai lagi,
   backend mengecek & memperbaiki otomatis kalau `highest_risk_level`/
   `trigger_source`-nya di luar nilai yang valid. Ini cukup untuk
   database yang sudah berjalan tanpa perlu direset.
2. Kalau masih ragu ada data korup di tempat lain / mau memulai dari
   kondisi paling bersih (disarankan untuk **development lokal**, di
   mana kehilangan data uji coba tidak masalah):

   ```bash
   # opsi paling pasti: reset total database lokal, lalu migrate dari nol
   dropdb nawasenadara_dev   # sesuaikan nama database di .env kamu
   createdb nawasenadara_dev
   npm run migrate:up
   ```

   Migration `1752700000005_fix-counseling-constraints.js` (percobaan
   perbaikan sebelumnya yang cuma drop+add ulang constraint yang SAMA
   persis, jadi tidak benar-benar memperbaiki apa pun) sudah dihapus
   dari riwayat migration — konsolidasi ini aman dilakukan karena
   proyek masih tahap development lokal (migration belum pernah
   dijalankan di environment production/staging manapun).

Migration penghapusan peran `orang_tua` juga sudah digabung langsung
ke migration awal `1752500000001_create-table-users.js` (constraint
`chk_users_role` dari awal cuma mengizinkan `'siswa'`/`'guru_bk'`),
menggantikan migration alter terpisah yang sebelumnya ada — dengan
alasan konsolidasi yang sama.
