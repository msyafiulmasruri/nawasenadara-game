// Progres episode — sekarang di-backing OLEH BACKEND (tabel
// user_episode_progress), bukan cuma localStorage lagi. Lihat
// GameProgressBridge.jsx untuk penjelasan pola cache-nya.
//
// Semua fungsi di file ini TETAP SINKRON (tidak ada async/await di
// signature-nya) supaya scene manapun yang sudah memanggilnya
// (EpisodeSelectScene, Episode1Scene, PlaceholderEpisodeScene, dst.)
// tidak perlu di-refactor jadi async — baca selalu dari cache yang
// sudah dimuat GameProgressBridge, tulis selalu fire-and-forget ke
// backend di belakang layar.
//
// localStorage TETAP dipakai sebagai fallback kalau: (a) bridge belum
// sempat memuat cache dari server (mis. request pertama masih
// berjalan), atau (b) request ke server gagal (offline/error) — supaya
// pengalaman main tidak pernah benar-benar terhenti gara-gara masalah
// jaringan.

const STORAGE_KEY = 'nawasenadara_progress_v1';

function readLocalRaw() {
  if (typeof window === 'undefined') return { completed: [] };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || !Array.isArray(parsed.completed)) return { completed: [] };
    return parsed;
  } catch (e) {
    console.warn('Gagal membaca progres lokal, mulai dari awal.', e);
    return { completed: [] };
  }
}

function writeLocalRaw(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan progres lokal.', e);
  }
}

// Kalau cache dari server sudah ada, itu SUMBER UTAMA. Kalau belum
// (bridge belum sempat fetch, atau gagal), pakai localStorage.
function getCompletedEpisodesFromCache() {
  if (typeof window === 'undefined') return null;
  const cache = window.__nawasenadaraProgressCache;
  if (!Array.isArray(cache)) return null;
  return cache.filter((row) => row.status === 'completed').map((row) => row.episode_id);
}

export function getCompletedEpisodes() {
  const fromServer = getCompletedEpisodesFromCache();
  if (fromServer) return fromServer;
  return readLocalRaw().completed;
}

// Episode 1 selalu terbuka. Episode lain terbuka kalau episode
// sebelumnya (id - 1) sudah pernah diselesaikan — ATAU kalau cache
// server sudah eksplisit menandainya 'unlocked'/'in_progress'/
// 'completed' (lebih akurat daripada cuma menghitung mundur dari
// daftar completed, kalau suatu saat ada cara lain untuk unlock).
export function isEpisodeUnlocked(episodeId) {
  if (episodeId === 1) return true;

  if (typeof window !== 'undefined' && Array.isArray(window.__nawasenadaraProgressCache)) {
    const row = window.__nawasenadaraProgressCache.find((r) => r.episode_id === episodeId);
    if (row && row.status !== 'locked') return true;
  }

  return getCompletedEpisodes().includes(episodeId - 1);
}

export function completeEpisode(episodeId, choices) {
  // 1) Update state LOKAL dulu (localStorage + cache in-memory) supaya
  //    UI (EpisodeSelectScene) langsung terasa responsif tanpa nunggu
  //    network.
  const data = readLocalRaw();
  if (!data.completed.includes(episodeId)) {
    data.completed.push(episodeId);
    writeLocalRaw(data);
  }

  if (typeof window !== 'undefined' && Array.isArray(window.__nawasenadaraProgressCache)) {
    const cache = window.__nawasenadaraProgressCache;
    const existing = cache.find((r) => r.episode_id === episodeId);
    if (existing) existing.status = 'completed';

    const next = cache.find((r) => r.episode_id === episodeId + 1);
    if (next && next.status === 'locked') next.status = 'unlocked';
  }

  // 2) Kirim ke backend di belakang layar (fire-and-forget) — lihat
  //    GameProgressBridge.jsx. Kalau bridge belum terpasang (mis.
  //    dipanggil sebelum GameProgressBridge sempat mount), diam-diam
  //    dilewati; progres tetap benar secara lokal.
  if (typeof window !== 'undefined') {
    window.__nawasenadaraProgress?.updateStatus(episodeId, 'completed', choices || []);
  }
}

