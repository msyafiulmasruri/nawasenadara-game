const SESSION_NOTICE_KEY = 'nawasenadara:session-notice';

export const SESSION_EXPIRED_MESSAGE =
  'Sesi kamu telah berakhir. Silakan masuk kembali untuk melanjutkan.';

export function saveSessionExpiredNotice() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(SESSION_NOTICE_KEY, SESSION_EXPIRED_MESSAGE);
  } catch {
    // Browser yang memblokir sessionStorage tetap diarahkan ke halaman login.
  }
}

export function readSessionNotice() {
  if (typeof window === 'undefined') return '';

  try {
    return window.sessionStorage.getItem(SESSION_NOTICE_KEY) || '';
  } catch {
    return '';
  }
}

export function clearSessionNotice() {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(SESSION_NOTICE_KEY);
  } catch {
    // Tidak perlu tindakan tambahan bila storage tidak tersedia.
  }
}
