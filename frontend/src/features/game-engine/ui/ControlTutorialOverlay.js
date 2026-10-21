/**
 * ControlTutorialOverlay.js
 *
 * Panduan kontrol bergaya minimalis, monokrom, dan semi-transparan (faded)
 * sesuai referensi visual, khusus menampilkan kontrol yang benar-benar
 * digunakan di dalam game 2D side-scrolling Nawasena Dara:
 *   1. Jalan Kiri / Kanan : A / D atau Panah Kiri / Kanan
 *   2. Lari Cepat         : Shift
 *   3. Melompat           : Space
 *   4. Bicara & Interaksi : E atau Klik Kiri Mouse
 *
 * - Tanpa tombol yang tidak terpakai (tanpa W, S, Panah Atas/Bawah, H, dsb.).
 * - Tanpa warna-warni mencolok (monokrom hitam transparan & putih bersih).
 * - Tanpa emoticon sama sekali.
 */

const ROOT_ID = 'nd-ctrl-tutorial-root';
const STYLE_ID = 'nd-ctrl-tutorial-style';
const STORAGE_KEY = 'nawasenadara_seen_control_tutorial_v1';

const CSS = `
#${ROOT_ID} {
  position: fixed;
  inset: 0;
  z-index: 8500;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 4vw;
  pointer-events: none;
  font-family: 'Pixelify Sans', monospace;
  color: #ffffff;
  background: radial-gradient(
    ellipse at center,
    rgba(8, 8, 14, 0.58) 0%,
    rgba(8, 8, 14, 0.38) 65%,
    rgba(8, 8, 14, 0.16) 100%
  );
  opacity: 0;
  transition: opacity 480ms cubic-bezier(0.22, 1, 0.36, 1);
  user-select: none;
  -webkit-font-smoothing: antialiased;
}
#${ROOT_ID}.is-visible {
  opacity: 1;
}
#${ROOT_ID}.is-closing {
  opacity: 0;
  transition: opacity 420ms ease;
}

.nd-ctrl__panel {
  pointer-events: auto;
  width: min(760px, 100%);
  background: rgba(12, 12, 20, 0.54);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1.5px solid rgba(255, 255, 255, 0.22);
  border-radius: 22px;
  padding: clamp(24px, 3.2vw, 36px) clamp(20px, 3.8vw, 44px);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.42);
  transform: translateY(14px) scale(0.98);
  transition: transform 480ms cubic-bezier(0.22, 1, 0.36, 1);
}
#${ROOT_ID}.is-visible .nd-ctrl__panel {
  transform: translateY(0) scale(1);
}
#${ROOT_ID}.is-closing .nd-ctrl__panel {
  transform: translateY(10px) scale(0.98);
}

.nd-ctrl__header {
  text-align: center;
  margin-bottom: clamp(20px, 2.8vw, 30px);
}
.nd-ctrl__heading {
  margin: 0 0 6px;
  font-family: 'Jersey 15', 'Pixelify Sans', monospace;
  font-size: clamp(26px, 3.2vw, 36px);
  font-weight: 400;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.96);
}
.nd-ctrl__subheading {
  margin: 0;
  font-size: clamp(15px, 1.7vw, 19px);
  color: rgba(255, 255, 255, 0.72);
  font-weight: 400;
}

/* Grid 2x2 untuk 4 kontrol utama yang benar-benar dipakai di game */
.nd-ctrl__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: clamp(22px, 3vw, 32px) clamp(20px, 3vw, 36px);
  align-items: end;
  justify-items: center;
}

.nd-ctrl__group {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  opacity: 0;
  transform: translateY(12px);
  animation: ndCtrlFadeUp 520ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.nd-ctrl__group:nth-child(1) { animation-delay: 60ms; }
.nd-ctrl__group:nth-child(2) { animation-delay: 130ms; }
.nd-ctrl__group:nth-child(3) { animation-delay: 200ms; }
.nd-ctrl__group:nth-child(4) { animation-delay: 270ms; }

.nd-ctrl__cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 76px;
  gap: 8px;
}
.nd-ctrl__row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.nd-ctrl__divider {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 4px;
}

/* Bentuk Keycap Monokrom Hitam-Putih Transparan */
.nd-ctrl__key {
  min-width: 52px;
  height: 52px;
  padding: 0 14px;
  border-radius: 12px;
  background: rgba(10, 10, 16, 0.82);
  border: 2px solid rgba(255, 255, 255, 0.84);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: 'Pixelify Sans', monospace;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.38);
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 150ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}
.nd-ctrl__key--wide {
  min-width: 154px;
  height: 52px;
  justify-content: center;
  padding: 0 20px;
  font-size: 19px;
  font-weight: 700;
}

/* Efek saat tombol ditekan pemain (interaktif monokrom) */
.nd-ctrl__key.is-pressed,
.nd-ctrl__key.is-done {
  background: rgba(255, 255, 255, 0.95);
  color: #0a0a12;
  border-color: #ffffff;
  transform: translateY(2px) scale(0.97);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.45);
}

/* Ikon Mouse Minimalis seperti referensi */
.nd-ctrl__mouse {
  width: 46px;
  height: 66px;
  border-radius: 22px;
  border: 2.5px solid rgba(255, 255, 255, 0.88);
  background: rgba(10, 10, 16, 0.78);
  position: relative;
  display: inline-block;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.38);
  transition: transform 150ms ease, background-color 180ms ease, box-shadow 180ms ease;
}
.nd-ctrl__mouse::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 28px;
  background: rgba(255, 255, 255, 0.85);
  transform: translateX(-50%);
}
.nd-ctrl__mouse::after {
  content: '';
  position: absolute;
  top: 28px;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255, 255, 255, 0.85);
}
.nd-ctrl__mouse-wheel {
  position: absolute;
  top: 7px;
  left: 50%;
  transform: translateX(-50%);
  width: 8px;
  height: 15px;
  border-radius: 4px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: rgba(10, 10, 16, 0.9);
}
.nd-ctrl__mouse.is-pressed,
.nd-ctrl__mouse.is-done {
  background: rgba(255, 255, 255, 0.92);
  transform: scale(0.96);
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.45);
}

.nd-ctrl__label {
  margin: 0;
  font-size: clamp(18px, 2vw, 22px);
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.02em;
}
.nd-ctrl__sublabel {
  margin: -4px 0 0;
  font-size: clamp(14px, 1.5vw, 16px);
  color: rgba(255, 255, 255, 0.68);
  line-height: 1.35;
  max-width: 250px;
}

.nd-ctrl__footer {
  margin-top: clamp(22px, 3vw, 32px);
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.nd-ctrl__status {
  font-size: clamp(15px, 1.7vw, 18px);
  color: rgba(255, 255, 255, 0.78);
}
.nd-ctrl__close-btn {
  font-family: inherit;
  font-size: clamp(16px, 1.8vw, 19px);
  font-weight: 700;
  color: #0a0a12;
  background: rgba(255, 255, 255, 0.92);
  border: 1.5px solid #ffffff;
  border-radius: 10px;
  padding: 8px 22px;
  cursor: pointer;
  transition: background-color 160ms ease, transform 150ms ease, opacity 160ms ease;
}
.nd-ctrl__close-btn:hover {
  background: #ffffff;
  transform: translateY(-1px);
}

@keyframes ndCtrlFadeUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .nd-ctrl__grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .nd-ctrl__key {
    min-width: 44px;
    height: 44px;
    font-size: 19px;
  }
  .nd-ctrl__key--wide {
    min-width: 132px;
    height: 44px;
    font-size: 16px;
  }
  .nd-ctrl__footer {
    flex-direction: column;
    text-align: center;
  }
}

/* Mobile Landscape (Pixel 9, iPhone landscape, dsb. dengan tinggi <= 520px) */
@media (max-height: 520px) {
  #nd-ctrl-tutorial-root {
    padding: 6px 3vw;
  }
  .nd-ctrl__panel {
    padding: 10px 22px;
    border-radius: 14px;
    max-height: 96vh;
    overflow-y: auto;
  }
  .nd-ctrl__header {
    margin-bottom: 6px;
  }
  .nd-ctrl__heading {
    font-size: 18px;
    margin-bottom: 2px;
  }
  .nd-ctrl__subheading {
    font-size: 12px;
  }
  .nd-ctrl__grid {
    gap: 6px 20px;
  }
  .nd-ctrl__group {
    gap: 3px;
  }
  .nd-ctrl__cluster {
    min-height: 38px;
    gap: 4px;
  }
  .nd-ctrl__key {
    min-width: 36px;
    height: 34px;
    padding: 0 8px;
    font-size: 14px;
    border-radius: 7px;
  }
  .nd-ctrl__key--wide {
    min-width: 90px;
    height: 34px;
    padding: 0 12px;
    font-size: 13px;
  }
  .nd-ctrl__mouse {
    width: 28px;
    height: 40px;
    border-radius: 12px;
    border-width: 2px;
  }
  .nd-ctrl__mouse::before {
    height: 16px;
  }
  .nd-ctrl__mouse::after {
    top: 16px;
  }
  .nd-ctrl__mouse-wheel {
    top: 4px;
    width: 5px;
    height: 9px;
  }
  .nd-ctrl__label {
    font-size: 13px;
  }
  .nd-ctrl__sublabel {
    font-size: 10.5px;
    line-height: 1.2;
    margin-top: -2px;
    max-width: 220px;
  }
  .nd-ctrl__footer {
    margin-top: 6px;
    padding-top: 6px;
    gap: 8px;
  }
  .nd-ctrl__status {
    font-size: 11.5px;
  }
  .nd-ctrl__close-btn {
    font-size: 12px;
    padding: 4px 14px;
    border-radius: 6px;
  }
}
`;

