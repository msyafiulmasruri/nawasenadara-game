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
        '"{PLAYER_NAME}, tulisanmu di mading keren banget! Eh, kunci ruang mading masih kubawa. Aku kembalikan ke piket sebentar ya, tunggu aku di pos satpam depan!"',
      dynamic: true,
      situationHint:
        'Aku Naya, mengapresiasi karya Dara di mading, lalu pamit sebentar mengembalikan kunci dan memintanya menunggu di pos satpam.',
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
        'Saat menunggu di dekat gerbang, seorang siswa senior tiba-tiba melangkah menghalangi jalanmu.',
      next: 'n2_senior',
    },

    n2_senior: {
      id: 'n2_senior',
      speaker: 'senior',
      text:
        '"Hei, {PLAYER_NAME}. Ikut aku sebentar ke belakang kantin, ada hal penting berdua saja. Nggak usah lebay, hargai senior dikit dong."',
      next: 'n3',
    },

    // Titik Pilihan 1: Penolakan asertif, penjagaan batas, dan keselamatan diri (3 Pilihan)
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Tekanan itu semakin nyata. Bagaimana tindakanmu?',
      choices: [
        {
          id: 'a',
          label:
            '"Tidak, tolong mundur!" (Tegas melangkah ke pos satpam)',
          chatReply:
            'Saya menyatakan batasan diri dengan tenang dan tegas agar dia mundur, lalu segera melangkah ke arah pos satpam yang aman.',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label:
            '"Aku ada urusan piket." (Menjaga jarak dan mencari keramaian)',
          chatReply:
            'Saya beralasan harus segera piket sambil terus melangkah mundur mencari keramaian.',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label:
            '(Membeku ragu karena takut membuatnya tersinggung)',
          chatReply:
            'Saya membeku dan sempat ragu melangkah karena takut penolakan akan membuatnya semakin tersinggung.',
          emotion: 'takut',
          next: 'n4c',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'narration',
      text:
        'Kamu berdiri tegak dan bersuara tegas: "Tolong mundur!" Senior itu terkejut melihat ketegasanmu dan langkahnya terhenti.',
      next: 'n5_rescue',
    },

    n4b: {
      id: 'n4b',
      speaker: 'narration',
      text:
        'Alasanmu memberimu celah untuk menjaga jarak. Kamu bergerak cepat menjauh menuju area pos satpam yang ramai.',
      next: 'n5_rescue',
    },

    n4c: {
      id: 'n4c',
      speaker: 'narration',
      text:
        'Kamu sempat membeku ragu, namun berusaha terus melangkah menjauh mencari tempat aman.',
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
        '"{PLAYER_NAME}! Di sini!" seru Naya dari pos satpam bersama Pak Joko. Melihat satpam bersiaga, senior itu panik dan langsung pergi.',
      next: 'n5_naya',
    },

    n5_naya: {
      id: 'n5_naya',
      speaker: 'naya',
      text:
        '"{PLAYER_NAME}, kamu aman di sini. Tarik napas dulu... Tidak ada yang berhak melanggar batasanmu! Langkah apa yang ingin kita ambil sekarang?"',
      dynamic: true,
      situationHint:
        'Aku menenangkan Dara di pos satpam bersama Pak Joko, memvalidasi perasaannya, dan menanyakan langkah perlindungan berikutnya.',
      next: 'n6',
    },

    // Titik Pilihan 2: Penentuan Langkah Pelaporan & Perlindungan (3 Pilihan)
    n6: {
      id: 'n6',
      speaker: 'naya',
      text:
        '"Setelah napasmu tenang di tempat aman ini, langkah apa yang ingin kita ambil berikutnya?"',
      dynamic: true,
      situationHint:
        'Aku menawarkan pendampingan penuh kepada Dara untuk menentukan langkah pelaporan yang terpercaya.',
      choices: [
        {
          id: 'a',
          label:
            '"Catat kronologi kejadian, lalu lapor ke BK dan orang tua."',
          chatReply:
            'Kita catat kronologi kejadian dengan tenang sekarang, lapor ke satpam dan guru BK besok, serta kabari orang tua agar terlindungi. Temani aku ya, Naya.',
          emotion: 'aman',
          next: 'n7a',
        },
        {
          id: 'b',
          label:
            '"Temani aku pulang dulu, besok pagi baru kita temui BK."',
          chatReply:
            'Temani aku pulang dulu ya, Naya. Malam ini aku mau menenangkan diri, besok pagi baru kita temui guru BK.',
          emotion: 'netral',
          next: 'n7b',
        },
        {
          id: 'c',
          label:
            '"Aku marah banget! Mau kusebar di medsos biar dia jera!"',
          chatReply:
            'Aku marah sekali dan besok ingin kusebarkan di media sosial sekolah supaya dia dipermalukan dan jera.',
          emotion: 'marah',
          next: 'n7c',
        },
      ],
    },

    n7a: {
      id: 'n7a',
      speaker: 'naya',
      text:
        '"Pilihan tepat! Kita catat buktinya selagi segar. Besok pagi aku dan orang tua akan mendampingimu langsung ke ruang BK."',
      dynamic: true,
      situationHint:
        'Dara memilih mencatat bukti dan melapor secara terstruktur ke guru BK dan orang tua dengan pendampinganku.',
      next: 'n8_movement',
    },

    n7b: {
      id: 'n7b',
      speaker: 'naya',
      text:
        '"Tentu, rasa amanmu yang utama. Malam ini tenangkan diri dulu di rumah, besok pagi kita langsung temui Bu Ratih bersama."',
      dynamic: true,
      situationHint:
        'Dara memilih menenangkan diri sebelum melapor besok. Aku menghargai kesiapannya dan berjanji mendampingi besok pagi.',
      next: 'n8_movement',
    },

    n7c: {
      id: 'n7c',
      speaker: 'naya',
      text:
        '"Wajar kamu marah! Tapi menyebar di medsos rawan serangan balik dan masalah hukum. Melapor resmi ke BK jauh lebih aman dan melindungi kita."',
      dynamic: true,
      situationHint:
        'Dara marah dan ingin mempermalukan pelaku di medsos. Aku menenangkan dengan rasional dan menjelaskan pentingnya jalur resmi BK.',
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
        'Laporanmu ditindaklanjuti secara resmi oleh pihak sekolah. Dari keberanianmu menetapkan batas, lahirlah inisiatif solidaritas siswa: gerakan "TEMAN AMAN".',
      next: 'n8_ceremony',
    },

    n8_ceremony: {
      id: 'n8_ceremony',
      speaker: 'naya',
      text:
        '"Lihat panggung aula ini, {PLAYER_NAME}! Spanduk \\"Teman Aman\\" terpasang megah. Keberanianmu telah menginspirasi seluruh sekolah untuk berani bersuara dan saling menjaga!"',
      dynamic: true,
      situationHint:
        'Aku dan Dara berdiri di panggung aula sekolah dalam deklarasi "Teman Aman". Aku mengungkapkan rasa bangga atas keberanian Dara.',
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
