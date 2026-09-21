import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/gameConfig';

/**
 * True kalau viewport CSS saat ini lebih tinggi daripada lebar
 * (portrait). Dipakai untuk menentukan mode render background:
 * - Portrait -> level lebar (scrolling) + background tile berulang,
 *   karena satu gambar statis tidak akan pernah cukup mengisi rasio
 *   aspek yang jauh dari 16:9 tanpa terlihat kosong di sisi atas/bawah.
 * - Landscape -> satu layar statis (tidak scroll), karena rasio
 *   aspek art (mendekati 16:9) sudah cocok ditampilkan penuh sekali
 *   tanpa perlu diulang.
 */
export function isPortrait(scene) {
  const { width, height } = scene.scale.parentSize;
  return height > width;
}

/**
 * Sinkronkan game size Scale Manager dengan orientasi layar SAAT INI.
 * Tinggi SELALU tetap WORLD_HEIGHT (720) di kedua orientasi — supaya
 * groundY, scale karakter, dan ukuran UI tetap konsisten. Yang berubah
 * cuma lebar "satu layar" (gameSize.width), dihitung ULANG supaya
 * rasio dunia PERSIS menyamai rasio viewport CSS saat ini:
 *
 *   dynamicWidth = 720 * (viewportWidth / viewportHeight)
 *
 * Dengan rasio dunia = rasio layar, mode ENVELOP tidak perlu meng-crop
 * SISI MANAPUN sama sekali (scaleX === scaleY persis) — baik di
 * landscape maupun portrait.
 *
 * SEBELUMNYA portrait dikembalikan ke ukuran baku 1280x720 (bentuk
 * landscape 16:9) yang dipaksakan tampil di layar portrait sempit
 * (mis. 400x800) — akibatnya ENVELOP terpaksa meng-crop SISI KIRI-KANAN
 * secara BESAR-BESARAN (bisa sampai >70% lebar dunia hilang dari
 * pandangan) supaya tinggi 720 pas dengan tinggi layar. Ini penyebab
 * dua bug sekaligus:
 * 1. "Background masih terpotong banyak" — karena memang sebagian
 *    besar lebar dunia (termasuk background) berada di luar area yang
 *    ke-crop itu.
 * 2. "Karakter hilang" — kamera manual (_updatePortraitCamera di
 *    BasePlayerScene) menghitung scroll seolah-olah tidak ada crop
 *    sama sekali (world x=0 dianggap selalu di tepi kiri layar),
 *    padahal senyatanya crop menggeser jendela yang benar-benar
 *    terlihat jauh ke tengah dunia — karakter yang baru spawn di
 *    dekat x=0 jadi berada JAUH di luar jendela yang ke-crop itu,
 *    alias tidak pernah ter-render sama sekali di layar.
 *
 * Dengan gameSize portrait sekarang SELALU menyamai rasio layar persis
 * (crop ≈ 0), kedua bug itu hilang dengan sendirinya — gameSize.width
 * ini berfungsi sebagai "lebar satu layar", sedangkan level yang bisa
 * di-scroll (this.levelWidth di BasePlayerScene, biasanya jauh lebih
 * lebar — lihat Episode1Scene) tetap terpisah dan dipan manual oleh
 * kamera mengikuti karakter.
 *
 * WAJIB dipanggil di awal create() SETIAP scene yang menggambar
 * background/UI penuh layar (TitleScene, MenuScene, EpisodeSelectScene,
 * EpisodeIntroScene, BasePlayerScene, dst.) — bukan cuma BasePlayerScene.
 * Alasannya: `this.scale.setGameSize()` mengubah properti GLOBAL pada
 * instance Phaser.Game yang sama, TIDAK otomatis reset saat pindah
 * scene. Kalau scene sebelumnya sempat mengubahnya (mis. episode
 * landscape dengan lebar dinamis 1650), lalu scene berikutnya
 * (mis. EpisodeIntroScene) menggambar dengan asumsi lebar tetap 1280,
 * hasilnya ada area yang tidak digambar sama sekali di kanan/kiri
 * layar (gejala "ada ruang hitam kosong tidak simetris").
 *
 * @returns {{ width: number, height: number, isPortraitMode: boolean }}
 *          Ukuran (world unit) yang harus dipakai scene pemanggil untuk
 *          menggambar seluruh elemen — GANTI semua pemakaian konstanta
 *          WORLD_WIDTH mentah dengan `width` hasil fungsi ini.
 */
export function syncGameSizeToOrientation(scene) {
  const isPortraitMode = isPortrait(scene);
  const { width: pw, height: ph } = scene.scale.parentSize;
  const aspect = ph > 0 ? pw / ph : WORLD_WIDTH / WORLD_HEIGHT;
  const dynamicWidth = Math.max(1, Math.round(WORLD_HEIGHT * aspect));
  scene.scale.setGameSize(dynamicWidth, WORLD_HEIGHT);

  return {
    width: scene.scale.gameSize.width,
    height: scene.scale.gameSize.height,
    isPortraitMode,
  };
}

