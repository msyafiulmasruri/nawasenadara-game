// ================================================================
// EPISODE 2 — "Rahasia di Grup Kelas"
// ================================================================
//
// LATAR:
// Kamar Sekar setelah pulang sekolah / menjelang sore.
//
// Sekar sedang berada sendirian di kamar ketika ponselnya yang
// diletakkan di meja terus menerima notifikasi dari grup kelas.
//
// Pemain kemudian membuka HP dan menemukan percakapan yang mulai
// mengarah ke cyberbullying terhadap Kirana.
//
// ---------------------------------------------------------------
// SIDE CHARACTER
// ---------------------------------------------------------------
//
// Untuk sementara tetap menggunakan RAFI seperti Episode 1 sebagai
// karakter percobaan.
//
// PENTING:
//
// Rafi TIDAK berada secara fisik di kamar Sekar.
//
// Pada episode ini, Rafi berinteraksi melalui CHAT PRIBADI setelah
// Sekar membaca isi grup kelas.
//
// Dengan begitu:
// - hanya ada satu side character aktif: Rafi
// - background kamar tetap masuk akal
// - struktur DialogueBox yang sudah ada masih dapat digunakan
//
// Nantinya ketika UI HP/chat overlay selesai, node Rafi dapat
// divisualisasikan sebagai bubble chat tanpa perlu mengubah struktur
// dialogue tree.
//
// ---------------------------------------------------------------
// OBJEK INTERAKSI
// ---------------------------------------------------------------
//
// HP di atas meja menjadi trigger utama episode:
//
// player mendekati meja
//      ↓
// interact HP
//      ↓
// DialogueBox / Phone Overlay dibuka
//      ↓
// EPISODE2_DIALOGUE dimulai
//
// Untuk saat ini isi grup chat masih direpresentasikan dengan
// speaker: 'narration'.
//
// ---------------------------------------------------------------
// DIVING
// ---------------------------------------------------------------
//
// Diving hanya terjadi apabila pemain memilih untuk peduli /
// membantu Kirana.
//
// Diving bukan perpindahan lokasi secara nyata.
//
// Yang terjadi:
//
// kamar perlahan gelap
// suara notifikasi terdistorsi
// pesan-pesan grup muncul seperti gema
// pemain melihat representasi kesendirian Kirana
//
// Setelah sequence selesai pemain kembali melihat kamar.
//
// Nantinya efek ini dapat dibuat:
// - dark overlay
// - floating chat bubbles
// - blur / vignette
// - abstract background
//
// Untuk sekarang masih berupa narration.
//
// ---------------------------------------------------------------
// DYNAMIC DIALOGUE
// ---------------------------------------------------------------
//
// Node milik Rafi yang memiliki:
//
// dynamic: true
//
// akan diproses GenAI.
//
// `text` tetap merupakan PLOT / ground truth.
//
// text:
// - TIDAK ditampilkan langsung
// - dikirim sebagai plottedLine ke Groq
// - diparafrase GenAI
// - digunakan sebagai fallback apabila AI gagal
//
// ================================================================

const CHOICE_SITUATION_TEXT = {
  n3: 'aku baru membuka grup chat kelas dari kamar dan melihat beberapa teman mengejek Kirana, lalu Rafi mengirim chat pribadi dan bertanya apa pendapatku',

  n6: 'aku sudah memutuskan ingin membantu Kirana setelah melihat perundungan di grup kelas, lalu Rafi bertanya langkah apa yang ingin aku lakukan',
};

// ================================================================
// COUNSELING CONTEXT
// ================================================================
//
// Membuat rangkuman keputusan pemain untuk dikirim sebagai konteks
// pembuka apabila setelah episode selesai pemain masuk ke Kak Dara.
//
// ================================================================

export function buildEpisode2CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) {
    return null;
  }

  const parts = [
    'Barusan waktu lagi di kamar aku buka grup chat kelas karena notifikasinya ramai. Ternyata beberapa anak sedang mengejek Kirana di sana. Rafi juga sempat nge-chat aku secara pribadi dan nanya pendapatku soal itu.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE2_DIALOGUE.nodes[nodeId];

    const situation = CHOICE_SITUATION_TEXT[nodeId];

    const chosen = node?.choices?.find((choice) => choice.id === choiceId);

    if (!situation || !chosen) {
      return;
    }

    const replyText = chosen.label
      .replace(/^"|"$/g, '')
      .replace(/\s*\(diucapkan.*\)$/g, '');

    parts.push(`Waktu itu ${situation}. Aku jawab: "${replyText}"`);
  });

  return parts.join(' ');
}

