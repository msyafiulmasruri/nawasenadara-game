'use client';

import { useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { setupAutoFullscreenOnFirstInteraction } from '@/lib/fullscreen';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Providers({ children }) {
  // Dipasang di root Providers supaya berlaku untuk SEMUA halaman
  // (login, register, forgot-password, game, dst.) — bukan cuma saat
  // sudah masuk ke /game. Begitu pengguna melakukan interaksi pertama
  // apa pun (klik/tap/keydown) di halaman manapun, browser otomatis
  // diminta masuk fullscreen — jadi kalau interaksi pertama itu terjadi
  // di halaman login (mis. klik input email atau tombol Masuk),
  // fullscreen sudah aktif SEBELUM pemain sempat masuk ke /game.
  useEffect(() => {
    const cleanup = setupAutoFullscreenOnFirstInteraction();
    return cleanup;
  }, []);

  // Kalau env var belum di-set (mis. saat dev awal sebelum kredensial
  // Google dibuat), render tanpa GoogleOAuthProvider supaya app tidak
  // crash — GoogleAuthButton sendiri akan menyembunyikan diri kalau
  // client ID tidak ada (lihat components/GoogleAuthButton.jsx).
  if (!GOOGLE_CLIENT_ID) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
}
