'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

// Phaser scenes (MenuScene, SettingsScene) tidak punya akses ke React
// context — jadi satu-satunya jalan untuk memicu logout akun yang
// sesungguhnya (hapus cookie refresh token + panggil
// POST /api/auth/logout lewat AuthContext) dari dalam canvas game
// adalah lewat sebuah jembatan global sederhana di `window`.
export default function GameAuthBridge() {
  const { logout } = useAuth();

  useEffect(() => {
    window.__nawasenadaraAuth = { logout };
    return () => {
      if (window.__nawasenadaraAuth?.logout === logout) {
        delete window.__nawasenadaraAuth;
      }
    };
  }, [logout]);

  return null;
}
