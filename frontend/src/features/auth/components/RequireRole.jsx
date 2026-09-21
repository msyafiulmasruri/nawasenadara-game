'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';

// Sama seperti RequireAuth, tapi juga menolak user yang statusnya
// SUDAH login tapi role-nya tidak diizinkan (mis. siswa yang entah
// bagaimana mengakses /guru-bk/dashboard langsung lewat URL). Redirect
// tujuannya dibuat sesuai konteks role, bukan selalu ke /login, supaya
// pesan yang diterima pengguna masuk akal untuk portalnya masing-
// masing.
export default function RequireRole({ allowedRoles, redirectTo = '/login', children }) {
  const { status, isAuthenticated, user } = useAuth();
  const router = useRouter();

  const roleAllowed = user && allowedRoles.includes(user.role);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!isAuthenticated) {
      router.replace(redirectTo);
      return;
    }
    if (!roleAllowed) {
      // Login valid tapi portal salah — arahkan ke halaman yang sesuai
      // perannya sendiri alih-alih menampilkan halaman kosong/error.
      router.replace(user.role === 'guru_bk' ? '/guru-bk/dashboard' : '/game');
    }
  }, [status, isAuthenticated, roleAllowed, user, redirectTo, router]);

  if (status !== 'ready' || !isAuthenticated || !roleAllowed) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#05050f',
          color: '#ffffff',
          fontFamily: "'Pixelify Sans', monospace",
          fontSize: 14,
        }}
      >
        Memuat sesi…
      </div>
    );
  }

  return children;
}
