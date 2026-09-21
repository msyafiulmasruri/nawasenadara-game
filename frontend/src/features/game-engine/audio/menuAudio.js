import AudioManager from './AudioManager';

/**
 * menuAudio.js
 *
 * BUG SEBELUMNYA: TitleScene membuat `new AudioManager()` miliknya
 * sendiri lalu men-destroy()-nya di event 'shutdown' — padahal
 * 'shutdown' terpicu SAAT ITU JUGA ketika pemain menekan Space/klik
 * (karena listener yang sama juga langsung memanggil
 * `this.scene.start('MenuScene')`). Akibatnya BGM baru sempat mulai
 * sepersekian detik lalu langsung di-destroy — pemain nyaris tidak
 * pernah benar-benar mendengarnya.
 *
 * FIX: satu instance AudioManager di-share (module-level singleton)
 * antara TitleScene, MenuScene, dan SettingsScene, TIDAK terikat ke
 * lifecycle scene manapun. Musik menu jalan terus selagi pemain ada di
 * area Title/Menu/Settings, dan baru dihentikan secara eksplisit saat
 * masuk ke gameplay episode sungguhan (lihat stopMenuBGM() dipanggil
 * dari BasePlayerScene.create(), sebelum BGM gameplay-nya sendiri
 * mulai).
 */

let instance = null;
let playing = false;

function getInstance() {
  if (!instance) {
    instance = new AudioManager();
  }
  return instance;
}

export function startMenuBGM(settings) {
  const mgr = getInstance();
  if (!mgr._initialized) {
    mgr.init();
  }
  if (settings) {
    mgr.setBGMVolume(settings.bgmVolume);
    if (settings.muted) mgr.setMasterVolume(0);
  }
  if (playing) return; // sudah jalan — jangan mulai dobel
  playing = true;
  mgr.startMenuBGM();
}

export function stopMenuBGM() {
  if (!instance) return;
  instance.stopBGM();
  playing = false;
}

export function isMenuBGMPlaying() {
  return playing;
}

export function getMenuAudioManager() {
  return getInstance();
}
