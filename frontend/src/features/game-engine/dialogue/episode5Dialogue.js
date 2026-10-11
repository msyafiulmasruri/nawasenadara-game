// Naskah dialog quest NPC Kirana (Episode 5 — "Ketika Sahabat Berubah").
//
// TEMA (Berdasarkan Proposal & Alur Resmi GitHub):
// Mengidentifikasi tanda-tanda kekerasan dalam relasi/pacaran atau kontrol toxic
// pada sahabat (ponsel diperiksa, pergaulan dibatasi, dibentak, tangan dicengkeram,
// dan ancaman agar tetap diam).
//
// PEMBELAJARAN PSIKOLOGIS & ETIKA DUKUNGAN SEBAYA:
// 1. Membuka ruang aman tanpa memaksa pengakuan atau menuduh berbohong.
// 2. Memberi validasi emosi dan rasa aman (grounding), bukan menyalahkan korban (victim-blaming).
// 3. Menghubungkan korban dengan orang dewasa tepercaya (Bu Ratih di Ruang BK).
// 4. TIDAK melakukan konfrontasi gegabah/melabrak pelaku sendirian, karena konfrontasi
//    tanpa rencana justru membahayakan keselamatan korban dan merampas kendali korban.
//
// EMPAT TITIK CABANG PILIHAN DENGAN LABEL INDOBERT:
//   1. n_icebreak: Cara Dara membuka obrolan santai & mencairkan suasana di bangku taman.
//   2. n_threat: Respons Dara saat ponsel Kirana bergetar oleh pesan ancaman yang mengintimidasi.
//   3. n_confession: Merespons pengakuan perlakuan kasar dan ketakutan Kirana akan disalahkan.
//   4. n_action: Menentukan tindakan aman (ke Ruang BK Bu Ratih vs bahaya melabrak pelaku).

// --- Dialog kunjungan ULANG (revisit) --------------------------------
const EPISODE5_REVISIT_LINES = [
  'Makasih banyak ya, Dara... berada di dekat kamu bikin duniaku terasa jauh lebih aman.',
  'Bu Ratih baik banget ya. Sekarang perasaanku jauh lebih plong setelah dapat pendampingan di ruang BK.',
  'Sore ini kita nunggu bus bareng lagi di halte ya? Duduk berdua sama kamu rasanya adem banget.',
  'Aku lagi belajar untuk berani menetapkan batas dan gak membiarkan siapa pun menyakitiku lagi.',
];

let lastRevisitIndex = -1;

export function buildEpisode5RevisitDialogue() {
  let index = Math.floor(Math.random() * EPISODE5_REVISIT_LINES.length);
  if (EPISODE5_REVISIT_LINES.length > 1 && index === lastRevisitIndex) {
    index = (index + 1) % EPISODE5_REVISIT_LINES.length;
  }
  lastRevisitIndex = index;

  return {
    npcId: 'kirana',
    startNode: 'revisit_menu',
    nodes: {
      revisit_menu: {
        id: 'revisit_menu',
        speaker: 'kirana',
        text: '{PLAYER_NAME}, ada yang ingin kamu bicarakan lagi denganku?',
        choices: [
          {
            id: 'replay',
            label: '"Aku ingin mengulang percakapan kita dari awal (Ulangi Cerita)"',
            next: 'n1',
          },
          {
            id: 'chat',
            label: '"Cuma mau menyapa dan memastikan kamu baik-baik saja."',
            next: 'revisit_chat',
          },
        ],
      },
      revisit_chat: {
        id: 'revisit_chat',
        speaker: 'kirana',
        text: EPISODE5_REVISIT_LINES[index],
      },
      ...EPISODE5_DIALOGUE.nodes,
    },
  };
}

