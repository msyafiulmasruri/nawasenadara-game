// Naskah dialog quest NPC Rafi (Episode 1 — "Awal yang Baru").
//
// REVISI: tema dinaikkan eksplisit ke isu kesetaraan gender & bentuk
// awal kekerasan verbal terhadap remaja putri (komentar/candaan
// bias-gender, tekanan sosial untuk "diam saja"). Ada DUA titik cabang
// (n3 dan n5), masing-masing pilihan diberi `emotion` — salah satu dari
// 6 label yang SAMA dengan output model IndoBERT di layanan AI
// (app/services/sentiment_model.py, lihat nawasenadara-ai-main):
//   aman | netral | sedih | takut | marah | menyinggung
//
// `emotion` diakumulasi menjadi `emotion_tally` episode ini (lihat
// utils/emotionEnding.js -> computeEnding()) untuk menentukan tiga
// hasil akhir: Ending Sejati, Ending Baik, atau Ending Buruk. Tingkat
// mood baru ditampilkan setelah episode selesai, tepat sebelum ending
// diungkapkan; tidak ada mood bar selama gameplay.
//
// `scoreKey` LAMA (assertiveness/passive/dst.) dihapus — `emotion`
// sekarang satu-satunya sumber kebenaran skor, supaya konsisten dengan
// label yang sama persis dipakai backend/AI service (tidak ada dua
// skema skor berbeda yang harus dijaga sinkron).
//
// Setiap node:
//   { id, speaker: 'rafi' | 'narration', text, next? }
//   Node cabang punya `choices` (bukan `next`) — array
//   { id, label, emotion, next }.
//
// `dynamic: true` (+ `situationHint` opsional) menandai baris balasan
// Rafi yang SUDAH DIPLOT (text di atas tetap ada sebagai fallback &
// tampil instan dulu), tapi lalu dibuat ULANG dengan Gen AI (Groq,
// lihat DialogueBox._requestDynamicLine -> window.__nawasenadaraNlp.
// generateNpcLine -> POST /api/nlp/npc-dialogue) supaya redaksi
// kalimatnya bervariasi tiap kali node ini muncul, TANPA mengubah plot
// point/keputusan cerita (isi & efeknya ke choices/next tetap sama —
// cuma cara Rafi mengucapkannya yang di-parafrase ulang). Kalau
// pemanggilan gagal (offline, AI service down, dst.), teks statis di
// atas TETAP tampil apa adanya sebagai fallback, jadi dialog tidak
// pernah macet menunggu.

// --- Dialog kunjungan ULANG (gaya Harvest Moon) --------------------
const EPISODE1_REVISIT_LINES = [
  'Eh, gimana? Udah mulai betah belum di sini?',
  'Btw soal yang tadi... makasih ya udah jujur ngomong ke aku, aku jadi mikir ulang.',
  'Nanti kalau butuh temen ke kantin atau nanya-nanya soal sekolah sini, samperin aku aja.',
  'Btw kelasnya asik kan? Lumayan seru sih kalau udah kenal semua orang.',
];

let lastRevisitIndex = -1;

export function buildEpisode1RevisitDialogue() {
  let index = Math.floor(Math.random() * EPISODE1_REVISIT_LINES.length);
  if (EPISODE1_REVISIT_LINES.length > 1 && index === lastRevisitIndex) {
    index = (index + 1) % EPISODE1_REVISIT_LINES.length;
  }
  lastRevisitIndex = index;

  return {
    npcId: 'rafi',
    startNode: 'revisit',
    nodes: {
      revisit: {
        id: 'revisit',
        speaker: 'rafi',
        text: EPISODE1_REVISIT_LINES[index],
      },
    },
  };
}

// Deskripsi singkat situasi di tiap titik cabang (n3/n5) — dipakai
// buildEpisode1CounselingContext() di bawah untuk merangkai ringkasan
// yang dikirim OTOMATIS ke chatbot Kak Dara saat pemain membuka sesi
// konseling setelah quest Rafi selesai (lihat permintaan: Kak Dara
// harus "sudah tahu" isi obrolan, tidak perlu pemain jelaskan manual
// dari nol). Sengaja teks pendek & natural (bukan dump mentah node
// dialog) supaya enak dibaca Groq sebagai satu pesan pembuka wajar.
const CHOICE_SITUATION_TEXT = {
  n3: 'Rafi bilang cewek-cewek di kelas biasanya diem aja kalau dicandain soal gender, terus nanya apa aku juga gitu',
  n5: 'terus Rafi lanjut bilang cewek emang gitu, gampang tersinggung',
};

/**
 * Merangkai ringkasan obrolan quest Rafi (dari `collectedChoices` yang
 * dikirim DialogueBox.onClose) jadi SATU pesan naratif orang-pertama —
 * dikirim otomatis sebagai giliran pembuka ke /api/nlp/counseling
 * (trigger_source: 'episode_summary', lihat GameUIBridge.jsx
 * openChatbot()) supaya Kak Dara langsung merespons kontekstual tanpa
 * pemain perlu mengetik ulang ceritanya dari awal.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null} null kalau belum ada pilihan sama sekali.
 */
