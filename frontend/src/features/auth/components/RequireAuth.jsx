'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/context/AuthContext';

// Dipakai membungkus halaman yang butuh sesi login (mis. /game).
// Menunggu status 'checking' (silent refresh lewat cookie) selesai dulu
// sebelum memutuskan redirect, supaya pemain yang sesinya masih valid
// tidak sempat ter-lempar ke /login secara keliru saat reload halaman.
export default function RequireAuth({ children }) {
  const { status, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'ready' && !isAuthenticated) {
      router.replace('/login');
    }
  }, [status, isAuthenticated, router]);

  if (status !== 'ready' || !isAuthenticated) {
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
