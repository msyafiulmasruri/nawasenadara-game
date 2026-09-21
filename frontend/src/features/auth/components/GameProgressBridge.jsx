'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';

// Sama seperti GameAuthBridge.jsx & GameNlpBridge.jsx: Phaser scenes
// tidak punya akses ke React context, jadi progres episode dari server
// (tabel user_episode_progress) diambil di sini lalu ditaruh sebagai
// CACHE SINKRON di window, supaya progressStore.js (dipakai banyak
// scene: EpisodeSelectScene, Episode1Scene, PlaceholderEpisodeScene,
// dst.) bisa terus dibaca secara SINKRON tanpa perlu me-refactor setiap
// scene jadi async.
//
// Pola: fetch SEKALI saat game dimuat -> isi cache -> progressStore.js
// baca dari cache itu. Setiap kali progres berubah (episode selesai),
// progressStore.js update cache lokal DULU (supaya UI langsung
// responsif) baru kirim PUT ke backend di belakang layar
// (fire-and-forget, tidak diawait oleh scene manapun).
export default function GameProgressBridge() {
  const { getAccessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let resolveReady;
    // FIX: race condition — Episode1Scene (dan episode lain yang punya
    // quest wajib) menentukan status "sudah pernah diselesaikan?" dari
    // cache ini SECARA SINKRON begitu scene-nya create(). Kalau fetch
    // di bawah belum selesai duluan (mis. baru buka game, jaringan
    // agak lambat), cache masih kosong -> episode yang SUDAH selesai
    // di server pun terbaca seolah belum pernah disentuh, dan quest-nya
    // dipaksa diulang lagi walau pemain memilih "Lanjutkan Permainan
    // Lama". `ready` promise ini dipakai EpisodeIntroScene untuk
    // menunggu fetch pertama beres dulu SEBELUM masuk ke scene episode
    // manapun — lihat EpisodeIntroScene.create().
    const readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });

    const fetchAll = async () => {
      try {
        const rows = await apiClient.get('/api/progress', { getAccessToken });
        if (cancelled) return null;
        window.__nawasenadaraProgressCache = rows || [];
        return window.__nawasenadaraProgressCache;
      } catch (err) {
        console.warn('Gagal memuat progres dari server, pakai cache lokal.', err);
        return null;
      } finally {
        resolveReady();
      }
    };

    const bridge = {
      fetchAll,
      ready: readyPromise,
      // Dipanggil progressStore.js setiap kali status episode berubah.
      // Sengaja TIDAK di-await oleh pemanggil (fire-and-forget) supaya
      // gameplay tidak pernah menunggu network — kalau gagal, progres
      // tetap benar secara LOKAL (cache + localStorage fallback), cuma
      // belum ke-sync ke server sampai request berikutnya berhasil.
      updateStatus: async (episodeId, status, choices) => {
        try {
          await apiClient.put(
            `/api/progress/${episodeId}`,
            { status, choices: choices || [] },
            { getAccessToken },
          );
        } catch (err) {
          console.warn(`Gagal menyimpan progres episode ${episodeId} ke server.`, err);
        }
      },

      // Dipanggil MenuScene saat pemain memilih "Mulai Permainan
      // Baru" (lihat pilihan Lanjutkan/Mulai Baru di
      // _handleStartStory()). Menghapus semua progres di SERVER
      // (bukan cuma cache lokal seperti resetProgress() lama di
      // progressStore.js), lalu muat ulang cache supaya
      // EpisodeSelectScene langsung melihat semua episode terkunci
      // lagi (kecuali episode 1).
      resetAll: async () => {
        await apiClient.delete('/api/progress', { getAccessToken });
        await fetchAll();
      },
    };

    window.__nawasenadaraProgress = bridge;
    // Muat cache begitu bridge terpasang (mis. saat GamePage pertama
    // kali dibuka), supaya EpisodeSelectScene yang muncul beberapa saat
    // kemudian sudah punya data terbaru dari server.
    fetchAll();

    return () => {
      cancelled = true;
      if (window.__nawasenadaraProgress === bridge) {
        delete window.__nawasenadaraProgress;
      }
    };
  }, [getAccessToken]);

  return null;
}
