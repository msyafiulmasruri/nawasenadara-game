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
      'Di lorong kelas, Rafi melempar candaan yang meremehkan perempuan. Misi utamamu adalah mengenali candaan yang kelewat batas itu, lalu menyampaikan rasa tidak nyamanmu dengan tenang tanpa diam memendam atau membalas kasar.',
    aspects: [
      {
        id: 1,
        title: 'Kenali candaan yang merendahkan',
        desc: 'Sadar kalau omongan yang meremehkan teman perempuan itu bukan candaan biasa.',
      },
      {
        id: 2,
        title: 'Sampaikan rasa tidak nyaman',
        desc: 'Berani jujur bilang nggak suka saat candaan sudah kelewat batas.',
      },
      {
        id: 3,
        title: 'Bicara tenang tanpa membalas kasar',
        desc: 'Tegur dengan kepala dingin tanpa diam memendam atau balik memaki.',
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
      'Grup chat kelas sedang ramai menertawakan foto Kirana yang disebar tanpa izin. Misi utamamu adalah menolak ikut menyebarkan ejekan di grup dan hadir menemani Kirana supaya dia tidak merasa sendirian.',
    aspects: [
      {
        id: 1,
        title: 'Sadar ejekan di grup itu menyakitkan',
        desc: 'Paham kalau menertawakan foto teman di grup chat bikin temanmu terluka.',
      },
      {
        id: 2,
        title: 'Hadir menemani teman yang sedih',
        desc: 'Hampiri dan ajak Kirana ngobrol supaya dia nggak merasa sendirian.',
      },
      {
        id: 3,
        title: 'Tolak ikut tertawa atau menyebarkan',
        desc: 'Jangan ikut meneruskan foto ejekan dan berani ingatkan kalau itu salah.',
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
      'Sebuah akun asing mengirim pesan sok akrab lalu memaksa minta data dan foto pribadimu. Misi utamamu adalah mengenali tanda bahayanya, menolak memberikan informasi pribadi, lalu menyimpan bukti dan memblokir akun itu.',
    aspects: [
      {
        id: 1,
        title: 'Waspada bujukan akun asing',
        desc: 'Sadar ada tanda bahaya saat orang tak dikenal di internet mulai sok akrab dan memaksa.',
      },
      {
        id: 2,
        title: 'Tolak beri data dan foto pribadi',
        desc: 'Tegas menolak memberikan alamat rumah, nomor HP, maupun foto diri.',
      },
      {
        id: 3,
        title: 'Simpan bukti, blokir, dan lapor',
        desc: 'Simpan tangkapan layar chat sebagai bukti, blokir akunnya, dan cerita ke orang dewasa.',
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
      'Saat istirahat di kantin, kakak kelas mengomentari bentuk tubuhmu sambil tertawa. Misi utamamu adalah menyampaikan dengan tegas kalau kamu tidak nyaman, lalu menjaga jarak ke tempat yang aman.',
    aspects: [
      {
        id: 1,
        title: 'Paham fisikmu bukan bahan candaan',
        desc: 'Sadar kalau tubuh dan penampilanmu nggak boleh dijadikan bahan lelucon.',
      },
      {
        id: 2,
        title: 'Bilang tidak suka dengan tegas',
        desc: 'Berani bicara tenang bahwa kamu nggak nyaman dikomentari seperti itu.',
      },
      {
        id: 3,
        title: 'Menjauh ke tempat yang aman',
        desc: 'Jaga jarak dari orang yang mengganggu dan lapor ke guru jika terus berlanjut.',
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
      'Sahabatmu, Kirana, tampak murung dan ketakutan karena diperlakukan kasar oleh orang dekatnya. Misi utamamu adalah mendengarkan ceritanya dengan sabar tanpa menyalahkan, lalu menemani Kirana meminta bantuan Guru BK.',
    aspects: [
      {
        id: 1,
        title: 'Peka melihat perubahan sahabat',
        desc: 'Sadari tanda cemas dan takut saat sahabatmu sedang punya masalah.',
      },
      {
        id: 2,
        title: 'Dengarkan cerita tanpa menyalahkan',
        desc: 'Jadi teman curhat yang menenangkan tanpa memaksa atau menyalahkan korban.',
      },
      {
        id: 3,
        title: 'Temani cari bantuan Guru BK',
        desc: 'Ajak dan temani sahabatmu melapor ke Guru BK, jangan nekat melabrak pelaku sendirian.',
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
      'Seorang kakak kelas menghadangmu di dekat gerbang dan memaksa ikut ke tempat sepi. Misi utamamu adalah menolak ajakan itu dengan tegas, segera menuju pos satpam yang aman bersama Naya, dan melaporkan kejadiannya.',
    aspects: [
      {
        id: 1,
        title: 'Berani menolak paksaan',
        desc: 'Tegas berkata tidak dan menolak ikut saat ada ajakan atau paksaan yang mencurigakan.',
      },
      {
        id: 2,
        title: 'Segera menuju tempat aman',
        desc: 'Cepat pindah ke tempat ramai yang ada satpam atau guru bersama temanmu.',
      },
      {
        id: 3,
        title: 'Catat kejadian dan lapor resmi',
        desc: 'Ingat urutan kejadian dengan jelas lalu laporkan ke Guru BK dan orang tua.',
      },
    ],
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((episode) => episode.id === id) ?? null;
}
