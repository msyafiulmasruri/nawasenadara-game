// Naskah dialog DRAFT Episode 2 — "Rahasia di Grup Kelas".
//
// STATUS: baru naskah dialog saja (belum ada Episode2Scene/background —
// lihat config/episodes.js, episode 2 masih sceneKey
// 'PlaceholderEpisodeScene'). Begitu background & Episode2Scene khusus
// dibuat nanti (meniru pola Episode1Scene.js), file ini tinggal
// di-import & dipakai persis seperti EPISODE1_DIALOGUE dipakai di
// Episode1Scene.
//
// NPC: sengaja masih pakai Rafi (sama persis dengan Episode 1, lihat
// config/npcs.js) sebagai PERCOBAAN sementara — bukan side karakter
// baru untuk episode ini. Kalau nanti episode ini punya NPC sendiri,
// tinggal ganti npcId/nama di sini + tambah entri baru di
// config/npcs.js (id 2), tanpa perlu ubah struktur dialog di bawah.
//
// Konsep map & objek sesuai arahan (untuk dipakai Episode2Scene nanti):
//   - Map: kelas yang sama dengan Episode 1, waktu istirahat.
//   - Objek baru "HP di meja": nanti membuka OVERLAY UI chat grup
//     (bukan pindah scene) — di draft dialog ini, isi chat itu
//     sementara direpresentasikan lewat node `speaker: 'narration'`
//     (lihat n1b) sampai overlay UI-nya sungguhan dibuat.
//   - "Diving": kalau pemain pilih opsi "membantu" di titik cabang
//     pertama (n2), alur masuk ke node n3a yang menggambarkan pemain
//     memasuki ruang abstrak merepresentasikan perasaan korban bully
//     (Kirana) — juga masih narasi teks murni untuk sekarang, nanti
//     bisa digantikan efek visual/scene transisi sungguhan.
//
// Skema node & `emotion` SAMA PERSIS dengan episode1Dialogue.js (lihat
// catatan lengkap di file itu) — 6 label emosi yang sama, dipakai
// utils/emotionEnding.js untuk menghitung ending true/good/bad. Node
// balasan Rafi yang sudah diplot juga ditandai `dynamic: true` +
// `situationHint` supaya nanti di-generate ulang redaksinya lewat Gen
// AI (lihat DialogueBox._requestDynamicLine), sama seperti Episode 1.

const CHOICE_SITUATION_TEXT = {
  n2: 'aku baru baca isi grup chat kelas yang isinya bully-an ke Kirana, terus Rafi nanya gimana reaksiku',
  n4a: 'aku sudah masuk ke titik cabang kedua soal cara membantu Kirana setelah tadi milih untuk bantu',
};

/**
 * Mengikuti pola buildEpisode1CounselingContext() — merangkai ringkasan
 * obrolan quest Rafi episode ini jadi satu pesan pembuka natural untuk
 * dikirim otomatis ke Kak Dara begitu pemain membuka chatbot setelah
 * quest selesai.
 *
 * @param {Array<{nodeId: string, choiceId: string}>} choices
 * @returns {string|null}
 */
export function buildEpisode2CounselingContext(choices) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const parts = [
    'Barusan aku lihat isi grup chat kelas — ada yang nge-bully Kirana di sana, dan aku sempat ngobrolin ini sama Rafi.',
  ];

  choices.forEach(({ nodeId, choiceId }) => {
    const node = EPISODE2_DIALOGUE.nodes[nodeId];
    const situation = CHOICE_SITUATION_TEXT[nodeId];
    const chosen = node?.choices?.find((c) => c.id === choiceId);
    if (!situation || !chosen) return;
    const replyText = chosen.label.replace(/^"|"$/g, '').replace(/\s*\(diucapkan.*\)$/, '');
    parts.push(`Waktu itu ${situation}. Aku jawab: "${replyText}"`);
  });

  return parts.join(' ');
}

