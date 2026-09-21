'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';
import { setCharacterNameCache } from '@/features/game-engine/utils/characterName';

// Sama seperti GameProgressBridge.jsx: Phaser scenes tidak punya akses
// ke React context, jadi character_name dari server (tabel `users`,
// kolom `character_name`) diambil di sini lalu ditaruh sebagai cache
// SINKRON di window (lihat utils/characterName.js), supaya
// MenuScene/Episode1Scene/dialogue nodes bisa langsung membacanya
// tanpa await.
//
// Dipakai lewat window.__nawasenadaraProfile:
//   const hasName = await window.__nawasenadaraProfile.fetchProfile();
//   await window.__nawasenadaraProfile.saveCharacterName('Sekar');
export default function GameProfileBridge() {
  const { getAccessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;

    // Dipanggil sekali saat game dimuat (isi cache awal), DAN dipanggil
    // ulang oleh MenuScene tepat sebelum "Start Story" — supaya kalau
    // pemain login dari device lain lalu balik lagi, namanya tetap
    // konsisten dengan yang tersimpan di server, bukan cache basi.
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get('/api/auth/me', { getAccessToken });
        if (cancelled) return null;
        const name = data?.user?.character_name || null;
        if (name) setCharacterNameCache(name);
        return name;
      } catch (err) {
        console.warn('Gagal memuat profil (character_name) dari server.', err);
        return null;
      }
    };

    const saveCharacterName = async (name) => {
      const trimmed = (name || '').trim();
      if (!trimmed) throw new Error('Nama tokoh tidak boleh kosong.');
      const data = await apiClient.put(
        '/api/auth/character-name',
        { character_name: trimmed },
        { getAccessToken },
      );
      setCharacterNameCache(data?.user?.character_name || trimmed);
      return data?.user?.character_name || trimmed;
    };

    const bridge = { fetchProfile, saveCharacterName };
    window.__nawasenadaraProfile = bridge;
    fetchProfile();

    return () => {
      cancelled = true;
      if (window.__nawasenadaraProfile === bridge) {
        delete window.__nawasenadaraProfile;
      }
    };
  }, [getAccessToken]);

  return null;
}