export function buildEpisode1CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = ['Barusan aku ngobrol sama Rafi, teman sekelas baruku hari ini.'];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE1_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((c) => c.id === choiceId);
    if (!situation || !chosen) return;
    // Label pilihan disimpan dengan tanda kutip pembungkus, mis.
    // '"Iya deh, gapapa kok."' — dilucuti supaya menyatu wajar ke
    // dalam kalimat naratif ("Aku jawab: Iya deh...").
    const replyText = chosen.label.replace(/^"|"$/g, '').replace(/\s*\(diucapkan.*\)$/, '');
    parts.push(`Waktu itu ${situation}. Aku jawab: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE1_DIALOGUE = {
  npcId: 'rafi',
  startNode: 'n1',
  nodes: {
    n1: {
      id: 'n1',
      speaker: 'rafi',
      text: 'Eh, lo murid baru itu kan? Buru-buru amat masuknya, kayak yang lain telat gitu.',
      next: 'n1b',
    },
    n1b: {
      id: 'n1b',
      speaker: 'rafi',
      text: 'Santai, gue cuma iseng. Sini duduk, gue kenalin ke yang lain.',
      next: 'n2',
    },
    n2: {
      id: 'n2',
      speaker: 'rafi',
      text: 'Btw enak ya jadi cewek, gak usah pusing-pusing mikirin nilai matematika susah, kan santai aja. Hehe, bercanda doang kok— tapi bener juga kan?',
      next: 'n2b',
    },
    n2b: {
      id: 'n2b',
      speaker: 'rafi',
      text: 'Lagian anak-anak kelas ini emang asik, biasanya pada selow kalau dicandain, gak gampang baper. {PLAYER_NAME} juga asik kan orangnya?',
      next: 'n3',
    },
    // --- Titik cabang 1 ---
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Gimana caramu merespons omongan Rafi?',
      choices: [
        {
          id: 'a',
          label: '"Iya deh, santai aja, aku gak masalah kok."',
          emotion: 'takut',
          next: 'n4a',
        },
        {
          id: 'b',
          label: '"Gak gitu juga kali Raf, pintar atau enggak kan gak ada hubungannya sama cowok atau cewek."',
          emotion: 'aman',
          next: 'n4b',
        },
        {
          id: 'c',
          label: '"Garing banget candaan lo, gak mutu."',
          emotion: 'menyinggung',
          next: 'n4c',
        },
      ],
    },
    n4a: {
      id: 'n4a',
      speaker: 'rafi',
      text: 'Nah gitu dong! Asik kan kalau bisa santai bareng.',
      dynamic: true,
      situationHint: 'Aku baru saja mengalah dan bilang santai aja, Rafi merasa omongannya wajar dan santai meresponsnya.',
      next: 'n5',
    },
    n4b: {
      id: 'n4b',
      speaker: 'rafi',
      text: 'Eh... iya juga sih ya. Sorry deh, gue cuma latah ikut-ikutan obrolan anak-anak tadi.',
      dynamic: true,
      situationHint: 'Aku baru saja menegur dengan tenang bahwa kepintaran tidak ada hubungannya dengan gender, dan Rafi mulai sadar lalu meminta maaf.',
      next: 'n5',
    },
    n4c: {
      id: 'n4c',
      speaker: 'rafi',
      text: 'Waduh selow dong, gue kan cuma bercanda, gak usah ngegas gitu kali.',
      dynamic: true,
      situationHint: 'Aku baru saja membalas dengan kata-kata sinis kalau candaannya garing, Rafi jadi defensif dan kaget.',
      next: 'n5',
    },
    // --- Titik cabang 2 ---
    n5: {
      id: 'n5',
      speaker: 'rafi',
      text: 'Tapi serius, kadang anak-anak sini kalau diajak becanda dikit gampang baper. Menurut {PLAYER_NAME} gimana, bener kan?',
      dynamic: true,
      situationHint: 'Rafi bilang kalau teman-teman di kelas gampang baper, lalu bertanya apakah aku setuju dengannya.',
      choices: [
        {
          id: 'a',
          label: '"Bukan soal gampang baper, tapi ini soal saling ngehargai sesama teman aja."',
          emotion: 'aman',
          next: 'cutsceneA1',
        },
        {
          id: 'b',
          label: '"Terserah lo mau bilang apa, gue gak mau ambil pusing."',
          emotion: 'netral',
          next: 'cutsceneB1',
        },
        {
          id: 'c',
          label: '"Udah ah, males ribut..." (diucapkan pelan sambil buang muka)',
          emotion: 'sedih',
          next: 'cutsceneC1',
        },
      ],
    },


    // --- Branch A: berani menyampaikan batasan ---
    cutsceneA1: {
      id: 'cutsceneA1',
      speaker: 'narration',
      text: 'Ucapanmu membuat Rafi berhenti tertawa. Beberapa detik berlalu di koridor depan kelas. Rafi yang tadi bercanda mulai terdiam.',
      next: 'cutsceneA2',
    },

    cutsceneA2: {
      id: 'cutsceneA2',
      speaker: 'rafi',
      text: 'Lah, gue kan cuma bercanda. Tapi... ya, mungkin cara gue ngomong tadi emang kelewatan.',
      next: 'cutsceneA3',
    },

    cutsceneA3: {
      id: 'cutsceneA3',
      speaker: 'narration',
      text: 'Rafi menggaruk belakang kepalanya, terlihat sedikit salah tingkah. Kamu tetap berdiri di sana, memberi kesempatan kepadanya untuk memahami maksudmu.',
      next: 'cutsceneA4',
    },

    cutsceneA4: {
      id: 'cutsceneA4',
      speaker: 'rafi',
      text: 'Oke deh, gue paham. Harusnya gue nggak asal ngomong begitu. Ya udah, nggak usah dibahas panjang-panjang juga.',
      next: 'n6a',
    },

    // --- Branch B: memilih tidak ambil pusing ---
    cutsceneB1: {
      id: 'cutsceneB1',
      speaker: 'narration',
      text: 'Kamu mengalihkan pandangan dan memilih untuk tidak ikut memperpanjang perdebatan. Suara siswa lain yang berlalu-lalang kembali terdengar memenuhi koridor.',
      next: 'cutsceneB2',
    },

    cutsceneB2: {
      id: 'cutsceneB2',
      speaker: 'rafi',
      text: 'Nah, gitu dong. Nggak usah dibawa serius. Santai aja kali, kita juga cuma ngobrol.',
      next: 'cutsceneB3',
    },

    cutsceneB3: {
      id: 'cutsceneB3',
      speaker: 'narration',
      text: 'Kamu tidak membalas. Percakapan itu memang berhenti, tetapi bukan berarti kamu sepenuhnya setuju. Kamu hanya merasa tidak ingin menghabiskan tenaga untuk berdebat sekarang.',
      next: 'n6b',
    },

    // --- Branch C: memilih diam karena tidak nyaman ---
    cutsceneC1: {
      id: 'cutsceneC1',
      speaker: 'narration',
      text: 'Kamu menunduk dan melihat tali sepatumu perlahan. Kamu ingin mengatakan sesuatu, tetapi kata-katanya terasa sulit keluar. Koridor yang ramai mendadak terasa tidak nyaman.',
      next: 'cutsceneC2',
    },

    cutsceneC2: {
      id: 'cutsceneC2',
      speaker: 'rafi',
      text: 'Loh, kok diem? Ya udah deh, kalau lo gamau ikut ngomong juga gapapa.',
      next: 'cutsceneC3',
    },

    cutsceneC3: {
      id: 'cutsceneC3',
      speaker: 'narration',
      text: 'Rafi kembali disapa oleh temannya yang lewat. Tidak ada yang bertanya apakah kamu baik-baik saja. Kamu masih berdiri di depan kelas, berusaha mengabaikan perasaan mengganjal yang tertinggal.',
      next: 'n6c',
    },

    n6a: {
      id: 'n6a',
      speaker: 'rafi',
      text: 'Rafi terdiam sejenak. "Eh... iya juga ya," gumamnya pelan. Btw, selamat datang ya. Semoga betah di sini.',
      dynamic: true,
      situationHint: 'Rafi baru saja disadarkan bahwa candaannya soal gender tidak tepat, lalu buru-buru menyapa ramah menyambut aku.',
    },
    n6b: {
      id: 'n6b',
      speaker: 'rafi',
      text: 'Suasana kembali biasa saja, seolah tidak terjadi apa-apa. "Btw, selamat datang ya," kata Rafi singkat.',
      dynamic: true,
      situationHint: 'Rafi tidak terlalu menanggapi lebih jauh dan cuma menyapa singkat menyambut aku ke kelas.',
    },
    n6c: {
      id: 'n6c',
      speaker: 'rafi',
      text: '{PLAYER_NAME} memilih diam, walau dadanya terasa sesak. Rafi tidak menyadarinya. "Btw, selamat datang ya. Semoga betah di sini."',
      dynamic: true,
      situationHint: 'Aku memilih diam menahan perasaan tidak nyaman, dan Rafi tidak menyadarinya sama sekali, tetap menyapa ramah seolah semua baik-baik saja.',
    },
    // Semua node n6* adalah node terakhir (tanpa `next`) — DialogueBox
    // menutup diri & menandai quest selesai setelah salah satunya
    // tampil, tergantung cabang mana yang diambil pemain di n5.
  },
};