export const EPISODE2_DIALOGUE = {
  npcId: 'rafi',
  startNode: 'n1',
  nodes: {
    n1: {
      id: 'n1',
      speaker: 'rafi',
      text: 'Eh, HP gue bunyi terus dari tadi... grup kelas rame banget, coba deh liat ini.',
      next: 'n1b',
    },
    // Representasi sementara overlay chat grup (belum ada UI sungguhan
    // — lihat catatan di atas file ini). Ditulis sebagai narasi supaya
    // tetap jelas dibaca walau belum ada komponen chat bubble.
    n1b: {
      id: 'n1b',
      speaker: 'narration',
      text:
        'Layar HP Rafi menampilkan grup chat kelas. Beberapa pesan terbaru: ' +
        '"Kirana beneran aneh ya orangnya, gaya banget" — "wkwk bener, tadi di kantin diem doang kayak robot" — ' +
        '"btw jangan bilang2 dia ya, biar makin bete aja liatnya wkwk". Belasan reaksi "haha" menumpuk di bawahnya.',
      next: 'n2',
    },
    // --- Titik cabang 1 ---
    n2: {
      id: 'n2',
      speaker: 'rafi',
      text: 'Kocak ya isinya... eh tapi gimana, {PLAYER_NAME} baca juga kan? Menurut lo gimana nih?',
      dynamic: true,
      situationHint:
        'Rafi baru menunjukkan grup chat kelas yang isinya bully-an ke Kirana, dan menanggapinya santai seolah itu lucu, lalu menanyakan pendapatku.',
      choices: [
        {
          id: 'a',
          label: '"Kasian banget si Kirana, ini udah kelewatan. Kita bantu dia yuk."',
          emotion: 'aman',
          next: 'n3a',
        },
        {
          id: 'b',
          label: '"Ih serem juga isi chatnya... tapi kayaknya bukan urusan kita deh."',
          emotion: 'takut',
          next: 'n3b',
        },
        {
          id: 'c',
          label: '"Wkwk emang sih, Kirana orangnya rada aneh juga."',
          emotion: 'menyinggung',
          next: 'n3c',
        },
        {
          id: 'd',
          label: '"Ya udah biarin aja, nanti juga reda sendiri."',
          emotion: 'netral',
          next: 'n3d',
        },
      ],
    },
    // --- Cabang "membantu": diving ke ruang abstrak perasaan Kirana ---
    n3a: {
      id: 'n3a',
      speaker: 'narration',
      text:
        'Layar seketika meredup. Suara riuh kelas menghilang, digantikan gema pelan kata-kata dari chat tadi yang terus berulang. ' +
        'Di ruang abstrak ini, hanya ada satu sosok membelakangi — Kirana, dikelilingi warna kelabu yang perlahan menyempit.',
      next: 'n3a2',
    },
    n3a2: {
      id: 'n3a2',
      speaker: 'narration',
      text: 'Perlahan warna kelabu itu memudar begitu {PLAYER_NAME} melangkah mendekat. Kamu kembali ke kelas, di samping Rafi yang menunggu jawabanmu.',
      next: 'n4a',
    },
    // --- Titik cabang 2 (cara membantu) ---
    n4a: {
      id: 'n4a',
      speaker: 'rafi',
      text: 'Oke, terus mau lo apain nih? Gue ikut aja deh, terserah lo.',
      dynamic: true,
      situationHint: 'Aku baru saja memutuskan untuk membantu Kirana, dan Rafi menyerahkan keputusan langkah selanjutnya ke aku.',
      choices: [
        {
          id: 'a',
          label: '"Aku mau chat Kirana langsung, kasih tau dia kalau dia gak sendirian."',
          emotion: 'aman',
          next: 'n5a',
        },
        {
          id: 'b',
          label: '"Kita laporin ke wali kelas atau guru BK aja biar ditangani serius."',
          emotion: 'aman',
          next: 'n5b',
        },
        {
          id: 'c',
          label: '"Aku merhatiin dari jauh aja dulu, belum berani langsung ikut campur."',
          emotion: 'takut',
          next: 'n5c',
        },
      ],
    },
    n5a: {
      id: 'n5a',
      speaker: 'rafi',
      text: 'Bagus tuh, gue temenin. Semoga Kirana ngerasa mendingan ya.',
      dynamic: true,
      situationHint: 'Aku memutuskan mengirim pesan langsung ke Kirana untuk mendukungnya, dan Rafi mendukung keputusan itu.',
    },
    n5b: {
      id: 'n5b',
      speaker: 'rafi',
      text: 'Oke, itu juga ide bagus sih, biar ada yang benar-benar nindak lanjutin.',
      dynamic: true,
      situationHint: 'Aku memutuskan melaporkan bully-an ini ke wali kelas/guru BK, dan Rafi setuju itu langkah yang tepat.',
    },
    n5c: {
      id: 'n5c',
      speaker: 'rafi',
      text: 'Hmm oke deh, santai aja, gak harus buru-buru juga sih.',
      dynamic: true,
      situationHint: 'Aku memilih untuk mengamati dari jauh dulu, belum berani bertindak langsung, dan Rafi meresponsnya santai.',
    },
    // --- Cabang "abaikan" (takut/menghindar) ---
    n3b: {
      id: 'n3b',
      speaker: 'rafi',
      text: 'Ya udah sih, emang rame-rame gini mendingan gak usah ikut campur juga.',
      dynamic: true,
      situationHint: 'Aku memilih untuk tidak ikut campur karena merasa itu bukan urusanku, dan Rafi membenarkan sikap menghindar itu.',
    },
    // --- Cabang "ikut menyinggung" ---
    n3c: {
      id: 'n3c',
      speaker: 'rafi',
      text: 'Iya kan? Makin rame nih chatnya kalau gini caranya, wkwk.',
      dynamic: true,
      situationHint: 'Aku baru saja ikut mengomentari negatif tentang Kirana, dan Rafi malah makin terpancing meneruskan candaan yang merendahkan itu.',
    },
    // --- Cabang "netral/cuek" ---
    n3d: {
      id: 'n3d',
      speaker: 'rafi',
      text: 'Iya kali ya, paling ntar juga udah pada lupa.',
      dynamic: true,
      situationHint: 'Aku memilih bersikap acuh/netral dan menganggap masalah ini akan reda sendiri, Rafi pun ikut cuek.',
    },
    // Semua node n5*/n3b/n3c/n3d adalah node terakhir (tanpa `next`) —
    // DialogueBox menutup diri & menandai quest selesai setelah salah
    // satunya tampil, tergantung cabang mana yang diambil pemain.
  },
};
