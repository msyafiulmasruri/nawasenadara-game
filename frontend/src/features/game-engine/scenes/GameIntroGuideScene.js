import Phaser from 'phaser';
import { drawStarfieldBackground } from '../utils/starfieldBackground';
import { syncGameSizeToOrientation } from '../utils/visibleBounds';
import AudioManager from '../audio/AudioManager';
import { stopMenuBGM } from '../audio/menuAudio';
import { getSettings } from '../utils/settingsStore';

/**
 * Slide pengenalan game yang dipandu langsung oleh Kak Dara.
 *
 * KENAPA PAKAI LAPISAN HTML (bukan teks Phaser)?
 * Canvas Phaser digambar di resolusi dunia tetap (tinggi 720px) lalu
 * di-upscale browser lewat mode ENVELOP. Akibatnya semua teks di dalam
 * canvas ikut ter-upscale dan terlihat BURAM di layar besar / HP dengan
 * DPI tinggi. Slide ini sengaja dirender sebagai elemen DOM di atas
 * canvas supaya teks tajam di resolusi layar asli dan animasinya bisa
 * memakai transisi CSS yang halus. Lapisan dibersihkan otomatis saat
 * scene shutdown.
 *
 * Tata letak mengikuti sketsa: ikon bubble chat Kak Dara sejajar dengan
 * judul, kotak penjelasan bergaris kuning di bawahnya, dan panel
 * "Lanjut" di sisi kanan (portrait: di bawah).
 */

const ROOT_ID = 'nd-intro-root';
const STYLE_ID = 'nd-intro-style';

// Ikon garis kuning (SVG inline). 'dara' = bubble chat Kak Dara,
// sama seperti ikon tombol konseling di dalam game.
const ICONS = {
  dara: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M32 8c13.8 0 24 8.9 24 20.5S45.8 49 32 49c-2.6 0-5.1-.3-7.4-.9L12 56l3.2-11.6C10.7 40.6 8 35 8 28.5 8 16.9 18.2 8 32 8z"/></svg>`,
  story: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M10 14h18c2.2 0 4 1.8 4 4v34c0-2.2-1.8-4-4-4H10z"/><path d="M54 14H36c-2.2 0-4 1.8-4 4v34c0-2.2 1.8-4 4-4h18z"/></svg>`,
  choice: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M32 56V34"/><path d="M32 34 16 18"/><path d="M32 34l16-16"/><path d="M10 18h12V6"/><path d="M54 18H42V6"/></svg>`,
  heart: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M32 54S8 40 8 23c0-7.2 5.6-13 12.5-13 5 0 9.3 3 11.5 7.4C34.2 13 38.5 10 43.5 10 50.4 10 56 15.8 56 23c0 17-24 31-24 31z"/><path d="M16 30h9l4-7 6 13 4-6h9"/></svg>`,
  steps: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><rect x="10" y="8" width="44" height="50" rx="5"/><path d="M20 22l4 4 7-8"/><path d="M20 36l4 4 7-8"/><path d="M38 23h8M38 37h8M20 50h26"/></svg>`,
  friends: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><circle cx="22" cy="22" r="8"/><circle cx="44" cy="24" r="6.5"/><path d="M8 52c0-8.8 6.3-15 14-15s14 6.2 14 15"/><path d="M38 40c1.8-.9 3.8-1.4 6-1.4 6.6 0 12 5 12 12.4"/></svg>`,
  quiz: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><circle cx="32" cy="32" r="24"/><path d="M25 25c0-4 3.1-7 7-7s7 2.8 7 6.6c0 5.4-7 6-7 11.4"/><path d="M32 45v.5"/></svg>`,
  start: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"><path d="M14 56V26L32 12l18 14v30"/><path d="M26 56V40h12v16"/><path d="M8 56h48"/></svg>`,
};

