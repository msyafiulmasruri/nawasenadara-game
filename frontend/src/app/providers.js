'use client';

import { useEffect } from 'react';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { setupAutoFullscreenOnFirstInteraction } from '@/lib/fullscreen';

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

  // Registrasi Service Worker PWA (aktif di browser HP & desktop)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch((err) => {
          console.debug('[PWA] ServiceWorker info:', err);
        });
      });
    }
  }, []);

  return <AuthProvider>{children}</AuthProvider>;
}
