// Menentukan Ending Scene sebuah episode dari akumulasi label emosi
// pilihan dialog pemain (lihat episode1Dialogue.js — tiap choice punya
// `emotion`, salah satu dari 6 label output model IndoBERT yang sama
// dipakai layanan AI: aman, netral, sedih, takut, marah, menyinggung).
//
// REVISI: dulu setiap label emosi dipetakan 1:1 ke SATU judul ending
// sendiri (6 macam ending total: good/neutral/vulnerable/conflict/
// conflict_high/sad) — sekarang disederhanakan jadi TIGA kategori
// ending saja, sesuai arahan: `true` (Ending Sejati — konsisten
// tegas/asertif tanpa cela), `good` (Ending Baik — secara umum
// positif tapi belum sempurna), `bad` (Ending Buruk — pola respons
// didominasi diam/menahan diri/konflik).
//
// Caranya: tiap `emotion` diberi bobot skor (EMOTION_SCORE di bawah),
// lalu dihitung RATA-RATA skor dari seluruh pilihan yang diambil
// pemain di episode itu. Rata-rata itu yang menentukan kategori akhir
// (classifyEndingKey()) — bukan cuma emosi yang paling sering muncul
// seperti skema lama. Ini juga otomatis berlaku untuk episode
// berikutnya (2-6) tanpa perlu logic baru, cukup isi
// ENDING_DEFINITIONS[episodeId] dengan 3 entri: true/good/bad.

export const EMOTION_PRIORITY = ['aman', 'netral', 'sedih', 'takut', 'menyinggung', 'marah'];

// Bobot tiap label emosi untuk keperluan skor ending (BUKAN dipakai
// sebagai skor tingkat risiko NLP — itu tetap urusan RISK_MAP di
// backend/nlp-service, terpisah dari sini).
//   aman       = respons paling asertif & sehat  -> skor tertinggi
//   netral     = tidak memperkeruh, tapi juga belum menyuarakan apa pun
//   sedih/takut = cenderung memendam/menahan diri -> skor negatif ringan
//   menyinggung/marah = respons konfliktual -> skor negatif lebih berat
export const EMOTION_SCORE = {
  aman: 2,
  netral: 0,
  sedih: -1,
  takut: -1,
  menyinggung: -1,
  marah: -2,
};

// Ambang rata-rata skor (range kira-kira -2..2) untuk menentukan
// kategori ending. `true` butuh rata-rata TINGGI (pemain konsisten
// memilih respons paling sehat/asertif hampir di semua titik cabang),
// `bad` kalau rata-rata negatif (didominasi pola diam/menahan atau
// konflik), sisanya `good`.
const TRUE_ENDING_THRESHOLD = 1.5;
const BAD_ENDING_THRESHOLD = 0;

/**
 * @param {Record<string, number>} tally
 * @returns {{ avgScore: number, totalResponses: number }}
 */
function computeScore(tally) {
  const totalResponses = EMOTION_PRIORITY.reduce((sum, k) => sum + (tally[k] || 0), 0);
  if (totalResponses === 0) return { avgScore: 0, totalResponses: 0 };

  const totalScore = EMOTION_PRIORITY.reduce(
    (sum, k) => sum + (tally[k] || 0) * (EMOTION_SCORE[k] ?? 0),
    0,
  );
  return { avgScore: totalScore / totalResponses, totalResponses };
}

/** @returns {'true'|'good'|'bad'} */
export function classifyEndingKey(avgScore, totalResponses) {
  if (totalResponses === 0) return 'good';
  if (avgScore >= TRUE_ENDING_THRESHOLD) return 'true';
  if (avgScore < BAD_ENDING_THRESHOLD) return 'bad';
  return 'good';
}