const SLIDES = [
  {
    icon: 'dara',
    title: 'Halo, aku Kak Dara!',
    text:
      'Aku yang akan memandu kamu memulai permainan ini. Sebelum mulai, aku kenalin dulu fitur-fitur yang ada di game Nawasena Dara, ya!',
  },
  {
    icon: 'story',
    title: 'Apa itu Nawasena Dara?',
    text:
      'Nawasena Dara itu game cerita tentang kehidupan di sekolah. Kamu bakal ketemu situasi yang bikin nggak nyaman, misalnya candaan yang kelewatan atau ejekan di grup kelas. Tugasmu: pilih cara merespon yang paling tepat.',
  },
  {
    icon: 'dara',
    title: 'Fitur 1: Konseling Kak Dara',
    text:
      'Ini tempat kamu curhat kapan saja. Kalau habis main kamu merasa bingung, sedih, atau kesal, tekan tombol bubble chat di layar. Nanti aku temani ngobrol. Tenang, ceritamu aman dan nggak akan dihakimi.',
  },
  {
    icon: 'choice',
    title: 'Fitur 2: Pilihan Jawaban',
    text:
      'Di setiap obrolan, kamu sendiri yang memilih mau menjawab apa. Pilihanmu yang menentukan jalan dan akhir cerita, jadi pikirkan baik-baik, ya.',
  },
  {
    icon: 'heart',
    title: 'Fitur 3: Cermin Perasaan',
    text:
      'Dari jawaban yang kamu pilih, game ini bisa membaca perasaanmu: apakah kamu sedang tenang, cemas, atau marah. Hasilnya muncul di akhir episode, supaya kamu makin kenal dengan perasaanmu sendiri.',
  },
  {
    icon: 'steps',
    title: 'Fitur 4: 3 Langkah Misi',
    text:
      'Setiap episode punya 3 langkah yang perlu kamu lakukan. Kalau belum ada satu pun yang berhasil, kamu perlu mengulang episodenya. Di akhir Episode 6, kamu akan dapat rapor lengkap dariku!',
  },
  {
    icon: 'friends',
    title: 'Kenalan dengan Teman-temanmu',
    text: 'Ini beberapa teman yang akan kamu temui di sekolah nanti.',
    characters: [
      { name: 'Rafi', img: '/characters/rafi.png?v=4', desc: 'Teman sekelas yang suka bercanda' },
      { name: 'Kirana', img: '/characters/kirana-portrait.png?v=4', desc: 'Teman yang butuh dukunganmu' },
      { name: 'Senior Kantin', img: '/characters/senior-kantin.png?v=4', desc: 'Kakak kelas di kantin' },
      { name: 'Naya', img: '/characters/naya-portrait.png?v=4', desc: 'Teman yang sedang tertekan' },
    ],
  },
  {
    icon: 'quiz',
    title: 'Kuis Kilat dari Kak Dara',
    text: 'Coba jawab dulu, ya! Kalau kamu merasa sedih setelah bermain, fitur apa yang bisa kamu buka?',
    quiz: {
      options: [
        { label: 'Langsung tutup game', correct: false },
        { label: 'Konseling Kak Dara', correct: true },
        { label: 'Diam dan pendam sendiri', correct: false },
      ],
      correctFeedback: 'Tepat sekali! Kamu bisa curhat ke aku kapan saja lewat tombol bubble chat.',
      wrongFeedback: 'Hmm, belum tepat. Coba pilih jawaban yang lain, ya.',
    },
  },
  {
    icon: 'start',
    title: 'Siap Memulai?',
    text:
      'Kamu sudah siap! Ingat, di sini nggak ada yang menghakimi. Jadilah dirimu sendiri. Yuk, masuk ke Episode 1: Awal yang Baru!',
    nextLabel: 'Mulai Main',
  },
];

