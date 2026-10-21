import { getEpisodeById } from '../config/episodes';

/**
 * ObjectiveBriefing ("Hint Misi")
 *
 * Ditampilkan dengan gaya UI & animasi motion yang selaras dengan
 * pengenalan game di awal (GameIntroGuideScene):
 * - Hanya berisi 2 slide fokus:
 *   1. Tujuan Utama Misi (Head teks kuning #ffdd57, isian penjelasan putih #ffffff)
 *   2. Langkah-Langkah dalam Misi Tersebut (Head teks kuning #ffdd57, isian penjelasan putih #ffffff)
 * - Ukuran font head teks (kuning) dan ukuran font isian penjelasan (putih)
 *   dibuat SAMA BESAR di setiap slide agar selaras dan sangat mudah dibaca.
 * - Tombol navigasi "Lanjut ›" / "Mulai ›" berada di panel sebelah kanan
 *   (dan "Kembali" untuk melihat slide sebelumnya).
 */

const ROOT_ID = 'nd-mission-root';
const STYLE_ID = 'nd-mission-style';

const ICONS = {
  mission: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><circle cx="32" cy="32" r="24"/><circle cx="32" cy="32" r="14"/><circle cx="32" cy="32" r="5" fill="currentColor"/><path d="M32 4v6M32 54v6M4 32h6M54 32h6"/></svg>`,
  steps: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="8" width="44" height="50" rx="5"/><path d="M20 22l4 4 7-8"/><path d="M20 36l4 4 7-8"/><path d="M38 23h8M38 37h8M20 50h26"/></svg>`,
};

