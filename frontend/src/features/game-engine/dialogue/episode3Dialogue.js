// Naskah dialog Episode 3 — "Pesan dari Orang Asing".
//
// Tema: online grooming / stranger danger — seseorang tak dikenal
// (akun @bayang_kelabu91) mengirim DM ke Dara lewat Instagram dengan
// pendekatan progresif: awalnya terasa ramah, lalu perlahan berubah
// manipulatif dan mengancam. Pemain harus memutuskan cara merespons
// di setiap tahap sebelum situasi memburuk.
//
// Struktur alur cerita:
//   BAGIAN 1 — Awalan: notifikasi masuk, pemain membuka DM (narasi).
//   BAGIAN 2 — Eskalasi awal: orang asing tahu detail sekolah Dara
//               → titik cabang 1 (n_cb1): abaikan vs balas.
//   BAGIAN 3 — Ketegangan: orang asing tahu penampilan Dara hari ini
//               → titik cabang 2 (n_cb2): setelah balas di tahap 1.
//   BAGIAN 4 — Manipulasi: klaim punya "bukti" + minta nomor/foto
//               → titik cabang 3 (n_cb3): bagaimana merespons ancaman.
//   BAGIAN 5 — Ending: pesan terakhir "aku bisa lihat kamu dari jendela"
//               + panggilan masuk → titik cabang 4 (n_cb4): apa yang
//               Dara lakukan selanjutnya.
//
// Skema `emotion` SAMA PERSIS dengan Episode 1 & 2 (6 label):
//   aman | netral | sedih | takut | marah | menyinggung
// Dipakai DialogueBox → moodStore.setMood() (bar HUD) DAN
// utils/emotionEnding.js (menghitung ending episode).
//
// Speaker di sini ada TIGA:
//   'narration'     — kotak narasi tanpa portrait (seperti Ep1-2)
//   'bayang_kelabu' — "akun anonim"; portrait = UI chat bubble gelap
//   'dara'          — Dara sendiri (saat ada pilihan yang dinarasikan)
//
// Node `dynamic: true` dipakai untuk balasan @bayang_kelabu91 yang
// nanti bisa di-generate ulang redaksinya lewat Gen AI (sama dengan
// pola Episode 1-2) tanpa mengubah plot/choices.

const CHOICE_SITUATION_TEXT = {
  n_cb1:
    'ada DM masuk dari akun anonim yang tahu jadwal pelajaranku hari ini, dan aku harus memutuskan apakah membalasnya',
  n_cb2:
    'orang asing itu menunjukkan ia tahu persis apa yang aku pakai hari ini — artinya ia benar-benar mengamatiku',
  n_cb3:
    'orang asing itu mengklaim punya "bukti chat" tentangku dan meminta nomor atau foto sebagai syarat memberikannya',
  n_cb3_choice:
    'orang asing itu mengklaim punya "bukti chat" tentangku dan meminta nomor atau foto sebagai syarat memberikannya',
  n_cb4:
    'orang asing itu mengirim pesan terakhir bahwa ia bisa melihatku dari luar jendela kamarku, dan ada panggilan masuk',
};

