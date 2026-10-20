// Episode 6 — "Langkah Berani Bersama"
//
// Penutup alur enam episode: pemain mempraktikkan penolakan asertif,
// bergerak menuju tempat aman, menyimpan informasi penting, melapor dengan
// pendamping, serta mengubah pengalaman menjadi inisiatif dukungan bagi teman lain ("Teman Aman").

const CHOICE_SITUATION_TEXT = {
  n3: 'seorang senior menghadang jalan pulangku di dekat gerbang dan mendesakku ikut ke tempat sepi',
  n6: 'aku sudah berada di tempat aman di pos satpam bersama Naya dan menentukan langkah pelaporan yang terpercaya',
};

/**
 * Merangkum keputusan Episode 6 untuk konteks pembuka sesi konseling bersama Kak Dara.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode6CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Sepulang sekolah, seorang senior menghadang dan mendesakku ikut ke tempat sepi di dekat gerbang. Naya membantuku mencapai pos satpam yang aman, dan kami bersama-sama menentukan langkah pelaporan.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE6_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((choice) => choice.id === choiceId);
    if (!situation || !chosen) return;

    parts.push(`Ketika ${situation}, aku memilih: ${chosen.label}`);
  });

  return parts.join(' ');
}

/**
 * Dialog pendukung saat pemain menyapa Naya kembali setelah dialog utama selesai.
 */
export function buildEpisode6RevisitDialogue() {
  return {
    npcId: 'naya',
    startNode: 'rev_1',
    nodes: {
      rev_1: {
        id: 'rev_1',
        speaker: 'naya',
        text:
          '"{PLAYER_NAME}! Senang melihatmu tetap berani. Gerakan \\"Teman Aman\\" selalu ada di sini untuk saling menguatkan."',
        choices: [
          {
            id: 'replay',
            label: '"Aku ingin mengulang cerita episode ini dari awal."',
            next: 'n1',
          },
          {
            id: 'chat',
            label: '"Terima kasih banyak, Naya. Punya sahabat sepertimu membuat duniaku jauh lebih aman!"',
            next: 'rev_2',
          },
        ],
      },
      rev_2: {
        id: 'rev_2',
        speaker: 'naya',
        text:
          '"Sama-sama, {PLAYER_NAME}! Sahabat sejati itu saling menjaga batasan dan saling melindungi. Yuk, kita selesaikan hari ini dengan bangga!"',
      },
      ...EPISODE6_DIALOGUE.nodes,
    },
  };
}

