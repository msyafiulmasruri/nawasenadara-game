// Cermin dari logic frontend
// (features/game-engine/utils/emotionEnding.js) — sengaja diduplikasi
// (bukan di-share lewat package bersama) karena frontend & backend
// masih dua repo terpisah tanpa monorepo tooling. Kalau naskah episode
// baru ditambah atau skema skor di frontend diubah, definisi di sini
// WAJIB disinkronkan manual. `ending_key` di sini murni dipakai untuk
// keperluan backend/dashboard guru BK (analitik, laporan) — tampilan
// Ending Scene yang dilihat PEMAIN tetap dihitung ulang di frontend
// dari `choices` yang sama, jadi tidak ada risiko keduanya beda kalau
// frontend lupa sinkron (worst case cuma dashboard guru BK yang telat
// update).
//
// REVISI: skema ending disederhanakan dari 6 kategori (satu per label
// emosi) jadi TIGA kategori: true / good / bad — dihitung dari
// RATA-RATA skor tertimbang seluruh pilihan (EMOTION_SCORE), bukan
// lagi dari label yang paling sering muncul saja.

const EMOTION_KEYS = ['aman', 'netral', 'sedih', 'takut', 'marah', 'menyinggung'];

// Urutan prioritas kalau ada nilai tally sama tinggi (dipakai untuk
// `dominant`, sekadar metadata analitik — TIDAK lagi menentukan
// endingKey secara langsung).
const EMOTION_PRIORITY = ['aman', 'netral', 'sedih', 'takut', 'menyinggung', 'marah'];

// SAMA PERSIS dengan EMOTION_SCORE di frontend (utils/emotionEnding.js).
const EMOTION_SCORE = {
  aman: 2,
  netral: 0,
  sedih: -1,
  takut: -1,
  menyinggung: -1,
  marah: -2,
};

// SAMA PERSIS dengan ambang batas di frontend.
const TRUE_ENDING_THRESHOLD = 1.5;
const BAD_ENDING_THRESHOLD = 0;

function emptyTally() {
  return EMOTION_KEYS.reduce((acc, key) => ({ ...acc, [key]: 0 }), {});
}

function computeScore(tally) {
  const totalResponses = EMOTION_KEYS.reduce((sum, k) => sum + (tally[k] || 0), 0);
  if (totalResponses === 0) return { avgScore: 0, totalResponses: 0 };

  const totalScore = EMOTION_KEYS.reduce(
    (sum, k) => sum + (tally[k] || 0) * (EMOTION_SCORE[k] ?? 0),
    0,
  );
  return { avgScore: totalScore / totalResponses, totalResponses };
}

/** @returns {'true'|'good'|'bad'} */
function classifyEndingKey(avgScore, totalResponses) {
  if (totalResponses === 0) return 'good';
  if (avgScore >= TRUE_ENDING_THRESHOLD) return 'true';
  if (avgScore < BAD_ENDING_THRESHOLD) return 'bad';
  return 'good';
}

// Judul ending PER-EPISODE untuk ditampilkan di dashboard guru BK
// (tabel "Progres Episode") — sengaja disalin persis dari judul yang
// sama dilihat PEMAIN (frontend utils/emotionEnding.js
// ENDING_DEFINITIONS[1][*].title), supaya guru BK & siswa melihat
// istilah ending yang identik, bukan cuma kode `ending_key` mentah.
// Setiap episode punya tiga label yang sama kategorinya, tetapi judul
// naratifnya disesuaikan dengan tema episode.
export const ENDING_LABELS_PER_EPISODE = {
  1: {
    true: 'Ending Sejati — "Suara yang Didengar"',
    good: 'Ending Baik — "Belajar Bersikap"',
    bad: 'Ending Buruk — "Terjebak Pola Lama"',
  },
  2: {
    true: 'Ending Sejati — "Tidak Sendirian"',
    good: 'Ending Baik — "Mulai Peduli"',
    bad: 'Ending Buruk — "Ikut Diam, Ikut Bersalah"',
  },
  3: {
    true: 'Ending Sejati — "Batas yang Tegas"',
    good: 'Ending Baik — "Pelajaran Berharga"',
    bad: 'Ending Buruk — "Terjerat Jebakan Manipulasi"',
  },
  4: {
    true: 'Ending Sejati — "Batas yang Dihormati"',
    good: 'Ending Baik — "Berani Menjauh"',
    bad: 'Ending Buruk — "Candaan yang Tertinggal"',
  },
  5: {
    true: 'Ending Sejati — "Teman yang Aman"',
    good: 'Ending Baik — "Tetap Menemani"',
    bad: 'Ending Buruk — "Niat Baik, Risiko Baru"',
  },
  6: {
    true: 'Ending Sejati — "Suara yang Menjadi Cahaya"',
    good: 'Ending Baik — "Berani Melangkah"',
    bad: 'Ending Buruk — "Masih Mencari Suara"',
  },
};

