// Data NPC pendukung untuk alur enam episode. BootScene memuat portrait
// yang memiliki portraitPath; StoryEpisodeScene otomatis memakai visual
// dummy bila slot aset masih kosong. Saat aset final tersedia, cukup isi
// portraitPath pada entri terkait tanpa mengubah mekanik episode.
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
  3: {
    // Episode 3 — "akun anonim" tidak punya portrait gambar karakter
    // seperti NPC biasa. NPC ini direpresentasikan sebagai objek ponsel
    // interaktif di meja belajar Dara. portraitKey sengaja dibiarkan
    // null (tidak di-load di BootScene) karena DialogueBox Episode3Scene
    // mengganti label speaker dengan string literal '@bayang_kelabu91'
    // tanpa gambar portrait konvensional.
    id: 'bayang_kelabu',
    name: '@bayang_kelabu91',
    episodeId: 3,
    portraitKey: null,  // tidak ada gambar portrait — dialog berbasis teks
    portraitPath: null,
    // Posisi objek ponsel: di atas meja belajar di samping kanan laptop
    // (xRatio 0.58) yang terlihat di gambar latar eps3.jpg.
    xRatio: 0.58,
    // Radius interaksi agar pemain nyaman mendekati meja belajar.
    interactionRadius: 120,
    contentHeight: null,
    bottomPadding: null,
  },
  4: {
    id: 'senior_kantin',
    name: 'Senior Kantin',
    episodeId: 4,
    // Slot aset final. Selama file belum ada, StoryEpisodeScene
    // menggambar karakter dummy yang tetap bisa diajak berinteraksi.
    portraitKey: 'npc-senior-kantin-portrait',
    portraitPath: '/characters/senior-kantin.png',
    xRatio: 0.43,
    interactionRadius: 105,
    dummyColor: 0xb55f54,
    dummyAccent: 0x3d2636,
  },
  5: {
    id: 'kirana',
    name: 'Kirana',
    episodeId: 5,
    portraitKey: 'npc-kirana-portrait',
    portraitPath: '/characters/kirana.png',
    xRatio: 0.38,
    interactionRadius: 105,
    dummyColor: 0x5b8f79,
    dummyAccent: 0x273b55,
  },
  6: {
    id: 'naya',
    name: 'Naya',
    episodeId: 6,
    portraitKey: 'npc-naya-portrait',
    portraitPath: '/characters/naya.png',
    xRatio: 0.66,
    interactionRadius: 105,
    dummyColor: 0x6f73b8,
    dummyAccent: 0x332b55,
  },
};

export function getNpcByEpisode(episodeId) {
  return NPCS[episodeId] ?? null;
}