const ENDING_DEFINITIONS = {
  1: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Suara yang Didengar"',
      plusText:
        'Kamu konsisten berani menyuarakan ketidaknyamanan dengan cara yang tenang dan mengedukasi teman-teman sekelas soal kesetaraan gender, dari awal sampai akhir percakapan.',
      minusText:
        'Tetap perlu waspada — tidak semua orang akan langsung berubah hanya dari satu percakapan, sikap ini perlu terus dijaga ke depannya.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Belajar Bersikap"',
      plusText:
        'Kamu sudah menunjukkan sikap yang cukup seimbang — tidak memperkeruh suasana, dan di beberapa titik berani menyampaikan pandanganmu.',
      minusText:
        'Masih ada momen di mana ketidaknyamananmu belum sepenuhnya tersampaikan, jadi respons serupa berisiko terulang lagi.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Terjebak Pola Lama"',
      plusText:
        'Perasaanmu (sesak, kesal, atau takut) itu valid dan wajar dirasakan saat direndahkan berulang kali.',
      minusText:
        'Pola responsmu lebih banyak diam menahan diri atau justru meledak marah — keduanya berisiko: yang satu membuat perilaku serupa dianggap wajar, yang satu lagi memperkeruh hubungan tanpa menyelesaikan akar masalah. Kamu tidak wajib memilih salah satu dari keduanya.',
    },
  },
  2: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Tidak Sendirian"',
      plusText:
        'Kamu tidak cuma diam melihat Kirana di-bully — kamu bertindak nyata untuk membantunya, dan tetap tenang/asertif sepanjang percakapan dengan Rafi.',
      minusText:
        'Membantu satu kali bukan akhir cerita — Kirana tetap butuh dukungan berkelanjutan, bukan cuma sekali bantu lalu selesai.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Mulai Peduli"',
      plusText: 'Kamu menunjukkan kepedulian terhadap apa yang dialami Kirana, walau belum semua langkahmu tegas.',
      minusText:
        'Ada momen kamu ragu-ragu atau memilih menunggu dulu — keraguan itu wajar, tapi bisa membuat bantuan datang lebih lambat.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Ikut Diam, Ikut Bersalah"',
      plusText: 'Setidaknya kamu jujur dengan reaksi pertamamu, walau reaksi itu belum tepat.',
      minusText:
        'Memilih diam/menghindar atau bahkan ikut mengomentari negatif sama-sama membuat bully-an ke Kirana terus dianggap wajar — padahal dia butuh dibantu, bukan ditonton atau ditambah beban.',
    },
  },
  3: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Batas yang Tegas"',
      plusText:
        'Kamu membuat keputusan terbaik dengan memblokir akun mencurigakan, mengamankan bukti tangkapan layar, dan langsung terbuka menceritakan kejadian ini kepada orang tua.',
      minusText:
        'Kewaspadaan digital tetap harus dijaga — pelaku kejahatan siber dapat berganti akun, namun ketegasanmu menetapkan batasan adalah perlindungan terbaik.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Pelajaran Berharga"',
      plusText:
        'Kamu sempat ragu atau mencoba merespons orang asing tersebut, namun pada akhirnya kamu menyadari bahaya manipulasi dan berhasil mengambil langkah aman.',
      minusText:
        'Menjawab atau menantang akun anonim yang mencurigakan dapat memberi mereka celah — ke depannya, jangan ragu untuk langsung memutus komunikasi sejak tanda bahaya pertama.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Terjerat Jebakan Manipulasi"',
      plusText:
        'Ketakutan dan kepanikan yang kamu rasakan sangat wajar ketika dihadapkan pada ancaman siber dan situasi yang mencekam.',
      minusText:
        'Rasa panik membuatmu terpancing merespons atau menghadapi bahaya sendirian. Ingat, jangan pernah mengorbankan privasi demi ancaman pelaku, dan selalu libatkan orang tua sedini mungkin.',
    },
  },
  4: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Batas yang Dihormati"',
      plusText:
        'Kamu menyampaikan ketidaknyamanan dengan jelas, menjaga jarak, dan tahu kapan perlu meminta bantuan tanpa merendahkan orang lain.',
      minusText:
        'Menetapkan batas dapat perlu diulang. Tetap dekati guru atau orang tepercaya jika komentar serupa kembali terjadi.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Berani Menjauh"',
      plusText:
        'Kamu berhasil keluar dari situasi yang tidak nyaman dan mulai melindungi ruang amanmu.',
      minusText:
        'Batasmu belum seluruhnya tersampaikan. Dukungan orang tepercaya dapat membantu agar perilaku itu tidak dianggap wajar.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Candaan yang Tertinggal"',
      plusText:
        'Rasa kesal, takut, atau tidak nyaman yang kamu alami tetap valid—kejadian ini bukan salahmu.',
      minusText:
        'Menyalahkan diri atau membalas dengan hinaan membuat inti masalah kabur. Menjauh, nyatakan batas, lalu cari bantuan yang aman.',
    },
  },
  5: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Teman yang Aman"',
      plusText:
        'Kamu mendengar tanpa menghakimi, percaya kepada Kirana, memeriksa keselamatannya, dan menemaninya mencari bantuan pilihan dirinya.',
      minusText:
        'Pendampingan perlu berlanjut. Hormati keputusan Kirana sambil tetap melibatkan orang dewasa saat ada risiko keselamatan.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Tetap Menemani"',
      plusText:
        'Kamu memberi Kirana ruang dan membuatnya merasa tidak sendirian.',
      minusText:
        'Bantuan bisa tertunda bila keselamatan tidak diperiksa dan belum ada orang dewasa tepercaya yang dilibatkan.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Niat Baik, Risiko Baru"',
      plusText:
        'Keinginanmu melindungi Kirana menunjukkan bahwa kamu peduli pada keselamatannya.',
      minusText:
        'Memaksa cerita atau menghadapi pelaku sendiri dapat menambah bahaya. Dengarkan kebutuhan korban dan susun bantuan bersama.',
    },
  },
  6: {
    true: {
      key: 'true',
      title: 'Ending Sejati — "Suara yang Menjadi Cahaya"',
      plusText:
        'Sepanjang perjalanan, kamu konsisten menetapkan batas, melindungi diri dan teman, mencari bantuan, serta membangun dukungan bersama.',
      minusText:
        'Keberanian bukan berarti harus selalu kuat sendirian. Jaga jejaring aman dan terus beri ruang bagi proses pemulihan.',
    },
    good: {
      key: 'good',
      title: 'Ending Baik — "Berani Melangkah"',
      plusText:
        'Kamu sudah mengenali banyak pilihan aman dan mulai berani meminta dukungan ketika membutuhkannya.',
      minusText:
        'Beberapa respons masih ragu atau tertunda. Latih kalimat batas dan tentukan sejak awal siapa orang tepercaya yang dapat dihubungi.',
    },
    bad: {
      key: 'bad',
      title: 'Ending Buruk — "Masih Mencari Suara"',
      plusText:
        'Takut, marah, membeku, atau bingung adalah respons yang manusiawi; pengalaman buruk bukan kesalahanmu.',
      minusText:
        'Perjalananmu masih membutuhkan dukungan. Mulailah dari satu langkah aman: menjauh, simpan bukti bila memungkinkan, dan cerita kepada orang tepercaya.',
    },
  },
};

