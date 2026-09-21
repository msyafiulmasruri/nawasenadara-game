// Data NPC pendukung cerita — SATU NPC per episode (9 episode = 9
// NPC total, sesuai arahan). Dikelompokkan di sini (bukan ditulis
// langsung di masing-masing EpisodeXScene.js) supaya BootScene bisa
// me-load semua portrait NPC dari satu sumber data, sama seperti pola
// `EPISODES` di config/episodes.js untuk background.
//
// `portraitPath` : gambar potret (dipakai di DialogueBox, gaya
//   Harvest Moon — portrait tampil di atas kotak dialog).
// `worldSpriteKey` : sengaja SAMA dengan `portraitKey` untuk saat ini
//   (dummy asset yang dilampirkan cuma satu gambar per NPC, dipakai
//   baik sebagai potret dialog maupun sprite berdiri di dunia game).
//   Kalau nanti tiap NPC punya sprite dunia terpisah (idle pose beda
//   dari potret dialog), tinggal tambah field `worldSpritePath` sendiri
//   di sini tanpa perlu ubah kode lain.
export const NPCS = {
  1: {
    id: 'rafi',
    name: 'Rafi',
    episodeId: 1,
    portraitKey: 'npc-rafi-portrait',
    portraitPath: '/characters/rafi.png',
    // Posisi berdiri NPC di sepanjang level (rasio 0..1 dari levelWidth
    // final scene itu) — sengaja rasio, bukan piksel absolut, supaya
    // tetap konsisten di levelWidth berapa pun (beda device/orientasi).
    xRatio: 0.62,
    // Radius (dalam world unit) supaya prompt "bicara" muncul saat
    // pemain cukup dekat.
    interactionRadius: 90,
    // --- Metadata bounding-box KONTEN ASLI gambar (bukan kanvas) ---
    // rafi.png kanvasnya 1000x1000 (artwork versi baru — diganti sesuai
    // referensi yang diberikan), gambar karakternya sendiri cuma
    // mengisi sebagian (hasil pengukuran piksel alpha channel langsung):
    //   bounding box konten: x 357..634, y 60..872 dari kanvas 1000x1000
    // Dua angka di bawah dipakai Episode1Scene untuk menghitung scale &
    // offset yang benar berdasarkan tinggi KONTEN asli (bukan tinggi
    // kanvas mentah) — lihat penjelasan lengkap versi sebelumnya di
    // riwayat git kalau perlu banding.
    contentHeight: 812, // 872 - 60 (tinggi karakter sungguhan dalam px)
    bottomPadding: 128, // 1000 - 872 (ruang kosong di bawah kaki dalam px)
  },
};

export function getNpcByEpisode(episodeId) {
  return NPCS[episodeId] ?? null;
}