const CSS = `
#${ROOT_ID} {
  position: fixed; inset: 0; z-index: 9000;
  display: flex; align-items: stretch;
  font-family: 'Pixelify Sans', monospace;
  color: #fff;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(255,221,87,0.07), transparent 55%),
    radial-gradient(ellipse at 70% 90%, rgba(96,165,250,0.08), transparent 60%),
    rgba(9, 8, 22, 0.88);
  opacity: 0; transition: opacity 420ms cubic-bezier(.4, 0, .2, 1), background-color 420ms ease;
  -webkit-font-smoothing: antialiased; text-rendering: optimizeLegibility;
  user-select: none;
}
#${ROOT_ID}.is-visible { opacity: 1; }
#${ROOT_ID}.is-closing {
  background: #05050f;
  pointer-events: none;
}
#${ROOT_ID}.is-closing .nd-intro__main,
#${ROOT_ID}.is-closing .nd-intro__side,
#${ROOT_ID}.is-closing .nd-intro__skip {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
  transition: opacity 360ms cubic-bezier(.4, 0, .2, 1), transform 360ms cubic-bezier(.4, 0, .2, 1);
}
#${ROOT_ID}.is-fadeout {
  opacity: 0;
  transition: opacity 380ms cubic-bezier(.4, 0, .2, 1);
}
#${ROOT_ID} button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }

.nd-intro__skip {
  position: absolute; top: 22px; left: 28px; z-index: 2;
  font-size: 17px; color: #8b93a7 !important; letter-spacing: .04em;
  padding: 6px 10px; transition: color 200ms ease, opacity 320ms ease, transform 320ms ease;
}
.nd-intro__skip:hover { color: #ffdd57 !important; }

.nd-intro__main {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 72px 5vw 40px; min-width: 0;
}
.nd-intro__slide {
  width: min(880px, 100%);
  display: flex; flex-direction: column; align-items: center;
  transition: opacity 320ms ease, transform 320ms ease;
}
.nd-intro__slide.is-leaving { opacity: 0; transform: translateY(-14px); }

.nd-intro__head { display: flex; align-items: center; gap: 22px; margin-bottom: 26px; }
.nd-intro__icon {
  width: clamp(56px, 6vw, 76px); height: clamp(56px, 6vw, 76px); flex-shrink: 0;
  color: #ffdd57; filter: drop-shadow(0 0 14px rgba(255,221,87,0.35));
  animation: ndPop 600ms cubic-bezier(.34,1.56,.64,1) both, ndFloat 3.2s ease-in-out 600ms infinite;
}
.nd-intro__icon svg { width: 100%; height: 100%; }
.nd-intro__title {
  font-family: 'Pixelify Sans', monospace; font-weight: 700;
  font-size: clamp(28px, 3.6vw, 46px); line-height: 1.15; color: #ffdd57;
  text-shadow: 0 2px 18px rgba(255,221,87,0.25);
  animation: ndSlideIn 520ms ease-out 120ms both;
}

.nd-intro__box {
  position: relative; width: 100%;
  border: 2.5px solid #ffdd57; border-radius: 6px;
  background: rgba(20, 18, 38, 0.92);
  box-shadow: 0 10px 40px rgba(0,0,0,0.45), inset 0 0 30px rgba(255,221,87,0.04);
  padding: 34px clamp(22px, 3vw, 44px) 30px;
  animation: ndRise 560ms ease-out 220ms both;
}
.nd-intro__speaker {
  position: absolute; top: -15px; left: 22px;
  background: #ffdd57; color: #14122a; font-weight: 700;
  font-size: 16px; padding: 3px 12px; border-radius: 4px; letter-spacing: .03em;
}
.nd-intro__text {
  margin: 0; font-size: clamp(19px, 2vw, 27px); line-height: 1.6;
  font-weight: 500; color: #f8fafc; text-align: center; min-height: 3.2em;
}
.nd-intro__caret {
  display: inline-block; width: .55em; height: 1em; margin-left: 2px; vertical-align: -0.12em;
  background: #ffdd57; animation: ndBlink 900ms steps(1) infinite;
}

.nd-intro__extra { opacity: 0; transform: translateY(10px); transition: opacity 450ms ease, transform 450ms ease; }
.nd-intro__extra.is-shown { opacity: 1; transform: none; }

.nd-intro__chars { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 24px; }
.nd-intro__char { display: flex; flex-direction: column; align-items: center; text-align: center; }
.nd-intro__char-frame {
  width: 100%; aspect-ratio: 1; max-width: 140px; border: 2px solid rgba(255,221,87,0.7); border-radius: 8px;
  background: radial-gradient(circle at 50% 30%, rgba(255,221,87,0.12), rgba(255,255,255,0.02));
  display: flex; align-items: flex-end; justify-content: center; overflow: hidden;
  transition: transform 220ms ease, box-shadow 220ms ease;
}
.nd-intro__char:hover .nd-intro__char-frame { transform: translateY(-4px); box-shadow: 0 8px 22px rgba(255,221,87,0.25); }
.nd-intro__char-frame img { width: 100%; height: 100%; object-fit: contain; object-position: center bottom; }
.nd-intro__char-name { margin-top: 10px; font-size: clamp(17px, 1.6vw, 22px); font-weight: 700; color: #ffdd57; }
.nd-intro__char-desc { margin-top: 4px; font-size: clamp(14px, 1.2vw, 17px); color: #cbd5e1; line-height: 1.35; }

.nd-intro__quiz { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; }
.nd-intro__opt {
  width: 100%; padding: 14px 18px; border-radius: 6px !important;
  border: 2px solid rgba(255,255,255,0.18) !important; background: rgba(255,255,255,0.04) !important;
  font-size: clamp(17px, 1.7vw, 23px) !important; font-weight: 600; color: #f1f5f9 !important; text-align: left;
  transition: border-color 200ms ease, background 200ms ease, transform 200ms ease;
}
.nd-intro__opt:hover { border-color: #ffdd57 !important; transform: translateX(4px); }
.nd-intro__opt.is-correct { border-color: #4ade80 !important; background: rgba(74,222,128,0.14) !important; color: #bbf7d0 !important; }
.nd-intro__opt.is-wrong { border-color: #f87171 !important; background: rgba(248,113,113,0.12) !important; animation: ndShake 380ms ease; }
.nd-intro__feedback { min-height: 1.6em; margin-top: 6px; font-size: clamp(16px, 1.5vw, 20px); text-align: center; color: #cbd5e1; }
.nd-intro__feedback.is-good { color: #86efac; }
.nd-intro__feedback.is-bad { color: #fca5a5; }

.nd-intro__dots { display: flex; gap: 10px; margin-top: 30px; }
.nd-intro__dot { width: 10px; height: 10px; border-radius: 999px; background: rgba(255,255,255,0.2); transition: width 300ms ease, background 300ms ease; }
.nd-intro__dot.is-active { width: 30px; background: #ffdd57; }
.nd-intro__dot.is-done { background: rgba(255,221,87,0.45); }

/* Panel kanan "Lanjut": gradasi lembut + garis pemisah yang memudar di ujung */
.nd-intro__side {
  position: relative; width: clamp(150px, 16vw, 230px);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  background: linear-gradient(to right, rgba(255,221,87,0) 0%, rgba(255,221,87,0.035) 45%, rgba(255,221,87,0.08) 100%);
}
.nd-intro__side::before {
  content: ''; position: absolute; left: 0; top: 6%; bottom: 6%; width: 2px;
  background: linear-gradient(to bottom, transparent, rgba(255,221,87,0.55) 30%, rgba(255,221,87,0.55) 70%, transparent);
  box-shadow: 0 0 18px rgba(255,221,87,0.35);
}
.nd-intro__next {
  display: flex; align-items: center; gap: 8px;
  font-size: clamp(26px, 2.6vw, 36px) !important; font-weight: 700; color: #ffdd57 !important;
  text-shadow: 0 0 14px rgba(255,221,87,0.55), 0 0 32px rgba(255,221,87,0.25);
  animation: ndBreath 2.2s ease-in-out infinite;
  transition: transform 220ms ease, color 220ms ease, opacity 300ms ease;
}
.nd-intro__next:hover { color: #fff !important; transform: scale(1.06); animation-play-state: paused; opacity: 1; }
.nd-intro__next .nd-intro__chev { display: inline-block; animation: ndNudge 1.4s ease-in-out infinite; }
.nd-intro__next.is-disabled { opacity: .25 !important; animation: none; text-shadow: none; cursor: default; }
.nd-intro__next.is-disabled .nd-intro__chev { animation: none; }
.nd-intro__prev {
  font-size: 18px !important; color: #8b93a7 !important; transition: color 200ms ease, opacity 300ms ease;
}
.nd-intro__prev:hover { color: #fff !important; }
.nd-intro__prev.is-hidden { opacity: 0; pointer-events: none; }

@keyframes ndPop { from { opacity: 0; transform: scale(.4) rotate(-12deg); } to { opacity: 1; transform: scale(1) rotate(0); } }
@keyframes ndFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ndSlideIn { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes ndRise { from { opacity: 0; transform: translateY(22px) scale(.98); } to { opacity: 1; transform: none; } }
@keyframes ndBlink { 50% { opacity: 0; } }
@keyframes ndBreath { 0%,100% { opacity: .6; } 50% { opacity: 1; } }
@keyframes ndNudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(6px); } }
@keyframes ndShake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

/* Portrait (HP berdiri): panel Lanjut pindah ke bawah */
@media (max-aspect-ratio: 1/1) {
  #${ROOT_ID} { flex-direction: column; }
  .nd-intro__main { padding: 64px 5vw 16px; }
  .nd-intro__side {
    width: 100%; height: 120px; flex-direction: row; gap: 32px;
    background: linear-gradient(to bottom, rgba(255,221,87,0) 0%, rgba(255,221,87,0.08) 100%);
  }
  .nd-intro__side::before {
    left: 6%; right: 6%; top: 0; bottom: auto; width: auto; height: 2px;
    background: linear-gradient(to right, transparent, rgba(255,221,87,0.55) 30%, rgba(255,221,87,0.55) 70%, transparent);
  }
  .nd-intro__prev { order: -1; }
  .nd-intro__chars { grid-template-columns: repeat(2, 1fr); }
  .nd-intro__head { gap: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  #${ROOT_ID} *, #${ROOT_ID} { animation: none !important; transition: none !important; }
}
`;

