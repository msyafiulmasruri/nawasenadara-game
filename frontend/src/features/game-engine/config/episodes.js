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
      'Hari pertama di sekolah baru. Kamu berkenalan dengan Rafi, teman sekelas yang ramah tapi punya kebiasaan "bercanda" yang sering kali tidak sadar menyudutkan — terutama komentar-komentar yang merendahkan berdasarkan gender. Bagaimana kamu meresponsnya akan menentukan apakah suaramu akan didengar, atau kamu belajar untuk diam.',
    // Ditampilkan sebagai "briefing" wajib dibaca SEBELUM pemain bisa
    // bergerak bebas di gameplay episode ini — lihat
    // ui/ObjectiveBriefing.js & Episode1Scene.create(). Isinya BUKAN
    // cuma "ajak bicara NPC" generik, tapi eksplisit menyebut tema
    // moral episode ini (kesetaraan gender & cara menanggulangi
    // kekerasan verbal/candaan bias-gender terhadap remaja putri,
    // lihat §2 revisi naskah) DAN arahan cara menjawab/menanggulangi
    // situasi itu dengan tepat — sejalan dengan mekanisme ending
    // berbasis label emosi (utils/emotionEnding.js).
    objective:
      'Episode ini mengangkat tema kesetaraan gender dan bentuk awal kekerasan verbal terhadap remaja putri — candaan yang merendahkan berdasarkan gender. Ajak bicara Rafi, teman sekelas barumu, dan dengarkan baik-baik candaannya. Saat diberi pilihan menjawab, itu adalah kesempatanmu berlatih menanggulangi situasi seperti ini dengan tepat: sampaikan ketidaknyamananmu secara tenang, jujur, dan saling menghargai — BUKAN dengan diam menahan diri (membiarkan ketidaknyamanan itu dianggap wajar) atau membalas dengan marah/menyerang balik (yang hanya memicu konflik baru). Setiap responsmu akan dinilai dan menentukan ending episode ini.',
  },
  {
    id: 2,

    title: 'Rahasia di Grup Kelas',

    sceneKey: 'Episode2Scene',

    placeholderColor: 0x243b55,

    bgKey: 'episode2-bg',

    bgImagePath: '/scenes/episode-2-bg.png',

    description:
      'Sepulang sekolah, kamu kembali ke kamar dan mencoba beristirahat. ' +
      'Namun ponsel di atas meja terus menerima notifikasi dari grup kelas. ' +
      'Saat dibuka, kamu menemukan beberapa teman sedang menjadikan Kirana ' +
      'bahan ejekan. Rafi kemudian menghubungimu secara pribadi dan menanyakan ' +
      'pendapatmu. Pilihanmu akan menentukan apakah kamu memilih membantu, ' +
      'diam karena takut, ikut terbawa suasana, atau membiarkan semuanya terjadi.',

    objective:
      'Episode ini mengangkat tema cyberbullying, empati, dan etika digital. ' +
      'Dekati meja dan periksa ponselmu. Perhatikan bagaimana percakapan grup ' +
      'dapat berdampak kepada seseorang meskipun hanya dianggap sebagai candaan. ' +
      'Saat diberi pilihan, pertimbangkan tindakan yang dapat menghentikan ' +
      'perundungan tanpa ikut menyebarkan konten yang merugikan korban. ' +
      'Keputusanmu akan menentukan ending Episode 2.',
  },
  {
    id: 3,
    title: 'Pesan dari Orang Asing',
    sceneKey: 'Episode3Scene',
    placeholderColor: 0x1f2937,
    bgKey: 'episode3-bg',
    bgImagePath: '/scenes/episode-3-bg.png',
    description:
      'Malam itu, sebuah pesan dari akun tak dikenal masuk ke ponselmu. Awalnya terasa ramah, lalu perlahan berubah tidak nyaman. Kamu harus memutuskan cara meresponsnya sebelum semua terlambat.',
    objective:
      'Episode ini mengangkat tema stranger danger dan online grooming. Kamu mendapat DM dari akun Instagram anonim yang perlahan berubah mencurigakan. Gunakan naluri dan pengetahuanmu: kapan harus memblokir, kapan harus lapor ke orang tua, dan jangan pernah memberi data pribadi (nomor, foto) kepada orang asing — sekali pun ia mengancam atau punya "bukti". Setiap responsmu akan dinilai dan menentukan ending episode ini.',
  },
  {
    id: 4,
    title: 'Candaan yang Tidak Nyaman',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x3a2e2e,
    bgKey: 'episode4-bg',
    bgImagePath: '/scenes/episode-4-bg.png',
    description:
      'Di kantin yang ramai, komentar-komentar tentang tubuhmu terdengar dari meja seberang. Kamu harus melewati momen itu dan memutuskan: diam, menegur, atau mencari bantuan.',
  },
  {
    id: 5,
    title: 'Ketika Sahabat Berubah',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x234238,
    bgKey: 'episode5-bg',
    bgImagePath: '/scenes/episode-5-bg.png',
    description:
      'Sahabatmu belakangan ini terlihat berbeda — lebih pendiam, sering menunduk. Kamu menghampirinya di taman belakang sekolah dan mencoba memahami apa yang sebenarnya terjadi.',
  },
  {
    id: 6,
    title: 'Berani Berkata Tidak',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x1a1a2e,
    bgKey: 'episode6-bg',
    bgImagePath: '/scenes/episode-6-bg.png',
    description:
      'Di sebuah gang dekat rumah, kamu dihadapkan pada tekanan untuk melakukan sesuatu yang tidak kamu inginkan. Inilah saatnya melatih keberanian untuk berkata tidak.',
  },
  {
    id: 7,
    title: 'Mencari Tempat Aman',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x2e2b3f,
    bgKey: 'episode7-bg',
    bgImagePath: '/scenes/episode-7-bg.png',
    description:
      'Di rumah, kamu akhirnya memutuskan untuk mencari bantuan. Telepon di meja punya beberapa pilihan kontak — orang tua, guru BK, atau layanan bantuan. Semua bisa jadi awal pemulihan.',
  },
  {
    id: 8,
    title: 'Suara untuk Diriku',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x3b3022,
    bgKey: 'episode8-bg',
    bgImagePath: '/scenes/episode-8-bg.png',
    description:
      'Malam yang lebih tenang. Kamu menuliskan semua yang dirasakan di buku catatan pribadi, sebagai bagian dari proses pemulihan dan menemukan kembali kepercayaan diri.',
  },
  {
    id: 9,
    title: 'Langkah Baru',
    sceneKey: 'PlaceholderEpisodeScene',
    placeholderColor: 0x24344a,
    bgKey: 'episode9-bg',
    bgImagePath: '/scenes/episode-9-bg.png',
    description:
      'Sekolah terasa berbeda sekarang. Kamu menjelajahi tempat-tempat yang pernah kamu lalui, bertemu lagi dengan wajah-wajah dari perjalanananmu, dan menutup kisah ini dengan caramu sendiri.',
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((ep) => ep.id === id) ?? null;
}
