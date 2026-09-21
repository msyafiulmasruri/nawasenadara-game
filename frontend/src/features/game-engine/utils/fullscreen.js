/**
 * Helper fullscreen & orientation lock yang dipakai bersama oleh overlay
 * "Tap untuk Mulai" (React, PhaserGame.jsx) dan tombol fullscreen di
 * dalam game (Phaser, BasePlayerScene.js).
 *
 * CATATAN PENTING SOAL SAFARI iOS (harus dipahami, bukan bug yang bisa
 * "diperbaiki" lewat trik kode):
 * - Safari di iOS TIDAK mengimplementasikan Fullscreen API sama sekali
 *   untuk halaman web biasa (`element.requestFullscreen` tidak ada /
 *   selalu ditolak diam-diam). Ini keterbatasan platform dari Apple,
 *   bukan bug di kode kita — semua game/web berbasis canvas di Safari
 *   iOS mengalami hal yang sama.
 * - Satu-satunya cara dapat pengalaman "fullscreen tanpa address bar"
 *   di iOS adalah lewat "Add to Home Screen" (PWA) — begitu dibuka
 *   dari ikon Home Screen, iOS menjalankannya dalam mode `standalone`
 *   yang otomatis tanpa chrome browser sama sekali (diatur lewat
 *   manifest.json `display: "fullscreen"` + meta tag
 *   `apple-mobile-web-app-capable` yang sudah ada di layout.js).
 * - `screen.orientation.lock()` juga TIDAK didukung oleh Safari/WebKit
 *   di iOS dalam bentuk apa pun (baik tab biasa maupun standalone PWA).
 *   Di Android Chrome, lock ini hanya berfungsi saat elemen sedang
 *   fullscreen. Karena itu fungsi ini SELALU dibungkus try/catch dan
 *   gagal secara diam-diam di platform yang tidak mendukungnya —
 *   desain game tetap harus responsive di kedua orientasi (lihat
 *   scene-scene lain) sebagai jaring pengaman utama, bukan mengandalkan
 *   lock ini berhasil.
 */

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  // iPadOS 13+ melaporkan diri sebagai "Macintosh" tapi punya touch —
  // dibedakan dari Mac beneran lewat maxTouchPoints.
  const iPadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return iOSDevice || iPadOS13;
}

export function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  const mql = window.matchMedia?.('(display-mode: standalone)').matches;
  // `navigator.standalone` adalah properti non-standar khusus Safari iOS.
  return Boolean(mql || window.navigator.standalone);
}

export function isFullscreenSupported() {
  if (typeof document === 'undefined') return false;
  const el = document.documentElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen);
}

export function isCurrentlyFullscreen() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

/** Coba masuk fullscreen. Selalu aman dipanggil walau tidak didukung. */
export async function requestFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen ?? el.webkitRequestFullscreen ?? el.msRequestFullscreen;
  if (!req) return false;
  try {
    await req.call(el);
    return true;
  } catch {
    return false;
  }
}

export async function exitFullscreen() {
  const exit = document.exitFullscreen ?? document.webkitExitFullscreen ?? document.msExitFullscreen;
  if (!exit) return false;
  try {
    await exit.call(document);
    return true;
  } catch {
    return false;
  }
}

/**
 * Coba kunci rotasi ke orientasi SAAT INI (apa pun posisi HP saat
 * pemain menekan tombol mulai) — ini yang dimaksud "jaga-jaga" supaya
 * layar tidak berubah orientasi di tengah sesi lalu memicu bug reflow.
 * Cuma benar-benar berefek di Android Chrome/Edge dan HARUS dalam
 * keadaan fullscreen; di browser/OS lain gagal diam-diam.
 */
export async function tryLockCurrentOrientation() {
  try {
    const orientation = window.screen?.orientation;
    if (!orientation?.lock) return false;
    const type = orientation.type?.startsWith('portrait') ? 'portrait' : 'landscape';
    await orientation.lock(type);
    return true;
  } catch {
    return false;
  }
}

export async function unlockOrientation() {
  try {
    window.screen?.orientation?.unlock?.();
  } catch {
    // abaikan
  }
}
