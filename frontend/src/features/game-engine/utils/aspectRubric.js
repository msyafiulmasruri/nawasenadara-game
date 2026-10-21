import { getEpisodeById, EPISODES } from '../config/episodes';

const REPORT_STORAGE_KEY = 'nawasenadara_aspect_report_v1';

/**
 * Logika pemetaan pilihan jawaban terhadap 3 Aspek Capaian Psikologis per episode.
 * Sesuai arahan psikolog: bahasa santai, edukatif, dan jelas bagi siswa SMP/SMA.
 */
const EPISODE_ASPECT_EVALUATORS = {
  1: (choices) => {
    // Episode 1: n3 dan n5
    const choiceN3 = choices.find((c) => c.nodeId === 'n3')?.choiceId;
    const choiceN5 = choices.find((c) => c.nodeId === 'n5')?.choiceId;

    // Aspek 1: Kenali candaan yang merendahkan
    const a1 = choiceN3 === 'b' || choiceN5 === 'a' || choiceN5 === 'b';
    // Aspek 2: Sampaikan rasa tidak nyaman
    const a2 = choiceN3 === 'b' || choiceN5 === 'a';
    // Aspek 3: Bicara tenang tanpa membalas kasar
    const a3 = choiceN5 === 'a' && choiceN3 !== 'c' && choiceN5 !== 'c';

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu sadar kalau omongan yang meremehkan perempuan itu bukan candaan biasa.',
        feedbackMissing: 'Kamu masih membiarkan candaan yang merendahkan lewat begitu saja.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu berani jujur bilang tidak nyaman saat candaan teman kelewat batas.',
        feedbackMissing: 'Kamu belum berani bilang secara langsung kalau candaan itu bikin tidak nyaman.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu menyampaikan sikap dengan tenang tanpa diam memendam atau membalas kasar.',
        feedbackMissing: 'Kamu sempat terpancing membalas dengan emosi atau memilih diam memendam sendiri.',
      },
    ];
  },

  2: (choices) => {
    // Episode 2: n3 dan n6
    const choiceN3 = choices.find((c) => c.nodeId === 'n3')?.choiceId;
    const choiceN6 = choices.find((c) => c.nodeId === 'n6')?.choiceId;

    const a1 = choiceN3 === 'a' || (choiceN3 === 'b' && choiceN6 !== 'c');
    const a2 = choiceN3 === 'a' || choiceN6 === 'a';
    const a3 = choiceN3 === 'a' && choiceN6 === 'a';

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu peka kalau menertawakan foto teman di grup chat itu menyakitkan hati.',
        feedbackMissing: 'Kamu belum sadar kalau ikut menertawakan di grup chat bisa melukai perasaan teman.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu hadir menyapa dan menemani Kirana supaya dia tidak merasa sendirian.',
        feedbackMissing: 'Kamu masih ragu untuk menghampiri dan menemani Kirana yang sedang sedih.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu menolak ikut menyebarkan ejekan dan berani mengingatkan teman.',
        feedbackMissing: 'Kamu sempat diam saja atau ikut terbawa suasana grup yang mengejek teman.',
      },
    ];
  },

  3: (choices) => {
    // Episode 3: n_cb1, n_cb2, n_cb3_choice, n_cb4
    const cb1 = choices.find((c) => c.nodeId === 'n_cb1')?.choiceId;
    const cb2 = choices.find((c) => c.nodeId === 'n_cb2')?.choiceId;
    const cb3 = choices.find((c) => c.nodeId === 'n_cb3_choice' || c.nodeId === 'n_cb3')?.choiceId;
    const cb4 = choices.find((c) => c.nodeId === 'n_cb4')?.choiceId;

    const blockedEarly = cb1 === 'a' || cb2 === 'a';
    // Aspek 1: Waspada bujukan akun asing
    const a1 = blockedEarly || cb3 === 'a' || cb3 === 'b';
    // Aspek 2: Tolak beri data dan foto pribadi
    const a2 = blockedEarly || cb3 === 'a' || cb3 === 'b' || cb4 === 'a';
    // Aspek 3: Simpan bukti, blokir, dan lapor
    const a3 = blockedEarly || cb3 === 'a' || (cb3 === 'b' && cb4 === 'a');

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu cepat curiga dan waspada saat ada akun asing yang sok akrab.',
        feedbackMissing: 'Kamu sempat terpancing meladeni obrolan akun asing yang mencurigakan.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu tegas menjaga privasi dan menolak memberikan nomor HP atau foto diri.',
        feedbackMissing: 'Kamu sempat panik dan hampir menuruti paksaan orang asing di internet.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu menyimpan bukti chat, memblokir akun, dan cerita ke orang tua.',
        feedbackMissing: 'Kamu belum langsung memblokir dan melapor ke orang dewasa sejak tanda bahaya muncul.',
      },
    ];
  },

  4: (choices) => {
    // Episode 4: n3 dan n6 (kantin)
    const choiceN3 = choices.find((c) => c.nodeId === 'n3')?.choiceId;
    const choiceN6 = choices.find((c) => c.nodeId === 'n6')?.choiceId;

    const a1 = choiceN3 === 'a' || (choiceN3 === 'b' && choiceN6 !== 'c');
    const a2 = choiceN3 === 'a' || choiceN6 === 'a';
    const a3 = choiceN6 === 'a' && choiceN3 !== 'c';

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu paham kalau tubuh dan penampilanmu bukan bahan lelucon orang lain.',
        feedbackMissing: 'Kamu masih membiarkan komentar soal fisik dianggap candaan biasa.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu berani bilang tidak suka dengan tegas dan tetap tenang.',
        feedbackMissing: 'Kamu masih sungkan atau takut bilang kalau komentar itu bikin tidak nyaman.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu memilih menjauh ke tempat aman dan melibatkan guru jika tetap diganggu.',
        feedbackMissing: 'Kamu sempat terpancing membalas dengan marah atau diam di situasi yang tidak aman.',
      },
    ];
  },

  5: (choices) => {
    // Episode 5: n_icebreak dan n_action
    const ice = choices.find((c) => c.nodeId === 'n_icebreak' || c.nodeId === 'n3')?.choiceId;
    const act = choices.find((c) => c.nodeId === 'n_action' || c.nodeId === 'n6')?.choiceId;

    const a1 = ice === 'a' || ice === 'b';
    const a2 = ice !== 'c' && act !== 'c';
    const a3 = act === 'a';

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu peka melihat perubahan Kirana dan menyapanya dengan ramah.',
        feedbackMissing: 'Cara menyapamu sempat terkesan menuduh sehingga teman makin takut bercerita.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu mendengarkan cerita Kirana dengan sabar tanpa menyalahkannya.',
        feedbackMissing: 'Kamu sempat terpancing emosi atau membuat Kirana merasa disalahkan.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu langsung menemani Kirana mencari bantuan aman ke Guru BK.',
        feedbackMissing: 'Kamu menunda ke Guru BK atau malah ingin melabrak pelaku sendirian yang berbahaya.',
      },
    ];
  },

  6: (choices) => {
    // Episode 6: n3 dan n6 (gerbang sekolah & pos satpam)
    const choiceN3 = choices.find((c) => c.nodeId === 'n3')?.choiceId;
    const choiceN6 = choices.find((c) => c.nodeId === 'n6')?.choiceId;

    const a1 = choiceN3 === 'a' || choiceN3 === 'b';
    const a2 = choiceN3 === 'a' || choiceN6 === 'a' || choiceN6 === 'b';
    const a3 = choiceN6 === 'a' && choiceN3 !== 'c';

    return [
      {
        id: 1,
        fulfilled: a1,
        feedbackSuccess: 'Kamu berani menolak paksaan saat dihadang di dekat gerbang sekolah.',
        feedbackMissing: 'Kamu sempat membeku dan ragu menolak saat dipaksa ikut ke tempat sepi.',
      },
      {
        id: 2,
        fulfilled: a2,
        feedbackSuccess: 'Kamu segera menjauh ke pos satpam yang ramai dan ada orang dewasa.',
        feedbackMissing: 'Kamu kurang sigap menjaga jarak dan mencari perlindungan di tempat aman.',
      },
      {
        id: 3,
        fulfilled: a3,
        feedbackSuccess: 'Kamu mencatat urutan kejadian dengan jelas dan melapor resmi bersama teman.',
        feedbackMissing: 'Kamu menunda laporan atau ingin menyebarkannya di medsos yang justru berisiko.',
      },
    ];
  },
};

