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
      text: 'Btw enak ya jadi cewek, gak perlu mikirin nilai matematika susah-susah, kan nanti juga "kerjaannya" di rumah doang. Hehe, bercanda— eh tapi bener juga sih.',
      next: 'n2b',
    },
    n2b: {
      id: 'n2b',
      speaker: 'rafi',
      text: 'Lagian kelas ini emang gitu, cewek-cewek biasanya diem aja kalau dicandain, gak baper-baper amat. {PLAYER_NAME} juga gitu kan?',
      next: 'n3',
    },
    // --- Titik cabang 1 ---
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Gimana respons {PLAYER_NAME}?',
      choices: [
        {
          id: 'a',
          label: '"Iya deh, gapapa kok, aku gak masalah."',
          emotion: 'takut',
          next: 'n4a',
        },
        {
          id: 'b',
          label: '"Kok gitu sih, kayaknya itu gak ada hubungannya sama jadi cewek atau cowok deh."',
          emotion: 'aman',
          next: 'n4b',
        },
        {
          id: 'c',
          label: '"Ih apaan sih, receh banget bercandaannya."',
          emotion: 'menyinggung',
          next: 'n4c',
        },
      ],
    },
    n4a: {
      id: 'n4a',
      speaker: 'rafi',
      text: 'Nah gitu dong, santai aja.',
      dynamic: true,
      situationHint: 'Aku baru saja mengalah dan bilang tidak masalah, Rafi santai dan cuek saja meresponsnya.',
      next: 'n5',
    },
    n4b: {
      id: 'n4b',
      speaker: 'rafi',
      text: 'Eh... iya juga sih. Maksud gue bukan gitu-gitu amat, cuma kebiasaan aja denger yang lain ngomong begitu.',
      dynamic: true,
      situationHint: 'Aku baru saja menegur dengan tenang bahwa candaannya tidak ada hubungannya dengan gender, dan Rafi mulai sadar lalu beralasan.',
      next: 'n5',
    },
    n4c: {
      id: 'n4c',
      speaker: 'rafi',
      text: 'Woy santai, gue cuma bercanda doang kali, gak usah sensi gitu deh.',
      dynamic: true,
      situationHint: 'Aku baru saja membalas dengan sedikit menyindir kalau candaannya receh, Rafi jadi defensif dan bilang aku kesenggol/baperan.',
      next: 'n5',
    },
    // --- Titik cabang 2 ---
    // REVISI: sebelumnya ada "Doni" yang tiba-tiba nyahut di sini —
    // memunculkan side karakter kedua padahal episode ini didesain
    // hanya punya SATU side karakter (Rafi, lihat catatan NPCS di
    // config/npcs.js: "SATU NPC per episode"). Sekarang baris ini
    // tetap Rafi sendiri yang bicara, jadi konsisten satu lawan bicara
    // sepanjang quest.
    n5: {
      id: 'n5',
      speaker: 'rafi',
      text: 'Halah, udah ah, cewek mah emang gitu terus, gampang tersinggung doang. Gimana, {PLAYER_NAME} setuju kan?',
      dynamic: true,
      situationHint: 'Rafi baru saja menggeneralisasi bahwa cewek gampang tersinggung, lalu menantang balik dengan bertanya apakah aku setuju.',
      choices: [
        {
          id: 'a',
          label: '"Bukan soal gampang tersinggung, tapi ini soal saling menghargai aja kali."',
          emotion: 'aman',
          next: 'n6a',
        },
        {
          id: 'b',
          label: '"Terserah kalian mau bilang apa, aku gak mau ambil pusing."',
          emotion: 'netral',
          next: 'n6b',
        },
        {
          id: 'c',
          label: '"Udah, diemin aja, males ribut." (diucapkan pelan, menahan diri)',
          emotion: 'sedih',
          next: 'n6c',
        },
      ],
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
