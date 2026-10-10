// Episode 5 — "Ketika Sahabat Berubah"
//
// Episode ini melatih pemain mengenali tanda bahwa seorang teman mungkin
// mengalami kekerasan, mendengarkan tanpa menghakimi, dan melibatkan orang
// dewasa tepercaya tanpa mengambil alih keputusan korban.

const CHOICE_SITUATION_TEXT = {
  n3:
    'Kirana terlihat lebih pendiam, mudah terkejut oleh notifikasi, dan menyangkal bahwa ada sesuatu yang mengganggunya',
  n6:
    'Kirana akhirnya bercerita bahwa seseorang yang dekat dengannya sering mengontrol, membentak, mencengkeram tangannya, dan mengancamnya agar tetap diam',
};

/**
 * Merangkum keputusan Episode 5 untuk konteks pembuka sesi Kak Dara.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode5CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Di taman sekolah aku menemui Kirana yang belakangan berubah menjadi pendiam dan tampak cemas. Aku khawatir ia sedang mengalami perlakuan yang tidak aman dari seseorang yang dekat dengannya.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE5_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((choice) => choice.id === choiceId);
    if (!situation || !chosen) return;

    const replyText = chosen.label.replace(/^"|"$/g, '');
    parts.push(`Ketika ${situation}, aku merespons: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE5_DIALOGUE = {
  npcId: 'kirana',
  startNode: 'n1',

  nodes: {
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Sepulang kelas, kamu menemukan Kirana duduk sendiri di taman sekolah. Beberapa hari ini ia sering menjauh, menunduk, dan buru-buru menyimpan ponselnya saat ada orang mendekat.',
      next: 'n2',
    },

    n2: {
      id: 'n2',
      speaker: 'kirana',
      text: 'Oh, kamu nyari aku? Aku cuma capek. Tidak ada apa-apa, kok.',
      dynamic: true,
      situationHint:
        'Aku Kirana, sahabat Sekar. Belakangan aku menarik diri dan tampak cemas. Sekar menemukanku sendirian di taman. Aku belum siap bercerita, jadi aku bilang hanya lelah dan baik-baik saja. Jangan langsung mengungkap penyebabnya.',
      next: 'n3',
    },

    // Titik pilihan 1: membuka ruang aman tanpa memaksa pengakuan.
    n3: {
      id: 'n3',
      speaker: 'kirana',
      text:
        'Kamu sampai sengaja ke sini karena aku? Serius, tidak perlu khawatir. Aku baik-baik saja.',
      dynamic: true,
      situationHint:
        'Aku masih menyangkal ada masalah meski terlihat tegang dan mudah terkejut oleh notifikasi ponsel. Aku bertanya mengapa Sekar mencariku. Jangan memaksa alur atau membuatku langsung mengaku sebelum Sekar merespons.',
      choices: [
        {
          id: 'a',
          label:
            '"Aku tidak akan memaksa. Aku cuma mau kamu tahu aku siap mendengar dan percaya padamu."',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label: '"Baik. Kalau nanti ingin cerita, kabari aku saja."',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label:
            '"Kamu jelas menyembunyikan sesuatu. Siapa yang melakukannya? Jangan bohong padaku."',
          emotion: 'menyinggung',
          next: 'n4c',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'kirana',
      text:
        'Makasih sudah tidak memaksa. Aku takut kalau cerita, semuanya malah jadi lebih buruk.',
      dynamic: true,
      situationHint:
        'Sekar menawarkan ruang aman, mengatakan ia akan mendengar dan mempercayaiku tanpa memaksa. Aku sedikit lega, tetapi masih takut akibatnya jika bercerita.',
      next: 'n5',
    },

    n4b: {
      id: 'n4b',
      speaker: 'kirana',
      text: 'Makasih. Aku belum tahu kapan bisa cerita, tapi jangan pergi dulu, ya.',
      dynamic: true,
      situationHint:
        'Sekar menerima jawabanku dan mengatakan aku boleh menghubunginya nanti. Aku menghargai ruang itu, tetapi meminta ia tetap menemaniku sebentar karena aku sebenarnya tidak ingin sendirian.',
      next: 'n5',
    },

    n4c: {
      id: 'n4c',
      speaker: 'kirana',
      text:
        'Aku tidak bohong. Aku cuma... takut kamu juga akan menyalahkanku kalau tahu semuanya.',
      dynamic: true,
      situationHint:
        'Sekar mendesakku dan menuduhku menyembunyikan sesuatu. Aku merasa terpojok dan takut akan disalahkan, tetapi mulai mengisyaratkan bahwa memang ada masalah. Jangan membuatku marah ekstrem atau pergi dari adegan.',
      next: 'n5',
    },

    n5: {
      id: 'n5',
      speaker: 'narration',
      text:
        'Kirana menarik napas panjang. Ketika ponselnya kembali menyala, bahunya menegang. Ia mematikan layar lalu menatapmu dengan ragu.',
      next: 'n6',
    },

    // Titik pilihan 2: dukungan aman dan akses kepada orang dewasa tepercaya.
    n6: {
      id: 'n6',
      speaker: 'kirana',
      text:
        'Orang yang dekat denganku sering memeriksa ponselku, melarangku bertemu teman, dan membentakku. Kemarin tanganku dicengkeram saat aku menolak. Dia bilang aku bakal menyesal kalau cerita. Aku harus bagaimana?',
      dynamic: true,
      situationHint:
        'Aku akhirnya mengungkap tanda kekerasan dan kontrol dari seseorang yang dekat denganku: ponsel diperiksa, pergaulan dibatasi, aku dibentak, tanganku pernah dicengkeram, dan aku diancam agar diam. Aku takut dan meminta pendapat Sekar. Jangan menyalahkan korban, menambahkan detail kekerasan, atau menyuruhku menghadapi pelaku sendirian.',
      choices: [
        {
          id: 'a',
          label:
            '"Ini bukan salahmu. Kita cek dulu kamu aman, lalu aku temani bicara dengan guru BK atau orang dewasa yang kamu percaya."',
          emotion: 'aman',
          next: 'n7a',
        },
        {
          id: 'b',
          label:
            '"Istirahat dulu hari ini. Kalau sudah siap, sebaiknya kamu mencari orang dewasa yang bisa membantu."',
          emotion: 'netral',
          next: 'n7b',
        },
        {
          id: 'c',
          label:
            '"Kasih tahu siapa orangnya. Aku akan mendatanginya sendiri dan memaksanya mengaku."',
          emotion: 'marah',
          next: 'n7c',
        },
      ],
    },

    n7a: {
      id: 'n7a',
      speaker: 'kirana',
      text:
        'Aku takut, tapi aku mau ditemani. Bu Ratih di ruang BK biasanya membuatku merasa aman.',
      dynamic: true,
      situationHint:
        'Sekar menegaskan bahwa kekerasan ini bukan salahku, memeriksa keselamatanku, dan menawarkan menemani bicara dengan orang dewasa tepercaya. Aku memilih Bu Ratih, guru BK, dan bersedia pergi jika ditemani.',
      next: 'n8a',
    },

    n8a: {
      id: 'n8a',
      speaker: 'narration',
      text:
        'Kalian berjalan bersama menuju ruang BK. Kamu tidak menjanjikan semuanya langsung selesai; kamu memastikan Kirana tidak sendirian dan keputusan tentang langkah berikutnya tetap melibatkannya.',
    },

    n7b: {
      id: 'n7b',
      speaker: 'kirana',
      text:
        'Baik. Aku memang butuh waktu, tapi boleh tetap temani aku sampai jemputanku datang?',
      dynamic: true,
      situationHint:
        'Sekar menyarankan aku beristirahat dan mencari orang dewasa saat sudah siap, tetapi belum menawarkan bantuan langsung. Aku meminta ditemani sampai jemputan datang karena masih cemas.',
      next: 'n8b',
    },

    n8b: {
      id: 'n8b',
      speaker: 'narration',
      text:
        'Kamu menemaninya sore itu. Dukunganmu berarti, tetapi bantuan bisa tertunda jika keselamatan Kirana tidak segera diperiksa dan tidak ada orang dewasa tepercaya yang ikut dilibatkan.',
    },

    n7c: {
      id: 'n7c',
      speaker: 'kirana',
      text:
        'Jangan datangi dia! Aku takut dia makin marah dan menyalahkanku karena sudah cerita.',
      dynamic: true,
      situationHint:
        'Sekar marah dan ingin menghadapi orang yang menyakitiku seorang diri. Aku panik karena konfrontasi tanpa rencana dapat meningkatkan bahaya dan membuatku kehilangan kendali atas ceritaku. Minta ia berhenti tanpa menyalahkannya.',
      next: 'n8c',
    },

    n8c: {
      id: 'n8c',
      speaker: 'narration',
      text:
        'Niat melindungi Kirana datang dari kepedulian, tetapi konfrontasi mendadak dapat memperbesar risiko. Mendengarkan kebutuhannya dan mencari bantuan aman lebih penting daripada mengambil alih masalahnya.',
    },
  },
};
