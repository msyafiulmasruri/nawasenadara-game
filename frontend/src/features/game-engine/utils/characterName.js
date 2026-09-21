// Nama tokoh utama yang diisi pemain sekali di MenuScene, sebelum
// "Start Story" pertama kali (lihat catatan panjang di migration
// backend 1752700000006_add-character-name-to-users.js untuk alasan
// kenapa ini terpisah dari nama akun).
//
// Pola cache-nya SAMA PERSIS seperti progressStore.js: GameProfileBridge.jsx
// mengambil dari server sekali saat game dimuat dan menaruhnya di
// window.__nawasenadaraCharacterName supaya Phaser scene mana pun bisa
// membacanya secara SINKRON (dialogue nodes butuh string, bukan
// Promise). localStorage dipakai sebagai fallback kalau bridge belum
// sempat memuat / request gagal.

const STORAGE_KEY = 'nawasenadara_character_name_v1';

export function getCharacterName() {
  if (typeof window !== 'undefined' && window.__nawasenadaraCharacterName) {
    return window.__nawasenadaraCharacterName;
  }
  if (typeof window === 'undefined') return 'Kamu';
  try {
    return window.localStorage.getItem(STORAGE_KEY) || 'Kamu';
  } catch (e) {
    return 'Kamu';
  }
}

export function hasCharacterName() {
  const name = getCharacterName();
  return Boolean(name && name !== 'Kamu');
}

// Dipanggil GameProfileBridge.jsx setelah fetch server ATAU setelah
// pemain submit nama baru — memperbarui cache in-memory + localStorage
// sekaligus supaya keduanya selalu sinkron.
export function setCharacterNameCache(name) {
  if (typeof window !== 'undefined') {
    window.__nawasenadaraCharacterName = name;
    try {
      window.localStorage.setItem(STORAGE_KEY, name);
    } catch (e) {
      // Diam-diam saja — localStorage cuma fallback, bukan sumber utama.
    }
  }
}
