// Episode 4 — "Candaan yang Tidak Nyaman"
//
// Satu-satunya side character yang tampil di dunia adalah senior kantin.
// Semua baris NPC tetap memiliki fallback plot yang pasti, tetapi ditandai
// `dynamic: true` agar GenAI dapat memvariasikan redaksinya tanpa mengubah
// kejadian, pilihan, atau akibat dari pilihan pemain.

const CHOICE_SITUATION_TEXT = {
  n3:
    'aku sedang melewati kantin ketika seorang senior mengomentari penampilanku dan menyebutnya hanya candaan',
  n6:
    'senior itu masih meremehkan rasa tidak nyamanku dan bertanya apakah aku akan membesar-besarkan masalah',
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
        'Bel istirahat baru berbunyi. Kamu melintasi kantin untuk mencari tempat duduk ketika seorang senior di dekat meja kasir memperhatikanmu.',
      next: 'n2',
    },

    n2: {
      id: 'n2',
      speaker: 'senior_kantin',
      text:
        'Eh, {PLAYER_NAME}! Penampilanmu beda banget hari ini. Jadi pengin ketawa lihatnya.',
      dynamic: true,
      situationHint:
        'Aku seorang senior di kantin. Aku baru saja mengomentari penampilan Sekar dengan nada mengejek. Sampaikan candaan yang merendahkan secara realistis, singkat, dan tanpa menambah tindakan atau tokoh baru.',
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
        'Aku senior yang baru mengejek penampilan Sekar lalu berlindung di balik alasan "hanya bercanda". Aku bertanya dengan nada meremehkan mengapa Sekar diam. Jangan mengubah kejadian atau menyelesaikan konflik sebelum Sekar menjawab.',
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
        'Sekar sudah menyatakan batas dengan tenang dan meminta komentarku dihentikan. Aku masih defensif dan mencoba mengecilkan masalah. Tanggapi singkat tanpa mengancam atau menaikkan konflik.',
      next: 'n5',
    },

    n4b: {
      id: 'n4b',
      speaker: 'senior_kantin',
      text: 'Lho, langsung pergi? Berarti benar kamu tersinggung, ya?',
      dynamic: true,
      situationHint:
        'Sekar tidak menanggapi isi ejekanku dan memilih mencari tempat lain. Aku memanggilnya sekali lagi dari jarak dekat dan menganggap kepergiannya sebagai tanda ia tersinggung. Jangan menambah karakter baru.',
      next: 'n5',
    },

    n4c: {
      id: 'n4c',
      speaker: 'senior_kantin',
      text: 'Kok malah nyerang aku? Aku tidak ngomong separah itu, kali.',
      dynamic: true,
      situationHint:
        'Sekar membalas dengan hinaan pribadi. Aku menjadi defensif dan fokus pada hinaannya, sehingga inti soal batasan justru kabur. Balas realistis tanpa kekerasan atau ancaman.',
      next: 'n5',
    },

    n5: {
      id: 'n5',
      speaker: 'narration',
      text:
        'Kamu mengambil satu langkah menjauh. Ucapan senior itu masih terdengar, tetapi jalur menuju area kasir dan pintu kantin tetap terbuka.',
      next: 'n6',
    },

    // Titik pilihan 2: menetapkan batas lanjutan atau mencari jarak aman.
    n6: {
      id: 'n6',
      speaker: 'senior_kantin',
      text: 'Jadi sekarang kamu mau membesar-besarkan candaan begini?',
      dynamic: true,
      situationHint:
        'Sekar sudah mengambil jarak setelah komentarku membuatnya tidak nyaman. Aku masih menganggap masalah ini sepele dan menanyakan apakah ia akan membesar-besarkannya. Beri ruang agar Sekar menentukan respons berikutnya.',
      choices: [
        {
          id: 'a',
          label:
            '"Aku serius soal batasanku. Kalau diulangi, aku akan minta bantuan guru piket."',
          emotion: 'aman',
          next: 'n7a',
        },
        {
          id: 'b',
          label: '"Aku tidak mau melanjutkan obrolan ini. Aku pergi dulu."',
          emotion: 'netral',
          next: 'n7b',
        },
        {
          id: 'c',
          label: '"Iya, mungkin aku saja yang terlalu sensitif. Anggap tidak terjadi apa-apa."',
          emotion: 'sedih',
          next: 'n7c',
        },
      ],
    },

    n7a: {
      id: 'n7a',
      speaker: 'senior_kantin',
      text: 'Ya sudah. Aku dengar. Tidak akan aku lanjutkan.',
      dynamic: true,
      situationHint:
        'Sekar mengulangi batasnya secara tegas dan menyebut akan meminta bantuan guru piket jika perilaku ini berulang. Aku akhirnya berhenti. Jangan membuat permintaan maaf berlebihan atau mengubah kejadian.',
      next: 'n8a',
    },

    n8a: {
      id: 'n8a',
      speaker: 'narration',
      text:
        'Kamu berjalan ke tempat yang lebih aman. Dadamu masih berdebar, tetapi kamu berhasil menyampaikan batas tanpa merendahkan siapa pun dan tahu kepada siapa harus meminta bantuan.',
    },

    n7b: {
      id: 'n7b',
      speaker: 'senior_kantin',
      text: 'Ya sudah, sana. Aku juga tidak memaksamu ngobrol.',
      dynamic: true,
      situationHint:
        'Sekar memilih mengakhiri percakapan dan pergi. Aku membiarkannya menjauh, meski belum benar-benar memahami dampak komentarku. Respons harus singkat dan tidak mengejar Sekar.',
      next: 'n8b',
    },

    n8b: {
      id: 'n8b',
      speaker: 'narration',
      text:
        'Menjauh membantumu keluar dari situasi yang tidak nyaman. Namun, senior itu mungkin belum memahami batasmu karena kamu belum menyampaikannya dengan jelas atau mencari dukungan.',
    },

    n7c: {
      id: 'n7c',
      speaker: 'senior_kantin',
      text: 'Nah, begitu. Santai saja, tidak perlu dipikirkan.',
      dynamic: true,
      situationHint:
        'Sekar menyalahkan dirinya sendiri dan mengatakan agar kejadian dianggap selesai. Aku mengira candaanku diterima dan tidak menyadari bahwa ia masih terluka. Jangan menyebut Sekar lemah.',
      next: 'n8c',
    },

    n8c: {
      id: 'n8c',
      speaker: 'narration',
      text:
        'Kamu menjauh sambil masih merasa tidak nyaman. Mengalah mungkin meredakan suasana sesaat, tetapi perasaanmu tetap valid dan kamu tetap berhak menceritakannya kepada orang tepercaya.',
    },
  },
};
