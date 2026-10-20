import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/gameConfig';

/**
 * True kalau viewport CSS saat ini lebih tinggi daripada lebar
 * (portrait). Dipakai untuk menentukan mode render background:
 * - Portrait -> level lebar (scrolling) + background tile berulang,
 *   karena satu gambar statis tidak akan pernah cukup mengisi rasio
 *   aspek yang jauh dari 16:9 tanpa terlihat kosong di sisi atas/bawah.
 * - Landscape -> satu layar statis (tidak scroll), karena rasio
 *   aspek art (mendekati 16:9) sudah cocok ditampilkan penuh sekali
 *   tanpa perlu diulang.
 */
function getLiveParentSize(scene) {
  try {
    scene?.scale?.getParentBounds?.();
  } catch {
    // abaikan
  }
  const ps = scene?.scale?.parentSize;
  const parentEl = scene?.scale?.parent;
  const w =
    (parentEl?.clientWidth > 0 ? parentEl.clientWidth : 0) ||
    (typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 0) ||
    ps?.width ||
    WORLD_WIDTH;
  const h =
    (parentEl?.clientHeight > 0 ? parentEl.clientHeight : 0) ||
    (typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 0) ||
    ps?.height ||
    WORLD_HEIGHT;
  return { width: w, height: h };
}

export function isPortrait(scene) {
  const { width, height } = getLiveParentSize(scene);
  return height > width;
}

export function syncGameSizeToOrientation(scene, options = {}) {
  const isPortraitMode = isPortrait(scene);
  const { width: pw, height: ph } = getLiveParentSize(scene);
  const aspect = ph > 0 ? pw / ph : WORLD_WIDTH / WORLD_HEIGHT;
  let dynamicWidth = Math.max(1, Math.round(WORLD_HEIGHT * aspect));

  if (typeof options.maxWidth === 'number' && options.maxWidth > 0) {
    dynamicWidth = Math.min(dynamicWidth, Math.round(options.maxWidth));
  }

  // PENGAMAN REKURSI: setGameSize() SELALU memanggil scale.refresh(),
  // yang menembakkan event 'resize' lagi. Kalau fungsi ini dipanggil
  // dari dalam listener 'resize' (tanpa debounce), hasilnya loop tak
  // berujung -> "Maximum call stack size exceeded". Jadi hanya ubah
  // ukuran kalau memang berbeda dari ukuran saat ini.
  const gs = scene.scale.gameSize;
  if (gs?.width !== dynamicWidth || gs?.height !== WORLD_HEIGHT) {
    scene.scale.setGameSize(dynamicWidth, WORLD_HEIGHT);
  } else {
    // Pastikan display scale/offset canvas tetap ter-update ke parentSize terbaru
    // ketika keluar/masuk fullscreen atau split-screen walau rasio gameSize kebetulan sama
    scene.scale.updateScale?.();
    scene.scale.updateBounds?.();
  }

  if (scene.cameras?.main) {
    scene.cameras.main.setViewport(
      0,
      0,
      scene.scale.gameSize.width,
      scene.scale.gameSize.height,
    );
  }

  return {
    width: scene.scale.gameSize.width,
    height: scene.scale.gameSize.height,
    isPortraitMode,
  };
}

function getCurrentGameSize(scene) {
  const gs = scene.scale.gameSize;
  return {
    width: gs?.width || WORLD_WIDTH,
    height: gs?.height || WORLD_HEIGHT,
  };
}

export function getVisibleBounds(scene) {
  const { width: gw, height: gh } = getCurrentGameSize(scene);
  const parentSize = getLiveParentSize(scene);

  // ENVELOP menggunakan skala terbesar (max) supaya canvas selalu
  // MENUTUPI parent — kebalikan dari FIT yang pakai min.
  const scaleX = parentSize.width / gw;
  const scaleY = parentSize.height / gh;
  const scale = Math.max(scaleX, scaleY);

  // Ukuran dunia game yang terlihat di layar (dalam koordinat game).
  const visW = parentSize.width / scale;
  const visH = parentSize.height / scale;

  // Offset: seberapa banyak tepi dunia game yang terpotong di tiap sisi.
  const offX = (gw - visW) / 2;
  const offY = (gh - visH) / 2;

  return {
    left: offX,
    right: gw - offX,
    top: offY,
    bottom: gh - offY,
    width: visW,
    height: visH,
    centerX: gw / 2,
    centerY: gh / 2,
  };
}

export function getWorldScale(scene) {
  const { width: gw, height: gh } = getCurrentGameSize(scene);
  const parentSize = getLiveParentSize(scene);
  const scaleX = parentSize.width / gw;
  const scaleY = parentSize.height / gh;
  return Math.max(scaleX, scaleY);
}

/**
 * Konversi ukuran CSS px yang diinginkan (mis. target diameter tombol
 * 56px supaya nyaman disentuh jari) menjadi world unit, berdasarkan
 * skala ENVELOP saat ini.
 */
export function pxToWorld(scene, px) {
  return px / getWorldScale(scene);
}
