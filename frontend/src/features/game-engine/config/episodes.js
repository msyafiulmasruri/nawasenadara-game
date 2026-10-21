// Sumber kebenaran enam episode Nawasena Dara.
// Bahasa dirangkum seringkas & sejelas mungkin agar langsung dipahami anak SMA kelas 10,
// menggunakan kalimat aksi sehari-hari tanpa istilah formal yang kaku.

export const EPISODES = [
  {
    id: 1,
    title: 'Awal yang Baru',
    sceneKey: 'Episode1Scene',
    placeholderColor: 0x2b2340,
    bgKey: 'episode1-bg',
    bgImagePath: '/scenes/episode-1-corridor.png',
    cutsceneThumbnail: 'ep1-corridor-choice-b',
    description:
      'Hari pertamamu di sekolah baru! Di lorong kelas, Rafi melempar candaan yang meremehkan perempuan. Berani bilang nggak nyaman, atau cuma diam?',
    objective:
      'Sadar candaan meremehkan itu nggak benar, lalu berani tegur dengan tenang tanpa membalas kasar.',
    aspects: [
      {
        id: 1,
        title: 'Kenali candaan merendahkan',
        desc: 'Jangan anggap wajar omongan yang meremehkan kamu.',
      },
      {
        id: 2,
        title: 'Berani bilang tidak nyaman',
        desc: 'Tegur langsung saat candaan teman mulai kelewat batas.',
      },
      {
        id: 3,
        title: 'Bicara tenang dan tegas',
        desc: 'Sampaikan dengan kepala dingin tanpa membalas kasar.',
      },
    ],
  },
  {
    id: 2,
    title: 'Rahasia di Grup Kelas',
    sceneKey: 'Episode2Scene',
    placeholderColor: 0x243b55,
    bgKey: 'episode2-bg',
    bgImagePath: '/scenes/episode-2-bg.png',
    cutsceneThumbnail: 'ep2-hp-grup-diam',
    description:
      'Grup chat kelas mendadak ramai menertawakan foto Kirana. Kamu mau ikut ketawa, cuma baca diam-diam, atau hadir menemani Kirana?',
    objective:
      'Jangan ikut sebar foto ejekan di grup chat, dan temani Kirana supaya dia nggak sendirian.',
    aspects: [
      {
        id: 1,
        title: 'Peka perasaan teman',
        desc: 'Sadar ngetawain foto teman di grup itu bikin sakit hati.',
      },
      {
        id: 2,
        title: 'Hadir menemani teman',
        desc: 'Temani dan ajak ngobrol Kirana yang sedang sedih.',
      },
      {
        id: 3,
        title: 'Tolak ikut menyebarkan',
        desc: 'Jangan teruskan foto ejekan dan ingatkan teman sekelas.',
      },
    ],
  },
  {
    id: 3,
    title: 'Pesan dari Orang Asing',
    sceneKey: 'Episode3Scene',
    placeholderColor: 0x1f2937,
    bgKey: 'episode3-bg',
    bgImagePath: '/scenes/episode-3-bg.png',
    cutsceneThumbnail: 'ep3-window-cg',
    description:
      'Malam hari di kamar, akun asing tiba-tiba chat sok akrab lalu minta data pribadi dan fotomu. Hati-hati, lindungi privasimu sekarang!',
    objective:
      'Hati-hati sama akun asing yang sok akrab: tolak bagi data pribadi, simpan bukti, dan blokir.',
    aspects: [
      {
        id: 1,
        title: 'Waspada akun asing',
        desc: 'Langsung curiga kalau ada akun tak dikenal sok akrab.',
      },
      {
        id: 2,
        title: 'Jaga data dan foto pribadi',
        desc: 'Tegas menolak saat dipaksa kirim nomor HP atau foto.',
      },
      {
        id: 3,
        title: 'Simpan bukti dan blokir',
        desc: 'Screenshot chat buat bukti, blokir akunnya, dan lapor.',
      },
    ],
  },
  {
    id: 4,
    title: 'Candaan yang Tidak Nyaman',
    sceneKey: 'Episode4Scene',
    placeholderColor: 0x3a2e2e,
    bgKey: 'episode4-bg',
    bgImagePath: '/scenes/episode-4-bg.jpeg',
    cutsceneThumbnail: 'ep4-canteen-choice-a',
    description:
      'Waktu istirahat di kantin, kakak kelas mengomentari bentuk tubuhmu sambil ketawa. Yuk, tunjukkan kalau kamu berhak dihargai!',
    objective:
      'Tolak komentar fisik yang merendahkan, lalu segera menjauh ke tempat ramai yang aman.',
    aspects: [
      {
        id: 1,
        title: 'Tubuhmu bukan lelucon',
        desc: 'Paham fisik dan penampilanmu berhak dihargai.',
      },
      {
        id: 2,
        title: 'Tolak tegas dan lugas',
        desc: 'Bicara lugas kalau kamu risih dikomentari seperti itu.',
      },
      {
        id: 3,
        title: 'Menjauh ke tempat aman',
        desc: 'Segera jaga jarak dan dekati guru jika terus diganggu.',
      },
    ],
  },
  {
    id: 5,
    title: 'Ketika Sahabat Berubah',
    sceneKey: 'Episode5Scene',
    placeholderColor: 0x234238,
    bgKey: 'episode-5-bg',
    bgImagePath: '/scenes/episode-5-bg.jpg',
    cutsceneThumbnail: 'ep5-garden-bench-cg',
    description:
      'Kirana akhir-akhir ini kelihatan murung dan ketakutan tiap HP-nya bunyi. Yuk, dengarkan ceritanya dan bantu dia mencari pertolongan!',
    objective:
      'Dengarkan cerita Kirana dengan sabar tanpa menyalahkan, lalu temani dia melapor ke Guru BK.',
    aspects: [
      {
        id: 1,
        title: 'Peka perubahan sahabat',
        desc: 'Sadar sahabatmu lagi cemas dan butuh teman cerita.',
      },
      {
        id: 2,
        title: 'Dengar tanpa menghakimi',
        desc: 'Dengarkan curhatnya tanpa menyalahkan atau memojokkan.',
      },
      {
        id: 3,
        title: 'Temani ke Guru BK',
        desc: 'Ajak dan temani dia cari bantuan aman ke Guru BK.',
      },
    ],
  },
  {
    id: 6,
    title: 'Langkah Berani Bersama',
    sceneKey: 'Episode6Scene',
    placeholderColor: 0x1a1a2e,
    bgKey: 'episode-6-bg',
    bgImagePath: '/scenes/episode-6-bg.jpg',
    cutsceneThumbnail: 'ep6-teman-aman-cg',
    description:
      'Naya dihadang di dekat gerbang sekolah dan dipaksa ikut oleh seseorang. Jangan biarkan dia sendirian, ayo bertindak kompak!',
    objective:
      'Berani tolak ajakan paksa, lari ke pos satpam yang ramai, dan laporkan kejadiannya bersama teman.',
    aspects: [
      {
        id: 1,
        title: 'Berani menolak paksaan',
        desc: 'Tegas menolak saat dipaksa ikut ke tempat sepi.',
      },
      {
        id: 2,
        title: 'Cari perlindungan aman',
        desc: 'Segera lari ke pos satpam atau tempat yang ramai.',
      },
      {
        id: 3,
        title: 'Catat dan lapor resmi',
        desc: 'Ingat kejadiannya dan lapor ke sekolah serta orang tua.',
      },
    ],
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((episode) => episode.id === id) ?? null;
}