/**
 * Merangkai ringkasan pilihan Episode 3 jadi satu pesan naratif
 * orang-pertama — dikirim otomatis ke chatbot Kak Dara sebagai konteks.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode3CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Tadi malam aku mendapat DM dari akun Instagram tak dikenal bernama @bayang_kelabu91. Awalnya terasa seperti basa-basi, tapi lama-lama jadi sangat mencurigakan dan menakutkan.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE3_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((c) => c.id === choiceId);
    if (!situation || !chosen) return;
    const replyText = chosen.label.replace(/^"|"$/g, '').replace(/\s*\(.*\)$/, '');
    parts.push(`Waktu itu ${situation}. Aku memutuskan: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE3_DIALOGUE = {
  // Tidak ada NPC konvensional — "NPC"-nya adalah UI overlay chat HP.
  // npcId diisi 'bayang_kelabu' supaya DialogueBox tahu portrait mana
  // yang dipakai (key portrait diambil dari npcs.js episodeId: 3).
  npcId: 'bayang_kelabu',
  startNode: 'n1',
  nodes: {

    // ============================================================
    // BAGIAN 1 — AWALAN: Suasana tenang di kamar, HP bergetar
    // ============================================================
    n1: {
      id: 'n1',
      speaker: 'narration',
      text:
        'Pukul sembilan lewat lima belas malam. Kamar terasa hangat dan tenang — ' +
        'buku catatan terbuka di meja belajar, segelas teh kamomil hampir dingin di sisi kanan. ' +
        'Untuk pertama kalinya dalam berminggu-minggu, Dara merasa benar-benar dilindungi di sini.',
      next: 'n2',
    },
    n2: {
      id: 'n2',
      speaker: 'narration',
      text:
        'Bzzzt. Ponsel di meja bergetar dua kali berturut-turut. ' +
        'Layarnya menyala sebentar: ada permintaan Direct Message baru di Instagram. ' +
        'Akun pengirimnya tidak punya foto profil — lingkaran abu-abu kosong dengan nama pengguna @bayang_kelabu91. ' +
        'Pengikut: 0. Mengikuti: 1. Postingan: 0.',
      next: 'n3',
    },
    n3: {
      id: 'n3',
      speaker: 'bayang_kelabu',
      text: 'Halo, Dara. Belum tidur ya?',
      next: 'n4',
    },
    n4: {
      id: 'n4',
      speaker: 'bayang_kelabu',
      text:
        'Tugas esai Bu Ratna tadi siang emang bikin pusing banget ya. ' +
        'Untung tadi kamu nggak kena giliran maju ke depan kelas.',
      next: 'n_cb1',
    },

    // ============================================================
    // TITIK CABANG 1 — Abaikan / Balas / Langsung blokir
    // ============================================================
    n_cb1: {
      id: 'n_cb1',
      speaker: 'narration',
      text:
        'Orang ini tahu jadwal pelajaran Dara hari ini. Lebih dari itu, ' +
        'ia tahu persis apa yang terjadi di ruang kelas beberapa jam lalu. Apa yang Dara lakukan?',
      choices: [
        {
          id: 'a',
          label: 'Langsung blokir akun & hapus permintaan pesan.',
          chatReply: null,
          emotion: 'aman',
          next: 'n_cb1_block',
        },
        {
          id: 'b',
          label: 'Balas pesan untuk menanyakan identitasnya.',
          chatReply: 'Ini siapa ya? Kamu anak kelas mana?',
          emotion: 'takut',
          next: 'n_cb1_reply',
        },
        {
          id: 'c',
          label: 'Abaikan pesan dan jangan membalas apa pun.',
          chatReply: null,
          emotion: 'netral',
          next: 'n_cb1_ignore',
        },
      ],
    },

    // --- Cabang: langsung blokir (pilihan terbaik) ---
    n_cb1_block: {
      id: 'n_cb1_block',
      speaker: 'narration',
      text:
        'Dara menekan tombol "Blokir & Hapus" dengan cepat. ' +
        'Permintaan pesan itu lenyap seketika. Jantungnya masih berdegup sedikit lebih kencang, ' +
        'tapi ia tahu ia baru membuat keputusan yang benar: akun tak dikenal tanpa foto profil ' +
        'yang tahu detail pribadinya adalah tanda bahaya yang tidak perlu direspons lebih jauh.',
      next: 'n_safe_outro',
    },
    n_safe_outro: {
      id: 'n_safe_outro',
      speaker: 'narration',
      text:
        'Dara meletakkan ponsel kembali ke meja, mengambil teh kamomilnya, dan melanjutkan mengerjakan tugas. ' +
        'Ia juga memutuskan untuk menceritakan kejadian ini ke orang tua malam ini. ' +
        'Ada perasaan lega yang mengalir — ia tidak membiarkan rasa penasaran mengalahkan kewaspadaannya.',
      // node akhir → DialogueBox menutup & quest selesai
    },

    // --- Cabang: membalas (mulai eskalasi) ---
    n_cb1_reply: {
      id: 'n_cb1_reply',
      speaker: 'bayang_kelabu',
      text: 'Bukan teman sekelas sih. Tapi aku selalu ada di sekitar kamu kok.',
      dynamic: true,
      situationHint:
        'Dara baru saja bertanya siapa aku, dan aku menjawab secara misterius bahwa aku "selalu ada di sekitar" dia.',
      next: 'n5',
    },

    // --- Cabang: diam/tidak blokir (eskalasi tetap terjadi) ---
    n_cb1_ignore: {
      id: 'n_cb1_ignore',
      speaker: 'bayang_kelabu',
      text:
        'Kamu kelihatan manis banget tadi pas pulang sekolah, ' +
        'kardigan biru muda kamu cocok dipadu sama tas hitam itu.',
      dynamic: true,
      situationHint:
        'Dara tidak membalas dan tidak memblokir, tapi aku tetap mengirim pesan lagi — kali ini mendeskripsikan penampilan Dara hari ini.',
      next: 'n_cb2',
    },

    // ============================================================
    // BAGIAN 3 — Orang asing tahu penampilan Dara hari ini
    // ============================================================
    n5: {
      id: 'n5',
      speaker: 'bayang_kelabu',
      text:
        'Kamu kelihatan manis banget tadi pas pulang sekolah, ' +
        'kardigan biru muda kamu cocok dipadu sama tas hitam itu.',
      next: 'n_cb2',
    },

    // ============================================================
    // TITIK CABANG 2 — Reaksi saat tahu orang asing mengamatiya
    // ============================================================
    n_cb2: {
      id: 'n_cb2',
      speaker: 'narration',
      text:
        'Pagi tadi Dara memang memakai kardigan biru muda kesayangannya. ' +
        'Tas hitam itu baru dipakai dua hari terakhir. ' +
        'Orang ini benar-benar melihatnya. Mengamatinya. ' +
        'Sensasi dingin menjalar dari telapak tangan hingga ke tengkuknya. Apa yang Dara lakukan sekarang?',
      choices: [
        {
          id: 'a',
          label: 'Blokir akun sekarang dan segera temui orang tua.',
          chatReply: null,
          emotion: 'aman',
          next: 'n_cb2_tell_parents',
        },
        {
          id: 'b',
          label: 'Tegur dengan nada tegas dan ancam akan memblokir.',
          chatReply: 'Tolong jangan aneh-aneh! Kamu siapa sebenarnya?! Sebut nama kamu atau aku blokir!',
          emotion: 'marah',
          next: 'n_cb2_warn',
        },
        {
          id: 'c',
          label: 'Membeku ketakutan, tidak berani merespons apa pun.',
          chatReply: null,
          emotion: 'takut',
          next: 'n_cb2_freeze',
        },
      ],
    },

    // --- Cabang: blokir + lapor orang tua ---
    n_cb2_tell_parents: {
      id: 'n_cb2_tell_parents',
      speaker: 'narration',
      text:
        'Dara memblokir akun itu, lalu berdiri dari kursi belajarnya. ' +
        'Ia mengetuk pintu kamar dan keluar menemui Ayah dan Ibu yang sedang menonton sinetron. ' +
        '"Yah, Bu... ada yang perlu aku ceritain." Suaranya sedikit gemetar, tapi mantap.',
      next: 'n_safe_outro2',
    },
    n_safe_outro2: {
      id: 'n_safe_outro2',
      speaker: 'narration',
      text:
        'Ayah segera mengambil ponsel Dara dan memeriksa riwayatnya. ' +
        'Ibu memeluknya erat. Mereka memutuskan untuk melaporkan akun itu ke pihak sekolah besok pagi. ' +
        'Dara merasa bahu yang sudah berjam-jam tegang perlahan mengendur — ia tidak sendirian.',
      // node akhir
    },

    // --- Cabang: menegur orang asing ---
    n_cb2_warn: {
      id: 'n_cb2_warn',
      speaker: 'bayang_kelabu',
      text:
        'Lho, kok galak banget? Padahal aku cuma mau bantu kamu. ' +
        'Kamu tahu nggak, anak-anak cowok di kelas sebelah punya grup obrolan sendiri? ' +
        'Di situ mereka sering ngomongin kamu. Aku punya tangkapan layarnya.',
      dynamic: true,
      situationHint:
        'Dara menegur aku dengan ketus dan mengancam blokir. Aku membalas dengan memanfaatkan rasa penasaran dan ketakutannya — klaim punya "bukti" tentang dirinya.',
      next: 'n_cb3',
    },

    // --- Cabang: membeku/tidak bisa bereaksi ---
    n_cb2_freeze: {
      id: 'n_cb2_freeze',
      speaker: 'bayang_kelabu',
      text:
        'Hei, masih di sana kan? Jangan diam-diam gitu. ' +
        'Aku cuma mau bantu kok. ' +
        'Kamu tahu nggak, ada grup obrolan anak cowok kelas sebelah yang ngomongin kamu? ' +
        'Aku punya screenshot-nya, lengkap.',
      dynamic: true,
      situationHint:
        'Dara membeku dan tidak membalas, jadi aku mengirim pesan lagi — kali ini mengklaim punya bukti bahwa orang lain sedang membicarakan Dara secara negatif.',
      next: 'n_cb3',
    },

    // ============================================================
    // TITIK CABANG 3 — Taktik manipulasi: klaim bukti + minta data
    // ============================================================
    n_cb3: {
      id: 'n_cb3',
      speaker: 'bayang_kelabu',
      text:
        'Tapi jangan lewat DM sini, ribet. ' +
        'Kirim nomor WhatsApp kamu dulu. Atau... kirim foto kamu sekarang lagi ngapain, ' +
        'biar aku yakin kalau ini beneran kamu yang pegang HP. ' +
        'Lagian... kalau kamu tolak, bukti chat ini bakal aku sebar ke anak-anak satu angkatan.',
      next: 'n_cb3_choice',
    },
    n_cb3_choice: {
      id: 'n_cb3_choice',
      speaker: 'narration',
      text:
        'Tangan Dara gemetar. Ini pola klasik manipulasi: memancing dengan "bukti", ' +
        'lalu mengancam untuk memaksa memberikan data pribadi atau foto. ' +
        'Apa yang Dara lakukan?',
      choices: [
        {
          id: 'a',
          label: 'Simpan screenshot obrolan, laporkan akun, lalu blokir.',
          chatReply: null,
          emotion: 'aman',
          next: 'n_cb3_report',
        },
        {
          id: 'b',
          label: 'Tolak keras ancamannya dan jangan kirim data apa pun.',
          chatReply: 'Aku nggak akan kirim foto atau nomor apa pun! Berhenti mengancam aku!',
          emotion: 'aman',
          next: 'n_cb3_refuse',
        },
        {
          id: 'c',
          label: 'Panik dan bimbang karena takut ancaman bukti disebar.',
          chatReply: null,
          emotion: 'takut',
          next: 'n_cb3_panic',
        },
      ],
    },

    // --- Cabang: laporkan akun ---
    n_cb3_report: {
      id: 'n_cb3_report',
      speaker: 'narration',
      text:
        'Dara mengambil screenshot seluruh percakapan dengan cepat. ' +
        'Jempolnya menekan "Laporkan" → "Peniruan identitas & pelecehan" → kirim. ' +
        'Akun itu lalu diblokir. Sebuah keputusan tepat: bukti tersimpan, pelaku dilaporkan.',
      next: 'n_cb3_report2',
    },
    n_cb3_report2: {
      id: 'n_cb3_report2',
      speaker: 'narration',
      text:
        'Dara kemudian mengetuk pintu kamarnya dan memanggil Ayah. ' +
        'Memperlihatkan screenshot itu. Ayah mengangguk serius — "Besok kita ke pihak sekolah dan kalau perlu ke polisi." ' +
        'Dara menghembuskan napas panjang. Ini bukan akhir, tapi ia tahu ia sudah melakukan hal yang benar.',
      // node akhir
    },

    // --- Cabang: menolak tegas + tutup aplikasi ---
    n_cb3_refuse: {
      id: 'n_cb3_refuse',
      speaker: 'narration',
      text:
        'Dara menekan tombol "Blokir" dengan tegas, lalu menutup aplikasi. ' +
        'Layar HP mati. Ruangan terasa kembali hening — hanya suara jangkrik dan televisi dari ruang tamu. ' +
        'Besok ia akan bercerita ke orang tua dan meminta bantuan guru BK.',
      // node akhir
    },

    // --- Cabang: panik hampir mengirim data ---
    n_cb3_panic: {
      id: 'n_cb3_panic',
      speaker: 'narration',
      text:
        'Jari Dara berhenti di tengah mengetik nomor. Sesuatu dalam benaknya berteriak: ' +
        '"Ini jebakan. Kalau kamu kirim, itu yang mereka tunggu." ' +
        'Ia menghapus ketikannya. Napasnya memburu, tapi jempolnya akhirnya menekan "Blokir".',
      next: 'n_cb3_panic2',
    },
    n_cb3_panic2: {
      id: 'n_cb3_panic2',
      speaker: 'narration',
      text:
        'Setelah beberapa detik duduk diam mengumpulkan keberanian, Dara berdiri dan pergi ke ruang tamu. ' +
        '"Bu... ada yang mau aku ceritakan." — Keputusan tepat, meski terlambat sedikit.',
      next: 'n_cb4_pesan_terakhir',
    },

    // ============================================================
    // BAGIAN 4 — Pesan terakhir yang paling menakutkan
    // (hanya tercapai jika pemain belum memblokir dari cabang sebelumnya)
    // ============================================================
    n_cb4_pesan_terakhir: {
      id: 'n_cb4_pesan_terakhir',
      speaker: 'narration',
      text:
        'Sebelum Dara sempat menekan blokir, satu notifikasi terakhir membelah kesunyian. ' +
        'Layar HP menyala. Masih dari DM Instagram yang sama. Satu baris saja:',
      next: 'n_cb4_msg',
    },
    n_cb4_msg: {
      id: 'n_cb4_msg',
      speaker: 'bayang_kelabu',
      text:
        'Kamar kamu dingin ya malam ini? Makanya gorden jendela di samping meja belajar itu ' +
        'ditutup dong, Dara. Aku dari tadi kedinginan ngeliatin kamu dari seberang jalan.',
      next: 'n_cb4',
    },

    // ============================================================
    // TITIK CABANG 4 — Ending: siluet di luar + panggilan masuk
    // ============================================================
    n_cb4: {
      id: 'n_cb4',
      speaker: 'narration',
      text:
        'Dara memutar pandangan perlahan ke arah jendela. ' +
        'Gorden kainnya... sedikit tersingkap — celah terbuka selebar lima jari. ' +
        'Di balik lampu jalan yang berkedip redup di seberang gang, ' +
        'ada siluet berdiri tegak menghadap lurus ke jendela kamarnya. ' +
        'Ponsel bergetar kencang: PANGGILAN SUARA — Akun Anonim. ' +
        'Apa yang Dara lakukan?',
      choices: [
        {
          id: 'a',
          label: 'Tolak panggilan, tarik rapat gorden jendela, dan panggil Ayah/Ibu.',
          chatReply: null,
          emotion: 'aman',
          next: 'n_end_safe',
        },
        {
          id: 'b',
          label: 'Angkat panggilan karena panik ingin tahu siapa dia.',
          chatReply: null,
          emotion: 'takut',
          next: 'n_end_scared',
        },
        {
          id: 'c',
          label: 'Melangkah kaku mendekati jendela untuk melihat siluet itu.',
          chatReply: null,
          emotion: 'takut',
          next: 'n_end_window',
        },
      ],
    },

    // --- Ending: aman (keputusan terbaik) ---
    n_end_safe: {
      id: 'n_end_safe',
      speaker: 'narration',
      text:
        'Dara menekan "Tolak", menarik gorden hingga rapat, ' +
        'lalu berlari ke pintu kamar. "AYAH! IBU!" ' +
        'Dalam hitungan detik Ayah sudah di ambang pintu, wajahnya langsung berubah serius ' +
        'begitu melihat ekspresi Dara. "Ada apa?" ' +
        '"Ada orang di luar yang ngawasin aku dari tadi."',
      next: 'n_end_safe2',
    },
    n_end_safe2: {
      id: 'n_end_safe2',
      speaker: 'narration',
      text:
        'Ayah memeriksa ke luar dengan hati-hati. Siluet itu sudah menghilang. ' +
        'Mereka melaporkan kejadian ini ke RT setempat malam itu juga, ' +
        'dan keesokan paginya ke pihak sekolah. ' +
        'Dara merasa takut — tapi juga lega. Ia tidak menghadapi ini sendirian.',
      // node akhir
    },

    // --- Ending: mengangkat panggilan (tidak disarankan) ---
    n_end_scared: {
      id: 'n_end_scared',
      speaker: 'narration',
      text:
        'Jempolnya menekan "Angkat". Keheningan selama beberapa detik, ' +
        'lalu suara bisikan: "Aku tahu kamu bisa lihat aku kan?" ' +
        'Dara langsung mematikan panggilan, jarinya gemetar hebat.',
      next: 'n_end_scared2',
    },
    n_end_scared2: {
      id: 'n_end_scared2',
      speaker: 'narration',
      text:
        'Dara berlari ke ruang tamu dan menghambur ke pelukan Ibu sambil menangis. ' +
        'Mereka melaporkan nomor akun itu ke polisi malam itu juga. ' +
        'Pelajaran pahit: jangan pernah mengangkat panggilan dari orang asing yang mengancam — ' +
        'itu hanya memberi mereka kepuasan dan mengonfirmasi bahwa kamu ketakutan.',
      // node akhir
    },

    // --- Ending: mendekati jendela (paling berisiko) ---
    n_end_window: {
      id: 'n_end_window',
      speaker: 'narration',
      text:
        'Kaki Dara seolah bergerak sendiri menuju jendela. ' +
        'Tepat ketika tangannya menyentuh gorden — Ibu mengetuk pintu dari luar: ' +
        '"Dara, sudah larut, matiin lampunya..." Suara itu memecah ketakutannya.',
      next: 'n_end_window2',
    },
    n_end_window2: {
      id: 'n_end_window2',
      speaker: 'narration',
      text:
        'Dara menarik tangan dari gorden dan berbalik. "Bu, masuk dulu ya, ada yang penting." ' +
        'Siluet di luar menghilang begitu lampu ruang tamu menyala dan suara-suara orang tua memenuhi rumah. ' +
        'Dara selamat — tapi ia belajar: jangan pernah mendekati ancaman sendirian.',
      // node akhir
    },
  },
};
