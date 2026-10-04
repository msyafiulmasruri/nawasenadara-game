// Data semua episode Nawasena Dara. `sceneKey` menunjuk ke Phaser Scene
// yang menjalankan episode itu. Episode 1 dan Episode 2 sudah punya
// scene khusus (Episode1Scene dan Episode2Scene). Episode 3-9 untuk
// sementara memakai PlaceholderEpisodeScene sambil menunggu aset dan
// mekanik khusus masing-masing episode.
//
// CARA PASANG ASET BACKGROUND EPISODE 2-9 NANTI (tanpa ubah kode sama
// sekali di luar file ini + BootScene):
// 1. Taruh file gambarnya di public/scenes/, ikuti pola nama yang sudah
//    disiapkan di `bgImagePath` tiap episode di bawah (mis.
//    /scenes/episode-2-bg.png).
// 2. Itu saja — BootScene sudah mencoba me-load semua path ini dari
//    awal (aman kalau filenya belum ada, cuma di-skip diam-diam), dan
//    PlaceholderEpisodeScene otomatis mendeteksi textur mana yang
//    berhasil dimuat (`this.textures.exists(bgKey)`) lalu menampilkan
//    gambar itu dengan logika portrait/landscape PERSIS SAMA seperti
//    Episode1Scene (proporsional, tidak diregangkan/di-tile, lantai
//    tetap sinkron dengan groundY). Kalau belum ada gambarnya, otomatis
//    fallback ke warna polos (placeholderColor) seperti sekarang.
// 3. Kalau episode tertentu nanti butuh logic KHUSUS (bukan cuma ganti
//    background, mis. ada NPC/dialog/puzzle unik), baru saat itu buat
//    Scene khusus sendiri (contoh: Episode2Scene.js meniru pola
//    Episode1Scene.js), daftarkan di PhaserGame.jsx, lalu ganti
//    sceneKey di bawah dari 'PlaceholderEpisodeScene' ke nama scene
//    barunya. EpisodeSelectScene, EpisodeIntroScene, dan progressStore
//    semuanya baca dari episodes.js ini, jadi tidak ada bagian lain
//    yang perlu diubah.

