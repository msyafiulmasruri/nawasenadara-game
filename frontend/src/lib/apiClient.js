// Klien fetch tipis untuk berbicara dengan nawasenadara-backend.
//
// Access token hanya disimpan di memori AuthContext. Refresh token berada
// di cookie httpOnly dan otomatis dikirim lewat `credentials: 'include'`.

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

// Semua pemanggil apiClient di browser, termasuk bridge Phaser, berbagi
// handler ini. AuthContext memasangnya selama provider aktif supaya request
// yang menerima 401 bisa memakai satu proses refresh sesi terkoordinasi.
let sessionHandlers = null;

export function configureApiSession(handlers) {
  sessionHandlers = handlers;

  return () => {
    if (sessionHandlers === handlers) sessionHandlers = null;
  };
}

async function readPayload(response) {
  try {
    return await response.json();
  } catch {
    // Beberapa kegagalan jaringan/proxy tidak mempunyai body JSON.
    return null;
  }
}

function toApiError(response, payload) {
  const message = payload?.message || `Permintaan gagal (${response.status}).`;
  return new ApiError(message, response.status, payload?.details || payload?.errors);
}

const PUBLIC_AUTH_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/google',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

function canRefreshForPath(path) {
  return !PUBLIC_AUTH_PATHS.some(
    (publicPath) =>
      path === publicPath ||
      path.startsWith(`${publicPath}?`) ||
      path.startsWith(`${publicPath}/`),
  );
}

// `getAccessToken` berupa fungsi supaya request selalu membaca token terbaru,
// bukan nilai token yang dibekukan ketika komponen pertama kali dirender.
async function request(
  path,
  {
    method = 'GET',
    body,
    getAccessToken,
    refreshAccessToken,
    onUnauthorized,
    signal,
    retryUnauthorized = true,
  } = {},
) {
  const activeHandlers = sessionHandlers;
  const readAccessToken = getAccessToken || activeHandlers?.getAccessToken;
  const refreshSession = refreshAccessToken || activeHandlers?.refreshAccessToken;
  const handleUnauthorized = onUnauthorized || activeHandlers?.onUnauthorized;

  const headers = { 'Content-Type': 'application/json' };
  const token = readAccessToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });

  // Access token memang berumur pendek. Kalau ia kedaluwarsa tetapi refresh
  // cookie masih valid, perbarui sesi lalu ulangi request persis satu kali.
  // Endpoint refresh dikecualikan agar kegagalan refresh tidak membentuk loop.
  if (
    response.status === 401 &&
    retryUnauthorized &&
    token &&
    canRefreshForPath(path) &&
    typeof refreshSession === 'function'
  ) {
    // Request lain mungkin sudah menyelesaikan refresh ketika response 401 ini
    // tiba. Jika token sudah berubah, cukup retry dengan token terbaru tanpa
    // merotasi refresh cookie lagi.
    const latestToken = readAccessToken?.();
    if (!latestToken) {
      // Request paralel lain sudah mencoba refresh dan membersihkan sesi.
      // Jangan membuat percobaan refresh kedua memakai cookie yang sama.
      const payload = await readPayload(response);
      handleUnauthorized?.();
      throw toApiError(response, payload);
    }
    if (latestToken === token) {
      // refreshAccessToken membersihkan sesi bila refresh cookie juga tidak
      // berlaku. Error autentikasinya tetap diteruskan, bukan disamarkan.
      await refreshSession();
    }

    return request(path, {
      method,
      body,
      getAccessToken: readAccessToken,
      refreshAccessToken: refreshSession,
      onUnauthorized: handleUnauthorized,
      signal,
      retryUnauthorized: false,
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    if (response.status === 401 && canRefreshForPath(path)) handleUnauthorized?.();
    throw toApiError(response, payload);
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