// ================================================================
// DIALOGUE TREE
// ================================================================

export const EPISODE2_DIALOGUE = {
  npcId: 'rafi',

  startNode: 'n1',

  nodes: {
    // ============================================================
    // PEMBUKA — KAMAR SEKAR
    // ============================================================

    n1: {
      id: 'n1',

      speaker: 'narration',

      text:
        'Sore itu kamar terasa tenang setelah hari yang cukup panjang di sekolah. ' +
        'Saat kamu baru saja meletakkan tas, ponsel di atas meja tiba-tiba bergetar berkali-kali.',

      next: 'n1b',
    },

    n1b: {
      id: 'n1b',

      speaker: 'narration',

      text:
        'Tiga notifikasi berubah menjadi tujuh, lalu belasan. ' +
        'Semuanya berasal dari grup chat kelas.',

      next: 'n1c',
    },

    n1c: {
      id: 'n1c',

      speaker: 'narration',

      text:
        'Kamu mengambil ponsel dari meja dan membuka grup kelas. ' +
        'Pesan-pesan baru terus masuk dengan cepat.',

      next: 'n2',
    },

    // ============================================================
    // GROUP CHAT
    // ============================================================

    n2: {
      id: 'n2',

      speaker: 'narration',

      text:
        'Beberapa pesan membicarakan Kirana: ' +
        '"Tadi Kirana kenapa sih diem terus?" — ' +
        '"Sok misterius banget wkwk" — ' +
        '"Jangan ajak dia dulu deh, bikin suasana aneh." ' +
        'Beberapa reaksi tertawa mulai memenuhi pesan-pesan tersebut.',

      next: 'n2b',
    },

    n2b: {
      id: 'n2b',

      speaker: 'narration',

      text:
        'Awalnya terlihat seperti candaan biasa. ' +
        'Namun semakin lama, pesan yang muncul semakin merendahkan dan beberapa orang mulai ikut-ikutan.',

      next: 'n2c',
    },

    // ============================================================
    // RAFI MASUK MELALUI PRIVATE CHAT
    // ============================================================

    n2c: {
      id: 'n2c',

      speaker: 'narration',

      text: 'Sebuah notifikasi baru muncul di bagian atas layar. Kali ini bukan dari grup kelas, melainkan pesan pribadi dari Rafi.',

      next: 'n3',
    },

    // ============================================================
    // TITIK CABANG 1
    // ============================================================

    n3: {
      id: 'n3',

      speaker: 'rafi',

      text: 'Lo lihat grup kelas juga kan? Makin rame bahas Kirana. Menurut lo gimana?',

      dynamic: true,

      situationHint:
        'Sekar sedang sendirian di kamar dan baru membaca grup chat kelas yang berisi ejekan terhadap Kirana. Aku, Rafi, mengirim chat pribadi ke Sekar karena aku juga melihat percakapan itu dan ingin tahu pendapatnya.',

      choices: [
        {
          id: 'a',

          label:
            '"Ini udah kelewatan sih. Kasian Kirana, aku pengen bantu dia."',

          emotion: 'aman',

          next: 'n4a',
        },

        {
          id: 'b',

          label:
            '"Aku juga gak nyaman bacanya... tapi takut kalau ikut campur malah jadi sasaran."',

          emotion: 'takut',

          next: 'n4b',
        },

        {
          id: 'c',

          label: '"Ya... tapi beberapa chatnya emang lumayan lucu sih."',

          emotion: 'menyinggung',

          next: 'n4c',
        },

        {
          id: 'd',

          label:
            '"Gak usah ikut campur kali. Nanti juga grupnya sepi sendiri."',

          emotion: 'netral',

          next: 'n4d',
        },
      ],
    },

    // ============================================================
    // CABANG A — MEMILIH PEDULI
    // ============================================================

    n4a: {
      id: 'n4a',

      speaker: 'rafi',

      text: 'Gue juga mulai ngerasa mereka keterlaluan. Cuma gue bingung enaknya kita ngapain.',

      dynamic: true,

      situationHint:
        'Sekar mengatakan bahwa perundungan terhadap Kirana sudah keterlaluan dan ingin membantu. Aku, Rafi, ternyata juga merasa isi grup mulai berlebihan tetapi belum tahu harus melakukan apa.',

      next: 'n5',
    },

    // ============================================================
    // DIVING
    // ============================================================

    n5: {
      id: 'n5',

      speaker: 'narration',

      text:
        'Saat pandanganmu kembali tertuju pada layar ponsel, cahaya kamar perlahan terasa meredup. ' +
        'Suara notifikasi yang tadi terdengar biasa berubah menjadi gema yang datang dari berbagai arah.',

      next: 'n5b',
    },

    n5b: {
      id: 'n5b',

      speaker: 'narration',

      text:
        '"Aneh." — "Jangan ajak dia." — "Wkwk." ' +
        'Potongan kata dari grup tadi terus berulang, saling bertumpuk hingga sulit dibedakan.',

      next: 'n5c',
    },

    n5c: {
      id: 'n5c',

      speaker: 'narration',

      text:
        'Di tengah ruang yang semakin gelap, terlihat sosok Kirana duduk sendirian. ' +
        'Di sekelilingnya, gelembung pesan terus muncul dan memenuhi ruang, seolah membuat tempat di sekitarnya semakin sempit.',

      next: 'n5d',
    },

    n5d: {
      id: 'n5d',

      speaker: 'narration',

      text: 'Untuk sesaat kamu membayangkan bagaimana rasanya membuka ponsel dan mengetahui satu kelas sedang membicarakanmu tanpa kamu bisa menghentikannya.',

      next: 'n5e',
    },

    n5e: {
      id: 'n5e',

      speaker: 'narration',

      text: 'Suara notifikasi perlahan menghilang. Cahaya sore dari jendela kembali terlihat, dan kamu sadar masih berdiri di depan meja sambil menggenggam ponsel.',

      next: 'n6',
    },

    // ============================================================
    // TITIK CABANG 2
    // CARA MEMBANTU
    // ============================================================

    n6: {
      id: 'n6',

      speaker: 'rafi',

      text: 'Kalau kita emang mau bantu, menurut lo enaknya mulai dari mana?',

      dynamic: true,

      situationHint:
        'Sekar sudah memutuskan bahwa Kirana perlu dibantu setelah melihat perundungan di grup kelas. Aku, Rafi, menanyakan langkah apa yang sebaiknya dilakukan tanpa mengubah situasi menjadi semakin buruk.',

      choices: [
        {
          id: 'a',

          label:
            '"Aku mau chat Kirana pribadi dulu. Setidaknya dia tahu ada yang peduli dan dia gak sendirian."',

          emotion: 'aman',

          next: 'n7a',
        },

        {
          id: 'b',

          label:
            '"Kita simpan screenshot-nya terus ngomong ke wali kelas atau guru BK. Biar ada orang dewasa yang bantu nangani."',

          emotion: 'aman',

          next: 'n7b',
        },

        {
          id: 'c',

          label:
            '"Aku pengen bantu, tapi aku masih takut ikut terseret. Aku pantau dulu deh."',

          emotion: 'takut',

          next: 'n7c',
        },
      ],
    },

    // ============================================================
    // END CABANG BAIK — DUKUNG KIRANA
    // ============================================================

    n7a: {
      id: 'n7a',

      speaker: 'rafi',

      text: 'Iya, itu bagus. Gue juga bisa bantu nemenin. Yang penting Kirana tahu gak semua orang di kelas ikut ngejatuhin dia.',

      dynamic: true,

      situationHint:
        'Sekar memilih menghubungi Kirana secara pribadi agar Kirana tahu bahwa ia tidak sendirian. Aku, Rafi, mendukung keputusan itu dan menawarkan untuk ikut membantu.',

      next: 'n8a',
    },

    n8a: {
      id: 'n8a',

      speaker: 'narration',

      text: 'Kamu membuka kolom pesan Kirana. Untuk beberapa detik jari-jarimu berhenti di atas keyboard sebelum akhirnya mulai mengetik.',

      next: 'n8a2',
    },

    n8a2: {
      id: 'n8a2',

      speaker: 'narration',

      text: 'Di grup kelas, pesan-pesan masih terus berjalan. Tapi setidaknya malam itu Kirana akan menerima satu pesan yang berbeda dari semuanya.',
    },

    // ============================================================
    // END CABANG BAIK — LAPOR
    // ============================================================

    n7b: {
      id: 'n7b',

      speaker: 'rafi',

      text: 'Setuju. Kita simpan dulu buktinya. Besok kita bisa ngomong ke guru BK biar masalahnya gak makin jauh.',

      dynamic: true,

      situationHint:
        'Sekar memilih menyimpan bukti chat dan meminta bantuan wali kelas atau guru BK. Aku, Rafi, setuju dan bersedia ikut membantu melaporkannya.',

      next: 'n8b',
    },

    n8b: {
      id: 'n8b',

      speaker: 'narration',

      text:
        'Kamu menyimpan beberapa tangkapan layar pesan yang paling bermasalah. ' +
        'Bukan untuk menyebarkannya, tetapi sebagai bukti jika nanti diperlukan.',

      next: 'n8b2',
    },

    n8b2: {
      id: 'n8b2',

      speaker: 'narration',

      text: 'Setelah itu kamu menutup grup kelas. Besok, masalah ini tidak akan kamu hadapi sendirian.',
    },

    // ============================================================
    // END CABANG RAGU
    // ============================================================

    n7c: {
      id: 'n7c',

      speaker: 'rafi',

      text: 'Gue ngerti sih. Kalau belum berani sekarang, yang penting jangan ikut nambahin. Kita lihat dulu keadaan Kirana besok.',

      dynamic: true,

      situationHint:
        'Sekar sebenarnya ingin membantu tetapi masih takut ikut terseret masalah. Aku, Rafi, memahami keraguannya dan mengingatkan agar setidaknya tidak ikut memperburuk situasi.',

      next: 'n8c',
    },

    n8c: {
      id: 'n8c',

      speaker: 'narration',

      text: 'Kamu meletakkan kembali ponsel di meja. Perasaan tidak nyaman masih tersisa, karena kamu tahu masalah di grup itu mungkin belum selesai.',
    },

    // ============================================================
    // CABANG B — TAKUT / MENGHINDAR
    // ============================================================

    n4b: {
      id: 'n4b',

      speaker: 'rafi',

      text: 'Gue juga kepikiran gitu. Kalau kita ngomong di grup, takutnya malah diserang balik sama yang lain.',

      dynamic: true,

      situationHint:
        'Sekar merasa tidak nyaman melihat Kirana dirundung tetapi takut menjadi sasaran jika ikut campur. Aku, Rafi, juga menunjukkan rasa ragu dan takut terhadap tekanan dari grup.',

      next: 'n4b2',
    },

    n4b2: {
      id: 'n4b2',

      speaker: 'narration',

      text: 'Kamu tidak membalas apa pun di grup. Pesan terus bergulir sementara nama Kirana perlahan tenggelam di antara candaan-candaan berikutnya.',
    },

    // ============================================================
    // CABANG C — IKUT MENYINGGUNG
    // ============================================================

    n4c: {
      id: 'n4c',

      speaker: 'rafi',

      text: 'Heh, iya sih... tapi makin lama kok mereka makin keterlaluan juga ya.',

      dynamic: true,

      situationHint:
        'Sekar ikut menganggap sebagian ejekan tentang Kirana lucu. Aku, Rafi, awalnya mengikuti suasana tetapi mulai menyadari bahwa percakapan grup sudah semakin keterlaluan.',

      next: 'n4c2',
    },

    n4c2: {
      id: 'n4c2',

      speaker: 'narration',

      text: 'Jari kamu sempat berada di atas tombol kirim. Di layar, pesan baru kembali muncul dengan nama Kirana disebut di dalamnya.',

      next: 'n4c3',
    },

    n4c3: {
      id: 'n4c3',

      speaker: 'narration',

      text: 'Malam itu percakapan terus berlanjut, dan kamu memilih tetap berada di dalam arus candaan tersebut.',
    },

    // ============================================================
    // CABANG D — CUEK
    // ============================================================

    n4d: {
      id: 'n4d',

      speaker: 'rafi',

      text: 'Mungkin sih. Biasanya grup rame sebentar terus pindah bahas yang lain.',

      dynamic: true,

      situationHint:
        'Sekar memilih menganggap perundungan di grup akan selesai dengan sendirinya. Aku, Rafi, ikut menanggapi dengan sikap cuek dan tidak mengambil tindakan.',

      next: 'n4d2',
    },

    n4d2: {
      id: 'n4d2',

      speaker: 'narration',

      text: 'Kamu mematikan layar ponsel dan meletakkannya kembali di meja. Notifikasi masih beberapa kali terdengar di kamar yang kembali sunyi.',
    },
  },
};
