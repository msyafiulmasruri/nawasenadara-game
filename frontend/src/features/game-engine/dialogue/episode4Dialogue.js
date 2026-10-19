// Episode 4 — "Candaan yang Tidak Nyaman"
//
// Karakter pendukung: Senior Kantin.
// Dialog mendukung parafrase GenAI dinamis (`dynamic: true`), percabangan
// pilihan respons, serta cutscene visual untuk pilihan tindakan (terutama
// pilihan buruk/mengalah yang memicu konsekuensi emosional di kantin).

const EPISODE4_REVISIT_LINES = [
  'Lho, masih di sini? Sana beli makan, keburu bel istirahat habis.',
  'Udah ya, aku juga mau balik ngobrol sama temanku.',
  'Santai aja kali, gak usah tegang gitu.',
];

let lastRevisitIndex = -1;

export function buildEpisode4RevisitDialogue() {
  let index = Math.floor(Math.random() * EPISODE4_REVISIT_LINES.length);
  if (EPISODE4_REVISIT_LINES.length > 1 && index === lastRevisitIndex) {
    index = (index + 1) % EPISODE4_REVISIT_LINES.length;
  }
  lastRevisitIndex = index;

  return {
    npcId: 'senior_kantin',
    startNode: 'revisit',
    nodes: {
      revisit: {
        id: 'revisit',
        speaker: 'senior_kantin',
        text: EPISODE4_REVISIT_LINES[index],
        dynamic: true,
        situationHint:
          'Aku seorang senior kantin yang baru saja ditegur/selesai berinteraksi dengan Sekar. Ucapkan tanggapan singkat dan santai untuk menyuruhnya lanjut beraktivitas.',
      },
    },
  };
}

const CHOICE_SITUATION_TEXT = {
  n3: 'aku sedang melewati kantin ketika seorang senior mengomentari penampilanku dan menyebutnya hanya candaan',
  n6: 'senior itu masih meremehkan rasa tidak nyamanku dan bertanya apakah aku akan membesar-besarkan masalah',
};

