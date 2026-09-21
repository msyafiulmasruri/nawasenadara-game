import Phaser from 'phaser';
import { getMenuAudioManager } from '../audio/menuAudio';
import { drawStarfieldBackground } from '../utils/starfieldBackground';
import { getVisibleBounds, syncGameSizeToOrientation, pxToWorld } from '../utils/visibleBounds';
import { getSettings, setSfxVolume, setBgmVolume, setMuted } from '../utils/settingsStore';

const VOLUME_STEP = 0.1;

export default class SettingsScene extends Phaser.Scene {
  constructor() {
    super('SettingsScene');
  }

  create() {
    // WAJIB di awal — lihat dokumentasi syncGameSizeToOrientation()
    // (utils/visibleBounds.js), sama alasannya seperti scene menu lain.
    const { width, height } = syncGameSizeToOrientation(this);
    const bounds0 = getVisibleBounds(this);

    // Background langit + bintang berkedip — sebelumnya scene ini
    // benar-benar polos/hitam, tidak konsisten dengan Title/Menu.
    this._starfield = drawStarfieldBackground(this, width, height);

    this._settings = getSettings();
    this._rowTexts = {};

    this.titleText = this.add
      .text(width / 2, 0, 'SETTINGS', {
        fontFamily: '"Jersey 15", monospace',
        fontSize: `${pxToWorld(this, 38)}px`,
        color: '#ffdd57',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    // --- Baris SFX Volume ---
    this._buildStepperRow({
      key: 'sfx',
      label: 'SFX Volume',
      getValue: () => this._settings.sfxVolume,
      onChange: (delta) => {
        this._settings = setSfxVolume(clamp01(this._settings.sfxVolume + delta));
        // Terapkan LANGSUNG ke musik yang sedang jalan — sebelumnya
        // perubahan cuma ditulis ke localStorage dan baru terasa lain
        // kali AudioManager baru dibuat (keluar-masuk Settings).
        getMenuAudioManager().setSFXVolume(this._settings.sfxVolume);
        this._refreshRow('sfx');
      },
    });

    // --- Baris Music/BGM Volume ---
    this._buildStepperRow({
      key: 'bgm',
      label: 'Music Volume',
      getValue: () => this._settings.bgmVolume,
      onChange: (delta) => {
        this._settings = setBgmVolume(clamp01(this._settings.bgmVolume + delta));
        getMenuAudioManager().setBGMVolume(this._settings.bgmVolume);
        this._refreshRow('bgm');
      },
    });

    // --- Baris Mute All (matikan semua suara sekaligus) ---
    this._buildToggleRow({
      key: 'mute',
      getLabel: () => (this._settings.muted ? 'Sound: OFF' : 'Sound: ON'),
      onToggle: () => {
        this._settings = setMuted(!this._settings.muted);
        // FIX: sebelumnya toggle mute cuma ditulis ke localStorage.
        // Kalau di-OFF, musik yang sedang jalan tidak langsung senyap;
        // dan kalau di-ON lagi, tidak ada trigger apapun yang menyalakan
        // gain balik ke 1 (baru kerasa lagi kalau keluar-masuk scene
        // yang bikin AudioManager baru). Sekarang gain langsung
        // diterapkan ke instance yang sedang aktif saat itu juga.
        getMenuAudioManager().setMasterVolume(this._settings.muted ? 0 : 1);
        this._refreshRow('mute');
      },
    });

    // --- Reset Password ---
    // Fitur akun (ganti password) hidup di halaman web Next.js
    // (/forgot-password), bukan di dalam canvas Phaser — jadi di sini
    // cukup navigasi browser ke sana. Kita TIDAK logout otomatis;
    // /forgot-password sendiri tidak butuh sesi login (cukup email).
    this._buildActionRow({
      key: 'resetPassword',
      label: 'Reset Password',
      onSelect: () => {
        if (typeof window !== 'undefined') {
          window.location.href = '/forgot-password';
        }
      },
    });

    // --- Back ---
    this._buildActionRow({
      key: 'back',
      label: '< Back to Menu',
      onSelect: () => this.scene.start('MenuScene'),
      color: '#ffffff',
    });

    // Navigasi keyboard: UP/DOWN pindah baris, LEFT/RIGHT ubah value
    // (khusus baris volume), ENTER aktifkan baris (toggle/action).
    this._rowOrder = ['sfx', 'bgm', 'mute', 'resetPassword', 'back'];
    this._selectedRow = 0;
    this._highlightSelectedRow();

    this.input.keyboard.on('keydown-DOWN', () => {
      this._selectedRow = (this._selectedRow + 1) % this._rowOrder.length;
      this._highlightSelectedRow();
    });
    this.input.keyboard.on('keydown-UP', () => {
      this._selectedRow = (this._selectedRow - 1 + this._rowOrder.length) % this._rowOrder.length;
      this._highlightSelectedRow();
    });
    this.input.keyboard.on('keydown-LEFT', () => this._activateArrow(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._activateArrow(1));
    this.input.keyboard.on('keydown-ENTER', () => this._activateSelected());
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('MenuScene'));

    this._resizeDebounceTimer = null;
    this._onResize = () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this._resizeDebounceTimer = setTimeout(() => this._reposition(), 150);
    };
    this.scale.on('resize', this._onResize);
    this.events.once('shutdown', () => {
      if (this._resizeDebounceTimer) clearTimeout(this._resizeDebounceTimer);
      this.scale.off('resize', this._onResize);
    });

    this._reposition();
  }

  // ── Row builders ────────────────────────────────────────────────

  _buildStepperRow({ key, label, getValue, onChange }) {
    const rowFont = pxToWorld(this, 21);
    const arrowFont = pxToWorld(this, 24);

    const labelText = this.add
      .text(0, 0, label, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${rowFont}px`,
        color: '#ffffff',
      })
      .setOrigin(0, 0.5)
      .setDepth(2);

    const minusBtn = this.add
      .text(0, 0, '◀', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${arrowFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onChange(-VOLUME_STEP));

    const valueText = this.add
      .text(0, 0, formatPercent(getValue()), {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${rowFont}px`,
        color: '#ffffff',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2);

    const plusBtn = this.add
      .text(0, 0, '▶', {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${arrowFont}px`,
        color: '#ffdd57',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => onChange(VOLUME_STEP));

    this._rowTexts[key] = { type: 'stepper', labelText, minusBtn, valueText, plusBtn, onChange, getValue };
  }

  _buildToggleRow({ key, getLabel, onToggle }) {
    const rowFont = pxToWorld(this, 21);
    const labelText = this.add
      .text(0, 0, getLabel(), {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${rowFont}px`,
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onToggle);

    this._rowTexts[key] = { type: 'toggle', labelText, getLabel, onToggle };
  }

  _buildActionRow({ key, label, onSelect, color = '#ffdd57' }) {
    const rowFont = pxToWorld(this, 21);
    const labelText = this.add
      .text(0, 0, label, {
        fontFamily: '"Pixelify Sans", monospace',
        fontSize: `${rowFont}px`,
        fontStyle: '600',
        color,
      })
      .setOrigin(0.5)
      .setDepth(2)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', onSelect);

    this._rowTexts[key] = { type: 'action', labelText, onSelect };
  }

  _refreshRow(key) {
    const row = this._rowTexts[key];
    if (row.type === 'stepper') {
      row.valueText.setText(formatPercent(row.getValue()));
    } else if (row.type === 'toggle') {
      row.labelText.setText(row.getLabel());
    }
  }

  _highlightSelectedRow() {
    this._rowOrder.forEach((key, i) => {
      const row = this._rowTexts[key];
      const active = i === this._selectedRow;
      if (row.type === 'stepper') {
        row.labelText.setColor(active ? '#ffdd57' : '#ffffff');
      } else if (row.type === 'toggle') {
        row.labelText.setColor(active ? '#ffdd57' : '#ffffff');
      } else if (row.type === 'action' && row.labelText.style.color === '#ffffff') {
        row.labelText.setColor(active ? '#ffdd57' : '#ffffff');
      }
    });
  }

  _activateArrow(direction) {
    const key = this._rowOrder[this._selectedRow];
    const row = this._rowTexts[key];
    if (row.type === 'stepper') {
      row.onChange(direction * VOLUME_STEP);
    }
  }

  _activateSelected() {
    const key = this._rowOrder[this._selectedRow];
    const row = this._rowTexts[key];
    if (row.type === 'toggle') row.onToggle();
    if (row.type === 'action') row.onSelect();
  }

  _reposition() {
    const { width, height } = syncGameSizeToOrientation(this);
    this._starfield?.reposition(width, height);
    const bounds = getVisibleBounds(this);

    this.titleText.setFontSize(pxToWorld(this, 38));
    this.titleText.setPosition(bounds.centerX, bounds.top + bounds.height * 0.14);

    const rowFont = pxToWorld(this, 21);
    const arrowFont = pxToWorld(this, 24);
    const rowGap = bounds.height * 0.1;
    const startY = bounds.top + bounds.height * 0.32;
    const centerX = bounds.centerX;
    const arrowOffset = Math.min(bounds.width * 0.32, 140);

    this._rowOrder.forEach((key, i) => {
      const row = this._rowTexts[key];
      const y = startY + i * rowGap;

      if (row.type === 'stepper') {
        row.labelText.setFontSize(rowFont);
        row.labelText.setPosition(centerX - arrowOffset - 8, y - rowFont);
        row.labelText.setOrigin(0.5, 0.5);

        row.minusBtn.setFontSize(arrowFont);
        row.minusBtn.setPosition(centerX - arrowOffset, y + rowFont * 0.6);
        row.minusBtn.disableInteractive();
        row.minusBtn.setInteractive({ useHandCursor: true });

        row.valueText.setFontSize(rowFont);
        row.valueText.setPosition(centerX, y + rowFont * 0.6);

        row.plusBtn.setFontSize(arrowFont);
        row.plusBtn.setPosition(centerX + arrowOffset, y + rowFont * 0.6);
        row.plusBtn.disableInteractive();
        row.plusBtn.setInteractive({ useHandCursor: true });
      } else {
        row.labelText.setFontSize(rowFont);
        row.labelText.setPosition(centerX, y);
        row.labelText.setWordWrapWidth(bounds.width * 0.85);
        row.labelText.disableInteractive();
        row.labelText.setInteractive({ useHandCursor: true });
      }
    });
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function formatPercent(v) {
  return `${Math.round(v * 100)}%`;
}
