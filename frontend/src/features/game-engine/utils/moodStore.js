// Store singleton kecil untuk "mood" pemain yang dideteksi AI —
// dipakai oleh HUD profil (BasePlayerScene) untuk menampilkan kondisi
// emosional terkini pemain di pojok kiri atas, sekarang dalam bentuk
// progress bar (bukan cuma emotikon) — `value` (0..1) menentukan
// panjang batang, `color` menentukan warnanya.
//
// Sumber datanya DUA endpoint yang sudah ada (bukan endpoint baru):
//   - POST /api/nlp/analyze     (jurnal refleksi akhir episode)
//     -> hasil.label + hasil.confidence dipakai lewat setMood()
//   - POST /api/nlp/counseling  (tiap giliran chat dengan Kak Dara)
//     -> hasil.emotion_detected + hasil.emotion_confidence dipakai
//        lewat setMood()
// Lihat pemanggilannya di GameUIBridge.jsx (submitJournal &
// sendChatMessage). Modul ini murni state in-memory (bukan lewat
// window bridge) karena baik GameUIBridge.jsx maupun BasePlayerScene
// sama-sama modul JS yang bisa langsung import file ini — tidak perlu
// jembatan window seperti auth/nlp bridge (yang memang dibutuhkan
// karena Phaser scene tidak bisa akses React context/hook).
//
// Label yang dikenali mengikuti 6 kelas output model IndoBERT di
// proposal (Bab 2.2.5): aman, netral, sedih, takut, marah, menyinggung.
// `color` dalam format hex number (0xRRGGBB) supaya bisa langsung
// dipakai Phaser Rectangle.setFillStyle()/create fill color.
const MOOD_PRESETS = {
  aman: { emoji: '😊', label: 'Tenang', color: 0x4ade80 },
  netral: { emoji: '🙂', label: 'Netral', color: 0x9ca3af },
  sedih: { emoji: '😢', label: 'Sedih', color: 0x60a5fa },
  takut: { emoji: '😨', label: 'Takut', color: 0xa78bfa },
  marah: { emoji: '😠', label: 'Marah', color: 0xf87171 },
  menyinggung: { emoji: '😟', label: 'Waspada', color: 0xfb923c },
};

const DEFAULT_VALUE = 0.5;

let current = { key: 'netral', value: DEFAULT_VALUE, ...MOOD_PRESETS.netral };
const listeners = new Set();

function clamp01(n) {
  if (typeof n !== 'number' || Number.isNaN(n)) return null;
  return Math.max(0, Math.min(1, n));
}

/**
 * Dipanggil GameUIBridge.jsx setelah menerima label emosi + confidence
 * dari server.
 * @param {string} rawLabel - salah satu dari 6 label IndoBERT.
 * @param {number} [confidence] - 0..1, dipakai sebagai panjang progress
 *   bar. Kalau tidak dikirim (mis. dari sumber lama yang belum update),
 *   nilai bar sebelumnya dipertahankan supaya bar tidak tiba-tiba
 *   "kosong" tanpa alasan.
 */
export function setMood(rawLabel, confidence) {
  const key = String(rawLabel || 'netral').toLowerCase().trim();
  const preset = MOOD_PRESETS[key] ?? MOOD_PRESETS.netral;
  const value = clamp01(confidence) ?? current.value ?? DEFAULT_VALUE;
  current = { key: MOOD_PRESETS[key] ? key : 'netral', value, ...preset };
  listeners.forEach((fn) => {
    try {
      fn(current);
    } catch (e) {
      // Jangan sampai satu listener yang error mematikan listener lain.
    }
  });
}

/** Nilai mood terkini, dibaca sinkron (mis. saat HUD baru dibuat). */
export function getMood() {
  return current;
}

/** Berlangganan perubahan mood. Balikan fungsi untuk unsubscribe. */
export function onMoodChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
