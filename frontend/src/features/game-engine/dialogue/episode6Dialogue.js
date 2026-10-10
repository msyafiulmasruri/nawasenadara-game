// Episode 6 — "Langkah Berani Bersama"
//
// Penutup alur enam episode: pemain mempraktikkan penolakan asertif,
// bergerak menuju tempat aman, menyimpan informasi penting, melapor dengan
// pendamping, serta mengubah pengalaman menjadi dukungan bagi teman lain.

const CHOICE_SITUATION_TEXT = {
  n3:
    'seorang senior menghadang jalan pulangku, mendesakku ikut ke tempat sepi, dan mengabaikan penolakanku',
  n6:
    'aku sudah berada di tempat aman bersama Naya dan harus menentukan langkah setelah tekanan yang baru kualami',
};

/**
 * Merangkum keputusan Episode 6 untuk konteks pembuka sesi Kak Dara.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode6CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Sepulang kegiatan sekolah, seorang senior menekan aku untuk ikut dengannya ke tempat sepi. Naya melihat situasinya dan membantuku mencapai area yang lebih aman.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE6_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((choice) => choice.id === choiceId);
    if (!situation || !chosen) return;

    const replyText = chosen.label.replace(/^"|"$/g, '');
    parts.push(`Ketika ${situation}, aku memilih: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE6_DIALOGUE = {
  npcId: 'naya',
  startNode: 'n1',

  nodes: {
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Kegiatan sekolah baru selesai. Saat kamu berjalan menuju gerbang, seorang senior menghadang jalan dan mendesakmu ikut ke tempat yang lebih sepi untuk "mengobrol sebentar".',
      next: 'n2',
    },

    n2: {
      id: 'n2',
      speaker: 'narration',
      text:
        'Kamu sudah berkata tidak, tetapi ia terus mendekat dan menyebutmu berlebihan. Pos satpam terlihat tidak jauh, sementara Naya sedang berjalan dari arah taman.',
      next: 'n3',
    },

    // Titik pilihan 1: penolakan, jarak, dan keselamatan langsung.
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Tekanan itu belum berhenti. Apa yang kamu lakukan?',
      choices: [
        {
          id: 'a',
          label:
            '"Tidak. Mundur dan jangan halangi jalanku." Lalu bergerak ke arah pos satpam.',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label:
            'Beralasan harus segera pulang sambil perlahan mundur ke arah Naya.',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label:
            'Mengikuti beberapa langkah karena takut penolakan akan membuatnya semakin marah.',
          emotion: 'takut',
          next: 'n4c',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'narration',
      text:
        'Suaramu cukup jelas untuk terdengar dari pos satpam. Kamu menjaga jarak dan bergerak menuju area yang lebih ramai. Naya segera menghampiri.',
      next: 'n5',
    },

    n4b: {
      id: 'n4b',
      speaker: 'narration',
      text:
        'Alasanmu memberimu celah untuk mundur. Kamu belum menyatakan batas dengan jelas, tetapi berhasil mendekati Naya dan menjauh dari senior itu.',
      next: 'n5',
    },

    n4c: {
      id: 'n4c',
      speaker: 'narration',
      text:
        'Tubuhmu terasa kaku dan kamu sempat mengikuti. Naya memanggil namamu dari dekat pos satpam; suara itu memberimu kesempatan untuk berhenti dan berbalik menuju tempat aman.',
      next: 'n5',
    },

    n5: {
      id: 'n5',
      speaker: 'naya',
      text:
        'Aku lihat dia terus memaksa meski kamu menolak. Kita tetap di dekat pos satpam dulu, ya. Kamu aman? Ada yang sakit?',
      dynamic: true,
      situationHint:
        'Aku Naya, teman Sekar. Aku melihat seorang senior menekan Sekar untuk ikut ke tempat sepi. Sekarang kami sudah dekat pos satpam. Aku memeriksa keselamatan Sekar dengan tenang, percaya kepadanya, dan tidak menyalahkannya.',
      next: 'n6',
    },

    // Titik pilihan 2: pelaporan, dukungan aman, dan pemulihan.
    n6: {
      id: 'n6',
      speaker: 'naya',
      text:
        'Kamu tidak harus menghadapi ini sendirian. Setelah napasmu lebih tenang, kamu ingin kita melakukan apa?',
      dynamic: true,
      situationHint:
        'Aku sudah membawa Sekar ke area aman dan memastikan kondisinya. Aku menawarkan dukungan tanpa mengambil alih, lalu menanyakan langkah yang ia pilih. Jangan menentukan keputusan sebelum pilihan pemain muncul.',
      choices: [
        {
          id: 'a',
          label:
            '"Kita catat kejadiannya dan lapor ke satpam, guru BK, serta orang tuaku. Tolong temani aku menyusun rencana aman."',
          emotion: 'aman',
          next: 'n7a',
        },
        {
          id: 'b',
          label:
            '"Temani aku pulang dulu. Besok aku akan mencoba bicara dengan guru BK."',
          emotion: 'netral',
          next: 'n7b',
        },
        {
          id: 'c',
          label:
            '"Jangan beri tahu siapa pun. Besok aku akan mempermalukannya di media sosial supaya jera."',
          emotion: 'marah',
          next: 'n7c',
        },
      ],
    },

    n7a: {
      id: 'n7a',
      speaker: 'naya',
      text:
        'Aku temani. Kita tulis waktu, tempat, dan apa yang terjadi selagi masih ingat, lalu bicara kepada mereka bersama-sama.',
      dynamic: true,
      situationHint:
        'Sekar memilih menyimpan kronologi, melapor kepada satpam, guru BK, dan orang tua, serta meminta ditemani menyusun rencana aman. Aku mendukung keputusan itu dan membantu tanpa mengambil alih suaranya.',
      next: 'n8a',
    },

    n8a: {
      id: 'n8a',
      speaker: 'narration',
      text:
        'Laporanmu ditangani bersama orang dewasa tepercaya dan sekolah menyusun langkah perlindungan. Dalam proses pulih, kamu dan Naya ikut membangun kelompok "Teman Aman" agar siswa lain tahu cara berkata tidak, mendampingi korban, menyimpan bukti, dan mencari bantuan.',
    },

    n7b: {
      id: 'n7b',
      speaker: 'naya',
      text:
        'Baik, aku temani pulang. Malam ini catat yang masih kamu ingat, dan besok aku bisa ikut saat kamu menemui guru BK.',
      dynamic: true,
      situationHint:
        'Sekar ingin pulang lebih dahulu dan berencana bicara dengan guru BK besok. Aku menghargai kecepatannya, menawarkan pendampingan, dan menyarankan mencatat kejadian tanpa menekan.',
      next: 'n8b',
    },

    n8b: {
      id: 'n8b',
      speaker: 'narration',
      text:
        'Kamu pulang bersama Naya dan mulai memulihkan rasa aman. Rencana melapor sudah ada, tetapi bantuan baru benar-benar berjalan ketika kamu menepati janji untuk menemui orang dewasa tepercaya.',
    },

    n7c: {
      id: 'n7c',
      speaker: 'naya',
      text:
        'Aku paham kamu marah, tapi menyebarkannya sekarang bisa memancing serangan balik dan menghilangkan bukti. Tolong jangan hadapi ini sendirian.',
      dynamic: true,
      situationHint:
        'Sekar meminta kejadian dirahasiakan dan ingin mempermalukan senior itu di media sosial. Aku memahami kemarahannya, tetapi mengingatkan bahwa balas mempermalukan dapat memperbesar risiko dan merusak bukti. Tetap suportif dan tidak menggurui.',
      next: 'n8c',
    },

    n8c: {
      id: 'n8c',
      speaker: 'narration',
      text:
        'Kemarahanmu wajar, tetapi membalas sendirian bukanlah rencana perlindungan. Tanpa dukungan dan pelaporan yang aman, tekanan itu berisiko berulang dan proses pemulihanmu ikut tertunda.',
    },
  },
};