export default class GameIntroGuideScene extends Phaser.Scene {
  constructor() {
    super('GameIntroGuideScene');
  }

  create() {
    const { width, height } = syncGameSizeToOrientation(this);
    // Starfield Phaser tetap jadi latar di balik lapisan HTML semi-transparan.
    this._starfield = drawStarfieldBackground(this, width, height);
    stopMenuBGM();
    this.audioManager = new AudioManager();
    this.audioManager.init();
    const settings = getSettings();
    this.audioManager.setBGMVolume(settings.bgmVolume);
    if (settings.muted) this.audioManager.setMasterVolume(0);
    this.audioManager.startGuideBGM();

    this.currentSlideIndex = 0;
    this._isTransitioning = false;
    this._typingTimer = null;
    this._isTyping = false;
    this._quizSolved = false;
    this._timeouts = [];

    this._mountOverlay();
    this._renderSlide(0);

    // Di-debounce (sama seperti MenuScene/EpisodeSelectScene): memanggil
    // syncGameSizeToOrientation() langsung di dalam event 'resize' akan
    // memicu 'resize' lagi dari setGameSize() -> rekursi tak berujung.
    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => {
        this._resizeDebounceTimer = null;
        if (!this.scene.isActive()) return;
        const size = syncGameSizeToOrientation(this);
        this._starfield?.reposition?.(size.width, size.height);
      }, 150);
    };
    this.scale.on('resize', this._onResize);

    this.events.once('shutdown', () => this._cleanup());
    this.events.once('destroy', () => this._cleanup());
  }

  // ---------- DOM ----------

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
      <button type="button" class="nd-intro__skip" id="nd-intro-skip">Lewati</button>
      <div class="nd-intro__main">
        <div class="nd-intro__slide" id="nd-intro-slide"></div>
        <div class="nd-intro__dots" id="nd-intro-dots">
          ${SLIDES.map(() => '<span class="nd-intro__dot"></span>').join('')}
        </div>
      </div>
      <div class="nd-intro__side">
        <button type="button" class="nd-intro__next" id="nd-intro-next">
          <span id="nd-intro-next-label">Lanjut</span><span class="nd-intro__chev">&rsaquo;</span>
        </button>
        <button type="button" class="nd-intro__prev is-hidden" id="nd-intro-prev">Kembali</button>
      </div>
    `;
    document.body.appendChild(root);
    this._root = root;
    this._slideEl = root.querySelector('#nd-intro-slide');
    this._nextBtn = root.querySelector('#nd-intro-next');
    this._nextLabel = root.querySelector('#nd-intro-next-label');
    this._prevBtn = root.querySelector('#nd-intro-prev');
    this._dots = Array.from(root.querySelectorAll('.nd-intro__dot'));

    root.querySelector('#nd-intro-skip').addEventListener('click', () => this._finishIntro());
    this._nextBtn.addEventListener('click', () => this._handleNext());
    this._prevBtn.addEventListener('click', () => this._prevSlide());

    this._onKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        this._handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this._prevSlide();
      }
    };
    window.addEventListener('keydown', this._onKeyDown);

    // Fade-in lapisan setelah frame pertama supaya transisi CSS berjalan.
    requestAnimationFrame(() => root.classList.add('is-visible'));
  }

  _renderSlide(idx) {
    const slide = SLIDES[idx];
    if (!slide || !this._slideEl) return;

    let extraHtml = '';
    if (slide.characters) {
      extraHtml = `
        <div class="nd-intro__extra nd-intro__chars">
          ${slide.characters
            .map(
              (c) => `
            <div class="nd-intro__char">
              <div class="nd-intro__char-frame"><img src="${c.img}" alt="${c.name}" draggable="false" /></div>
              <div class="nd-intro__char-name">${c.name}</div>
              <div class="nd-intro__char-desc">${c.desc}</div>
            </div>`,
            )
            .join('')}
        </div>`;
    } else if (slide.quiz) {
      extraHtml = `
        <div class="nd-intro__extra nd-intro__quiz">
          ${slide.quiz.options
            .map((o, i) => `<button type="button" class="nd-intro__opt" data-opt="${i}">${String.fromCharCode(65 + i)}. ${o.label}</button>`)
            .join('')}
          <div class="nd-intro__feedback" id="nd-intro-feedback"></div>
        </div>`;
    }

    this._slideEl.innerHTML = `
      <div class="nd-intro__head">
        <div class="nd-intro__icon">${ICONS[slide.icon] || ICONS.dara}</div>
        <div class="nd-intro__title" role="heading" aria-level="1">${slide.title}</div>
      </div>
      <div class="nd-intro__box">
        <span class="nd-intro__speaker">Kak Dara</span>
        <p class="nd-intro__text" id="nd-intro-text"></p>
        ${extraHtml}
      </div>
    `;

    if (slide.quiz) this._bindQuiz(slide.quiz);

    // Navigasi
    this._dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === idx);
      d.classList.toggle('is-done', i < idx);
    });
    this._prevBtn.classList.toggle('is-hidden', idx === 0);
    this._nextLabel.textContent = slide.nextLabel || 'Lanjut';
    this._updateNextState();

    // Ketik teks Kak Dara setelah kotak selesai muncul.
    this._later(() => this._typeText(slide.text), 420);
  }

  _typeText(fullText) {
    const textEl = this._root?.querySelector('#nd-intro-text');
    if (!textEl) return;
    this._stopTyping();
    this._isTyping = true;
    this._fullText = fullText;

    let i = 0;
    const caret = '<span class="nd-intro__caret"></span>';
    this._typingTimer = window.setInterval(() => {
      i += 1;
      textEl.innerHTML = `${fullText.slice(0, i)}${caret}`;
      if (i >= fullText.length) this._completeTyping();
    }, 24);
  }

  _completeTyping() {
    this._stopTyping();
    const textEl = this._root?.querySelector('#nd-intro-text');
    if (textEl && this._fullText) textEl.textContent = this._fullText;
    this._isTyping = false;
    this._root?.querySelector('.nd-intro__extra')?.classList.add('is-shown');
  }

  _stopTyping() {
    if (this._typingTimer) {
      window.clearInterval(this._typingTimer);
      this._typingTimer = null;
    }
  }

  _bindQuiz(quiz) {
    const opts = Array.from(this._root.querySelectorAll('.nd-intro__opt'));
    const feedback = this._root.querySelector('#nd-intro-feedback');

    if (this._quizSolved) {
      const correctIdx = quiz.options.findIndex((o) => o.correct);
      opts[correctIdx]?.classList.add('is-correct');
      feedback.textContent = quiz.correctFeedback;
      feedback.className = 'nd-intro__feedback is-good';
    }

    opts.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (this._quizSolved) return;
        const opt = quiz.options[Number(btn.dataset.opt)];
        if (opt.correct) {
          this._quizSolved = true;
          btn.classList.add('is-correct');
          feedback.textContent = quiz.correctFeedback;
          feedback.className = 'nd-intro__feedback is-good';
          this._updateNextState();
        } else {
          btn.classList.remove('is-wrong');
          void btn.offsetWidth; // restart animasi goyang
          btn.classList.add('is-wrong');
          feedback.textContent = quiz.wrongFeedback;
          feedback.className = 'nd-intro__feedback is-bad';
        }
      });
    });
  }

  _updateNextState() {
    const slide = SLIDES[this.currentSlideIndex];
    const locked = Boolean(slide?.quiz) && !this._quizSolved;
    this._nextBtn?.classList.toggle('is-disabled', locked);
  }

  // ---------- Navigasi ----------

  _handleNext() {
    if (this._isTransitioning) return;
    // Klik saat teks masih diketik -> tampilkan teks penuh dulu.
    if (this._isTyping) {
      this._completeTyping();
      return;
    }
    const slide = SLIDES[this.currentSlideIndex];
    if (slide?.quiz && !this._quizSolved) {
      const fb = this._root?.querySelector('#nd-intro-feedback');
      if (fb) {
        fb.textContent = 'Pilih salah satu jawaban dulu, ya.';
        fb.className = 'nd-intro__feedback is-bad';
      }
      return;
    }
    if (this.currentSlideIndex < SLIDES.length - 1) {
      this._goToSlide(this.currentSlideIndex + 1);
    } else {
      this._finishIntro();
    }
  }

  _prevSlide() {
    if (this._isTransitioning || this.currentSlideIndex === 0) return;
    this._goToSlide(this.currentSlideIndex - 1);
  }

  // Fade out halus -> ganti isi -> animasi masuk (ikon pop, judul geser,
  // kotak naik, teks diketik).
  _goToSlide(targetIdx) {
    this._isTransitioning = true;
    this._stopTyping();
    this._isTyping = false;
    this._slideEl.classList.add('is-leaving');

    this._later(() => {
      this.currentSlideIndex = targetIdx;
      this._renderSlide(targetIdx);
      this._slideEl.classList.remove('is-leaving');
      this._later(() => {
        this._isTransitioning = false;
      }, 300);
    }, 320);
  }

  _later(fn, ms) {
    const id = window.setTimeout(fn, ms);
    this._timeouts.push(id);
    return id;
  }

  _finishIntro() {
    if (this._finishing) return;
    this._finishing = true;
    this._stopTyping();
    try {
      localStorage.setItem('nawasenadara_seen_intro_v1', 'true');
      localStorage.removeItem('nawasenadara_seen_control_tutorial_v1');
    } catch {
      // abaikan (mode privat / storage penuh)
    }
    this._root?.classList.add('is-closing');
    this.cameras.main.fadeOut(380, 5, 5, 15);
    this._later(() => {
      this.scene.start('EpisodeIntroScene', { episodeId: 1 });
    }, 380);
  }

  _cleanup() {
    this._stopTyping();
    this.audioManager?.destroy();
    this.audioManager = null;
    if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
    this._resizeDebounceTimer = null;
    this._timeouts?.forEach((id) => window.clearTimeout(id));
    this._timeouts = [];
    if (this._onKeyDown) window.removeEventListener('keydown', this._onKeyDown);
    this._onKeyDown = null;
    if (this._onResize) this.scale.off('resize', this._onResize);
    const rootEl = this._root;
    this._root = null;
    if (rootEl) {
      if (this._finishing) {
        requestAnimationFrame(() => {
          rootEl.classList.add('is-fadeout');
          window.setTimeout(() => rootEl.remove(), 400);
        });
      } else {
        rootEl.remove();
      }
    }
  }
}
