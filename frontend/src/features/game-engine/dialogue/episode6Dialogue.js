// Episode 6 — "Langkah Berani Bersama"
//
// Penutup alur enam episode: pemain mempraktikkan penolakan asertif,
// bergerak menuju tempat aman, menyimpan informasi penting, melapor dengan
// pendamping, serta mengubah pengalaman menjadi inisiatif dukungan bagi teman lain ("Teman Aman").

const CHOICE_SITUATION_TEXT = {
  n_chat_icebreak:
    'kami mengobrol santai sepulang kegiatan mading di koridor sekolah',
  n3:
    'seorang senior menghadang jalan pulangku di dekat gerbang dan mendesakku ikut ke tempat sepi',
  n6:
    'aku sudah berada di tempat aman di pos satpam bersama Naya dan menentukan langkah pelaporan yang terpercaya',
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
    'Sepulang kegiatan mading sekolah, seorang senior menghadang dan menekan aku untuk ikut ke tempat sepi dekat gerbang. Naya melihat situasinya, membantuku mencapai pos satpam yang aman, dan kami bersama-sama menentukan langkah pelaporan.',
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
          '"{PLAYER_NAME}! Senang banget melihatmu tetap tegak dan bersemangat. Jangan ragu ya, gerakan \\"Teman Aman\\" selalu ada di sini untuk saling menguatkan."',
        choices: [
          {
            id: 'a',
            label: 'Terima kasih banyak, Naya. Punya sahabat sepertimu membuat segalanya terasa lebih ringan!',
            next: 'rev_2a',
          },
          {
            id: 'b',
            label: 'Bagaimana persiapan posko pengaduan teman sebaya kita besok?',
            next: 'rev_2b',
          },
        ],
      },
      rev_2a: {
        id: 'rev_2a',
        speaker: 'naya',
        text:
          '"Sama-sama, {PLAYER_NAME}! Sahabat sejati itu saling menjaga batasan dan saling melindungi. Yuk, kita selesaikan hari ini dengan bangga!"',
      },
      rev_2b: {
        id: 'rev_2b',
        speaker: 'naya',
        text:
          '"Semua poster, kotak saran aman, dan nomor darurat guru BK sudah kita tata rapi. Besok kita siap sambut teman-teman!"',
      },
    },
  };
}