/**
 * Ukuran "dunia game" (game size) yang SEDANG DIPAKAI Scale Manager saat
 * ini. Biasanya ini sama dengan WORLD_WIDTH x WORLD_HEIGHT (konstanta
 * referensi 1280x720), TAPI BasePlayerScene sengaja mengubahnya secara
 * dinamis lewat `this.scale.setGameSize()` khusus untuk mode landscape
 * (lihat _applyLandscapeGameSize di BasePlayerScene) supaya rasio aspek
 * dunia game PERSIS menyamai rasio aspek layar — dengan begitu ENVELOP
 * tidak perlu meng-crop atas/bawah sama sekali (scaleX === scaleY,
 * tidak ada sisi yang "kelebihan" untuk dipotong).
 *
 * Semua helper di bawah baca ukuran AKTUAL ini (bukan konstanta tetap),
 * supaya tombol, batas visible area, dll. otomatis mengikuti — baik di
 * mode landscape dinamis maupun portrait (yang tetap pakai ukuran
 * referensi baku 1280x720).
 */
function getCurrentGameSize(scene) {
  const gs = scene.scale.gameSize;
  return {
    width: gs?.width || WORLD_WIDTH,
    height: gs?.height || WORLD_HEIGHT,
  };
}

/**
 * Hitung area game yang benar-benar terlihat di layar saat menggunakan
 * mode scale ENVELOP. ENVELOP membesarkan canvas supaya menutupi seluruh
 * viewport (mirip CSS background-size: cover), sehingga bagian tepi
 * dunia game bisa terpotong jika rasio aspek viewport berbeda dari
 * rasio game saat ini (lihat getCurrentGameSize di atas — di landscape
 * rasio ini sengaja disamakan dengan rasio layar, jadi harusnya nyaris
 * tidak ada crop sama sekali; di portrait tetap 16:9 baku karena
 * memang didesain untuk di-crop kiri-kanan lalu di-scroll).
 *
 * Fungsi ini mengembalikan batas area yang PASTI terlihat, supaya
 * elemen UI (tombol, teks) bisa diposisikan di dalamnya tanpa risiko
 * terpotong di layar apa pun — desktop, laptop, maupun mobile.
 *
 * @param {Phaser.Scene} scene – Scene Phaser yang sedang aktif.
 * @returns {{ left: number, right: number, top: number, bottom: number,
 *             width: number, height: number, centerX: number, centerY: number }}
 */
export function getVisibleBounds(scene) {
  const { width: gw, height: gh } = getCurrentGameSize(scene);
  const parentSize = scene.scale.parentSize;

  // ENVELOP menggunakan skala terbesar (max) supaya canvas selalu
  // MENUTUPI parent — kebalikan dari FIT yang pakai min.
  const scaleX = parentSize.width / gw;
  const scaleY = parentSize.height / gh;
  const scale = Math.max(scaleX, scaleY);

  // Ukuran dunia game yang terlihat di layar (dalam koordinat game).
  const visW = parentSize.width / scale;
  const visH = parentSize.height / scale;

  // Offset: seberapa banyak tepi dunia game yang terpotong di tiap sisi.
  const offX = (gw - visW) / 2;
  const offY = (gh - visH) / 2;

  return {
    left: offX,
    right: gw - offX,
    top: offY,
    bottom: gh - offY,
    width: visW,
    height: visH,
    centerX: gw / 2,
    centerY: gh / 2,
  };
}

/**
 * Skala aktual "world unit -> CSS px" yang dipakai mode ENVELOP saat ini
 * (sama seperti hitungan `scale` di dalam getVisibleBounds, diekspos
 * terpisah supaya elemen UI seperti tombol sentuh bisa dihitung
 * ukurannya dalam CSS px yang konsisten di semua perangkat, lalu
 * dikonversi balik ke world unit — bukan pakai radius/ukuran tetap
 * dalam world unit yang ikut menyusut kalau layarnya kecil, atau jadi
 * terlalu besar/kecil secara visual di layar raksasa).
 */
export function getWorldScale(scene) {
  const { width: gw, height: gh } = getCurrentGameSize(scene);
  const parentSize = scene.scale.parentSize;
  const scaleX = parentSize.width / gw;
  const scaleY = parentSize.height / gh;
  return Math.max(scaleX, scaleY);
}

/**
 * Konversi ukuran CSS px yang diinginkan (mis. target diameter tombol
 * 56px supaya nyaman disentuh jari) menjadi world unit, berdasarkan
 * skala ENVELOP saat ini.
 */
export function pxToWorld(scene, px) {
  return px / getWorldScale(scene);
}