const CSS = `
#${ROOT_ID} {
  position: fixed; inset: 0; z-index: 8800;
  display: flex; align-items: stretch;
  font-family: 'Pixelify Sans', monospace;
  color: #ffffff;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255,221,87,0.08), transparent 55%),
    radial-gradient(ellipse at 70% 90%, rgba(96,165,250,0.08), transparent 60%),
    rgba(9, 8, 22, 0.90);
  opacity: 0;
  transition: opacity 320ms cubic-bezier(.4, 0, .2, 1);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
  user-select: none;
}
#${ROOT_ID}.is-visible { opacity: 1; }
#${ROOT_ID}.is-closing {
  opacity: 0;
  pointer-events: none;
  transition: opacity 260ms cubic-bezier(.4, 0, .2, 1);
}
#${ROOT_ID} button {
  font-family: inherit;
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
}

.nd-mission__skip {
  position: absolute; top: 22px; left: 28px; z-index: 100 !important;
  font-size: 18px; font-weight: 600; color: #cbd5e1 !important; letter-spacing: .04em;
  padding: 6px 14px; border-radius: 6px;
  border: 1.5px solid rgba(255,255,255,0.22) !important;
  background: rgba(20,18,38,0.92) !important;
  pointer-events: auto !important;
  cursor: pointer !important;
  touch-action: manipulation;
  transition: color 200ms ease, border-color 200ms ease, transform 200ms ease;
}
.nd-mission__skip:hover {
  color: #ffdd57 !important;
  border-color: #ffdd57 !important;
  transform: translateY(-1px);
}

.nd-mission__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 68px 5vw 40px;
  min-width: 0;
  min-height: 0;
}

.nd-mission__slide {
  width: min(900px, 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: opacity 280ms ease, transform 280ms ease;
}
.nd-mission__slide.is-leaving {
  opacity: 0;
  transform: translateY(-14px);
}

/* Head Teks Kuning Selaras */
.nd-mission__head {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin-bottom: 26px;
  text-align: center;
}
.nd-mission__icon {
  width: clamp(54px, 5.8vw, 74px);
  height: clamp(54px, 5.8vw, 74px);
  flex-shrink: 0;
  color: #ffdd57;
  filter: drop-shadow(0 0 14px rgba(255,221,87,0.35));
  animation: ndMissionPop 560ms cubic-bezier(.34,1.56,.64,1) both, ndMissionFloat 3.2s ease-in-out 560ms infinite;
}
.nd-mission__icon svg { width: 100%; height: 100%; }

.nd-mission__title {
  font-family: 'Pixelify Sans', monospace;
  font-weight: 700;
  font-size: clamp(28px, 3.5vw, 44px);
  line-height: 1.18;
  color: #ffdd57;
  text-shadow: 0 2px 18px rgba(255,221,87,0.28);
  animation: ndMissionSlideIn 480ms ease-out 100ms both;
}

/* Kotak Penjelasan Bergaris Kuning */
.nd-mission__box {
  position: relative;
  width: 100%;
  border: 2.5px solid #ffdd57;
  border-radius: 8px;
  background: rgba(20, 18, 38, 0.94);
  box-shadow: 0 12px 42px rgba(0,0,0,0.5), inset 0 0 30px rgba(255,221,87,0.05);
  padding: 36px clamp(24px, 3.2vw, 46px) 32px;
  animation: ndMissionRise 520ms ease-out 180ms both;
  cursor: pointer;
  margin-top: 16px;
  overflow: visible;
}

.nd-mission__speaker {
  position: absolute;
  top: -16px;
  left: 24px;
  background: #ffdd57;
  color: #14122a;
  font-weight: 700;
  font-size: 17px;
  padding: 3px 14px;
  border-radius: 4px;
  letter-spacing: .03em;
  z-index: 5;
}

/* Isian Penjelasan Teks Putih — Ukuran Sama Besar di Semua Slide */
.nd-mission__body {
  margin: 0;
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(21px, 2.2vw, 29px);
  line-height: 1.62;
  font-weight: 500;
  color: #ffffff;
  text-align: center;
  min-height: 3.2em;
  max-height: 52vh;
  overflow-y: auto;
  overscroll-behavior: contain;
  touch-action: pan-y;
  scrollbar-width: thin;
  scrollbar-color: rgba(255,221,87,0.4) transparent;
}
.nd-mission__body::-webkit-scrollbar {
  width: 5px;
}
.nd-mission__body::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}
.nd-mission__body::-webkit-scrollbar-thumb {
  background: rgba(255, 221, 87, 0.4);
  border-radius: 4px;
}
.nd-mission__body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 221, 87, 0.7);
}
.nd-mission__body.is-steps {
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.nd-mission__step-row {
  font-family: 'Pixelify Sans', monospace;
  font-size: clamp(21px, 2.2vw, 29px);
  line-height: 1.52;
  font-weight: 500;
  color: #ffffff;
}
.nd-mission__caret {
  display: inline-block;
  width: .52em;
  height: .95em;
  margin-left: 3px;
  vertical-align: -0.1em;
  background: #ffdd57;
  animation: ndMissionBlink 900ms steps(1) infinite;
}

.nd-mission__dots {
  display: flex;
  gap: 10px;
  margin-top: 28px;
}
.nd-mission__dot {
  width: 11px;
  height: 11px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
  transition: width 280ms ease, background 280ms ease;
}
.nd-mission__dot.is-active {
  width: 32px;
  background: #ffdd57;
}
.nd-mission__dot.is-done {
  background: rgba(255,221,87,0.5);
}

/* Panel Kanan "Lanjut" (sama seperti pengenalan game di awal) */
.nd-mission__side {
  position: relative;
  width: clamp(160px, 17vw, 240px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: linear-gradient(to right, rgba(255,221,87,0) 0%, rgba(255,221,87,0.04) 45%, rgba(255,221,87,0.09) 100%);
}
.nd-mission__side::before {
  content: '';
  position: absolute;
  left: 0;
  top: 6%;
  bottom: 6%;
  width: 2px;
  background: linear-gradient(to bottom, transparent, rgba(255,221,87,0.55) 30%, rgba(255,221,87,0.55) 70%, transparent);
  box-shadow: 0 0 18px rgba(255,221,87,0.35);
}
.nd-mission__next {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 18px;
  font-size: clamp(26px, 2.6vw, 36px) !important;
  font-weight: 700;
  color: #ffdd57 !important;
  text-shadow: 0 0 14px rgba(255,221,87,0.55), 0 0 32px rgba(255,221,87,0.25);
  animation: ndMissionBreath 2.2s ease-in-out infinite;
  transition: transform 220ms ease, color 220ms ease, opacity 260ms ease;
}
.nd-mission__next:hover {
  color: #ffffff !important;
  transform: scale(1.06);
  animation-play-state: paused;
  opacity: 1;
}
.nd-mission__next .nd-mission__chev {
  display: inline-block;
  animation: ndMissionNudge 1.4s ease-in-out infinite;
}
.nd-mission__prev {
  font-size: 19px !important;
  font-weight: 600;
  color: #cbd5e1 !important;
  padding: 6px 12px;
  transition: color 200ms ease, opacity 260ms ease;
}
.nd-mission__prev:hover { color: #ffdd57 !important; }
.nd-mission__prev.is-hidden { opacity: 0; pointer-events: none; }

@keyframes ndMissionPop { from { opacity: 0; transform: scale(.4) rotate(-12deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes ndMissionFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ndMissionSlideIn { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes ndMissionRise { from { opacity: 0; transform: translateY(22px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes ndMissionBlink { 50% { opacity: 0; } }
@keyframes ndMissionBreath { 0%,100% { opacity: .68; } 50% { opacity: 1; } }
@keyframes ndMissionNudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }

/* Layar sedang / laptop kecil (height 521px - 680px) */
@media (max-height: 680px) and (min-height: 521px) {
  .nd-mission__main { padding: 28px 4vw 16px; }
  .nd-mission__head { gap: 14px; margin-bottom: 14px; }
  .nd-mission__icon { width: 44px; height: 44px; }
  .nd-mission__title { font-size: 26px; }
  .nd-mission__box { padding: 22px 28px 18px; max-height: calc(100vh - 120px); }
  .nd-mission__body { font-size: 17px; line-height: 1.5; }
  .nd-mission__step-row { font-size: 16px; line-height: 1.45; }
  .nd-mission__dots { margin-top: 14px; }
  .nd-mission__side { width: clamp(130px, 15vw, 180px); }
  .nd-mission__next { font-size: 24px !important; }
}

/* HP Landscape standar / kompak (Pixel, iPhone, Xiaomi dll - height <= 520px) */
@media (max-height: 520px), (max-width: 900px) and (orientation: landscape) {
  .nd-mission__skip {
    top: 8px;
    left: 14px;
    font-size: 13px;
    padding: 3px 9px;
    border-radius: 4px;
  }
  .nd-mission__main {
    padding: 6px 14px 6px 16px;
    justify-content: center;
  }
  .nd-mission__slide {
    width: min(680px, 100%);
  }
  .nd-mission__head {
    gap: 8px;
    margin-bottom: 6px;
  }
  .nd-mission__icon {
    width: 28px;
    height: 28px;
  }
  .nd-mission__title {
    font-size: 17px;
    line-height: 1.15;
    text-shadow: 0 1px 8px rgba(255,221,87,0.25);
  }
  .nd-mission__box {
    margin-top: 14px;
    padding: 14px 16px 8px;
    border-width: 2px;
    border-radius: 6px;
    box-shadow: 0 6px 20px rgba(0,0,0,0.5);
    overflow: visible;
  }
  .nd-mission__speaker {
    top: -11px;
    left: 14px;
    font-size: 11px;
    padding: 1px 8px;
    border-radius: 3px;
    max-width: calc(100% - 24px);
    white-space: nowrap;
    overflow: visible;
    z-index: 5;
  }
  .nd-mission__body {
    font-size: 13px;
    line-height: 1.36;
    min-height: auto;
    max-height: 48vh;
    overflow-y: auto;
  }
  .nd-mission__body.is-steps {
    gap: 5px;
  }
  .nd-mission__step-row {
    font-size: 12px;
    line-height: 1.32;
  }
  .nd-mission__dots {
    gap: 6px;
    margin-top: 5px;
  }
  .nd-mission__dot {
    width: 6px;
    height: 6px;
  }
  .nd-mission__dot.is-active {
    width: 18px;
  }
  .nd-mission__side {
    width: clamp(90px, 13vw, 115px);
    gap: 6px;
  }
  .nd-mission__next {
    font-size: 18px !important;
    padding: 6px 8px;
    gap: 4px;
  }
  .nd-mission__prev {
    font-size: 12px !important;
    padding: 2px 6px;
  }
}

/* HP Landscape layar kecil / browser ber-address bar (height <= 380px) */
@media (max-height: 380px) {
  .nd-mission__main { padding: 4px 10px 4px 12px; }
  .nd-mission__head { gap: 6px; margin-bottom: 4px; }
  .nd-mission__icon { width: 22px; height: 22px; }
  .nd-mission__title { font-size: 14.5px; }
  .nd-mission__box {
    padding: 9px 12px 6px;
    max-height: calc(100vh - 58px);
  }
  .nd-mission__speaker { top: -8px; font-size: 10px; }
  .nd-mission__body { font-size: 11.5px; line-height: 1.28; }
  .nd-mission__step-row { font-size: 11px; line-height: 1.25; }
  .nd-mission__dots { margin-top: 4px; }
  .nd-mission__side { width: 80px; gap: 4px; }
  .nd-mission__next { font-size: 15px !important; padding: 4px 6px; }
}

/* HP Tampilan Portrait */
@media (max-aspect-ratio: 1/1) {
  #${ROOT_ID} { flex-direction: column; }
  .nd-mission__skip { top: 10px; left: 14px; font-size: 13px; padding: 3px 9px; }
  .nd-mission__main {
    padding: 44px 4vw 8px;
    flex: 1;
    overflow-y: auto;
    justify-content: center;
  }
  .nd-mission__head { gap: 10px; margin-bottom: 10px; }
  .nd-mission__icon { width: 34px; height: 34px; }
  .nd-mission__title { font-size: 18px; line-height: 1.2; }
  .nd-mission__box { padding: 16px 14px 12px; max-height: none; }
  .nd-mission__speaker { top: -10px; left: 12px; font-size: 11px; padding: 1px 7px; }
  .nd-mission__body { font-size: 14px; line-height: 1.4; min-height: auto; }
  .nd-mission__body.is-steps { gap: 8px; }
  .nd-mission__step-row { font-size: 13px; line-height: 1.35; }
  .nd-mission__dots { margin-top: 10px; }
  .nd-mission__side {
    width: 100%;
    height: 60px;
    flex-direction: row;
    gap: 20px;
    flex-shrink: 0;
    background: linear-gradient(to bottom, rgba(255,221,87,0) 0%, rgba(255,221,87,0.09) 100%);
  }
  .nd-mission__side::before {
    left: 6%; right: 6%; top: 0; bottom: auto; width: auto; height: 2px;
    background: linear-gradient(to right, transparent, rgba(255,221,87,0.55) 30%, rgba(255,221,87,0.55) 70%, transparent);
  }
  .nd-mission__prev { order: -1; font-size: 14px !important; }
  .nd-mission__next { font-size: 19px !important; }
}
@media (prefers-reduced-motion: reduce) {
  #${ROOT_ID} *, #${ROOT_ID} { animation: none !important; transition: none !important; }
}
`;