export const EPISODE6_DIALOGUE = {
  npcId: 'naya',
  startNode: 'n1',

  nodes: {
    // ================================================================
    // BABAK 1: KORIDOR SEKOLAH SAAT SENJA (Obrolan Santai & Hangat)
    // Cutscene: ep6-corridor-chat-cg
    // ================================================================
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Sore itu, setelah menyelesaikan proyek mading di lantai dua, kamu dan Naya melangkah santai menuju halaman depan sekolah untuk bersiap pulang berbarengan.',
      next: 'n1_banter1',
    },

    n1_banter1: {
      id: 'n1_banter1',
      speaker: 'naya',
      text:
        '"Hahaha, {PLAYER_NAME}, liat deh ujung jarimu! Itu lem kertas atau adonan kanji sih? Udah belepotan dari pas kita nempelin mading tadi!"',
      dynamic: true,
      situationHint:
        'Aku Naya, sahabat Dara di tim redaksi mading sekolah. Kami baru saja menyelesaikan tugas mading sepulang sekolah. Aku melemparkan candaan hangat tentang sisa lem di tangannya untuk mencairkan suasana lelah.',
      next: 'n1_dara_reply1',
    },

    n1_dara_reply1: {
      id: 'n1_dara_reply1',
      speaker: 'player',
      text:
        '"Duh, gara-gara guntingnya tumpul banget tadi! Aku harus nahan kertas karton sambil ngoles lem buru-buru biar artikel rubrik kita nggak miring."',
      next: 'n1_banter2',
    },

    n1_banter2: {
      id: 'n1_banter2',
      speaker: 'naya',
      text:
        '"Tapi hasilnya keren parah, {PLAYER_NAME}! Artikel yang kamu tulis tentang \\"Mengenali Batasan Diri dan Berani Bersuara\\" bener-bener jadi sorotan utama mading. Bu Ratih tadi pas lewat sampai ngacungin jempol dua!"',
      dynamic: true,
      situationHint:
        'Aku mengapresiasi karya tulisan Dara di mading sekolah dengan tulus dan bangga. Tulisan itu bertema batasan diri dan keberanian bersuara.',
      next: 'n1_dara_reply2',
    },

    n1_dara_reply2: {
      id: 'n1_dara_reply2',
      speaker: 'player',
      text:
        '"Syukurlah kalau pesannya sampai. Rasanya lega banget bisa bikin hal yang bermanfaat buat teman-teman sekolah."',
      next: 'n1_banter3',
    },

    n1_banter3: {
      id: 'n1_banter3',
      speaker: 'naya',
      text:
        '"Nah, mumpung mading kelar sebelum gerbang ditutup, kita masih punya sedikit waktu santai nih. Sepulang ini enaknya ngapain dulu ya?"',
      dynamic: true,
      situationHint:
        'Aku mengajak Dara mengobrol santai tentang rencana sore setelah ekstrakurikuler sebelum pulang ke rumah.',
      next: 'n_chat_icebreak',
    },

    // Pilihan interaktif santai untuk membangun keakraban
    n_chat_icebreak: {
      id: 'n_chat_icebreak',
      speaker: 'narration',
      text: 'Apa yang ingin kamu katakan kepada Naya?',
      choices: [
        {
          id: 'a',
          label:
            '"Jajan cilok mang Dadang yuk! Wanginya manggil-manggil."',
          emotion: 'aman',
          next: 'n1_res_a',
        },
        {
          id: 'b',
          label:
            '"Foto mading sekali lagi yuk buat kenang-kenangan!"',
          emotion: 'aman',
          next: 'n1_res_b',
        },
        {
          id: 'c',
          label:
            '"Mau buru-buru pulang nih, PR matematika belum kelar!"',
          emotion: 'netral',
          next: 'n1_res_c',
        },
        {
          id: 'd',
          label:
            '"Duduk santai di pos satpam yuk sambil nikmati sore!"',
          emotion: 'aman',
          next: 'n1_res_d',
        },
      ],
    },

    n1_res_a: {
      id: 'n1_res_a',
      speaker: 'naya',
      text:
        '"Setuju banget! Cilok mang Dadang pake kuah anget plus kecap manis emang obat paling ampuh abis pegel gunting karton. Yuk kita borong!"',
      dynamic: true,
      situationHint:
        'Dara mengajak jajan cilok mang Dadang di depan gerbang. Aku antusias menyetujuinya.',
      next: 'n1_keys_notice',
    },

    n1_res_b: {
      id: 'n1_res_b',
      speaker: 'naya',
      text:
        '"Ide cemerlang! Nanti kita kirim juga fotonya ke grup OSIS biar makin banyak yang baca buletin tentang saling jaga di sekolah."',
      dynamic: true,
      situationHint:
        'Dara ingin memotret mading. Aku sangat mendukung agar pesan perlindungan diri semakin tersebar luas.',
      next: 'n1_keys_notice',
    },

    n1_res_c: {
      id: 'n1_res_c',
      speaker: 'naya',
      text:
        '"Hahaha, klasik anak SMA banget! Tenang, nanti malam kalau kamu mentok di rumus deret geometri, chat aku aja ya, kita bahas bareng."',
      dynamic: true,
      situationHint:
        'Dara mengeluhkan PR matematika yang belum selesai. Aku menertawakan dengan hangat dan menawarkan bantuan belajar bersama nanti malam.',
      next: 'n1_keys_notice',
    },

    n1_res_d: {
      id: 'n1_res_d',
      speaker: 'naya',
      text:
        '"Ide bagus! Angin sore di dekat gerbang emang paling seger buat ngelurusin kaki abis seharian duduk. Kita nikmati sore dulu sebentar ya!"',
      dynamic: true,
      situationHint:
        'Dara mengajak duduk santai di bangku depan pos satpam menikmati angin sore. Aku setuju dan menikmati suasana santai bersama Dara.',
      next: 'n1_keys_notice',
    },

    n1_keys_notice: {
      id: 'n1_keys_notice',
      speaker: 'naya',
      text:
        '"Eh astaga, tunggu sebentar, {PLAYER_NAME}! Kunci ruang mading masih ketinggalan di saku rokku. Aku harus balikin ke meja piket guru di lantai dua sebentar sebelum Pak Joko menguncinya."',
      next: 'n1_dara_wait',
    },

    n1_dara_wait: {
      id: 'n1_dara_wait',
      speaker: 'player',
      text:
        '"Perlu kutemani balik ke atas, Nay?"',
      next: 'n1_naya_instruct',
    },

    n1_naya_instruct: {
      id: 'n1_naya_instruct',
      speaker: 'naya',
      text:
        '"Nggak usah, cuma dua menit kok! Kamu tunggu di sini ya di depan pos satpam. Jangan keluar gerbang sendirian dulu sebelum aku balik, tunggu aku ya!"',
      dynamic: true,
      situationHint:
        'Aku harus mengembalikan kunci ke ruang piket sebentar. Aku mengingatkan Dara agar menunggu di depan pos satpam dan tidak keluar gerbang sendirian.',
      next: 'n1_corridor_end',
    },

    n1_corridor_end: {
      id: 'n1_corridor_end',
      speaker: 'narration',
      text:
        'Naya bergegas berbalik kembali ke dalam gedung sekolah untuk mengembalikan kunci. Kamu menunggu sendirian di area depan gerbang yang mulai sepi...',
      next: 'n2',
    },

    // ================================================================
    // BABAK 2: GERBANG SEKOLAH & TEKANAN SENIOR (Konflik Batasan Diri)
    // Cutscene: ep6-gate-pressure-cg
    // ================================================================
    n2: {
      id: 'n2',
      speaker: 'narration',
      text:
        'Saat kamu tiba di dekat gerbang depan, suasana sekolah sudah sangat sunyi. Tiba-tiba seorang siswa senior laki-laki melangkah keluar dari balik pilar dan menghadang tepat di depanmu.',
      next: 'n2_senior_entry',
    },

    n2_senior_entry: {
      id: 'n2_senior_entry',
      speaker: 'narration',
      text:
        'Sosoknya berdiri menjulang menghalangi jalur jalanmu. Tatapannya menuntut dan jarak berdirinya melanggar batas ruang personal yang membuatmu merasa tidak nyaman.',
      next: 'n2_senior_talk_narr',
    },

    n2_senior_talk_narr: {
      id: 'n2_senior_talk_narr',
      speaker: 'narration',
      text:
        'Senior itu melangkah maju menghadangmu dengan sorot mata menuntut dan nada mendesak.',
      next: 'n2_senior_talk',
    },

    n2_senior_talk: {
      id: 'n2_senior_talk',
      speaker: 'senior',
      text:
        '"Hei, {PLAYER_NAME} kan? Kebetulan banget ketemu di sini. Ikut aku sebentar yuk ke gang belakang kantin yang sepi, ada hal penting yang mau kuomongin berdua aja."',
      next: 'n2_senior_insist_narr',
    },

    n2_senior_insist_narr: {
      id: 'n2_senior_insist_narr',
      speaker: 'narration',
      text:
        'Kamu menggelengkan kepala dan mundur selangkah untuk menjaga jarak, tetapi ia justru melangkah maju mendekat dengan raut wajah sinis.',
      next: 'n2_senior_insist',
    },

    n2_senior_insist: {
      id: 'n2_senior_insist',
      speaker: 'senior',
      text:
        '"Alah, nggak usah berlebihan gitu. Cuma ngobrol bentar, hargai senior dikit dong."',
      next: 'n3',
    },

    // Titik Pilihan 1: Penolakan asertif, penjagaan batas, dan keselamatan diri
    n3: {
      id: 'n3',
      speaker: 'narration',
      text: 'Tekanan itu semakin nyata dan ia terus memaksakan kehendaknya. Apa yang kamu lakukan?',
      choices: [
        {
          id: 'a',
          label:
            '"Tidak, tolong mundur!" Tegas jalan ke pos satpam.',
          chatReply:
            'Saya menyatakan batasan diri dengan tenang dan tegas agar dia mundur, lalu segera melangkah ke arah pos satpam yang aman.',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label:
            'Beralasan tugas piket, mundur cari keramaian.',
          chatReply:
            'Saya beralasan harus segera menyerahkan berkas piket sambil terus melangkah mundur mencari keramaian.',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label:
            'Membeku ragu karena takut membuatnya tersinggung.',
          chatReply:
            'Saya membeku dan sempat ragu melangkah karena takut penolakan akan membuatnya semakin tersinggung.',
          emotion: 'takut',
          next: 'n4c',
        },
        {
          id: 'd',
          label:
            'Membentak balik penuh amarah di area yang sepi.',
          chatReply:
            'Saya membentak balik dengan penuh amarah tanpa memperhitungkan keselamatan diri di area sepi.',
          emotion: 'marah',
          next: 'n4d',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'narration',
      text:
        'Dengan suara lantang dan tegas, kamu mengangkat tangan memberi gestur batas yang jelas. Suaramu terdengar menggema di halaman sekolah. Senior itu tersentak kaget melihat ketegasanmu dan langkahnya terhenti!',
      next: 'n4_rescue_narr',
    },

    n4b: {
      id: 'n4b',
      speaker: 'narration',
      text:
        'Alasanmu memberimu celah untuk menjaga jarak. Meski belum menyatakan batas secara lugas, kamu bergerak cepat menjauh dari jangkauannya menuju area terbuka.',
      next: 'n4_rescue_narr',
    },

    n4c: {
      id: 'n4c',
      speaker: 'narration',
      text:
        'Tubuhmu sempat membeku akibat intimidasi yang mendadak. Namun sebelum ia sempat melangkah lebih dekat, sebuah suara familiar terdengar memecah keheningan sore.',
      next: 'n4_rescue_narr',
    },

    n4d: {
      id: 'n4d',
      speaker: 'narration',
      text:
        'Bentakan kemarahanmu mengejutkannya, namun ketegangan sempat memuncak berbahaya di area sepi tersebut sebelum perhatian satpam teralih ke arah kalian.',
      next: 'n4_rescue_narr',
    },

    // ================================================================
    // BABAK 3: POS SATPAM & PERLINDUNGAN SEBAYA (Peredaan & Dukungan)
    // Cutscene: ep6-safety-haven-cg
    // ================================================================
    n4_rescue_narr: {
      id: 'n4_rescue_narr',
      speaker: 'narration',
      text:
        'Di dekat gerbang sekolah, sosok Naya dan Pak Joko berdiri tegap di depan pos satpam yang terang benderang.',
      next: 'n4_rescue_shout',
    },

    n4_rescue_shout: {
      id: 'n4_rescue_shout',
      speaker: 'naya',
      text:
        '"{PLAYER_NAME}! Di sini! Cepat ke sini!"',
      next: 'n4_senior_flee',
    },

    n4_senior_flee: {
      id: 'n4_senior_flee',
      speaker: 'narration',
      text:
        'Melihat Pak Joko dan Naya mengamati langsung dari pos jaga, senior itu panik, salah tingkah, lalu bergegas membalikkan badan dan menghilang di tikungan jalan.',
      next: 'n5_haven_arrival',
    },

    n5_haven_arrival: {
      id: 'n5_haven_arrival',
      speaker: 'narration',
      text:
        'Kamu tiba di pos satpam yang aman. Pak Joko tersenyum ramah memastikan keamanan, sementara Naya segera merangkul pundakmu dan membimbingmu duduk di bangku kayu pos jaga.',
      next: 'n5',
    },

    n5: {
      id: 'n5',
      speaker: 'naya',
      text:
        '"{PLAYER_NAME}! Aku lihat tadi dia terus mendesakmu meski kamu menolak. Ini, minum air dingin dulu pelan-pelan ya. Tarik napas... hembuskan perlahan. Kamu sudah aman di sini."',
      dynamic: true,
      situationHint:
        'Aku Naya, teman setia Dara. Aku melihat seorang senior menekan Dara di dekat gerbang. Sekarang kami sudah di pos satpam yang terang bersama Pak Joko. Aku menenangkan Dara, memberikan air minum, memvalidasi perasaannya, dan menegaskan bahwa ia aman serta tidak bersalah.',
      next: 'n5_grounding_complete',
    },

    n5_grounding_complete: {
      id: 'n5_grounding_complete',
      speaker: 'narration',
      text:
        'Kamu meneguk air dingin pemberian Naya. Udara sejuk dan kehadiran sahabatmu perlahan meredakan debaran jantung yang sempat berpacu kencang. Rasa aman kembali hadir seutuhnya.',
      next: 'n5_validation',
    },

    n5_validation: {
      id: 'n5_validation',
      speaker: 'naya',
      text:
        '"Kamu luar biasa berani tadi. Ingat ya, apa pun alasannya, tidak ada seorang pun yang berhak memaksakan kehendak atau membuatmu merasa terancam seperti itu. Kamu sama sekali tidak salah."',
      dynamic: true,
      situationHint:
        'Aku menguatkan Dara bahwa tindakan penolakan yang ia lakukan sudah sangat tepat, dan bahwa pelaku tidak memiliki hak untuk melanggar batasannya.',
      next: 'n6',
    },

    // ================================================================
    // BABAK 4: STRATEGI & LANGKAH AMAN (Pelaporan Terstruktur)
    // Cutscene: ep6-safety-haven-cg
    // ================================================================
    n6: {
      id: 'n6',
      speaker: 'naya',
      text:
        '"Kamu tidak harus memendam kejadian ini sendirian. Setelah napasmu tenang dan kita di tempat yang aman ini, kamu ingin kita mengambil langkah apa berikutnya?"',
      dynamic: true,
      situationHint:
        'Aku menawarkan pendampingan penuh kepada Dara untuk menentukan langkah selanjutnya. Aku menghargai pilihannya tanpa memaksakan kehendak.',
      choices: [
        {
          id: 'a',
          label:
            '"Catat bukti kejadian, lapor ke BK dan orang tua."',
          chatReply:
            'Kita catat kronologi kejadian dengan tenang sekarang, lapor ke satpam dan guru BK besok, serta kabari orang tua agar terlindungi. Temani aku ya, Naya.',
          emotion: 'aman',
          next: 'n7a_narr',
        },
        {
          id: 'b',
          label:
            '"Temani pulang dulu, besok pagi baru kita temui BK."',
          chatReply:
            'Temani aku pulang dulu ya, Naya. Malam ini aku mau menenangkan diri, besok pagi baru kita temui guru BK.',
          emotion: 'netral',
          next: 'n7b_narr',
        },
        {
          id: 'c',
          label:
            '"Aku marah banget! Mau kusebar di medsos biar jera!"',
          chatReply:
            'Aku marah sekali dan besok ingin kusebarkan di media sosial sekolah supaya dia dipermalukan dan jera.',
          emotion: 'marah',
          next: 'n7c_narr',
        },
        {
          id: 'd',
          label:
            '"Mending diamkan saja, takut dia membalas dendam."',
          chatReply:
            'Mungkin lebih baik kita diamkan saja karena aku takut jika melapor urusannya tambah runyam dan dia membalas dendam.',
          emotion: 'takut',
          next: 'n7d_narr',
        },
      ],
    },

    n7a_narr: {
      id: 'n7a_narr',
      speaker: 'narration',
      text:
        'Kamu memutuskan untuk mencatat kronologi kejadian dan melapor secara terstruktur demi keselamatan diri.',
      next: 'n7a',
    },

    n7a: {
      id: 'n7a',
      speaker: 'naya',
      text:
        '"Aku temani sepenuhnya, {PLAYER_NAME}! Kita tulis kronologinya selagi ingatan masih segar: waktu, tempat, dan apa yang dia katakan. Besok pagi aku akan mendampingimu langsung ke ruang BK!"',
      dynamic: true,
      situationHint:
        'Dara memilih mencatat bukti dan melapor secara terstruktur ke satpam, guru BK, dan orang tua dengan pendampinganku. Aku sangat mendukung keputusan berdaya ini.',
      next: 'n8_transition',
    },

    n7b_narr: {
      id: 'n7b_narr',
      speaker: 'narration',
      text:
        'Kamu memilih untuk menenangkan diri terlebih dahulu di rumah sebelum melangkah lebih jauh.',
      next: 'n7b',
    },

    n7b: {
      id: 'n7b',
      speaker: 'naya',
      text:
        '"Tentu, {PLAYER_NAME}. Ketenangan dan rasa amanmu nomor satu sekarang. Aku antar kamu sampai naik jemputan dengan selamat. Besok pagi pas bel pertama, kita langsung jalan bareng ke ruang Bu Ratih ya."',
      dynamic: true,
      situationHint:
        'Dara memilih menenangkan diri di rumah sebelum melapor besok. Aku menghargai ritme pemulihannya dan berjanji mendampinginya besok pagi.',
      next: 'n8_transition',
    },

    n7c_narr: {
      id: 'n7c_narr',
      speaker: 'narration',
      text:
        'Kemarahan membakar perasaanmu melihat perlakuan senior yang melanggar batasanmu.',
      next: 'n7c',
    },

    n7c: {
      id: 'n7c',
      speaker: 'naya',
      text:
        '"Aku paham banget kamu marah, {PLAYER_NAME}—sikapnya emang keterlaluan! Tapi menyebarkannya di medsos tanpa jalur resmi rawan serangan balik dan bikin bukti rusak. Melapor ke BK jauh lebih melindungi keselamatanmu."',
      dynamic: true,
      situationHint:
        'Dara marah dan ingin mempermalukan pelaku di medsos. Aku menenangkan dengan rasional dan suportif, menjelaskan bahaya serangan balik serta pentingnya alur perlindungan resmi.',
      next: 'n8_transition',
    },

    n7d_narr: {
      id: 'n7d_narr',
      speaker: 'narration',
      text:
        'Rasa takut dan cemas sempat menyelimutimu membayangkan risiko jika melapor.',
      next: 'n7d',
    },

    n7d: {
      id: 'n7d',
      speaker: 'naya',
      text:
        '"Wajar banget kalau kamu merasa takut, {PLAYER_NAME}. Tapi kamu nggak sendirian lagi sekarang. Kalau kita diam, pelaku merasa punya kuasa. Pak Joko dan aku siap jadi saksi dan mendampingimu sampai tuntas."',
      dynamic: true,
      situationHint:
        'Dara merasa takut melapor karena khawatir dendam. Aku meyakinkannya bahwa ia tidak sendirian dan sekolah memiliki mekanisme perlindungan aman.',
      next: 'n8_transition',
    },

    // ================================================================
    // BABAK 5: AULA SEKOLAH & GERAKAN "TEMAN AMAN" (Puncak Akhir Episode)
    // Cutscene: ep6-teman-aman-cg
    // ================================================================
    n8_transition: {
      id: 'n8_transition',
      speaker: 'narration',
      text:
        'Hari-hari setelah kejadian itu membuka babak baru di sekolah. Laporan yang kamu dan Naya sampaikan ditindaklanjuti secara serius oleh pihak sekolah dengan pendampingan penuh dari Guru BK dan orang tua.',
      next: 'n8_movement_born',
    },

    n8_movement_born: {
      id: 'n8_movement_born',
      speaker: 'narration',
      text:
        'Pengalaman tersebut tidak berhenti sebagai memori kelam, melainkan berubah menjadi lentera perubahan. Bersama Naya dan dukungan pihak sekolah, kamu menginisiasi sebuah gerakan solidaritas siswa bernama "TEMAN AMAN".',
      next: 'n8_hall_ceremony',
    },

    n8_hall_ceremony: {
      id: 'n8_hall_ceremony',
      speaker: 'narration',
      text:
        'Pagi ini, aula utama SMA Negeri 1 dipadati ratusan pasang mata siswa dan guru. Di depan panggung, spanduk besar bertuliskan "TEMAN AMAN — Ruang Aman, Berani Bersuara, Saling Menjaga" terpampang megah.',
      next: 'n8_naya_proud',
    },

    n8_naya_proud: {
      id: 'n8_naya_proud',
      speaker: 'naya',
      text:
        '"Lihat aula ini, {PLAYER_NAME}! Langkah berani yang kamu mulai kemarin telah menginspirasi seluruh sekolah. Sekarang tidak ada lagi teman yang harus merasa sendirian atau takut saat menghadapi tekanan."',
      dynamic: true,
      situationHint:
        'Aku dan Dara berdiri di panggung aula sekolah dalam deklarasi inisiatif "Teman Aman". Aku mengungkapkan rasa bangga yang luar biasa atas keberanian dan ketangguhan Dara.',
      next: 'n8_epilogue',
    },

    n8_epilogue: {
      id: 'n8_epilogue',
      speaker: 'narration',
      text:
        'Kamu tersenyum menatap deretan teman sebaya yang kini memiliki tempat berpijak yang aman. Dari koridor kelas, ruang digital, hingga halaman gerbang sekolah, kamu telah membuktikan bahwa batasan diri adalah harga mati yang layak dihormati.',
      next: 'n8_final',
    },

    n8_final: {
      id: 'n8_final',
      speaker: 'narration',
      text:
        'Kamu telah menuntaskan seluruh perjalanan Nawasena Dara. Keberanianmu hari ini bukan sekadar mengakhiri sebuah cerita, melainkan menyalakan cahaya harapan bagi generasi muda Indonesia untuk melangkah maju tanpa rasa takut!',
    },
  },
};