/**
 * Menghitung evaluasi pemenuhan aspek untuk episode tertentu.
 */
export function evaluateEpisodeAspects(episodeId, choices = []) {
  const epData = getEpisodeById(episodeId);
  const rawAspects = epData?.aspects || [];

  const evaluator = EPISODE_ASPECT_EVALUATORS[episodeId];
  const evalResults = evaluator ? evaluator(choices) : [
    { id: 1, fulfilled: true, feedbackSuccess: 'Langkah pertama berhasil.', feedbackMissing: 'Perlu latihan lagi.' },
    { id: 2, fulfilled: true, feedbackSuccess: 'Langkah kedua berhasil.', feedbackMissing: 'Perlu latihan lagi.' },
    { id: 3, fulfilled: true, feedbackSuccess: 'Langkah ketiga berhasil.', feedbackMissing: 'Perlu latihan lagi.' },
  ];

  const aspectItems = rawAspects.map((aspectDef, index) => {
    const res = evalResults[index] || { fulfilled: false };
    return {
      id: aspectDef.id,
      title: aspectDef.title,
      desc: aspectDef.desc,
      fulfilled: Boolean(res.fulfilled),
      feedback: res.fulfilled ? res.feedbackSuccess : res.feedbackMissing,
    };
  });

  const fulfilledAspects = aspectItems.filter((a) => a.fulfilled);
  const pendingAspects = aspectItems.filter((a) => !a.fulfilled);
  const fulfilledCount = fulfilledAspects.length;
  const totalCount = aspectItems.length;

  // Klasifikasi Ending berdasarkan 3 Aspek:
  // - 3/3 Terpenuhi -> Ending Sejati ('true')
  // - 1/3 atau 2/3 Terpenuhi -> Ending Baik ('good')
  // - 0/3 Terpenuhi -> Ending Buruk ('bad')
  let endingKey = 'good';
  if (fulfilledCount === totalCount) {
    endingKey = 'true';
  } else if (fulfilledCount === 0) {
    endingKey = 'bad';
  } else {
    endingKey = 'good';
  }

  // Jika 0 aspek terpenuhi, siswa mendapatkan Ending Buruk tapi tetap
  // diberikan opsi 'Lanjutkan Saja' supaya bisa tercatat di rekapan Guru BK.
  const canAdvance = true;
  const needsRetry = endingKey === 'bad';

  let endingTitle = '';
  let endingSummary = '';
  let feedbackSummary = '';

  if (fulfilledCount === totalCount) {
    endingTitle = 'Misi Berhasil - Semua 3 Langkah Terpenuhi (Ending Sejati)';
    endingSummary =
      'Hebat! Kamu sudah memenuhi ketiga langkah tujuan di episode ini:\n' +
      fulfilledAspects.map((a) => `${a.id}. ${a.title}`).join('\n');
    feedbackSummary =
      'Luar biasa! Semua 3 langkah tujuan di episode ini sudah kamu penuhi dengan tepat. Kamu mendapatkan Ending Sejati!';
  } else if (fulfilledCount > 0) {
    endingTitle = `Misi Cukup Baik - ${fulfilledCount} dari ${totalCount} Langkah Terpenuhi (Ending Baik)`;
    endingSummary =
      `Kamu sudah memenuhi:\n` +
      fulfilledAspects.map((a) => `${a.id}. ${a.title}`).join('\n') +
      `\n\nSayang sekali kamu belum memenuhi ${pendingAspects.length === 1 ? '1 langkah terakhir yaitu' : 'langkah ini'}:\n` +
      pendingAspects.map((a) => `${a.id}. ${a.title}`).join('\n');
    feedbackSummary =
      `Kamu sudah memenuhi: ${fulfilledAspects.map((a) => `(${a.id}) ${a.title}`).join(', ')}.\n` +
      `Langkah belum terpenuhi: ${pendingAspects.map((a) => `(${a.id}) ${a.title}`).join(', ')}. Kamu mendapatkan Ending Baik.`;
  } else {
    endingTitle = 'Misi Belum Berhasil - 0 Langkah Terpenuhi (Ending Buruk)';
    endingSummary =
      'Sayang sekali kamu belum memenuhi satu pun dari 3 langkah tujuan di episode ini:\n' +
      aspectItems.map((a) => `${a.id}. ${a.title}`).join('\n') +
      '\n\nKamu bisa mengulangi episode ini untuk memperbaikinya, atau memilih lanjutkan saja ke jurnal refleksi.';
    feedbackSummary =
      'Belum ada langkah tujuan yang terpenuhi di episode ini (Ending Buruk). Kamu bisa mengulang episode untuk mencoba pilihan yang lebih tepat, atau lanjutkan saja.';
  }

  const result = {
    episodeId,
    episodeTitle: epData?.title || `Episode ${episodeId}`,
    aspects: aspectItems,
    fulfilledAspects,
    pendingAspects,
    fulfilledCount,
    totalCount,
    endingKey,
    canAdvance,
    needsRetry,
    endingTitle,
    endingSummary,
    feedbackSummary,
  };

  saveEpisodeAspectEvaluation(episodeId, result);
  return result;
}

/**
 * Menyimpan evaluasi aspek ke LocalStorage untuk keperluan Rapor Capaian Akhir Episode 6.
 */
export function saveEpisodeAspectEvaluation(episodeId, evaluation) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    const report = raw ? JSON.parse(raw) : {};
    report[episodeId] = {
      episodeId,
      episodeTitle: evaluation.episodeTitle,
      fulfilledCount: evaluation.fulfilledCount,
      totalCount: evaluation.totalCount,
      aspects: evaluation.aspects,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
    window.__nawasenadaraAspectReport = report;
  } catch (err) {
    console.warn('Gagal menyimpan evaluasi aspek rapor:', err);
  }
}

/**
 * Mengambil seluruh data rapor 6 episode untuk ditampilkan di akhir Episode 6.
 */
export function getFullAspectReport() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