export default class ObjectiveBriefing {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this._root = null;
    this._typingTimer = null;
    this._isTyping = false;
    this._isTransitioning = false;
    this._timeouts = [];
    this.currentSlideIndex = 0;
  }

  show({
    objectiveText,
    episodeData = null,
    promptLabel = 'MULAI',
    onContinue,
  } = {}) {
    if (this.isOpen) return;
    this.isOpen = true;
    this._onContinue = onContinue;
    this._closing = false;
    this._isTransitioning = false;
    this.currentSlideIndex = 0;

    const scene = this.scene;
    const epId = episodeData?.id || scene?.episodeId || 1;
    const epData = episodeData || getEpisodeById(epId);
    const epTitle = epData?.title ? `Episode ${epData.id}: ${epData.title}` : `Episode ${epId}`;

    const mainMissionText =
      objectiveText ||
      epData?.objective ||
      'Pahami situasi di sekitarmu, berani bicara jujur, dan cari bantuan orang yang kamu percaya.';

    const aspects = Array.isArray(epData?.aspects) ? epData.aspects : [];
    const stepsLines =
      aspects.length > 0
        ? aspects.map((a, idx) => `${idx + 1}. ${a.desc || a.title}`)
        : [
            '1. Sadari situasi yang membuatmu atau temanmu tidak nyaman.',
            '2. Sampaikan batasan dengan tenang dan tegas tanpa membalas kasar.',
            '3. Cari tempat aman dan segera lapor ke orang dewasa tepercaya.',
          ];

    const finalBtnLabel =
      promptLabel && promptLabel.toUpperCase().includes('KEMBALI')
        ? 'Lanjut Main'
        : 'Mulai';

    // Hanya 2 slide:
    // Slide 1: Tujuan Utama Misi
    // Slide 2: Langkah-Langkah dalam Misi Tersebut
    this._slides = [
      {
        icon: 'mission',
        title: `Tujuan Utama Misi — Episode ${epId}`,
        speaker: `Kak Dara • ${epTitle}`,
        mode: 'paragraph',
        text: mainMissionText,
        nextLabel: 'Lanjut',
      },
      {
        icon: 'steps',
        title: `Langkah-Langkah Misi — Episode ${epId}`,
        speaker: `Kak Dara • 3 Langkah Misi`,
        mode: 'steps',
        steps: stepsLines,
        text: stepsLines.join('\n'),
        nextLabel: finalBtnLabel,
      },
    ];

    this._mountOverlay();
    this._renderSlide(0);

    this._shutdownHandler = () => this.close(true);
    scene?.events?.once('shutdown', this._shutdownHandler);
    scene?.events?.once('destroy', this._shutdownHandler);
  }

  _mountOverlay() {
    if (typeof document === 'undefined') return;
    document.getElementById(ROOT_ID)?.remove();

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = CSS;
      document.head.appendChild(style);
    }

    const root = document.createElement('div');
    root.id = ROOT_ID;
    root.innerHTML = `
      <button type="button" class="nd-mission__skip" id="nd-mission-skip">Lewati</button>
      <div class="nd-mission__main">
        <div class="nd-mission__slide" id="nd-mission-slide"></div>
        <div class="nd-mission__dots" id="nd-mission-dots">
          ${this._slides.map(() => '<span class="nd-mission__dot"></span>').join('')}
        </div>
      </div>
      <div class="nd-mission__side">
        <button type="button" class="nd-mission__next" id="nd-mission-next">
          <span id="nd-mission-next-label">Lanjut</span><span class="nd-mission__chev">&rsaquo;</span>
        </button>
        <button type="button" class="nd-mission__prev is-hidden" id="nd-mission-prev">Kembali</button>
      </div>
    `;

    document.body.appendChild(root);
    this._root = root;
    this._slideEl = root.querySelector('#nd-mission-slide');
    this._nextBtn = root.querySelector('#nd-mission-next');
    this._nextLabel = root.querySelector('#nd-mission-next-label');
    this._prevBtn = root.querySelector('#nd-mission-prev');
    this._dots = Array.from(root.querySelectorAll('.nd-mission__dot'));

    const missionSkipBtn = root.querySelector('#nd-mission-skip');
    const onMissionSkip = (e) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      this.close();
    };
    missionSkipBtn?.addEventListener('click', onMissionSkip);
    missionSkipBtn?.addEventListener('pointerdown', onMissionSkip);

    // Tombol Lanjut / Mulai di bagian kanan:
    // Langsung pindah ke slide berikutnya / mulai game tanpa pernah nyangkut!
    this._nextBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._advanceSlideImmediate();
    });

    this._prevBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._prevSlide();
    });

    this._onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        this._advanceSlideImmediate();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        this._prevSlide();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    };
    window.addEventListener('keydown', this._onKeyDown, true);

    requestAnimationFrame(() => root.classList.add('is-visible'));
  }

  _renderSlide(idx) {
    const slide = this._slides[idx];
    if (!slide || !this._slideEl) return;

    const isSteps = slide.mode === 'steps';

    this._slideEl.innerHTML = `
      <div class="nd-mission__head">
        <div class="nd-mission__icon">${ICONS[slide.icon] || ICONS.mission}</div>
        <div class="nd-mission__title" role="heading" aria-level="1">${slide.title}</div>
      </div>
      <div class="nd-mission__box" id="nd-mission-box">
        <span class="nd-mission__speaker">${slide.speaker}</span>
        <div class="nd-mission__body ${isSteps ? 'is-steps' : ''}" id="nd-mission-body"></div>
      </div>
    `;

    // Klik pada kotak teks: jika sedang mengetik, langsung tampilkan penuh;
    // jika sudah penuh, lanjut ke slide berikutnya.
    this._slideEl.querySelector('#nd-mission-box')?.addEventListener('click', () => {
      if (this._isTyping) {
        this._completeTyping();
      } else {
        this._advanceSlideImmediate();
      }
    });

    this._dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    this._prevBtn?.classList.toggle('is-hidden', idx === 0);
    if (this._nextLabel) {
      this._nextLabel.textContent = slide.nextLabel || 'Lanjut';
    }

    this._later(() => this._startSlideTyping(slide), 220);
  }

  _startSlideTyping(slide) {
    const bodyEl = this._root?.querySelector('#nd-mission-body');
    if (!bodyEl) return;
    this._stopTyping();
    this._isTyping = true;
    this._currentSlide = slide;

    const caret = '<span class="nd-mission__caret"></span>';

    if (slide.mode === 'steps' && Array.isArray(slide.steps)) {
      const fullJoined = slide.steps.join('\n');
      let charCount = 0;
      this._typingTimer = window.setInterval(() => {
        charCount += 2;
        const partial = fullJoined.slice(0, charCount).split('\n');
        bodyEl.innerHTML = partial
          .map(
            (line, idx) =>
              `<div class="nd-mission__step-row">${line}${idx === partial.length - 1 ? caret : ''}</div>`,
          )
          .join('');
        if (charCount >= fullJoined.length) {
          this._completeTyping();
        }
      }, 18);
      return;
    }

    const fullText = slide.text || '';
    let i = 0;
    this._typingTimer = window.setInterval(() => {
      i += 2;
      bodyEl.innerHTML = `${fullText.slice(0, i)}${caret}`;
      if (i >= fullText.length) {
        this._completeTyping();
      }
    }, 18);
  }

  _completeTyping() {
    this._stopTyping();
    this._isTyping = false;
    const bodyEl = this._root?.querySelector('#nd-mission-body');
    const slide = this._currentSlide || this._slides?.[this.currentSlideIndex];
    if (!bodyEl || !slide) return;

    if (slide.mode === 'steps' && Array.isArray(slide.steps)) {
      bodyEl.innerHTML = slide.steps
        .map((line) => `<div class="nd-mission__step-row">${line}</div>`)
        .join('');
    } else {
      bodyEl.textContent = slide.text || '';
    }
  }

  _stopTyping() {
    if (this._typingTimer) {
      window.clearInterval(this._typingTimer);
      this._typingTimer = null;
    }
  }

  _advanceSlideImmediate() {
    if (this._closing || this._isTransitioning) return;
    this._stopTyping();
    this._isTyping = false;

    if (this.currentSlideIndex < this._slides.length - 1) {
      this._goToSlide(this.currentSlideIndex + 1);
    } else {
      this.close();
    }
  }

  _prevSlide() {
    if (this._closing || this._isTransitioning || this.currentSlideIndex <= 0) return;
    this._goToSlide(this.currentSlideIndex - 1);
  }

  _goToSlide(targetIdx) {
    this._isTransitioning = true;
    this._stopTyping();
    this._isTyping = false;
    this._slideEl?.classList.add('is-leaving');

    this._later(() => {
      this.currentSlideIndex = targetIdx;
      this._renderSlide(targetIdx);
      this._slideEl?.classList.remove('is-leaving');
      this._later(() => {
        this._isTransitioning = false;
      }, 220);
    }, 220);
  }

  _later(fn, ms) {
    const id = window.setTimeout(fn, ms);
    this._timeouts.push(id);
    return id;
  }

  close(silent = false) {
    if (!this.isOpen) return;
    this.isOpen = false;
    this._closing = true;
    this._stopTyping();

    this._timeouts?.forEach((id) => window.clearTimeout(id));
    this._timeouts = [];

    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown, true);
      this._onKeyDown = null;
    }

    if (this._shutdownHandler && this.scene?.events) {
      this.scene.events.off('shutdown', this._shutdownHandler);
      this.scene.events.off('destroy', this._shutdownHandler);
      this._shutdownHandler = null;
    }

    const rootEl = this._root;
    this._root = null;
    if (rootEl) {
      if (silent) {
        rootEl.remove();
      } else {
        rootEl.classList.add('is-closing');
        window.setTimeout(() => rootEl.remove(), 260);
      }
    }

    if (!silent) {
      this._onContinue?.();
      this.scene?.startControlTutorial?.({ force: false });
    }
  }
}