const DEFAULT_ENDINGS = {
  true: {
    key: 'true',
    title: 'Ending Sejati',
    plusText: 'Kamu konsisten memilih respons yang aman, tegas, dan sehat sepanjang episode.',
    minusText: 'Pertahankan keberanian ini sambil tetap mencari dukungan saat situasinya membutuhkan bantuan orang lain.',
  },
  good: {
    key: 'good',
    title: 'Ending Baik',
    plusText: 'Kamu melewati episode ini dengan sikap yang cukup seimbang.',
    minusText: 'Masih ada ruang untuk membuat responsmu lebih tegas dan konsisten pada situasi berikutnya.',
  },
  bad: {
    key: 'bad',
    title: 'Ending Buruk',
    plusText: 'Perasaan sulit yang muncul sepanjang episode tetap valid dan layak dipahami.',
    minusText: 'Pilihanmu masih cenderung berisiko atau memendam masalah; cobalah menetapkan batas dan mencari bantuan tepercaya.',
  },
};

/**
 * @param {Array<{emotion?: string}>} choices - hasil collectedChoices dari DialogueBox.
 * @returns {{tally: Record<string, number>, dominant: string, avgScore: number, endingKey: 'true'|'good'|'bad', ending: object}}
 */
export function computeEnding(episodeId, choices = []) {
  const tally = { aman: 0, netral: 0, sedih: 0, takut: 0, marah: 0, menyinggung: 0 };
  choices.forEach((c) => {
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

  const episodeDefs = ENDING_DEFINITIONS[episodeId] || {};
  const ending = episodeDefs[endingKey] || DEFAULT_ENDINGS[endingKey];

  return { tally, dominant, avgScore, endingKey, ending };
}