/**
 * Merangkum keputusan Episode 4 untuk konteks pembuka sesi Kak Dara.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode4CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Saat jam istirahat, seorang senior di kantin mengomentari penampilanku lalu menganggap reaksiku berlebihan karena katanya ia hanya bercanda.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE4_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((choice) => choice.id === choiceId);
    if (!situation || !chosen) return;

    const replyText = chosen.label.replace(/^"|"$/g, '');
    parts.push(`Ketika ${situation}, aku merespons: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE4_DIALOGUE = {
  npcId: 'senior_kantin',
  startNode: 'n1',

  nodes: {
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Bel istirahat baru berbunyi. Suasana kantin mulai ramai dengan riuh percakapan siswa. Kamu melintasi deretan meja untuk mencari tempat duduk ketika seorang senior di dekat kasir memperhatikanmu.',
      next: 'n2',
    },

    n2: {
      id: 'n2',
      speaker: 'senior_kantin',
      text:
        'Eh, {PLAYER_NAME}! Penampilanmu beda banget hari ini. Jadi pengin ketawa lihatnya.',
      dynamic: true,
      situationHint:
        'Aku seorang senior di kantin sekolah. Aku baru saja mengomentari penampilan Sekar dengan nada mengejek yang merendahkan. Sampaikan candaan yang menyentil penampilan fisiknya secara realistis, singkat, dan tanpa menambah tokoh baru.',
      next: 'n3',
    },

    // Titik pilihan 1: respons awal terhadap komentar yang merendahkan.
    n3: {
      id: 'n3',
      speaker: 'senior_kantin',
      text:
        'Kok diam? Jangan baper, dong. Aku cuma bercanda. Memangnya aku salah ngomong apa?',
      dynamic: true,
      situationHint:
        'Aku senior yang baru mengejek penampilan Sekar lalu berlindung di balik alasan "hanya bercanda". Aku bertanya dengan nada meremehkan mengapa Sekar diam. Jangan menyelesaikan konflik sebelum Sekar menjawab.',
      choices: [
        {
          id: 'a',
          label:
            '"Aku tidak nyaman penampilanku dijadikan bahan tertawaan. Tolong hentikan."',
          emotion: 'aman',
          next: 'n4a',
        },
        {
          id: 'b',
          label: '"Aku mau cari tempat duduk dulu."',
          emotion: 'netral',
          next: 'n4b',
        },
        {
          id: 'c',
          label: '"Candaanmu norak banget. Pantas tidak ada yang tahan dekat kamu."',
          emotion: 'menyinggung',
          next: 'n4c',
        },
      ],
    },

    n4a: {
      id: 'n4a',
      speaker: 'senior_kantin',
      text: 'Serius amat? Sekarang bercanda sedikit saja tidak boleh?',
      dynamic: true,
      situationHint:
        'Sekar menyatakan batas dengan tenang dan meminta komentarku dihentikan. Aku masih bersikap defensif dan mengecilkan masalah. Tanggapi singkat tanpa mengancam atau menaikkan konflik.',
      next: 'n5',
    },

    n4b: {
      id: 'n4b',
      speaker: 'senior_kantin',
      text: 'Lho, langsung pergi? Berarti benar kamu tersinggung, ya?',
      dynamic: true,
      situationHint:
        'Sekar tidak menanggapi ejekanku dan memilih mencari tempat lain. Aku memanggilnya sekali lagi dari jarak dekat dan menganggap kepergiannya sebagai tanda ia tersinggung.',
      next: 'n5',
    },

    n4c: {
      id: 'n4c',
      speaker: 'senior_kantin',
      text: 'Kok malah nyerang balik? Aku tidak ngomong separah itu, kali.',
      dynamic: true,
      situationHint:
        'Sekar membalas dengan hinaan pribadi. Aku menjadi defensif dan fokus pada serangannya, sehingga inti soal batasan justru kabur.',
      next: 'n5',
    },

    n5: {
      id: 'n5',
      speaker: 'narration',
      text:
        'Kamu mengambil satu langkah menjauh. Ucapan senior itu masih terdengar, sementara beberapa pasang mata siswa lain di sekitar kantin sempat melirik ke arah kalian.',
      next: 'n6',
    },

    // Titik pilihan 2: menetapkan batas lanjutan atau mencari jarak aman.
    n6: {
      id: 'n6',
      speaker: 'senior_kantin',
      text: 'Jadi sekarang kamu mau membesar-besarkan candaan begini?',
      dynamic: true,
      situationHint:
        'Sekar sudah mengambil jarak setelah komentarku membuatnya tidak nyaman. Aku masih menganggap masalah ini sepele dan menanyakan apakah ia akan membesar-besarkannya.',
      choices: [
        {
          id: 'a',
          label:
            '"Aku serius soal batasanku. Kalau diulangi, aku akan minta bantuan guru piket."',
          emotion: 'aman',
          next: 'cutsceneA1',
        },
        {
          id: 'b',
          label: '"Aku tidak mau melanjutkan obrolan ini. Aku pergi dulu."',
          emotion: 'netral',
          next: 'cutsceneB1',
        },
        {
          id: 'c',
          label: '"Iya, mungkin aku saja yang terlalu sensitif. Anggap tidak terjadi apa-apa."',
          emotion: 'sedih',
          next: 'cutsceneC1',
        },
      ],
    },

    // --- Branch A: asertif, tegas menyampaikan batas & siap melapor ---
    cutsceneA1: {
      id: 'cutsceneA1',
      speaker: 'narration',
      text: 'Kata-katamu terdengar tenang tetapi tegas. Kamu berdiri tegak dan menatapnya tanpa ragu. Senior itu tersentak dan melangkah mundur sedikit, seolah baru menyadari bahwa kamu tidak main-main.',
      next: 'cutsceneA2',
    },

    cutsceneA2: {
      id: 'cutsceneA2',
      speaker: 'senior_kantin',
      text: 'Ya sudah... iya. Aku dengar. Tidak akan aku teruskan lagi.',
      dynamic: true,
      situationHint:
        'Sekar mengulangi batasnya secara tegas dan siap melapor ke guru piket. Aku akhirnya sadar bahwa candaanku keterlaluan dan berhenti. Balas singkat tanpa berlebihan.',
      next: 'cutsceneA3',
    },

    cutsceneA3: {
      id: 'cutsceneA3',
      speaker: 'narration',
      text: 'Senior itu menggaruk tengkuknya canggung dan tidak berkata apa-apa lagi. Kamu berbalik dengan tenang. Dadamu masih berdebar, tetapi kamu bangga karena berhasil menegakkan batasmu tanpa rasa takut.',
      next: 'cutsceneA4',
    },

    cutsceneA4: {
      id: 'cutsceneA4',
      speaker: 'narration',
      text: 'Jika perilaku seperti itu pernah berulang, kamu tahu langkah berikutnya: cari guru piket atau orang dewasa tepercaya di sekolah. Menjaga batas diri adalah hakmu.',
      next: 'n8a',
    },

    // --- Branch B: memilih menjauh — menjaga jarak aman ---
    cutsceneB1: {
      id: 'cutsceneB1',
      speaker: 'narration',
      text: 'Kamu membalikkan badan dan melangkah cepat menjauh dari area kasir kantin. Langkah kakimu tergesa menuju lorong keluar.',
      next: 'cutsceneB2',
    },

    cutsceneB2: {
      id: 'cutsceneB2',
      speaker: 'senior_kantin',
      text: 'Dih, langsung cabut? Ya sudah sana, siapa juga yang maksa ngobrol.',
      dynamic: true,
      situationHint:
        'Sekar memilih mengakhiri percakapan dan pergi menjauh. Aku bersandar santai sambil mengangkat bahu acuh tak acuh. Respons singkat dan tidak mengejar Sekar.',
      next: 'cutsceneB3',
    },

    cutsceneB3: {
      id: 'cutsceneB3',
      speaker: 'narration',
      text: 'Dari kejauhan, kamu melihat senior itu bersandar santai sambil mengangkat bahu acuh tak acuh. Menjauh dari situasi yang tidak nyaman memang langkah awal yang baik untuk melindungi diri. Namun, tanpa menyampaikan batas yang jelas atau melapor, rasa ganjal di hatimu masih tersisa.',
      next: 'n8b',
    },

    // --- Branch C: PILIHAN BURUK — menyalahkan diri sendiri & menormalisasi ---
    cutsceneC1: {
      id: 'cutsceneC1',
      speaker: 'narration',
      text: 'Kata-kata itu meluncur begitu saja dari mulutmu — sebuah cara cepat untuk meredakan ketegangan. Namun begitu mengucapkannya, hatimu terasa remuk.',
      next: 'cutsceneC2',
    },

    cutsceneC2: {
      id: 'cutsceneC2',
      speaker: 'senior_kantin',
      text: 'Nah, gitu dong! Makanya santai aja, kan emang cuma bercanda, gak usah dibawa baper.',
      dynamic: true,
      situationHint:
        'Sekar menyalahkan dirinya sendiri agar situasi mereda. Aku mengira candaanku wajar dan diterima, tanpa sadar komentarku melukai perasaannya. Respons ceria meremehkan.',
      next: 'cutsceneC3',
    },

    cutsceneC3: {
      id: 'cutsceneC3',
      speaker: 'narration',
      text: 'Senior itu tertawa puas dan kembali mengobrol bersama teman-temannya di meja kantin, seolah tidak pernah terjadi apa-apa. Kamu berjalan ke sudut kantin dan duduk sendirian di depan meja kayu yang dingin.',
      next: 'cutsceneC4',
    },

    cutsceneC4: {
      id: 'cutsceneC4',
      speaker: 'narration',
      text: 'Kamu menundukkan kepala memandang makananmu yang belum tersentuh. Dadamu sesak oleh perasaan malu dan bersalah yang sebenarnya bukan salahmu.',
      next: 'cutsceneC5',
    },

    cutsceneC5: {
      id: 'cutsceneC5',
      speaker: 'narration',
      text: 'Komentar fisik yang dibungkus sebagai candaan tetaplah perlakuan yang tidak pantas, apa pun alasannya. Menyalahkan diri sendiri hanya membuat pelaku merasa perilakunya wajar. Kamu berhak merasa nyaman atas tubuhmu dan berhak mencari bantuan jika perlakuan itu terus berulang.',
      next: 'n8c',
    },

    // --- Simpul Penutup Masing-Masing Cabang ---
    n8a: {
      id: 'n8a',
      speaker: 'narration',
      text:
        'Kamu melangkah ke area kantin yang lebih tenang dengan perasaan lega. Kamu berhasil menyampaikan batas dengan jelas dan berani.',
    },

    n8b: {
      id: 'n8b',
      speaker: 'narration',
      text:
        'Kamu meninggalkan kantin. Menjauh melindungimu dari perdebatan, tetapi membicarakan batasanmu kepada guru atau teman tepercaya bisa membantumu merasa lebih tenang.',
    },

    n8c: {
      id: 'n8c',
      speaker: 'narration',
      text:
        'Kamu duduk termenung sambil memikirkan apa yang terjadi. Jangan biarkan dirimu menanggung rasa tidak nyaman ini sendirian — cari orang dewasa yang kamu percaya.',
    },
  },
};