export default class ControlTutorialOverlay {
  constructor(scene) {
    this.scene = scene;
    this.isOpen = false;
    this._root = null;
    this._onKeyDown = null;
    this._onKeyUp = null;
    this._triedActions = new Set();
    this._autoCloseTimer = null;
  }

  static hasSeenTutorial() {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  static markSeen() {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // abaikan
    }
  }

  show({ force = false } = {}) {
    if (!force && ControlTutorialOverlay.hasSeenTutorial()) {
      return;
    }
    if (this.isOpen) {
      return;
    }

    this.isOpen = true;
    this._triedActions.clear();
    this._mountDOM();

    if (!this._shutdownBound) {
      this._shutdownBound = () => this.destroy();
      this.scene.events.once('shutdown', this._shutdownBound);
      this.scene.events.once('destroy', this._shutdownBound);
    }
  }

  _mountDOM() {
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
      <div class="nd-ctrl__panel" id="nd-ctrl-panel">
        <div class="nd-ctrl__header">
          <h2 class="nd-ctrl__heading">PETUNJUK KONTROL PERMAINAN</h2>
          <p class="nd-ctrl__subheading">Gunakan tombol berikut untuk bergerak dan berinteraksi di dalam cerita</p>
        </div>

        <div class="nd-ctrl__grid">
          <!-- 1. Jalan Kiri / Kanan (A/D atau Panah Kiri/Kanan) -->
          <div class="nd-ctrl__group">
            <div class="nd-ctrl__cluster">
              <div class="nd-ctrl__row">
                <div class="nd-ctrl__key" data-key="a" data-action="walk">A</div>
                <div class="nd-ctrl__key" data-key="d" data-action="walk">D</div>
                <span class="nd-ctrl__divider">/</span>
                <div class="nd-ctrl__key" data-key="arrowleft" data-action="walk">&larr;</div>
                <div class="nd-ctrl__key" data-key="arrowright" data-action="walk">&rarr;</div>
              </div>
            </div>
            <p class="nd-ctrl__label">Jalan Kiri &amp; Kanan</p>
            <p class="nd-ctrl__sublabel">Tekan A / D atau Panah Kiri / Kanan untuk melangkah</p>
          </div>

          <!-- 2. Lari Cepat (Shift) -->
          <div class="nd-ctrl__group">
            <div class="nd-ctrl__cluster">
              <div class="nd-ctrl__key nd-ctrl__key--wide" data-key="shift" data-action="run">Shift</div>
            </div>
            <p class="nd-ctrl__label">Lari Cepat</p>
            <p class="nd-ctrl__sublabel">Tekan Shift untuk beralih antara berjalan dan berlari</p>
          </div>

          <!-- 3. Melompat (Space) -->
          <div class="nd-ctrl__group">
            <div class="nd-ctrl__cluster">
              <div class="nd-ctrl__key nd-ctrl__key--wide" data-key="space" data-action="jump">Space</div>
            </div>
            <p class="nd-ctrl__label">Melompat</p>
            <p class="nd-ctrl__sublabel">Tekan Space saat ingin melompat</p>
          </div>

          <!-- 4. Interaksi & Bicara (E / Klik Mouse) -->
          <div class="nd-ctrl__group">
            <div class="nd-ctrl__cluster">
              <div class="nd-ctrl__row" style="gap: 14px;">
                <div class="nd-ctrl__key" data-key="e" data-action="interact">E</div>
                <span class="nd-ctrl__divider">/</span>
                <div class="nd-ctrl__mouse" id="nd-ctrl-mouse" data-action="interact">
                  <span class="nd-ctrl__mouse-wheel"></span>
                </div>
              </div>
            </div>
            <p class="nd-ctrl__label">Bicara &amp; Interaksi</p>
            <p class="nd-ctrl__sublabel">Tekan E atau klik langsung pada karakter maupun objek</p>
          </div>
        </div>

        <div class="nd-ctrl__footer">
          <span class="nd-ctrl__status" id="nd-ctrl-status">
            Coba tekan tombol A/D, Shift, atau Space untuk menguji kontrol
          </span>
          <button type="button" class="nd-ctrl__close-btn" id="nd-ctrl-close">
            Mulai Bermain
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(root);
    this._root = root;
    this._statusEl = root.querySelector('#nd-ctrl-status');
    this._mouseEl = root.querySelector('#nd-ctrl-mouse');

    root.querySelector('#nd-ctrl-close').addEventListener('click', (e) => {
      e.stopPropagation();
      ControlTutorialOverlay.markSeen();
      this.close();
    });

    if (this._mouseEl) {
      this._mouseEl.addEventListener('click', () => {
        this._mouseEl.classList.add('is-done');
        this._recordAction('interact');
      });
    }

    this._onKeyDown = (e) => {
      if (!this.isOpen) return;
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();

      let selectorKey = key;
      if (code === 'space' || key === ' ') selectorKey = 'space';
      else if (key === 'shift') selectorKey = 'shift';

      const els = root.querySelectorAll(`[data-key="${selectorKey}"]`);
      els.forEach((el) => {
        el.classList.add('is-pressed', 'is-done');
        const act = el.getAttribute('data-action');
        if (act) this._recordAction(act);
      });
    };

    this._onKeyUp = (e) => {
      if (!this.isOpen) return;
      const key = (e.key || '').toLowerCase();
      const code = (e.code || '').toLowerCase();

      let selectorKey = key;
      if (code === 'space' || key === ' ') selectorKey = 'space';
      else if (key === 'shift') selectorKey = 'shift';

      const els = root.querySelectorAll(`[data-key="${selectorKey}"]`);
      els.forEach((el) => el.classList.remove('is-pressed'));
    };

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    requestAnimationFrame(() => root.classList.add('is-visible'));
  }