export const ENDING_LABELS = {
  true: 'Ending Sejati',
  good: 'Ending Baik',
  bad: 'Ending Buruk',
};

export function getEndingLabel(episodeId, endingKey) {
  return (
    ENDING_LABELS_PER_EPISODE[episodeId]?.[endingKey] ||
    ENDING_LABELS[endingKey] ||
    'Ending Baik'
  );
}

/**
 * @param {number} episodeId
 * @param {Array<{emotion?: string}>} choices
 * @returns {{ emotionTally: Record<string, number>, dominant: string, avgScore: number, endingKey: 'true'|'good'|'bad' }}
 */
export function computeEmotionTallyAndEnding(episodeId, choices = []) {
  const tally = emptyTally();
  (Array.isArray(choices) ? choices : []).forEach((c) => {
    const key = c?.emotion;
    if (key && Object.prototype.hasOwnProperty.call(tally, key)) {
      tally[key] += 1;
    }
  });

  let dominant = 'netral';
  let best = 0;
  EMOTION_PRIORITY.forEach((label) => {
    if (tally[label] > best) {
      best = tally[label];
      dominant = label;
    }
  });

  const { avgScore, totalResponses } = computeScore(tally);
  const endingKey = classifyEndingKey(avgScore, totalResponses);

  return { emotionTally: tally, dominant, avgScore, endingKey };
}

// Judul + konklusi plus/minus untuk ENDING AKUMULASI (gabungan seluruh
// episode yang sudah diselesaikan siswa) — dipakai dashboard guru BK
// (bk-controller.js getStudentDetail) sebagai representasi "kalau
// siswa ini mencapai Episode 6 sekarang, ending macam apa yang paling
// mencerminkan pola responsnya selama ini". Bahasanya sengaja lebih
// merangkum ("secara keseluruhan...", "sepanjang cerita...") daripada
// judul per-episode di ENDING_LABELS di atas, karena ini bicara pola
// jangka panjang, bukan satu kejadian di satu episode.
const OVERALL_ENDING_META = {
  true: {
    title: 'Sejati — Berdaya & Konsisten Asertif',
    plusText:
      'Secara keseluruhan siswa secara konsisten merespons situasi sulit dengan tenang, asertif, dan berani menyuarakan ketidaknyamanannya secara sehat, di hampir seluruh episode yang sudah dilalui.',
    minusText:
      'Tetap perlu pendampingan rutin — pola positif ini baik untuk terus dikuatkan, bukan tanda situasi sudah sepenuhnya aman.',
  },
  good: {
    title: 'Baik — Cukup Adaptif',
    plusText:
      'Siswa relatif tenang dan di banyak situasi menunjukkan sikap yang seimbang, dengan beberapa momen berani bersikap.',
    minusText:
      'Sikap tegasnya belum konsisten menonjol di semua situasi — ada ruang untuk mendorong siswa lebih berani bersikap saat menghadapi tekanan.',
  },
  bad: {
    title: 'Buruk — Pola Diam atau Konflik Dominan',
    plusText:
      'Perasaan siswa (baik saat memilih diam maupun saat bereaksi keras) valid dan wajar muncul dari situasi-situasi yang direkam di sepanjang cerita.',
    minusText:
      'Pola responsnya berulang kali cenderung memendam/menahan diri atau justru konfliktual — sinyal untuk segera ditindaklanjuti guru BK secara personal, bukan sekadar dipantau.',
  },
};

/** Menjumlahkan beberapa emotion_tally (satu per episode yang sudah
 * 'completed') jadi satu tally gabungan. */
export function sumEmotionTallies(tallies = []) {
  const combined = emptyTally();
  (Array.isArray(tallies) ? tallies : []).forEach((t) => {
    if (!t) return;
    EMOTION_KEYS.forEach((key) => {
      combined[key] += Number(t[key]) || 0;
    });
  });
  return combined;
}

/**
 * @param {Record<string, number>} combinedTally - hasil sumEmotionTallies().
 * @returns {{ dominant: string, avgScore: number, endingKey: 'true'|'good'|'bad', title: string, plusText: string, minusText: string, hasData: boolean }}
 */
export function computeOverallEnding(combinedTally) {
  const tally = combinedTally || emptyTally();

  let dominant = 'netral';
  let best = 0;
  EMOTION_PRIORITY.forEach((label) => {
    if (tally[label] > best) {
      best = tally[label];
      dominant = label;
    }
  });

  const { avgScore, totalResponses } = computeScore(tally);
  const endingKey = classifyEndingKey(avgScore, totalResponses);
  const meta = OVERALL_ENDING_META[endingKey] || OVERALL_ENDING_META.good;

  return { dominant, avgScore, endingKey, hasData: totalResponses > 0, ...meta };
}
