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
import apiClient, { ApiError, configureApiSession } from '@/lib/apiClient';
import { saveSessionExpiredNotice } from '@/features/auth/utils/sessionNotice';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // `checking` menahan halaman terlindungi sampai percobaan silent refresh
  // pertama selesai, sehingga pengguna tidak terlempar ke login terlalu dini.
  const [status, setStatus] = useState('checking');
  const accessTokenRef = useRef(null);

  // Backend merotasi refresh token. Semua 401 yang datang bersamaan harus
  // menunggu promise yang sama agar cookie lama tidak dipakai berulang kali.
  const refreshPromiseRef = useRef(null);
  const sessionExpiredHandledRef = useRef(false);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const applySession = useCallback((data) => {
    accessTokenRef.current = data?.access_token || null;
    sessionExpiredHandledRef.current = false;
    setUser(data?.user || null);
  }, []);

  const clearSession = useCallback(() => {
    accessTokenRef.current = null;
    setUser(null);
  }, []);

  const handleSessionExpired = useCallback(() => {
    // Beberapa request permainan dapat gagal serentak. Pesan dan pembersihan
    // sesi hanya dilakukan sekali; RequireAuth/RequireRole menangani redirect.
    if (sessionExpiredHandledRef.current) return;
    sessionExpiredHandledRef.current = true;
    clearSession();
    saveSessionExpiredNotice();
  }, [clearSession]);

  const requestSessionRefresh = useCallback(
    (markExpiredOnFailure = true) => {
      if (refreshPromiseRef.current) return refreshPromiseRef.current;

      const refreshPromise = apiClient
        .post('/api/auth/refresh', undefined, {
          // Jangan kirim access token lama dan jangan menerapkan handler 401
          // global pada request refresh itu sendiri.
          getAccessToken: () => null,
          onUnauthorized: () => {},
          retryUnauthorized: false,
        })
        .then((data) => {
          if (!data?.access_token || !data?.user) {
            throw new ApiError('Respons pembaruan sesi tidak valid.', 401);
          }
          applySession(data);
          return data.access_token;
        })
        .catch((err) => {
          // Hanya 401 dari endpoint refresh yang membuktikan cookie sesi
          // memang tidak berlaku. Gangguan jaringan/5xx tidak boleh
          // mengeluarkan pengguna; request berikutnya boleh mencoba lagi.
          if (markExpiredOnFailure && err instanceof ApiError && err.statusCode === 401) {
            handleSessionExpired();
          } else if (!markExpiredOnFailure) {
            clearSession();
          }
          throw err;
        })
        .finally(() => {
          if (refreshPromiseRef.current === refreshPromise) {
            refreshPromiseRef.current = null;
          }
        });

      refreshPromiseRef.current = refreshPromise;
      return refreshPromise;
    },
    [applySession, clearSession, handleSessionExpired],
  );

  const refreshAccessToken = useCallback(
    () => requestSessionRefresh(true),
    [requestSessionRefresh],
  );

  // apiClient dipakai oleh komponen React dan scene Phaser. Satu konfigurasi
  // bersama memastikan keduanya memperoleh refresh + retry yang konsisten.
  useEffect(
    () =>
      configureApiSession({
        getAccessToken,
        refreshAccessToken,
        onUnauthorized: handleSessionExpired,
      }),
    [getAccessToken, refreshAccessToken, handleSessionExpired],
  );

  // Coba pulihkan sesi dari refresh cookie ketika aplikasi pertama dibuka.
  // Promise bersama juga membuat pola ini aman terhadap double-effect React
  // Strict Mode: setup kedua menunggu request pertama, bukan merotasi lagi.
  useEffect(() => {
    let cancelled = false;

    requestSessionRefresh(false)
      .catch(() => {
        // Tidak punya refresh cookie pada kunjungan pertama adalah normal.
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [requestSessionRefresh]);

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