export const EPISODES = [
  {
    id: 1,
    title: 'Awal yang Baru',
    sceneKey: 'Episode1Scene',
    placeholderColor: 0x2b2340,
    bgKey: 'episode1-bg',
    bgImagePath: '/scenes/episode-1-corridor.png',
    description:
      'Hari pertamamu di sekolah baru. Saat berkenalan dengan teman sekelas, kamu menghadapi candaan bernada bias gender. Tentukan sikapmu: diam menahan diri atau berani menyuarakan batasan dengan tenang.',
    objective:
      'Episode ini mengangkat tema kesetaraan gender dan penanganan candaan seksis. Dengarkan percakapan Rafi dan latih sikap asertifmu: sampaikan ketidaknyamanan secara tenang dan saling menghargai. Pilihanmu akan dinilai dan menentukan ending episode ini.',
  },
  {
    id: 2,
    title: 'Rahasia di Grup Kelas',
    sceneKey: 'Episode2Scene',
    placeholderColor: 0x243b55,
    bgKey: 'episode2-bg',
    bgImagePath: '/scenes/episode-2-bg.png',
    description:
      'Ponselmu bergetar di kamar, menampilkan obrolan grup kelas yang mengejek Kirana. Saat perundungan siber terjadi di depan matamu, pilih langkahmu: ikut diam, atau berani peduli dan bertindak nyata.',
    objective:
      'Episode ini mengangkat tema cyberbullying, empati, dan etika digital. Buka ponsel di meja dan tentukan tindakanmu untuk menghentikan perundungan tanpa memperburuk situasi bagi korban.',
  },
  {
    id: 3,
    title: 'Pesan dari Orang Asing',
    sceneKey: 'Episode3Scene',
    placeholderColor: 0x1f2937,
    bgKey: 'episode3-bg',
    bgImagePath: '/scenes/episode-3-bg.jpg',
    description:
      'Malam larut, pesan mencurigakan masuk dari akun anonim yang mengetahui aktivitas pribadimu. Uji kewaspadaanmu dalam menghadapi manipulasi daring: kapan harus memblokir dan melapor ke orang tua.',
    objective:
      'Episode ini mengangkat tema stranger danger dan online grooming. Jaga data pribadimu dan tentukan kapan harus memblokir serta melapor kepada orang tua saat menghadapi akun tak dikenal.',
  },
  {
    id: 4,
    title: 'Candaan yang Tidak Nyaman',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x3a2e2e,
    bgKey: 'episode4-bg',
    bgImagePath: '/scenes/episode-4-bg.png',
    description:
      'Suasana kantin sekolah yang ramai mendadak membuatmu risih akibat komentar fisik dan pelecehan verbal. Waktunya memahami batasan persetujuan (consent) dan mengambil tindakan aman.',
    objective:
      'Episode ini membahas pelecehan verbal dan batasan persetujuan (consent). Kenali komentar yang melanggar batas dan ambil tindakan untuk menegur, bercerita kepada teman, atau melapor.',
  },
  {
    id: 5,
    title: 'Ketika Sahabat Berubah',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x234238,
    bgKey: 'episode5-bg',
    bgImagePath: '/scenes/episode-5-bg.png',
    description:
      'Sahabat dekatmu menunjukkan tanda-tanda ketakutan dan perubahan perilaku yang mencurigakan. Kenali tanda-tanda korban kekerasan dan jadilah pendukung yang empatik di taman sekolah.',
    objective:
      'Episode ini melatih kepekaan mendeteksi tanda-tanda kekerasan pada sahabat sebaya serta memberikan dukungan awal yang aman.',
  },
  {
    id: 6,
    title: 'Berani Berkata Tidak',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x1a1a2e,
    bgKey: 'episode6-bg',
    bgImagePath: '/scenes/episode-6-bg.png',
    description:
      'Tekanan teman sebaya memaksamu melakukan hal yang melanggar kenyamanan dirimu. Latih keberanian dan kemampuan asertif untuk berkata "tidak" demi melindungi batasan diri.',
    objective:
      'Episode ini berfokus pada ketegasan asertif dalam menolak tekanan kelompok dan menjaga batasan integritas diri.',
  },
  {
    id: 7,
    title: 'Mencari Tempat Aman',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x2e2b3f,
    bgKey: 'episode7-bg',
    bgImagePath: '/scenes/episode-7-bg.png',
    description:
      'Situasi sulit menuntut bantuan pihak terpercaya. Pelajari mekanisme pelaporan yang aman dan temukan ruang perlindungan bersama guru BK, keluarga, atau layanan bantuan profesional.',
    objective:
      'Episode ini membimbing langkah praktis mencari bantuan kepada orang dewasa terpercaya dan mengakses kanal perlindungan anak.',
  },
  {
    id: 8,
    title: 'Suara untuk Diriku',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x3b3022,
    bgKey: 'episode8-bg',
    bgImagePath: '/scenes/episode-8-bg.png',
    description:
      'Memasuki tahap pemulihan psikologis dan penguatan harga diri (self-esteem). Tuangkan refleksimu, bangun kembali rasa percaya diri, dan temukan dukungan positif di sekitarmu.',
    objective:
      'Episode ini mengeksplorasi strategi koping positif, regulasi emosi, dan pemulihan kesehatan mental pasca-tekanan emosional.',
  },
  {
    id: 9,
    title: 'Langkah Baru',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x24344a,
    bgKey: 'episode9-bg',
    bgImagePath: '/scenes/episode-9-bg.png',
    description:
      'Perjalananmu membawa perubahan. Gunakan pemahaman yang kamu miliki untuk menginspirasi kesetaraan gender dan menciptakan lingkungan sekolah yang aman dan bebas dari kekerasan.',
    objective:
      'Episode penutup yang menguji integrasi seluruh pemahamanmu dalam menciptakan kepemimpinan positif dan lingkungan yang saling menghormati.',
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((ep) => ep.id === id) ?? null;
}
