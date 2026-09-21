'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import apiClient, { ApiError } from '@/lib/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'checking' saat percobaan silent-refresh pertama kali (dipakai
  // untuk menahan render halaman yang butuh status login pasti,
  // mis. redirect guard) supaya tidak sempat "kelihatan" logged-out
  // sesaat sebelum refresh cookie selesai diverifikasi.
  const [status, setStatus] = useState('checking');
  const accessTokenRef = useRef(null);
  // Menjaga supaya silent-refresh di effect bawah cuma benar-benar
  // dieksekusi SEKALI per page load. Perlu karena Next.js App Router
  // default reactStrictMode:true, dan di dev mode React 18 sengaja
  // menjalankan useEffect DUA KALI (setup -> cleanup -> setup) pada
  // mount pertama untuk mendeteksi side-effect yang tidak aman. Tanpa
  // guard ini, /api/auth/refresh terpanggil 2x nyaris bersamaan dengan
  // refresh token cookie yang SAMA (yang lama) — panggilan pertama
  // sukses lalu merotasi (revoke) token lama, panggilan kedua yang
  // masih bawa cookie lama otomatis kena reuse-detection di backend
  // dan MENCABUT SEMUA SESI user, sehingga user yang baru saja login
  // tiba-tiba ke-logout / diminta login ulang saat refresh halaman.
  const refreshStartedRef = useRef(false);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const applySession = useCallback((data) => {
    accessTokenRef.current = data?.access_token || null;
    setUser(data?.user || null);
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
  }, []);

  // Silent refresh saat pertama kali app dibuka — memanfaatkan cookie
  // httpOnly `refresh_token` yang mungkin masih tersimpan dari sesi
  // sebelumnya untuk langsung mendapat access token baru tanpa user
  // harus login ulang.
  useEffect(() => {
    if (refreshStartedRef.current) return undefined;
    refreshStartedRef.current = true;

    let cancelled = false;
    (async () => {
      try {
        const data = await apiClient.post('/api/auth/refresh', undefined, {
          getAccessToken,
        });
        if (!cancelled) applySession(data);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async ({ email, password, expected_role }) => {
      const data = await apiClient.post(
        '/api/auth/login',
        { email, password, expected_role },
        { getAccessToken },
      );
      applySession(data);
      return data.user;
    },
    [applySession, getAccessToken],
  );

  const register = useCallback(
    async ({ name, email, password, role }) => {
      const data = await apiClient.post(
        '/api/auth/register',
        { name, email, password, role },
        { getAccessToken },
      );
      applySession(data);
      return data.user;
    },
    [applySession, getAccessToken],
  );

  const googleLogin = useCallback(
    async ({ credential, role, expected_role }) => {
      const data = await apiClient.post(
        '/api/auth/google',
        { credential, role, expected_role },
        { getAccessToken },
      );
      applySession(data);
      return data.user;
    },
    [applySession, getAccessToken],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/api/auth/logout', undefined, { getAccessToken });
    } finally {
      clearSession();
    }
  }, [clearSession, getAccessToken]);

  const forgotPassword = useCallback(
    (email) => apiClient.post('/api/auth/forgot-password', { email }, { getAccessToken }),
    [getAccessToken],
  );

  const verifyResetToken = useCallback(
    (token) =>
      apiClient.get(`/api/auth/reset-password/verify?token=${encodeURIComponent(token)}`, {
        getAccessToken,
      }),
    [getAccessToken],
  );

  const resetPassword = useCallback(
    (token, password) =>
      apiClient.post('/api/auth/reset-password', { token, password }, { getAccessToken }),
    [getAccessToken],
  );

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: Boolean(user),
      getAccessToken,
      login,
      register,
      googleLogin,
      logout,
      forgotPassword,
      verifyResetToken,
      resetPassword,
    }),
    [
      user,
      status,
      getAccessToken,
      login,
      register,
      googleLogin,
      logout,
      forgotPassword,
      verifyResetToken,
      resetPassword,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam <AuthProvider>.');
  return ctx;
}

export { ApiError };
