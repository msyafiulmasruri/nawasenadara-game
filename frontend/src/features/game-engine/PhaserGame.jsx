'use client';

import { useEffect, useRef } from 'react';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import MenuScene from './scenes/MenuScene';
import SettingsScene from './scenes/SettingsScene';
import EpisodeSelectScene from './scenes/EpisodeSelectScene';
import EpisodeIntroScene from './scenes/EpisodeIntroScene';
import EpisodeEndingScene from './scenes/EpisodeEndingScene';
import Episode1Scene from './scenes/Episode1Scene';
import PlaceholderEpisodeScene from './scenes/PlaceholderEpisodeScene';
import { WORLD_WIDTH, WORLD_HEIGHT } from './config/gameConfig';
import { tryLockCurrentOrientation } from './utils/fullscreen';

/**
 * Minta browser masuk fullscreen pada interaksi pertama pengguna
 * (klik/tap/keypress) — TitleScene sudah menampilkan "PRESS SPACE TO
 * START" sebagai ajakan tap pertama itu, jadi TIDAK perlu overlay HTML
 * terpisah lagi di sini (sempat ditambahkan lalu dihapus lagi karena
 * jadi dobel dengan layar mulai yang sudah ada).
 * Fullscreen API WAJIB dipanggil dari user gesture, jadi tidak bisa
 * otomatis saat reload — harus menunggu satu interaksi.
 */
function setupAutoFullscreen() {
  const requestFS = () => {
    const el = document.documentElement;
    if (document.fullscreenElement) return; // sudah fullscreen
    const req =
      el.requestFullscreen ??
      el.webkitRequestFullscreen ??
      el.msRequestFullscreen;
    if (req) {
      req
        .call(el)
        .then(() => {
          // Sekalian coba kunci ke orientasi yang sedang dipakai saat
          // ini, supaya tidak berubah-ubah di tengah sesi. Gagal diam-
          // diam di platform yang tidak mendukung (termasuk iOS Safari
          // — di sana requestFullscreen sendiri juga tidak akan
          // pernah berhasil, itu keterbatasan WebKit, bukan bug kode).
          tryLockCurrentOrientation();
        })
        .catch(() => {
          // Browser menolak — abaikan saja, game tetap jalan.
        });
    }
    // Hapus semua listener setelah percobaan pertama, berhasil maupun
    // gagal, supaya tidak spam request setiap klik.
    window.removeEventListener('pointerdown', requestFS, true);
    window.removeEventListener('keydown', requestFS, true);
  };

  // `capture: true` supaya tertangkap lebih awal sebelum Phaser.
  window.addEventListener('pointerdown', requestFS, true);
  window.addEventListener('keydown', requestFS, true);

  // Kembalikan fungsi cleanup untuk useEffect.
  return () => {
    window.removeEventListener('pointerdown', requestFS, true);
    window.removeEventListener('keydown', requestFS, true);
  };
}

