// Utility fullscreen bersama — dipakai di halaman login/register (lewat
// Providers.js, global untuk SEMUA halaman) dan juga di TitleScene game
// (lihat features/game-engine/scenes/TitleScene.js).
//
// CATATAN PENTING soal iOS Safari: Fullscreen API (document.
// requestFullscreen) TIDAK didukung sama sekali di Safari iPhone/iPad
// versi browser biasa — ini keterbatasan platform Apple, bukan bug kita.
// Satu-satunya cara reliable menghilangkan address bar di iOS adalah
// meng-install web app ini ke Home Screen (PWA, lihat manifest.json +
// meta tag apple-mobile-web-app-capable di layout.js) — begitu dibuka
// dari ikon Home Screen, otomatis berjalan tanpa address bar tanpa perlu
// panggil API apa pun. Fungsi di bawah tetap dipanggil di iOS (untuk
// jaga-jaga versi Safari yang mendukung vendor-prefixed webkit API),
// tapi kalau gagal/tidak didukung, akan diam-diam diabaikan (tidak
// error, tidak mengganggu alur normal).
export function requestAppFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;

  const el = document.documentElement;
  const req = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
  if (!req) return;

  try {
    const result = req.call(el);
    // Beberapa browser mengembalikan Promise, sebagian lagi tidak.
    if (result?.catch) {
      result.catch(() => {
        // Ditolak/tidak didukung — abaikan, tidak perlu ditampilkan ke user.
      });
    }
  } catch (e) {
    // Browser lama yang bahkan melempar error sinkron alih-alih menolak
    // Promise-nya — tetap diamankan supaya tidak meng-crash halaman.
  }
}

/**
 * Pasang listener SEKALI SAJA untuk interaksi pertama pengguna di
 * mana pun di halaman (klik, tap, atau keydown), lalu otomatis minta
 * fullscreen saat itu terjadi. Dipanggil dari Providers.js supaya
 * berlaku global di SEMUA halaman (login, register, game, dst.) —
 * bukan cuma di dalam game — sesuai permintaan supaya fullscreen sudah
 * aktif dari sejak halaman login, bukan menunggu sampai masuk /game.
 *
 * `capture: true` supaya listener ini menangkap event lebih dulu
 * sebelum sempat di-stopPropagation oleh elemen lain (mis. tombol form),
 * dan `{ once: true }` supaya otomatis lepas sendiri setelah terpakai
 * sekali (tidak perlu terus-terusan mendengarkan sepanjang sesi).
 */
export function setupAutoFullscreenOnFirstInteraction() {
  if (typeof window === 'undefined') return () => {};

  const handler = () => {
    requestAppFullscreen();
  };

  window.addEventListener('pointerdown', handler, { capture: true, once: true });
  window.addEventListener('keydown', handler, { capture: true, once: true });

  return () => {
    window.removeEventListener('pointerdown', handler, { capture: true });
    window.removeEventListener('keydown', handler, { capture: true });
  };
}