// Dipanggil saat sebuah scene episode BARU DIMUAT (bukan saat
// selesai) — menandai 'in_progress' di server, supaya dashboard guru
// BK bisa membedakan "belum pernah dicoba" vs "sedang dijalani" (lihat
// kolom episodes_in_progress di /api/bk/students).
export function markEpisodeInProgress(episodeId) {
  if (typeof window !== 'undefined') {
    window.__nawasenadaraProgress?.updateStatus(episodeId, 'in_progress');
  }
}

// FIX: "chat Kak Dara hilang lagi setelah lanjut permainan lama" —
// sebelumnya status "sudah ngobrol sama NPC episode 1" (yang membuka
// ikon chat Kak Dara) HANYA dibaca dari getCompletedEpisodes(), yaitu
// daftar episode yang SUDAH TUNTAS SEPENUHNYA (sampai ke ujung level).
// Kalau pemain baru ngobrol dengan Rafi tapi belum sempat menuntaskan
// episode 1 (belum jalan sampai ujung), lalu keluar & lanjut lagi nanti
// (baik sesi browser baru maupun setelah reload), tidak ada baris
// manapun yang menandai "sudah ngobrol" — ikon chat hilang lagi dan
// pemain dipaksa mengulang dialog dari awal, padahal progresnya ada.
//
// Fix-nya: simpan status ini SEGERA setelah dialog dengan NPC selesai
// (bukan menunggu episode tuntas), memakai kolom `choices` yang memang
// sudah ada di tabel user_episode_progress (JSONB, riwayat pilihan
// dialog) — dialog dengan NPC episode 1 selalu punya minimal satu
// choice point, jadi array `choices` yang terisi = bukti valid bahwa
// pemain sudah menuntaskan dialog itu. Tidak perlu kolom/migrasi baru.
//
// Cache in-memory (window.__nawasenadaraProgressCache) di-update
// LANGSUNG di sini (bukan cuma dikirim ke server) supaya kalau scene
// di-restart di sesi yang sama (mis. rotasi layar memicu
// scene.restart()) sebelum request PUT ke server selesai, status ini
// tetap kebaca benar — sama seperti pola completeEpisode() di atas.
export function markNpcTalked(episodeId, choices = []) {
  if (typeof window === 'undefined') return;

  if (Array.isArray(window.__nawasenadaraProgressCache)) {
    const cache = window.__nawasenadaraProgressCache;
    const existing = cache.find((r) => r.episode_id === episodeId);
    if (existing) {
      existing.choices = choices;
      if (existing.status === 'locked' || !existing.status) existing.status = 'in_progress';
    } else {
      cache.push({ episode_id: episodeId, status: 'in_progress', choices });
    }
  }

  window.__nawasenadaraProgress?.updateStatus(episodeId, 'in_progress', choices);
}

// Dibaca scene episode (mis. Episode1Scene.create()) untuk memutuskan
// apakah ikon chat Kak Dara & quest NPC-nya harus dianggap "sudah
// selesai" sejak scene ini dimuat — true kalau episode-nya sudah
// pernah dituntaskan SEPENUHNYA (getCompletedEpisodes), ATAU baris
// progres episode ini di cache sudah punya riwayat `choices` (artinya
// pemain sudah pernah menuntaskan dialog NPC-nya, lihat markNpcTalked
// di atas), meski episode itu sendiri belum ditamatkan.
export function hasTalkedToNpc(episodeId) {
  if (getCompletedEpisodes().includes(episodeId)) return true;

  if (typeof window !== 'undefined' && Array.isArray(window.__nawasenadaraProgressCache)) {
    const row = window.__nawasenadaraProgressCache.find((r) => r.episode_id === episodeId);
    if (row && Array.isArray(row.choices) && row.choices.length > 0) return true;
  }

  return false;
}

export function resetProgress() {
  writeLocalRaw({ completed: [] });
  if (typeof window !== 'undefined' && Array.isArray(window.__nawasenadaraProgressCache)) {
    window.__nawasenadaraProgressCache = window.__nawasenadaraProgressCache.map((row) => ({
      ...row,
      status: row.episode_id === 1 ? 'unlocked' : 'locked',
    }));
  }
  // Catatan: ini TIDAK mereset status di server (belum ada endpoint
  // reset progres) — cuma reset tampilan lokal. Kalau nanti dibutuhkan
  // reset sungguhan di server juga, perlu endpoint baru
  // (mis. DELETE /api/progress) mengikuti pola yang sama seperti
  // endpoint progress lainnya.
}
