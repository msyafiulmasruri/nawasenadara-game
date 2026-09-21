// Penyimpanan preferensi audio pemain (SFX/BGM volume + mute) di
// localStorage — sama pola dengan progressStore.js. Dibaca oleh
// BasePlayerScene tiap kali AudioManager baru dibuat (tiap masuk
// episode), dan ditulis oleh SettingsScene saat pemain mengubah slider.

const STORAGE_KEY = 'nawasenadara_settings_v1';

const DEFAULTS = {
  sfxVolume: 0.6, // sinkron dengan default AudioManager.sfxGain
  bgmVolume: 0.25, // sinkron dengan default AudioManager.bgmGain
  muted: false,
};

function readRaw() {
  if (typeof window === 'undefined') return { ...DEFAULTS };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS };
    return {
      sfxVolume: clamp01(parsed.sfxVolume ?? DEFAULTS.sfxVolume),
      bgmVolume: clamp01(parsed.bgmVolume ?? DEFAULTS.bgmVolume),
      muted: Boolean(parsed.muted),
    };
  } catch (e) {
    console.warn('Gagal membaca pengaturan audio lokal, pakai default.', e);
    return { ...DEFAULTS };
  }
}

function writeRaw(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Gagal menyimpan pengaturan audio lokal.', e);
  }
}

function clamp01(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function getSettings() {
  return readRaw();
}

export function setSfxVolume(v) {
  const data = readRaw();
  data.sfxVolume = clamp01(v);
  writeRaw(data);
  return data;
}

export function setBgmVolume(v) {
  const data = readRaw();
  data.bgmVolume = clamp01(v);
  writeRaw(data);
  return data;
}

export function setMuted(muted) {
  const data = readRaw();
  data.muted = Boolean(muted);
  writeRaw(data);
  return data;
}
