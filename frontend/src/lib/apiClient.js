// Klien fetch tipis untuk berbicara dengan nawasenadara-backend.
//
// Dua hal penting yang mengikuti desain backend (lihat
// src/security/token-manager.js & authentication-controller.js di repo
// backend):
//   1. Access token TIDAK PERNAH disimpan di localStorage — hanya
//      dipegang di memori (lewat AuthContext) dan dikirim manual lewat
//      header Authorization di tiap request.
//   2. Refresh token dikirim otomatis oleh browser lewat cookie
//      httpOnly, makanya setiap request WAJIB `credentials: 'include'`
//      supaya cookie itu ikut terkirim (dan supaya Set-Cookie dari
//      response ikut disimpan browser).

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiError extends Error {
  constructor(message, statusCode, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// `getAccessToken` adalah fungsi (bukan nilai) supaya apiClient selalu
// membaca token TERBARU dari AuthContext saat request dibuat, bukan
// nilai yang "dibekukan" saat modul ini pertama kali di-import.
async function request(path, { method = 'GET', body, getAccessToken, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // Response tanpa body (mis. beberapa error jaringan) — biarkan null.
  }

  if (!res.ok) {
    const message = payload?.message || `Permintaan gagal (${res.status}).`;
    throw new ApiError(message, res.status, payload?.details || payload?.errors);
  }

  return payload?.data ?? null;
}

const apiClient = {
  get: (path, opts) => request(path, { ...opts, method: 'GET' }),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
  delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };
export default apiClient;
