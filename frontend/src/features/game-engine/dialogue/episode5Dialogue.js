// Naskah dialog quest NPC Kirana (Episode 5 — "Ketika Sahabat Berubah").
//
// TEMA:
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
// ALUR GAMEPLAY & CUTSCENE:
// - Dialog interaksi terjadi di taman sekolah (gameplay scene) dengan pilihan respons pembuka (n_icebreak)
//   dan penentuan tindakan (n_action).
// - Pilihan penentuan tindakan (n_action) langsung mengarahkan ke CUTSCENE sinematik (cutsceneA, cutsceneB,
//   cutsceneC, cutsceneD) yang MURNI NARATIF & DIALOG tanpa opsi pilihan jawaban, selaras dengan Episode 1 dan 4.

// --- Dialog kunjungan ULANG (revisit) --------------------------------
const EPISODE5_REVISIT_LINES = [
  '"Makasih banyak ya, {PLAYER_NAME}... berada di dekat kamu bikin duniaku terasa jauh lebih aman."',
  '"Bu Ratih baik banget ya. Sekarang perasaanku jauh lebih plong setelah dapat pendampingan di ruang BK."',
  '"Sore ini kita nunggu bus bareng lagi di halte ya? Duduk berdua sama kamu rasanya adem banget."',
  '"Aku lagi belajar untuk berani menetapkan batas dan gak membiarkan siapa pun menyakitiku lagi."',
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
        text: '"{PLAYER_NAME}, ada yang ingin kamu bicarakan lagi denganku?"',
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
  n_action: 'Kirana menceritakan kekerasan yang dialaminya dan bingung harus melangkah ke mana',
  n_threat: 'ponsel Kirana bergetar bertubi-tubi oleh pesan teks ancaman dan kontrol yang membuatnya panik gemetar',
  n_confession: 'Kirana mencurahkan bahwa orang dekatnya sering mengontrol, membentak, dan mencengkeram tangannya jika menolak',
  // Backward compatibility:
  n3: 'aku mendekati Kirana yang menyendiri di bangku taman dan mengajaknya mengobrol santai untuk membuka ruang aman',
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
    // ================================================================
    // BAGIAN 1: PERCAKAPAN DI TAMAN SEKOLAH (GAMEPLAY SCENE)
    // ================================================================
    n1: {
      id: 'n1',
      speaker: 'narration',
      text: 'Sepulang kelas, kamu menemukan Kirana duduk sendiri di bangku taman sekolah yang teduh. Angin sore berhembus lembut menggugurkan beberapa helai dedaunan pohon beringin.',
      next: 'n1_approach',
    },
    n1_approach: {
      id: 'n1_approach',
      speaker: 'narration',
      text: 'Mendengar langkah kakimu mendekat, Kirana buru-buru menyembunyikan ponselnya ke dalam saku roknya dan menundukkan kepalanya.',
      next: 'n1b',
    },
    n1b: {
      id: 'n1b',
      speaker: 'kirana',
      text: '"E-eh, kamu mencariku, {PLAYER_NAME}? Aku cuma lagi capek saja kok... Tidak ada apa-apa."',
      dynamic: true,
      situationHint:
        'Aku Kirana, sahabat Sekar. Belakangan aku menarik diri dan cemas. Sekar menemuiku di taman. Aku belum siap bercerita sehingga bilang hanya lelah.',
      next: 'n1c',
    },
    n1c: {
      id: 'n1c',
      speaker: 'narration',
      text: 'Kamu duduk di samping Kirana di bangku kayu taman, lalu menyodorkan sekotak susu dingin dan sepotong roti manis untuk mencairkan ketegangan.',
      next: 'n_icebreak',
    },

    // --- TITIK CABANG 1: MEMBUKA RUANG AMAN DI TAMAN SEKOLAH ---
    n_icebreak: {
      id: 'n_icebreak',
      speaker: 'narration',
      text: 'Kirana menatap minuman itu dengan ragu. Bagaimana {PLAYER_NAME} membuka percakapan?',
      choices: [
        {
          id: 'a',
          label: '"Hai Ran, duduk santai yuk. Ini susu buat kamu. Aku selalu ada kalau kamu mau cerita."',
          emotion: 'aman',
          next: 'n_icebreak_res_a',
        },
        {
          id: 'b',
          label: '"Belakangan ini sering melamun, ada masalah kah? Kalau butuh teman cerita, kabari ya."',
          emotion: 'netral',
          next: 'n_icebreak_res_b',
        },
        {
          id: 'c',
          label: '"Kamu jelas menyembunyikan sesuatu. Kenapa rahasia-rahasiaan dan menjauh dariku gini?"',
          emotion: 'menyinggung',
          next: 'n_icebreak_res_c',
        },
      ],
    },

    n_icebreak_res_a: {
      id: 'n_icebreak_res_a',
      speaker: 'kirana',
      text: '"Makasih banyak ya, {PLAYER_NAME}... Duduk berdua sama kamu rasanya bikin kepalaku sedikit lebih adem."',
      dynamic: true,
      situationHint: 'Aku menawarkan ruang santai tanpa memaksa, membuat Kirana merasa aman dan dihargai.',
      next: 'n2_shift',
    },
    n_icebreak_res_b: {
      id: 'n_icebreak_res_b',
      speaker: 'kirana',
      text: '"Makasih sudah peduli... Aku belum tahu harus mulai cerita dari mana, tapi jangan pergi dulu ya."',
      dynamic: true,
      situationHint: 'Aku bertanya secara umum, Kirana menjawab sopan namun meminta ditemani sebentar.',
      next: 'n2_shift',
    },
    n_icebreak_res_c: {
      id: 'n_icebreak_res_c',
      speaker: 'kirana',
      text: '"Aku tidak bermaksud begitu... Aku cuma takut kalau kamu tahu, kamu juga bakal menyalahkanku."',
      dynamic: true,
      situationHint: 'Aku mendesak Kirana, membuatnya merasa tersudut dan takut disalahkan.',
      next: 'n2_shift',
    },
    n_icebreak_res_d: {
      id: 'n_icebreak_res_d',
      speaker: 'kirana',
      text: '"Maaf ya, {PLAYER_NAME}... Aku sama sekali tidak bermaksud menjauhimu. Aku cuma lagi takut banget sama diriku sendiri."',
      dynamic: true,
      situationHint: 'Aku mengeluhkan sikapnya yang menjauh, membuat Kirana merasa menjadi beban teman.',
      next: 'n2_shift',
    },

    // --- ESKALASI SITUASI & CURAHAN HATI DI TAMAN SEKOLAH ---
    n2_shift: {
      id: 'n2_shift',
      speaker: 'narration',
      text: 'Suasana taman kembali hening sejenak, ditemani desau angin sore di dedaunan. Namun ketenangan itu mendadak pecah...',
      next: 'n2_threat',
    },
    n2_threat: {
      id: 'n2_threat',
      speaker: 'narration',
      text: 'Bzzzt! Bzzzt! Bzzzt! Ponsel di saku Kirana bergetar keras tanpa henti. Di layar yang menyala, rentetan pesan teks masuk bertubi-tubi dengan kata-kata penuh amarah, tuntutan posesif, dan ancaman. Kirana panik gemetar hebat sampai kotak susunya terjatuh ke tanah.',
      next: 'n2_mark',
    },
    n2_mark: {
      id: 'n2_mark',
      speaker: 'narration',
      text: 'Saat tangannya bergerak panik mencoba mematikan layar ponsel, lengan seragam Kirana tersingkap—tampak jelas bekas cengkeraman kemerahan yang membiru di pergelangan tangannya!',
      next: 'n3_confession',
    },
    n3_confession: {
      id: 'n3_confession',
      speaker: 'kirana',
      text: '"Orang yang dekat denganku sering memeriksa isi ponselku, melarangku berteman sama siapa pun, dan membentakku di depan umum. Kemarin tanganku dicengkeram saat aku menolak permintaannya... Dia mengancam aku bakal menyesal seumur hidup kalau berani cerita ke siapa pun."',
      dynamic: true,
      situationHint:
        'Aku akhirnya memberanikan diri membuka tanda kekerasan dan kontrol posesif dari seseorang yang dekat denganku: ponsel diperiksa, dibentak, tangan dicengkeram, dan diancam agar diam.',
      next: 'n4_plea',
    },
    n4_plea: {
      id: 'n4_plea',
      speaker: 'kirana',
      text: '"Bel sekolah sudah berbunyi... Koridor mulai sepi. Aku bingung harus melangkah ke mana, {PLAYER_NAME}... Aku takut kalau melapor, dia makin nekat mencelakaiku. Aku harus bagaimana?"',
      dynamic: true,
      situationHint:
        'Aku bingung dan ketakutan akan keselamatan diriku. Aku meminta pendapat dan perlindungan dari sahabatku Sekar.',
      next: 'n_action',
    },

    // --- TITIK CABANG 2: PENENTUAN TINDAKAN DUKUNGAN (MENGARAH KE CUTSCENE) ---
    n_action: {
      id: 'n_action',
      speaker: 'narration',
      text: 'Kirana dilanda ketakutan mendalam dan kebingungan. Langkah apa yang ditawarkan {PLAYER_NAME} untuk mendampingi dan melindungi sahabatmu?',
      choices: [
        {
          id: 'a',
          label: '"Ini bukan salahmu, Ran. Ayo temui Bu Ratih di ruang BK sekarang, aku dampingi kamu."',
          emotion: 'aman',
          next: 'cutsceneA1',
        },
        {
          id: 'b',
          label: '"Tarik napas dulu, Ran. Kita istirahat di halte sore ini. Besok kalau sudah siap, kita temui Bu Ratih bareng-bareng."',
          emotion: 'netral',
          next: 'cutsceneB1',
        },
        {
          id: 'c',
          label: '"Kurang ajar! Kasih tahu siapa namanya, biar kulabrak dan kuhajar dia sekarang juga!"',
          emotion: 'marah',
          next: 'cutsceneC1',
        },
      ],
    },

    // ================================================================
    // BAGIAN 2: CUTSCENE SINEMATIK LAYAR PENUH (TANPA OPSI PILIHAN JAWABAN)
    // ================================================================

    // --- CABANG A: ASENTIF & DUKUNGAN AMAN (RUANG BK BU RATIH & HALTE SENJA) ---
    cutsceneA1: {
      id: 'cutsceneA1',
      speaker: 'narration',
      text: 'Kata-katamu yang mantap menembus kabut kepanikan di dada Kirana. Kamu menggenggam tangannya yang dingin, lalu bersama-sama melangkah menuju Ruang Bimbingan Konseling (BK) di lantai dasar.',
      next: 'cutsceneA2',
    },
    cutsceneA2: {
      id: 'cutsceneA2',
      speaker: 'narration',
      text: 'Di dalam Ruang BK yang teduh dan tenang, Bu Ratih menyambut kalian berdua dengan pelukan hangat. Beliau mendengarkan setiap rincian cerita Kirana dengan penuh empati tanpa sedikit pun menyalahkan korban.',
      next: 'cutsceneA3',
    },
    cutsceneA3: {
      id: 'cutsceneA3',
      speaker: 'kirana',
      text: '"Terima kasih banyak sudah mendampingiku, {PLAYER_NAME}... Bu Ratih berjanji akan menjamin keamananku di sekolah dan memanggil orang tuaku dengan cara yang aman. Beban berat di dadaku rasanya terangkat."',
      dynamic: true,
      situationHint: 'Sekar mendampingiku menemui Bu Ratih di Ruang BK. Aku merasa sangat lega dan terlindungi.',
      next: 'cutsceneA4',
    },
    cutsceneA4: {
      id: 'cutsceneA4',
      speaker: 'narration',
      text: 'Sepulang dari Ruang BK, langit barat berubah menjadi lembayung senja yang memesona. Duduk berdua di halte bus sekolah, Kirana menyandarkan kepalanya ke bahumu dalam kehangatan persahabatan yang aman.',
      next: 'cutsceneA5',
    },
    cutsceneA5: {
      id: 'cutsceneA5',
      speaker: 'kirana',
      text: '"Berada di dekatmu bikin duniaku tidak menakutkan lagi. Aku bangga dan bersyukur punya sahabat sebaik kamu, {PLAYER_NAME}."',
      dynamic: true,
      situationHint: 'Kami duduk berdua di halte senja dalam rasa aman dan ikatan persahabatan sejati.',
      next: 'n8a',
    },
    n8a: {
      id: 'n8a',
      speaker: 'narration',
      text: 'Kamu berhasil menjadi teman sebaya yang suportif: tidak membiarkan korban sendirian, tidak melakukan konfrontasi gegabah, dan menghubungkannya dengan pihak tepercaya yang mampu memberi perlindungan nyata.',
    },

    // --- CABANG B: NETRAL (ISTIRAHAT DI HALTE BUS & BERI WAKTU SEBELUM MELAPOR) ---
    cutsceneB1: {
      id: 'cutsceneB1',
      speaker: 'narration',
      text: 'Kamu menepuk lembut pundak Kirana dan mengajaknya berjalan keluar gerbang sekolah menuju halte bus di tepi jalan raya.',
      next: 'cutsceneB2',
    },
    cutsceneB2: {
      id: 'cutsceneB2',
      speaker: 'narration',
      text: 'Angin sore berhembus menyejukkan. Kalian berdua duduk di bangku kayu halte di bawah sinar temaram senja, memberi Kirana ruang aman untuk menenangkan debaran jantungnya.',
      next: 'cutsceneB3',
    },
    cutsceneB3: {
      id: 'cutsceneB3',
      speaker: 'kirana',
      text: '"Makasih banyak ya sudah mau mengerti dan tidak memaksaku buru-buru, {PLAYER_NAME}. Duduk di sini bikin kepalaku lebih tenang. Besok... temani aku ke ruang Bu Ratih ya."',
      dynamic: true,
      situationHint: 'Sekar memberiku waktu menenangkan diri di halte bus senja. Aku berjanji akan ke Ruang BK besok jika ditemani.',
      next: 'cutsceneB4',
    },
    cutsceneB4: {
      id: 'cutsceneB4',
      speaker: 'narration',
      text: 'Memberikan ruang bernapas dan validasi emosi adalah langkah awal yang baik. Namun pendampingan kepada orang dewasa tepercaya tetap harus segera diwujudkan agar keselamatan korban terjamin.',
      next: 'n8b',
    },
    n8b: {
      id: 'n8b',
      speaker: 'narration',
      text: 'Mendengarkan kesiapan korban penting, tetapi jangan tunda mencari bantuan aman ketika ada tanda-tanda ancaman fisik yang membahayakan sahabatmu.',
    },

    // --- CABANG C: AGRESIF / MARAH (BAHAYA MELABRAK PELAKU SENDIRIAN) ---
    cutsceneC1: {
      id: 'cutsceneC1',
      speaker: 'narration',
      text: 'Mendengar kamu tersulut emosi dan hendak melabrak pelaku, Kirana seketika panik luar biasa. Ia mencengkeram lenganmu erat-erat dengan mata membelalak ketakutan.',
      next: 'cutsceneC2',
    },
    cutsceneC2: {
      id: 'cutsceneC2',
      speaker: 'kirana',
      text: '"Jangan, kumohon jangan, {PLAYER_NAME}! Kalau kamu labrak dia tanpa rencana, dia bakal makin gelap mata dan melampiaskan dendamnya ke aku! Kamu gak tahu seberapa berbahayanya dia!"',
      dynamic: true,
      situationHint: 'Sekar berniat melabrak pelaku. Aku panik luar biasa dan memohonnya berhenti karena konfrontasi gegabah justru membahayakan korban.',
      next: 'cutsceneC3',
    },
    cutsceneC3: {
      id: 'cutsceneC3',
      speaker: 'narration',
      text: 'Kamu tertegun dan menarik napas panjang. Kemarahanmu datang dari rasa peduli, tetapi konfrontasi gegabah justru menempatkan korban dalam risiko bahaya yang jauh lebih besar dan merampas kendali dirinya.',
      next: 'cutsceneC4',
    },
    cutsceneC4: {
      id: 'cutsceneC4',
      speaker: 'narration',
      text: 'Melindungi sahabat bukan dengan cara menjadi pahlawan yang main hakim sendiri, melainkan mendengarkan kebutuhan korban dan mencari perlindungan bersama pihak berwenang tepercaya.',
      next: 'n8c',
    },
    n8c: {
      id: 'n8c',
      speaker: 'narration',
      text: 'Konfrontasi tanpa rencana pengamanan dapat memperburuk eskalasi kekerasan. Utamakan selalu keselamatan dan persetujuan korban sebelum mengambil tindakan.',
    },

    // --- CABANG D: PASIF / MENYERAH (BAHAYA MEMBIARKAN KEKERASAN) ---
    cutsceneD1: {
      id: 'cutsceneD1',
      speaker: 'narration',
      text: 'Kirana tertunduk lesu di bangku taman. Air matanya menetes perlahan membasahi ujung rok seragamnya, kehilangan secercah harapan yang sempat menyala.',
      next: 'cutsceneD2',
    },
    cutsceneD2: {
      id: 'cutsceneD2',
      speaker: 'kirana',
      text: '"Iya... mungkin memang nasibku harus terus pasrah dan takut seperti ini seumur hidup..."',
      dynamic: true,
      situationHint: 'Sekar menyarankanku untuk pasrah dan menuruti pelaku. Aku merasa kehilangan harapan dan putus asa.',
      next: 'cutsceneD3',
    },
    cutsceneD3: {
      id: 'cutsceneD3',
      speaker: 'narration',
      text: 'Menatap sahabatmu yang putus asa membuat hatimu sesak. Kamu menyadari bahwa menyuruh korban bersabar dan pasrah pada kekerasan hanya akan memperdalam trauma batin.',
      next: 'cutsceneD4',
    },
    cutsceneD4: {
      id: 'cutsceneD4',
      speaker: 'narration',
      text: 'Membiarkan kekerasan terus berlanjut tanpa perlawanan dan bantuan aman akan membiarkan pelaku terus berkuasa. Memutus rantai ketakutan membutuhkan keberanian mencari uluran tangan yang aman.',
      next: 'n8d',
    },
    n8d: {
      id: 'n8d',
      speaker: 'narration',
      text: 'Jangan biarkan sahabatmu menanggung kekerasan seorang diri. Selalu ada pintu bantuan yang aman di sekolah seperti guru BK dan pihak konseling.',
    },

    // --- ALIASES UNTUK BACKWARD COMPATIBILITY ---
    n3: {
      get choices() {
        return EPISODE5_DIALOGUE.nodes.n_icebreak.choices;
      },
      get text() {
        return EPISODE5_DIALOGUE.nodes.n_icebreak.text;
      },
      id: 'n3',
      speaker: 'narration',
    },
    n6: {
      get choices() {
        return EPISODE5_DIALOGUE.nodes.n_action.choices;
      },
      get text() {
        return EPISODE5_DIALOGUE.nodes.n_action.text;
      },
      id: 'n6',
      speaker: 'narration',
    },
  },
};