export default function PhaserGame() {
  const gameRef = useRef(null);
  const phaserInstance = useRef(null);

  useEffect(() => {
    // Phaser mengakses `window`, jadi wajib di-load secara dinamis
    // di sisi client saja (tidak boleh di-import biasa di top-level).
    let destroyed = false;

    // Pasang auto-fullscreen listener — akan hilang sendiri setelah
    // interaksi pertama pengguna (klik/tap/tekan tombol).
    const cleanupFS = setupAutoFullscreen();

    import('phaser').then((PhaserModule) => {
      if (destroyed || phaserInstance.current) return;

      const Phaser = PhaserModule.default ?? PhaserModule;

      const config = {
        type: Phaser.AUTO,
        parent: gameRef.current,
        scene: [
          BootScene,
          TitleScene,
          MenuScene,
          SettingsScene,
          EpisodeSelectScene,
          EpisodeIntroScene,
          EpisodeEndingScene,
          Episode1Scene,
          PlaceholderEpisodeScene,
        ],
        physics: {
          default: 'arcade',
          arcade: { gravity: { x: 0, y: 0 }, debug: false },
        },
        input: {
          // Default Phaser cuma lacak 1 pointer aktif -> tombol kiri/kanan
          // + jump tidak bisa ditekan bersamaan di HP. Dinaikkan supaya
          // beberapa jari bisa terdeteksi sekaligus (arah + run + jump).
          activePointers: 4,
        },
        scale: {
          // ENVELOP mempertahankan resolusi dunia game TETAP di
          // WORLD_WIDTH x WORLD_HEIGHT, lalu membesarkan canvas supaya
          // selalu MENUTUPI seluruh viewport tanpa area kosong (mirip
          // CSS background-size: cover). Tepi yang berlebih dipotong,
          // bukan dikasih letterbox hitam.
          //
          // PENTING: jangan batasi ukuran canvas lewat CSS (mis.
          // max-width/max-height) — canvas ENVELOP MEMANG sengaja
          // dibuat lebih besar dari viewport di salah satu sumbu,
          // supaya sumbu itu bisa di-crop rapi lewat overflow:hidden
          // pada #game-container. Membatasinya lewat CSS akan
          // memaksa canvas menyusut TIDAK PROPORSIONAL di satu sumbu
          // saja -> hasilnya gambar gepeng/melebar (stretched).
          //
          // Supaya elemen UI (tombol sentuh, pause, dll.) tidak ikut
          // terpotong, tiap scene mereposisinya ke area yang benar-benar
          // terlihat (visible bounds) via utils/visibleBounds.js.
          mode: Phaser.Scale.ENVELOP,
          parent: gameRef.current,
          width: WORLD_WIDTH,
          height: WORLD_HEIGHT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
        },
      };

      phaserInstance.current = new Phaser.Game(config);

      // Phaser Scale Manager sudah dengar event `resize` window, tapi di
      // iOS Safari event itu kadang tidak terpicu tepat waktu saat rotasi
      // layar atau saat address bar muncul/hilang (karena viewport CSS
      // berubah via `visualViewport`, bukan lewat `resize` biasa). Kalau
      // ini tidak ditangani, canvas bisa "nyangkut" di ukuran lama —
      // itulah sumber tampilan tidak konsisten saat ganti orientasi.
      //
      // Solusi: paksa Phaser hitung ulang ukuran (`scale.refresh()`) pada
      // beberapa event tambahan, plus retry singkat setelah rotasi karena
      // beberapa browser mengubah `innerWidth/innerHeight` dengan delay
      // beberapa ratus ms setelah event `orientationchange` ditembakkan.
      const forceRefresh = () => {
        if (!phaserInstance.current) return;
        phaserInstance.current.scale.refresh();
      };

      const onOrientationChange = () => {
        forceRefresh();
        // Retry berkala menangkap kasus browser yang telat update
        // innerWidth/innerHeight setelah rotasi selesai secara visual.
        [50, 150, 300, 600].forEach((delay) => setTimeout(forceRefresh, delay));
      };

      window.addEventListener('orientationchange', onOrientationChange);
      window.addEventListener('resize', forceRefresh);
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', forceRefresh);
        window.visualViewport.addEventListener('scroll', forceRefresh);
      }

      phaserInstance.current.__cleanupResizeListeners = () => {
        window.removeEventListener('orientationchange', onOrientationChange);
        window.removeEventListener('resize', forceRefresh);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', forceRefresh);
          window.visualViewport.removeEventListener('scroll', forceRefresh);
        }
      };
    });

    return () => {
      destroyed = true;
      cleanupFS();
      if (phaserInstance.current) {
        phaserInstance.current.__cleanupResizeListeners?.();
        phaserInstance.current.destroy(true);
        phaserInstance.current = null;
      }
    };
  }, []);

  return <div ref={gameRef} id="game-container" />;
}
