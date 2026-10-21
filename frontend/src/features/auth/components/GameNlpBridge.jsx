'use client';

import { useEffect } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';
import apiClient from '@/lib/apiClient';

// Sama seperti GameAuthBridge.jsx (lihat komentar di file itu untuk
// alasan lengkap kenapa pola window-bridge ini diperlukan): Phaser
// scenes berjalan di luar pohon komponen React, jadi tidak punya akses
// langsung ke AuthContext / access token. Bridge ini menaruh fungsi-
// fungsi pemanggil endpoint /api/nlp/* ke `window` supaya scene mana
// pun (EpisodeIntroScene, Episode1Scene, StoryEpisodeScene, dst.)
// bisa memanggilnya lewat `window.__nawasenadaraNlp`.
//
// CONTOH PEMAKAIAN di dalam sebuah Phaser Scene, saat pemain submit
// jurnal refleksi di akhir episode:
//
//   const nlp = window.__nawasenadaraNlp;
//   if (nlp) {
//     const result = await nlp.analyzeReflection({
//       text: reflectionText,
//       episodeId: this.episodeId,
//     });
//     if (result.suggest_counseling) {
//       // tampilkan ajakan halus untuk buka chatbot, JANGAN dipaksa
//       // otomatis terbuka untuk sumber 'reflection' biasa — lihat
//       // NLP_INTEGRATION_DESIGN.md.
//     }
//   }
//
// Lihat NLP_INTEGRATION_DESIGN.md untuk peta lengkap kapan tiap
// endpoint ini dipanggil di masing-masing dari 6 episode.
//
// TAMBAHAN: generateNpcLine (di bawah) dipakai DialogueBox.js untuk
// menulis-ulang (parafrase) baris dialog NPC yang sudah diplot naskah
// episode — lihat catatan panjang di episode1Dialogue.js/
// episode2Dialogue.js (`dynamic: true` + `situationHint`).
export default function GameNlpBridge() {
  const { getAccessToken } = useAuth();

  useEffect(() => {
    const bridge = {
      // Dipanggil setelah pemain mengisi jurnal refleksi singkat di
      // akhir SEBUAH episode (episodeId 1-6). Selalu dipanggil di
      // SEMUA episode — lihat proposal Gambar 3.2.
      analyzeReflection: async ({ text, episodeId }) =>
        apiClient.post(
          '/api/nlp/analyze',
          { text, episode_id: episodeId },
          { getAccessToken },
        ),

      // Klasifikasi mood yang ditampilkan setelah ending dan sebelum
      // jurnal. `responses` berisi teks opsi yang benar-benar dipilih,
      // bukan label emosi buatan UI.
      classifyEpisodeMood: async ({ responses, episodeId }) =>
        apiClient.post(
          '/api/nlp/episode-mood',
          { responses, episode_id: episodeId },
          { getAccessToken },
        ),

      // Satu giliran chat di Chatbot Konseling Virtual. `sessionId`
      // opsional — kosongkan di pesan pertama sebuah percakapan baru,
      // lalu simpan `session_id` dari respons untuk dipakai di pesan-
      // pesan berikutnya supaya histori percakapan tetap nyambung.
      sendCounselingMessage: async ({ text, sessionId, triggerSource, episodeId }) => {
        const allowedTriggers = ['manual', 'reflection_flag', 'episode7_phone', 'episode_summary', 'npc_quest'];
        const safeTrigger = allowedTriggers.includes(triggerSource) ? triggerSource : 'manual';
        const numEpisode = Number(episodeId);
        const validEpisodeId = Number.isInteger(numEpisode) && numEpisode >= 1 && numEpisode <= 6 ? numEpisode : undefined;

        return apiClient.post(
          '/api/nlp/counseling',
          {
            text,
            ...(sessionId ? { session_id: sessionId } : {}),
            trigger_source: safeTrigger,
            ...(validEpisodeId !== undefined ? { episode_id: validEpisodeId } : {}),
          },
          { getAccessToken },
        );
      },

      getCounselingHistory: async (sessionId) =>
        apiClient.get(`/api/nlp/counseling/${sessionId}/messages`, { getAccessToken }),

      // Dipanggil saat chatbot BARU DIBUKA — cek apakah ada sesi
      // percakapan sebelumnya yang masih "aktif" (idle < 30 menit),
      // supaya histori chat tidak hilang tiap kali jendela chatbot
      // ditutup-buka lagi (mis. setelah keluar-masuk game). Balikan
      // { session_id: null, messages: [] } kalau belum/tidak ada.
      getActiveSession: async () =>
        apiClient.get('/api/nlp/counseling/active', { getAccessToken }),

      // Dipanggil HANYA oleh Episode7Scene (map "Mencari Tempat Aman")
      // saat memuat scene telepon, untuk memutuskan apakah NPC
      // chatbot perlu auto-muncul karena distres tinggi terdeteksi di
      // episode-episode sebelumnya. Lihat NLP_INTEGRATION_DESIGN.md.
      shouldAutoOpenCounseling: async () =>
        apiClient.get('/api/nlp/counseling/should-auto-open', { getAccessToken }),

      // Menulis ULANG (parafrase) satu baris dialog NPC yang sudah
      // diplot naskah episode — dipanggil DialogueBox.js tiap kali
      // sebuah node ber-`dynamic: true` dirender (lihat
      // episode1Dialogue.js/episode2Dialogue.js). Baris statis di
      // naskah SUDAH tampil duluan sebagai fallback instan sebelum
      // panggilan ini selesai — kalau ini gagal/timeout, DialogueBox
      // cukup diam-diam tetap memakai baris statis itu, TIDAK pernah
      // memblokir pemain menunggu.
      generateNpcLine: async ({ npcName, plottedLine, situation, playerChoiceLabel }) =>
        apiClient.post(
          '/api/nlp/npc-dialogue',
          {
            npc_name: npcName,
            plotted_line: plottedLine,
            situation: situation || null,
            player_choice_label: playerChoiceLabel || null,
          },
          { getAccessToken },
        ),

      // Mengambil daftar pertanyaan evaluasi assertive boundary untuk
      // pertarungan Boss Runner di Episode 6. Dihasilkan secara dinamis
      // oleh AI (Groq LLM) disesuaikan untuk usia SMP dan SMA, dengan
      // fallback otomatis ke bank soal terkurasi jika offline.
      getRunnerQuestions: async ({ count = 10, targetAudience = 'smp_sma', topics = [] } = {}) =>
        apiClient.post(
          '/api/nlp/quiz-questions',
          {
            count,
            target_audience: targetAudience,
            ...(topics && topics.length ? { topics } : {}),
          },
          { getAccessToken },
        ),

      // Mini Boss Close-Up Dialogue: Mengambil 5 dialog dinamis Reno (Siswa Nakal)
      getMiniBossDialogues: async () =>
        apiClient.get('/api/nlp/miniboss/dialogues', { getAccessToken }),

      // Mini Boss Close-Up Dialogue: Evaluasi respon ketikan siswa & de-eskalasi bar emosi
      evaluateMiniBossResponse: async ({ text, round, topic, npcLine, currentEmotionTier }) =>
        apiClient.post(
          '/api/nlp/miniboss/evaluate-response',
          {
            text,
            round,
            topic,
            npc_line: npcLine,
            current_emotion_tier: currentEmotionTier,
          },
          { getAccessToken },
        ),
    };

    window.__nawasenadaraNlp = bridge;
    return () => {
      if (window.__nawasenadaraNlp === bridge) {
        delete window.__nawasenadaraNlp;
      }
    };
  }, [getAccessToken]);

  return null;
}