export const EPISODE6_DIALOGUE = {
  npcId: 'naya',
  startNode: 'n1',

  nodes: {
    // ================================================================
    // BABAK 1: MADING SEKOLAH SAAT SENJA (Persiapan Pulang)
    // Cutscene: ep6-corridor-chat-cg
    // ================================================================
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Sore itu, artikel madingmu bertema "Batasan Diri dan Berani Bersuara" selesai terpasang rapi di koridor sekolah.',
      next: 'n1_naya',
    },

    n1_naya: {
      id: 'n1_naya',
      speaker: 'naya',
      text:
        '"{PLAYER_NAME}, tulisanmu di mading keren banget! Eh, kunci ruang mading masih kubawa. Aku balikin ke ruang piket bentar ya, tungguin aku di pos satpam depan!"',
      dynamic: true,
      situationHint:
        'Aku Naya, memuji karya sahabatku di mading dengan gaya santai anak sekolah, lalu pamit sebentar mengembalikan kunci dan memintanya menunggu di pos satpam.',
      next: 'n2',
    },

    // ================================================================
    // BABAK 2: GERBANG SEKOLAH — TEKANAN SENIOR & BATASAN ASERTIF
    // Cutscene: ep6-gate-pressure-cg
    // ================================================================
    n2: {
      id: 'n2',
      speaker: 'narration',
      text:
        'Saat menunggu di dekat gerbang, seorang kakak kelas tiba-tiba melangkah menghalangi jalanmu.',
      next: 'n2_senior',
    },

    n2_senior: {
      id: 'n2_senior',
      speaker: 'senior',
      text:
        '"Eh, {PLAYER_NAME}. Ikut aku bentar ke belakang kantin yuk, ada omongan penting berdua aja. Nggak usah lebay, hargai kakak kelas dikit dong."',
      next: 'n3',
    },

    // Titik Pilihan 1: Penolakan tegas, jaga jarak, dan keselamatan diri (3 Pilihan)
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Kakak kelas itu makin mendesakmu. Apa yang kamu lakukan?',
      choices: [
        {
          id: 'a',
          label:
            '"Nggak mau, tolong minggir!" (Langsung jalan ke pos satpam)',
          chatReply:
            'Aku nolak tegas dan minta dia minggir, terus langsung jalan cepat ke arah pos satpam yang aman.',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label:
            '"Maaf Kak, aku dipanggil piket." (Jaga jarak dan cari tempat ramai)',
          chatReply:
            'Aku alasan dipanggil piket sambil mundur jaga jarak dan jalan ke tempat ramai.',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label:
            '(Diam mematung karena takut dia tersinggung)',
          chatReply:
            'Aku sempat diam mematung dan bingung mau jalan ke mana karena takut bikin dia marah.',
          emotion: 'takut',
          next: 'n4c',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'narration',
      text:
        'Kamu berdiri tegak dan menjawab tegas: "Nggak mau, tolong minggir!" Kakak kelas itu kaget melihat sikap tegasmu dan langsung mundur.',
      next: 'n5_rescue',
    },

    n4b: {
      id: 'n4b',
      speaker: 'narration',
      text:
        'Alasanmu memberimu ruang untuk jaga jarak. Kamu langsung melangkah cepat menuju area pos satpam yang ramai.',
      next: 'n5_rescue',
    },

    n4c: {
      id: 'n4c',
      speaker: 'narration',
      text:
        'Kamu sempat mematung karena takut, tapi berusaha mundur pelan-pelan mencari tempat yang lebih ramai.',
      next: 'n5_rescue',
    },

    // ================================================================
    // BABAK 3: POS SATPAM — PERLINDUNGAN AMAN & LANGKAH PELAPORAN
    // Cutscene: ep6-safety-haven-cg
    // ================================================================
    n5_rescue: {
      id: 'n5_rescue',
      speaker: 'narration',
      text:
        '"{PLAYER_NAME}! Sini!" panggil Naya dari pos satpam bersama Pak Joko. Melihat satpam memperhatikan, kakak kelas itu panik dan buru-buru pergi.',
      next: 'n5_naya',
    },

    n5_naya: {
      id: 'n5_naya',
      speaker: 'naya',
      text:
        '"{PLAYER_NAME}, syukurlah kamu udah aman di sini! Tarik napas dulu ya... Nggak ada yang boleh maksa kamu kayak tadi!"',
      dynamic: true,
      situationHint:
        'Aku menenangkan sahabatku di pos satpam bersama Pak Joko dengan bahasa anak sekolah yang hangat.',
      next: 'n6',
    },

    // Titik Pilihan 2: Penentuan Langkah Pelaporan & Perlindungan (3 Pilihan)
    n6: {
      id: 'n6',
      speaker: 'naya',
      text:
        '"Sekarang kamu udah aman di pos satpam. Menurutmu langkah apa yang paling pas kita lakuin habis ini?"',
      dynamic: true,
      situationHint:
        'Aku mengajak sahabatku menentukan langkah melapor yang aman dengan gaya obrolan akrab.',
      choices: [
        {
          id: 'a',
          label:
            '"Catat kejadiannya sekarang, terus lapor ke BK dan orang tua."',
          chatReply:
            'Kita catat kejadian tadi selagi ingat, lapor ke Pak Satpam dan guru BK besok, terus kabari orang tua. Temani aku ya, Nay.',
          emotion: 'aman',
          next: 'n7a',
        },
        {
          id: 'b',
          label:
            '"Temani aku pulang dulu ya, besok pagi baru kita ke ruang BK."',
          chatReply:
            'Temani aku pulang dulu ya, Nay. Malam ini aku mau nenangin diri dulu, besok pagi baru kita ke ruang BK.',
          emotion: 'netral',
          next: 'n7b',
        },
        {
          id: 'c',
          label:
            '"Aku kesel banget! Mau kusebar di medsos biar dia malu!"',
          chatReply:
            'Aku marah banget dan pengen nyebarin kelakuan dia ke medsos sekolah biar dia malu dan kapok.',
          emotion: 'marah',
          next: 'n7c',
        },
      ],
    },

    n7a: {
      id: 'n7a',
      speaker: 'naya',
      text:
        '"Setuju banget! Kita catat sekarang biar nggak lupa. Besok pagi aku sama orang tuamu siap nemenin kamu langsung ke ruang BK."',
      dynamic: true,
      situationHint:
        'Sahabatku memilih mencatat bukti dan melapor ke guru BK serta orang tua. Aku mendukung penuh dengan bahasa santai.',
      next: 'n8_movement',
    },

    n7b: {
      id: 'n7b',
      speaker: 'naya',
      text:
        '"Oke, yang penting kamu tenang dulu malam ini. Istirahat ya di rumah, besok pagi kita langsung ke ruangan Bu Ratih bareng-bareng."',
      dynamic: true,
      situationHint:
        'Sahabatku memilih menenangkan diri dulu sebelum melapor besok. Aku mengerti dan berjanji menemani besok pagi.',
      next: 'n8_movement',
    },

    n7c: {
      id: 'n7c',
      speaker: 'naya',
      text:
        '"Wajar banget kamu kesel! Tapi kalau disebar di medsos, takutnya malah balik nyerang kamu. Lebih aman kita lapor resmi ke guru BK biar sekolah yang nindak."',
      dynamic: true,
      situationHint:
        'Sahabatku marah dan ingin menyebar di medsos. Aku menenangkan dan mengajak lapor resmi ke guru BK.',
      next: 'n8_movement',
    },

    // ================================================================
    // BABAK 4: RESOLUSI & GERAKAN "TEMAN AMAN" (PUNCAK 6 EPISODE)
    // Cutscene: ep6-teman-aman-cg
    // ================================================================
    n8_movement: {
      id: 'n8_movement',
      speaker: 'narration',
      text:
        'Laporanmu langsung ditindaklanjuti oleh pihak sekolah. Dari keberanianmu bersuara, muncullah gerakan bareng teman-teman di sekolah: "TEMAN AMAN".',
      next: 'n8_ceremony',
    },

    n8_ceremony: {
      id: 'n8_ceremony',
      speaker: 'naya',
      text:
        '"Lihat deh panggung aula ini, {PLAYER_NAME}! Spanduk \\"Teman Aman\\" udah kepasang. Keberanianmu bikin teman-teman satu sekolah ikut berani bicara dan saling jaga!"',
      dynamic: true,
      situationHint:
        'Aku dan sahabatku berdiri di aula sekolah melihat spanduk Teman Aman. Aku bangga atas keberaniannya.',
      next: 'n8_final',
    },

    n8_final: {
      id: 'n8_final',
      speaker: 'narration',
      text:
        'Kamu telah menuntaskan seluruh 6 episode Nawasena Dara. Batasan dirimu berharga, dan kamu tidak pernah sendirian. Teruslah melangkah maju dengan berani!',
    },
  },
};
