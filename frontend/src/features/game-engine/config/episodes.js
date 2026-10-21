// Sumber kebenaran enam episode Nawasena Dara.
// Bahasa dirangkum seringkas mungkin agar langsung dipahami anak SMP/SMA,
// menggunakan obrolan sehari-hari tanpa istilah formal yang rumit.

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
      'Kenali candaan yang merendahkan, lalu sampaikan rasa tidak nyamanmu dengan tenang dan tegas tanpa membalas kasar.',
    aspects: [
      {
        id: 1,
        title: 'Kenali candaan yang merendahkan',
        desc: 'Sadar omongan yang meremehkan bukan candaan biasa.',
      },
      {
        id: 2,
        title: 'Sampaikan rasa tidak nyaman',
        desc: 'Berani jujur bilang tidak suka saat kelewat batas.',
      },
      {
        id: 3,
        title: 'Bicara tenang tanpa membalas kasar',
        desc: 'Tegur dengan kepala dingin tanpa membalas kasar.',
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
      'Tolak ikut menyebarkan foto ejekan di grup chat dan hadir temani Kirana agar dia tidak merasa sendirian.',
    aspects: [
      {
        id: 1,
        title: 'Sadar ejekan di grup itu menyakitkan',
        desc: 'Paham menertawakan foto teman di grup melukai perasaannya.',
      },
      {
        id: 2,
        title: 'Hadir menemani teman yang sedih',
        desc: 'Ajak Kirana mengobrol agar dia tidak merasa sendirian.',
      },
      {
        id: 3,
        title: 'Tolak ikut tertawa atau menyebarkan',
        desc: 'Jangan teruskan foto ejekan dan ingatkan teman lain.',
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
      'Waspadai pesan akun asing, tolak beri data atau foto pribadi, lalu simpan bukti dan blokir akunnya.',
    aspects: [
      {
        id: 1,
        title: 'Waspada bujukan akun asing',
        desc: 'Kenali bahaya orang asing yang memaksa minta hal pribadi.',
      },
      {
        id: 2,
        title: 'Tolak beri data dan foto pribadi',
        desc: 'Tegas menolak memberikan info kontak maupun foto diri.',
      },
      {
        id: 3,
        title: 'Simpan bukti, blokir, dan lapor',
        desc: 'Tangkap layar chat untuk bukti, blokir akunnya, dan lapor.',
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
      'Tolak tegas komentar yang merendahkan fisikmu di kantin, lalu segera menjauh ke tempat yang aman.',
    aspects: [
      {
        id: 1,
        title: 'Paham fisik bukan bahan candaan',
        desc: 'Sadar tubuh dan penampilanmu bukan bahan lelucon.',
      },
      {
        id: 2,
        title: 'Bilang tidak suka dengan tegas',
        desc: 'Bicara lugas dan tenang bahwa kamu tidak nyaman dikomentari begitu.',
      },
      {
        id: 3,
        title: 'Menjauh ke tempat yang aman',
        desc: 'Jaga jarak dari pengganggu dan segera cari bantuan guru.',
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
      'Dengarkan cerita Kirana dengan sabar tanpa menyalahkan, lalu temani dia meminta bantuan Guru BK.',
    aspects: [
      {
        id: 1,
        title: 'Peka melihat perubahan sahabat',
        desc: 'Sadari tanda cemas dan takut saat sahabat punya masalah.',
      },
      {
        id: 2,
        title: 'Dengarkan cerita tanpa menyalahkan',
        desc: 'Beri rasa aman dan dengarkan curhat tanpa menyalahkan.',
      },
      {
        id: 3,
        title: 'Temani cari bantuan Guru BK',
        desc: 'Ajak dan temani sahabatmu melapor ke BK tanpa melabrak sendiri.',
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
      'Tolak ajakan paksa dengan tegas, segera menuju pos satpam bersama Naya, dan laporkan kejadiannya.',
    aspects: [
      {
        id: 1,
        title: 'Berani menolak paksaan',
        desc: 'Tegas berkata tidak saat dipaksa pergi ke tempat sepi.',
      },
      {
        id: 2,
        title: 'Segera menuju tempat aman',
        desc: 'Cepat pindah ke pos satpam atau tempat ramai bersama Naya.',
      },
      {
        id: 3,
        title: 'Catat kejadian dan lapor resmi',
        desc: 'Ingat urutan kejadian dan laporkan ke Guru BK serta orang tua.',
      },
    ],
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((episode) => episode.id === id) ?? null;
}