  /**
   * Dipanggil dari BasePlayerScene saat pemain menekan kontrol
   * (baik lewat keyboard maupun tombol layar sentuh).
   */
  notifyAction(actionId) {
    if (!this.isOpen || !this._root) return;
    const els = this._root.querySelectorAll(`[data-action="${actionId}"]`);
    els.forEach((el) => el.classList.add('is-done'));
    if (actionId === 'interact') {
      this._mouseEl?.classList.add('is-done');
    }
    this._recordAction(actionId);
  }

  _recordAction(actionId) {
    this._triedActions.add(actionId);
    if (!this._statusEl) return;

    const count = this._triedActions.size;
    if (count >= 3) {
      this._statusEl.textContent = 'Kontrol utama sudah dicoba. Selamat bermain!';
      if (!this._autoCloseTimer) {
        this._autoCloseTimer = window.setTimeout(() => {
          ControlTutorialOverlay.markSeen();
          this.close();
        }, 1400);
      }
    } else {
      this._statusEl.textContent = `Kontrol dicoba (${count}/3) - Coba tekan jalan (A/D), lari (Shift), dan lompat (Space)`;
    }
  }

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;

    if (this._autoCloseTimer) {
      window.clearTimeout(this._autoCloseTimer);
      this._autoCloseTimer = null;
    }

    if (this._onKeyDown) {
      window.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
    if (this._onKeyUp) {
      window.removeEventListener('keyup', this._onKeyUp);
      this._onKeyUp = null;
    }

    const rootEl = this._root;
    this._root = null;
    if (rootEl) {
      rootEl.classList.remove('is-visible');
      rootEl.classList.add('is-closing');
      window.setTimeout(() => rootEl.remove(), 420);
    }
  }

  destroy() {
    this.close();
    document.getElementById(ROOT_ID)?.remove();
  }
}
