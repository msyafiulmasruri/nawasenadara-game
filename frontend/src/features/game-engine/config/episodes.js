// Sumber kebenaran enam episode Nawasena Dara. Alur 1-4 mempertahankan
// tema proposal, sedangkan Episode 5-6 merangkum dukungan sebaya,
// pelaporan aman, pemulihan, dan kepemimpinan yang sebelumnya tersebar
// sampai Episode 9.

export const EPISODES = [
  {
    id: 1,
    title: 'Awal yang Baru',
    sceneKey: 'Episode1Scene',
    placeholderColor: 0x2b2340,
    bgKey: 'episode1-bg',
    bgImagePath: '/scenes/episode-1-corridor.png',
    description:
      'Di sekolah baru, sebuah candaan bias gender menguji keberanianmu menetapkan batas dengan tetap saling menghargai.',
    objective:
      'Kenali candaan yang merendahkan berdasarkan gender. Sampaikan rasa tidak nyaman dan batasmu dengan tenang, tanpa diam memendam atau membalas dengan serangan pribadi.',
  },
  {
    id: 2,
    title: 'Rahasia di Grup Kelas',
    sceneKey: 'Episode2Scene',
    placeholderColor: 0x243b55,
    bgKey: 'episode2-bg',
    bgImagePath: '/scenes/episode-2-bg.png',
    description:
      'Kirana menjadi sasaran ejekan di grup kelas. Pilihanmu menentukan apakah kamu ikut diam atau hadir sebagai teman yang aman.',
    objective:
      'Hadapi cyberbullying dengan empati dan etika digital. Hentikan penyebaran konten yang merugikan, dukung korban, dan pilih tindakan yang tidak memperbesar masalah.',
  },
  {
    id: 3,
    title: 'Pesan dari Orang Asing',
    sceneKey: 'Episode3Scene',
    placeholderColor: 0x1f2937,
    bgKey: 'episode3-bg',
    bgImagePath: '/scenes/episode-3-bg.png',
    description:
      'DM dari akun anonim terasa makin mencurigakan. Lindungi privasimu, simpan bukti, dan cari bantuan sebelum terlambat.',
    objective:
      'Kenali manipulasi dan bahaya orang asing di internet. Jangan berikan data pribadi; blokir, simpan bukti, dan libatkan orang dewasa tepercaya saat muncul ancaman.',
  },
  {
    id: 4,
    title: 'Candaan yang Tidak Nyaman',
    sceneKey: 'StoryEpisodeScene',
    placeholderColor: 0x3a2e2e,
    bgKey: 'episode4-bg',
    bgImagePath: '/scenes/episode-4-bg.jpeg',
    description:
      'Seorang senior mengomentari penampilanmu di kantin. Sampaikan batas, menjauh, atau cari bantuan dengan aman.',
    objective:
      'Kenali komentar fisik yang dibungkus sebagai candaan. Nyatakan batas secara jelas, jaga jarak aman, dan cari guru atau orang tepercaya bila perilaku berlanjut.',
  },
  {
    id: 5,
    title: 'Ketika Sahabat Berubah',
    sceneKey: 'StoryEpisodeScene',
    placeholderColor: 0x234238,
    bgKey: 'episode5-bg',
    bgImagePath: '/scenes/episode-5-bg.jpeg',
    description:
      'Kirana berubah pendiam dan cemas. Dengarkan tanpa menghakimi, cek keselamatannya, lalu bantu ia menemui orang tepercaya.',
    objective:
      'Kenali tanda seseorang mungkin mengalami kekerasan. Dengarkan dan percaya tanpa memaksa, periksa keselamatannya, lalu tawarkan pendampingan menuju bantuan yang ia percaya.',
  },
  {
    id: 6,
    title: 'Langkah Berani Bersama',
    sceneKey: 'StoryEpisodeScene',
    placeholderColor: 0x1a1a2e,
    bgKey: 'episode6-bg',
    // Aset yang semula bernama episode-6-bg.jpeg adalah taman Episode 5.
    // Episode 6 memakai fallback terarah sampai latar final diunggah.
    bgImagePath: null,
    description:
      'Tekanan di jalan pulang menguji keberanianmu berkata tidak. Cari tempat aman, lapor dengan dukungan, lalu bangun langkah bersama.',
    objective:
      'Berlatih menolak dengan tegas, bergerak ke tempat aman, mencatat kejadian, dan melapor bersama pendamping. Pemulihan dan keberanianmu dapat menjadi dukungan bagi teman lain.',
  },
];

export function getEpisodeById(id) {
  return EPISODES.find((episode) => episode.id === id) ?? null;
}