// Deskripsi situasi di tiap titik cabang untuk dirangkum ke sesi konseling Kak Dara
const CHOICE_SITUATION_TEXT = {
  n_icebreak: 'aku mendekati Kirana yang menyendiri di bangku taman dan mengajaknya mengobrol santai untuk membuka ruang aman',
  n_threat: 'ponsel Kirana bergetar bertubi-tubi oleh pesan teks ancaman dan kontrol yang membuatnya panik gemetar',
  n_confession: 'Kirana mencurahkan bahwa orang dekatnya sering mengontrol, membentak, dan mencengkeram tangannya jika menolak',
  n_action: 'Kirana bingung harus melangkah ke mana dan takut situasinya memburuk jika mencari bantuan',
  // Backward compatibility dengan versi GitHub:
  n3: 'Kirana terlihat menarik diri dan menyangkal ada masalah',
  n6: 'Kirana menceritakan perlakuan kasar dan ancaman dari orang yang dekat dengannya',
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
    'Di taman sekolah aku menemui sahabatku Kirana yang belakangan berubah menjadi pendiam dan tampak cemas karena mengalami perlakuan tidak aman dari orang dekatnya.',
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
    // --- BABAK 1: PENCAIR SUASANA & OBROLAN RINGAN DI BANGKU TAMAN ---
    n1: {
      id: 'n1',
      speaker: 'narration',
      text: 'Sepulang kelas, angin sore berhembus sejuk menerpa dedaunan pohon beringin tua. Di bangku kayu taman sekolah yang sepi, kamu melihat Kirana duduk sendirian sambil menunduk lesu.',
      next: 'n1b',
    },
    n1b: {
      id: 'n1b',
      speaker: 'kirana',
      text: 'Mendengar langkah kakimu mendekat, Kirana buru-buru memasukkan ponselnya ke dalam saku roknya. "E-eh, kamu nyari aku, {PLAYER_NAME}? Aku cuma lagi capek aja kok... Tidak ada apa-apa."',
      next: 'n1c',
    },
    n1c: {
      id: 'n1c',
      speaker: 'narration',
      text: 'Kamu duduk di samping Kirana di bangku taman yang teduh, lalu menyodorkan kotak susu dingin dan sepotong roti manis ke hadapannya untuk mencairkan ketegangan.',
      next: 'n_icebreak',
    },

    // --- TITIK CABANG 1: MEMBUKA RUANG AMAN TANPA MEMAKSA ---
    n_icebreak: {
      id: 'n_icebreak',
      speaker: 'narration',
      text: 'Kirana menatap minuman itu dengan ragu. Bagaimana {PLAYER_NAME} membuka percakapan?',
      choices: [
        {
          id: 'a',
          label: '"Minum dulu nih susunya biar seger. Aku cuma mau nemenin kamu duduk santai di sini, gak usah mikir macem-macem dulu ya."',
          emotion: 'aman',
          next: 'n_icebreak_res_a',
        },
        {
          id: 'b',
          label: '"Aku perhatiin belakangan ini kamu sering menyendiri dan melamun sepulang sekolah. Ada hal yang lagi dipikirin kah?"',
          emotion: 'netral',
          next: 'n_icebreak_res_b',
        },
        {
          id: 'c',
          label: '"Kamu jelas lagi bohong dan nyembunyiin sesuatu dari aku. Sejak kapan sih kita ada rahasia-rahasiaan?"',
          emotion: 'menyinggung',
          next: 'n_icebreak_res_c',
        },
        {
          id: 'd',
          label: '"Kamu ngejauhin aku ya, Ran? Tiap aku samperin kamu selalu buang muka dan buru-buru pergi..."',
          emotion: 'sedih',
          next: 'n_icebreak_res_d',
        },
      ],
    },

    n_icebreak_res_a: {
      id: 'n_icebreak_res_a',
      speaker: 'kirana',
      text: 'Kirana menerima kotak susu itu dengan kedua tangannya. Senyum tipis yang tulus terbit di wajahnya yang letih. "Makasih banyak ya, {PLAYER_NAME}... Duduk berdua sama kamu rasanya bikin kepalaku sedikit lebih adem."',
      dynamic: true,
      situationHint: 'Aku menawarkan ruang santai tanpa memaksa, membuat Kirana merasa aman dan dihargai.',
      next: 'n2_shift',
    },
    n_icebreak_res_b: {
      id: 'n_icebreak_res_b',
      speaker: 'kirana',
      text: 'Kirana menunduk, memainkan sedotan di tangannya. "A-aku cuma lagi banyak pikiran soal ujian aja kok... makasih udah nanyain, Ra."',
      dynamic: true,
      situationHint: 'Aku bertanya secara umum, Kirana menjawab sopan namun masih menutup diri.',
      next: 'n2_shift',
    },
    n_icebreak_res_c: {
      id: 'n_icebreak_res_c',
      speaker: 'kirana',
      text: 'Bahu Kirana seketika menegang. Matanya berkaca-kaca menatap tanah. "Aku gak bohong... aku cuma takut kamu bakal ikutan repot dan nyalahin aku kalau tahu semuanya."',
      dynamic: true,
      situationHint: 'Aku menuduh Kirana berbohong, membuatnya merasa tersudut dan tertekan.',
      next: 'n2_shift',
    },
    n_icebreak_res_d: {
      id: 'n_icebreak_res_d',
      speaker: 'kirana',
      text: 'Kirana menatapmu dengan sorot mata bersalah. "Maaf ya, {PLAYER_NAME}... aku sama sekali gak bermaksud ngejauhin kamu. Aku cuma lagi takut banget sama diriku sendiri."',
      dynamic: true,
      situationHint: 'Aku mengeluhkan sikapnya yang menjauh, membuat Kirana merasa menjadi beban teman.',
      next: 'n2_shift',
    },

    // --- BABAK 2: TEKANAN NOTIFIKASI PONSEL & TANDA KEKERASAN ---
    n2_shift: {
      id: 'n2_shift',
      speaker: 'narration',
      text: 'Suasana taman kembali hening sejenak, ditemani gemerisik dedaunan tertiup angin sore. Namun ketenangan itu mendadak pecah...',
      next: 'n2_threat_intro',
    },
    n2_threat_intro: {
      id: 'n2_threat_intro',
      speaker: 'narration',
      text: 'Bzzzt! Bzzzt! Bzzzt! Ponsel di saku Kirana bergetar keras tanpa henti. Di layar yang menyala, rentetan pesan teks masuk bertubi-tubi dengan kata-kata penuh amarah, tuntutan posesif, dan ancaman.',
      next: 'n2_threat',
    },
    n2_threat: {
      id: 'n2_threat',
      speaker: 'kirana',
      text: 'Napas Kirana tercekat. Seluruh tubuhnya gemetar hebat sampai kotak susunya terjatuh ke tanah. Saat tangannya bergerak panik mencoba mematikan layar, lengan seragamnya tersingkap—kamu melihat bekas cengkeraman kemerahan yang membekas di pergelangan tangannya!',
      next: 'n_threat',
    },

    // --- TITIK CABANG 2: MERESPONS KEPANIKAN & ANCAMAN PESAN ---
    n_threat: {
      id: 'n_threat',
      speaker: 'narration',
      text: 'Kirana dilanda serangan cemas hebat (panic spike) melihat rentetan pesan itu. Apa yang dilakukan {PLAYER_NAME}?',
      choices: [
        {
          id: 'a',
          label: '"Tarik napas pelan-pelan, Ran. Matikan dulu layarnya dan lihat aku. Kamu aman di sini sama aku, jangan takut."',
          emotion: 'aman',
          next: 'n_threat_res_a',
        },
        {
          id: 'b',
          label: '"Kurang ajar banget orang ini! Siniin HP kamu, biar aku yang balas chat-nya dan maki-maki dia sekarang juga!"',
          emotion: 'marah',
          next: 'n_threat_res_b',
        },
        {
          id: 'c',
          label: '"Ya ampun... kata-katanya kasar dan ngeri banget, Ran. Aku jadi ikut merinding lihatnya..."',
          emotion: 'takut',
          next: 'n_threat_res_c',
        },
        {
          id: 'd',
          label: '"Kenapa gak langsung kamu blokir aja sih nomornya? Gak usah lebay sampai gemeteran gitu dong."',
          emotion: 'menyinggung',
          next: 'n_threat_res_d',
        },
      ],
    },

    n_threat_res_a: {
      id: 'n_threat_res_a',
      speaker: 'kirana',
      text: 'Kamu menggenggam tangannya yang dingin dan meletakkan tanganmu di pundaknya. Kirana menatap matamu yang teduh, perlahan mengikuti ritme napasmu hingga debaran jantungnya mereda. "...Makasih, {PLAYER_NAME}. Tadi duniaku rasanya runtuh seketika."',
      dynamic: true,
      situationHint: 'Aku menerapkan teknik grounding dan menenangkan kepanikan Kirana dengan rasa aman.',
      next: 'n3_memory_intro',
    },
    n_threat_res_b: {
      id: 'n_threat_res_b',
      speaker: 'kirana',
      text: 'Kirana cepat-cepat menarik ponselnya ke dadanya dengan wajah pucat ketakutan. "Jangan, tolong jangan! Kalau kamu balas kasar, dia bakal makin marah dan nekat datangin aku ke sini!"',
      dynamic: true,
      situationHint: 'Aku bereaksi agresif ingin membalas pelaku, membuat Kirana semakin panik dan ketakutan.',
      next: 'n3_memory_intro',
    },
    n_threat_res_c: {
      id: 'n_threat_res_c',
      speaker: 'kirana',
      text: 'Kirana memeluk lututnya sendiri, menggigil di bangku taman. "Iya... tiap dengar getaran HP ini, rasanya tenggorokanku tercekik..."',
      dynamic: true,
      situationHint: 'Aku menunjukkan rasa takut yang sama, membuat Kirana semakin larut dalam kecemasannya.',
      next: 'n3_memory_intro',
    },
    n_threat_res_d: {
      id: 'n_threat_res_d',
      speaker: 'kirana',
      text: 'Air mata Kirana menetes deras ke pipinya. "Kalau semudah itu memblokirnya, aku udah lakuin dari dulu, Ra... Kamu gak tahu seberapa menakutkannya ancaman dia..."',
      dynamic: true,
      situationHint: 'Aku meremehkan ketakutan korban, membuat Kirana merasa tidak dipahami.',
      next: 'n3_memory_intro',
    },

    // --- BABAK 3: FLASHBACK MEMORI & CURAHAN HATI KEJURUAN ---
    n3_memory_intro: {
      id: 'n3_memory_intro',
      speaker: 'kirana',
      text: 'Kirana menyeka air matanya dengan ujung lengan seragam. Matanya menatap sayu ke arah jendela perpustakaan sekolah di seberang lapangan. "Aku kangen masa-masa dulu, {PLAYER_NAME}... waktu kita masih sering ketawa bareng tanpa ada beban."',
      next: 'n3_memory',
    },
    n3_memory: {
      id: 'n3_memory',
      speaker: 'narration',
      text: 'Kilas balik memori terlintas di benak kalian berdua: Duduk berdua di meja kayu perpustakaan yang hangat, membaca komik, belajar bersama, dan saling melempar lelucon konyol di bawah sinar matahari sore. Sebelum sosok itu datang merenggut semua kebebasan dan senyum Kirana.',
      next: 'n3_confession',
    },
    n3_confession: {
      id: 'n3_confession',
      speaker: 'kirana',
      text: 'Dengan suara bergetar menahan tangis, Kirana akhirnya membuka suara: "Orang yang dekat denganku sering memeriksa isi ponselku, melarangku berteman sama siapa pun, dan membentakku di tempat umum. Kemarin tanganku dicengkeram kuat banget waktu aku menolak permintaannya... Dia bilang aku bakal menyesal seumur hidup kalau berani cerita ke siapa pun. Aku harus bagaimana, Dara?"',
      next: 'n_confession',
    },

    // --- TITIK CABANG 3: MERESPONS PENGAKUAN KEKERASAN ---
    n_confession: {
      id: 'n_confession',
      speaker: 'narration',
      text: 'Kirana telah memberanikan diri mengungkap kekerasan relasi yang dialaminya. Bagaimana {PLAYER_NAME} merespons curahan hatinya?',
      choices: [
        {
          id: 'a',
          label: '"Dengar aku, Kirana. Ini sama sekali BUKAN salahmu. Tidak ada seorang pun yang berhak memperlakukanmu sekasar itu. Kamu sangat berharga."',
          emotion: 'aman',
          next: 'n_confession_res_a',
        },
        {
          id: 'b',
          label: '"Terima kasih banyak sudah mau berani jujur dan cerita ke aku, Ran. Rahasia ini bakal aman di antara kita."',
          emotion: 'netral',
          next: 'n_confession_res_b',
        },
        {
          id: 'c',
          label: '"Hati aku sakit banget dengarnya, Ran... kenapa kamu harus menanggung beban seberat dan seseram ini sendirian?"',
          emotion: 'sedih',
          next: 'n_confession_res_c',
        },
        {
          id: 'd',
          label: '"Kenapa kamu bisa tahan sih sama orang toksik kayak gitu? Harusnya dari awal kamu putusin dan jauhin dia!"',
          emotion: 'menyinggung',
          next: 'n_confession_res_d',
        },
      ],
    },

    n_confession_res_a: {
      id: 'n_confession_res_a',
      speaker: 'kirana',
      text: 'Kirana menatap matamu lama, lalu tangisnya pecah di pundakmu. Kata-katamu membebaskannya dari belenggu rasa bersalah yang selama ini mengurung jiwanya. "Makasih, {PLAYER_NAME}... Selama ini dia selalu bilang kalau semua ini salahku karena gak bisa jadi pacar yang penurut..."',
      dynamic: true,
      situationHint: 'Aku menegaskan bahwa kekerasan ini bukan salah korban, memulihkan harga diri Kirana.',
      next: 'n4_bell',
    },
    n_confession_res_b: {
      id: 'n_confession_res_b',
      speaker: 'kirana',
      text: 'Kirana mengangguk pelan. "Makasih sudah mau mendengarkan, Ra... Beban di dadaku rasanya sedikit terangkat."',
      dynamic: true,
      situationHint: 'Aku menerima ceritanya secara netral dan menjaga kerahasiaannya.',
      next: 'n4_bell',
    },
    n_confession_res_c: {
      id: 'n_confession_res_c',
      speaker: 'kirana',
      text: 'Kirana meremas roknya erat-erat. "Aku takut banget bikin orang lain ikut cemas... makanya aku tahan semuanya sendirian..."',
      dynamic: true,
      situationHint: 'Aku merespons dengan kesedihan mendalam, Kirana merasa telah menyusahkan sahabatnya.',
      next: 'n4_bell',
    },
    n_confession_res_d: {
      id: 'n_confession_res_d',
      speaker: 'kirana',
      text: 'Kirana tersentak dan menarik dirinya mundur. Sorot matanya terluka. "Kamu pikir aku mau hidup kayak gini? Dia mengancam akan menghancurkan reputasiku dan keluargaku kalau aku pergi..."',
      dynamic: true,
      situationHint: 'Aku menyalahkan korban kenapa tidak pergi dari dulu, membuat Kirana merasa dihakimi.',
      next: 'n4_bell',
    },

    // --- BABAK 4: TITIK BALIK — RUANG BK BU RATIH VS BAHAYA MELABRAK ---
    n4_bell: {
      id: 'n4_bell',
      speaker: 'narration',
      text: 'Teng... nong... teng... Suara bel sekolah berbunyi dari pengeras suara, menandakan jam kepulangan telah tiba dan koridor mulai sepi. Kirana menatapmu dengan mata memohon: "Aku bingung harus melangkah ke mana, Ra... Aku takut kalau melapor, dia makin nekat."',
      next: 'n4_bk_intro',
    },
    n4_bk_intro: {
      id: 'n4_bk_intro',
      speaker: 'narration',
      text: 'Di lantai dasar gedung sekolah, ada Ruang Bimbingan Konseling (BK). Di sana ada Bu Ratih, guru BK yang selalu mendengarkan tanpa menghakimi, menjaga kerahasiaan siswa, dan punya wewenang untuk memberi perlindungan nyata.',
      next: 'n_action',
    },

    // --- TITIK CABANG 4: MENGAMBIL TINDAKAN AMAN ---
    n_action: {
      id: 'n_action',
      speaker: 'narration',
      text: 'Langkah apa yang ditawarkan {PLAYER_NAME} untuk melindungi dan mendampingi Kirana?',
      choices: [
        {
          id: 'a',
          label: '"Kita pastikan keselamatanmu dulu. Ayo kita temui Bu Ratih di ruang BK sekarang, aku akan genggam tanganmu dan dampingi sampai selesai."',
          emotion: 'aman',
          next: 'n_action_res_a',
        },
        {
          id: 'b',
          label: '"Kalau kamu belum sanggup cerita hari ini, kita pulang bareng dulu ke halte. Nanti kalau kamu sudah siap, baru kita temui Bu Ratih bersama."',
          emotion: 'netral',
          next: 'n_action_res_b',
        },
        {
          id: 'c',
          label: '"Kasih tahu siapa nama orangnya! Biar aku labrak dan hajar dia sekarang juga di depan gerbang sekolah!"',
          emotion: 'marah',
          next: 'n_action_res_c',
        },
        {
          id: 'd',
          label: '"Mungkin mending kamu jangan cari masalah dulu deh, turuti aja maunya daripada dia makin nekat..."',
          emotion: 'takut',
          next: 'n_action_res_d',
        },
      ],
    },

    n_action_res_a: {
      id: 'n_action_res_a',
      speaker: 'kirana',
      text: 'Kirana menatap matamu lekat-lekat. Ketakutan di wajahnya perlahan berganti menjadi secercah keberanian yang kokoh. "Iya, {PLAYER_NAME}... temani aku ya. Bu Ratih orang baik, aku percaya sama beliau. Selama ada kamu di sampingku, aku siap melangkah."',
      dynamic: true,
      situationHint: 'Aku menawarkan pendampingan aman ke Bu Ratih di Ruang BK. Kirana merasa berani dan terlindungi.',
      next: 'n5_halte',
    },
    n_action_res_b: {
      id: 'n_action_res_b',
      speaker: 'kirana',
      text: 'Kirana menghela napas lega. "Makasih banyak ya, Ra... Duduk di halte sore bareng kamu sampai jemputanku datang kayaknya bakal bikin kepalaku lebih tenang."',
      dynamic: true,
      situationHint: 'Aku menemani Kirana beristirahat ke halte tanpa memaksanya langsung melapor hari ini.',
      next: 'n5_halte_neutral',
    },
    n_action_res_c: {
      id: 'n_action_res_c',
      speaker: 'kirana',
      text: 'Kirana panik dan memegang erat pergelangan tanganmu. "Jangan, kumohon jangan! Kalau kamu labrak dia, dia bakal makin gelap mata dan dendam ke aku! Masalah ini gak bisa diselesaikan pakai kekerasan baru!"',
      dynamic: true,
      situationHint: 'Aku ingin melabrak pelaku sendirian, Kirana panik mengingatkan bahwa konfrontasi gegabah justru membahayakan korban.',
      next: 'n5_outro_confront',
    },
    n_action_res_d: {
      id: 'n_action_res_d',
      speaker: 'kirana',
      text: 'Kirana tertunduk lesu menatap sepatunya. "Iya... mungkin memang nasibku harus terus pasrah dan takut kayak gini seumur hidup..." gumamnya lirih.',
      dynamic: true,
      situationHint: 'Aku menyuruh Kirana pasrah pada pelaku, membuatnya kehilangan harapan untuk lepas dari jeratan kekerasan.',
      next: 'n5_outro_passive',
    },

    // --- BABAK 5: HALTE SEPULANG SEKOLAH DI UJUNG SENJA ---
    n5_halte: {
      id: 'n5_halte',
      speaker: 'narration',
      text: 'Setelah pembicaraan yang menghangatkan hati bersama Bu Ratih di Ruang BK—di mana pihak sekolah berjanji akan menjamin keamanan Kirana dan memanggil pihak terkait—kalian berdua melangkah keluar gerbang menuju halte bus di tepi jalan raya.',
      next: 'n5_outro',
    },
    n5_outro: {
      id: 'n5_outro',
      speaker: 'kirana',
      text: 'Duduk berdua di bangku kayu halte di bawah sinar temaram lampu jalan dan langit lembayung senja yang memesona, Kirana menyandarkan kepalanya pelan ke bahumu. "Makasih banyak ya, {PLAYER_NAME}... untuk pertama kalinya setelah sekian lama, aku merasa duniaku gak menakutkan lagi. Aku punya sahabat terbaik di dunia."',
      dynamic: true,
      situationHint: 'Kami duduk bersama di halte senja dalam kehangatan persahabatan sejati setelah berhasil mencari perlindungan ke Ruang BK.',
    },

    n5_halte_neutral: {
      id: 'n5_halte_neutral',
      speaker: 'narration',
      text: 'Kalian berdua berjalan keluar sekolah menuju halte bus. Senja membentang indah di langit barat, menemani obrolan kalian berdua menunggu jemputan tiba.',
      next: 'n5_outro_neutral',
    },
    n5_outro_neutral: {
      id: 'n5_outro_neutral',
      speaker: 'kirana',
      text: 'Kirana tersenyum tipis sambil melambaikan tangan saat mobil jemputannya tiba di halte. "Makasih sudah nemenin aku sore ini ya, Ra. Besok... temani aku ke ruang Bu Ratih ya."',
    },

    n5_outro_confront: {
      id: 'n5_outro_confront',
      speaker: 'narration',
      text: 'Kamu menyadari bahwa kepedulian yang diungkapkan dengan emosi melabrak tanpa rencana justru bisa menempatkan korban dalam bahaya yang lebih besar. Melibatkan orang dewasa tepercaya dan mendengarkan kesiapan korban adalah langkah paling bijak.',
    },

    n5_outro_passive: {
      id: 'n5_outro_passive',
      speaker: 'narration',
      text: 'Membiarkan kekerasan terus berlanjut tanpa perlawanan dan bantuan aman hanya akan memperdalam luka batin. Kirana membutuhkan uluran tangan yang berani untuk memutus rantai ketakutan ini.',
    },
  },
};
