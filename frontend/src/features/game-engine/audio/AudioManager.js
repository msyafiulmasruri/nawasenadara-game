/**
 * AudioManager.js
 *
 * Procedural audio generator menggunakan Web Audio API.
 * Menghasilkan sound effects (footstep walk, footstep run, jump)
 * dan background music (lo-fi chill loop) secara real-time di browser
 * tanpa membutuhkan file audio eksternal.
 *
 * Penggunaan:
 *   const audio = new AudioManager();
 *   audio.init();
 *   audio.playFootstepWalk();
 *   audio.playFootstepRun();
 *   audio.playJump();
 *   audio.startBGM();
 *   audio.stopBGM();
 */

export default class AudioManager {
  constructor() {
    this.ctx = null;
    this.bgmPlaying = false;
    this.bgmNodes = null;
    this.masterGain = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this._initialized = false;
  }

  /**
   * Inisialisasi AudioContext. Harus dipanggil setelah user interaction
   * (klik/tap) karena kebijakan autoplay browser.
   */
  init() {
    if (this._initialized) return;

    this.ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Master -> SFX + BGM gain nodes
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1.0;
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.6;
    this.sfxGain.connect(this.masterGain);

    this.bgmGain = this.ctx.createGain();
    this.bgmGain.gain.value = 0.25;
    this.bgmGain.connect(this.masterGain);

    this._initialized = true;
  }

  /**
   * Resume AudioContext jika suspended (karena kebijakan autoplay).
   */
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ─── Internal Helpers ──────────────────────────────────────────────

  _now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  _createNoiseBuffer(duration) {
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // ─── SFX: Footstep Walk ────────────────────────────────────────────
  // Bunyi "tok" ringan — sepatu di lantai keramik/kayu
  playFootstepWalk() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();

    // Low thud oscillator
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.3, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    // Click noise for texture
    const noiseBuffer = this._createNoiseBuffer(0.02);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.15, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);

    // Low-pass filter for warmth
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1500;
    filter.Q.value = 1;

    osc.connect(oscGain);
    noiseSrc.connect(noiseGain);
    oscGain.connect(filter);
    noiseGain.connect(filter);
    filter.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.12);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.03);
  }

  // ─── SFX: Footstep Run ────────────────────────────────────────────
  // Lebih berat & impact-ful dibanding walk
  playFootstepRun() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();

    // Heavy thud
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(50, t + 0.06);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    // Sub bass layer
    const sub = this.ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = 45;

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    // Impact noise
    const noiseBuffer = this._createNoiseBuffer(0.015);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    filter.Q.value = 0.7;

    osc.connect(oscGain);
    sub.connect(subGain);
    noiseSrc.connect(noiseGain);
    oscGain.connect(filter);
    subGain.connect(filter);
    noiseGain.connect(filter);
    filter.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.1);
    sub.start(t);
    sub.stop(t + 0.08);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.02);
  }

  // ─── SFX: Jump ────────────────────────────────────────────────────
  // Swoosh naik — pitch sweep up dengan breathy texture
  // Blip pendek ala dialog Harvest Moon/Animal Crossing — dipanggil
  // tiap beberapa karakter saat efek ketik-mesin-tik teks intro
  // episode berjalan (lihat EpisodeIntroScene.js). Pitch dinaikkan
  // sedikit secara acak tiap panggilan supaya rentetan blip cepat
  // tidak terdengar monoton/robotic.
  playTypewriterBlip() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const basePitch = 620 + Math.random() * 140;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(basePitch, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.06);
  }

  playJump() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();

    // Pitch sweep up
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(700, t + 0.15);
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.3);

    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.01, t);
    oscGain.gain.linearRampToValueAtTime(0.35, t + 0.03);
    oscGain.gain.linearRampToValueAtTime(0.15, t + 0.15);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

    // Breathy wind noise
    const noiseBuffer = this._createNoiseBuffer(0.25);
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = noiseBuffer;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, t);
    noiseGain.gain.linearRampToValueAtTime(0.12, t + 0.05);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    // Band-pass for swoosh character
    const bpFilter = this.ctx.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.setValueAtTime(400, t);
    bpFilter.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
    bpFilter.Q.value = 2;

    // Harmonic
    const harmonic = this.ctx.createOscillator();
    harmonic.type = 'triangle';
    harmonic.frequency.setValueAtTime(360, t);
    harmonic.frequency.exponentialRampToValueAtTime(1050, t + 0.15);

    const harmonicGain = this.ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.01, t);
    harmonicGain.gain.linearRampToValueAtTime(0.1, t + 0.03);
    harmonicGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    osc.connect(oscGain);
    noiseSrc.connect(noiseGain);
    noiseGain.connect(bpFilter);
    harmonic.connect(harmonicGain);

    oscGain.connect(this.sfxGain);
    bpFilter.connect(this.sfxGain);
    harmonicGain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.35);
    noiseSrc.start(t);
    noiseSrc.stop(t + 0.3);
    harmonic.start(t);
    harmonic.stop(t + 0.3);
  }

  // ─── SFX: Phone Vibration (Getar Smartphone) ──────────────────────
  // Getaran haptic ganda khas ponsel di atas meja kayu atau di tangan
  playPhoneVibrate() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    // Dual pulse vibration (bzzz... bzzz...)
    [0, 0.14].forEach((offset) => {
      const pulseT = t + offset;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(115, pulseT);
      osc.frequency.linearRampToValueAtTime(75, pulseT + 0.11);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 320;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, pulseT);
      gain.gain.linearRampToValueAtTime(0.25, pulseT + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, pulseT + 0.11);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(pulseT);
      osc.stop(pulseT + 0.12);
    });
  }

  // ─── SFX: Chat Notification (Pesan Masuk) ─────────────────────────
  // Ding/chime digital modern saat pesan masuk ke aplikasi pesan
  playMessageReceived(isThreat = false) {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    if (isThreat) {
      // Chime ancaman: turun disonan dan agak berdengung dingin (tritone D5 -> G#4)
      const freqs = [587.33, 415.30];
      freqs.forEach((f, idx) => {
        const noteT = t + idx * 0.12;
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = f;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, noteT);
        gain.gain.linearRampToValueAtTime(0.18, noteT + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.45);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = f;
        filter.Q.value = 2.0;

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteT);
        osc.stop(noteT + 0.5);
      });
    } else {
      // Chime notif DM bersih ceria (C6 -> G6)
      const freqs = [1046.50, 1567.98];
      freqs.forEach((f, idx) => {
        const noteT = t + idx * 0.09;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = f;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, noteT);
        gain.gain.linearRampToValueAtTime(0.16, noteT + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, noteT + 0.35);

        osc.connect(gain);
        gain.connect(this.sfxGain);

        osc.start(noteT);
        osc.stop(noteT + 0.38);
      });
    }
  }

  // ─── SFX: Chat Sent (Pesan Balasan Terkirim) ───────────────────────
  // Pop/swoosh ceria halus saat bubble balasan Dara muncul
  playMessageSent() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(480, t);
    osc.frequency.exponentialRampToValueAtTime(1050, t + 0.07);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.14, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // ─── SFX: Threat Drone Stinger ────────────────────────────────────
  // Dentuman sub-bass dan desis dingin saat ketegangan memuncak
  playThreatStinger() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    // Sub-bass heavy impact
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(80, t);
    sub.frequency.exponentialRampToValueAtTime(26, t + 0.6);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.28, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    // Eerie screamer overtone (low amplitude, filtered)
    const screamer = ctx.createOscillator();
    screamer.type = 'sawtooth';
    screamer.frequency.setValueAtTime(220, t);
    screamer.frequency.linearRampToValueAtTime(185, t + 0.5);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 650;

    const screamerGain = ctx.createGain();
    screamerGain.gain.setValueAtTime(0.08, t);
    screamerGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);

    screamer.connect(filter);
    filter.connect(screamerGain);
    screamerGain.connect(this.sfxGain);

    sub.start(t);
    sub.stop(t + 0.75);
    screamer.start(t);
    screamer.stop(t + 0.55);
  }

  // ─── SFX: Window Peeking Jump Scare / Cold Sting ──────────────────
  // Kilasan dingin tajam saat tirai tersingkap & melihat siluet di luar
  playWindowSpookStinger() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    // High dissonant cluster (ala biola thriller)
    const freqs = [740, 784, 1108]; // F#5, G5, C#6
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, t);
      osc.frequency.exponentialRampToValueAtTime(f * 1.05, t + 0.35);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = f;
      filter.Q.value = 4.0;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.5);
    });

    // Sudden gust / sharp impact
    const noise = ctx.createBufferSource();
    noise.buffer = this._createNoiseBuffer(0.2);
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = 'highpass';
    nFilter.frequency.value = 1800;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.18, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    noise.connect(nFilter);
    nFilter.connect(nGain);
    nGain.connect(this.sfxGain);

    noise.start(t);
    noise.stop(t + 0.22);
  }

  // ─── SFX: Block Account Stamp Impact ──────────────────────────────
  // Dentuman tegas "DUK-KLIK!" saat stempel "AKUN TELAH DIBLOKIR" menghantam layar
  playBlockStamp() {
    if (!this._initialized) return;
    this.resume();

    const t = this._now();
    const ctx = this.ctx;

    // Heavy slam impact
    const punch = ctx.createOscillator();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(140, t);
    punch.frequency.exponentialRampToValueAtTime(40, t + 0.15);

    const punchGain = ctx.createGain();
    punchGain.gain.setValueAtTime(0.4, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    // Mechanical click / lock snap
    const click = ctx.createOscillator();
    click.type = 'triangle';
    click.frequency.setValueAtTime(1200, t);
    click.frequency.exponentialRampToValueAtTime(300, t + 0.04);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.25, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

    punch.connect(punchGain);
    punchGain.connect(this.sfxGain);
    click.connect(clickGain);
    clickGain.connect(this.sfxGain);

    punch.start(t);
    punch.stop(t + 0.3);
    click.start(t);
    click.stop(t + 0.08);
  }

  // ─── BGM: Chill Lo-fi Loop ─────────────────────────────────────────
  // Background music yang chill dan relaxing, di-generate secara
  // real-time menggunakan oscillator + scheduled notes.
  startBGM() {
    if (!this._initialized) return;
    this.stopBGM();
    this.resume();
    this.bgmPlaying = true;

    // Restore bgmGain yang mungkin di-nol-kan oleh stopBGM()
    if (this.bgmGain && this.ctx) {
      const t = this._now();
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this._bgmVolume ?? 0.25, t);
    }

    this._scheduleBGMLoop();
  }

  _scheduleBGMLoop() {
    if (!this.bgmPlaying) return;

    const ctx = this.ctx;
    const bpm = 72;
    const beatDuration = 60 / bpm;

    // Chord progression: Cmaj7 - Am7 - Fmaj7 - G7
    // Masing-masing 4 beat (2 bar total = 8 beat = 1 cycle)
    const chords = [
      { notes: [130.81, 164.81, 196.00, 246.94], bass: 65.41 },  // Cmaj7
      { notes: [110.00, 130.81, 164.81, 196.00], bass: 55.00 },  // Am7
      { notes: [87.31, 110.00, 130.81, 164.81], bass: 43.65 },   // Fmaj7
      { notes: [98.00, 123.47, 146.83, 174.61], bass: 49.00 },   // G7
    ];

    const beatsPerChord = 4;
    const cycleDuration = chords.length * beatsPerChord * beatDuration;

    // Melody (pentatonic C): scheduled per cycle
    const melodyNotes = [
      { freq: 523.25, beat: 0, dur: 1.5 },
      { freq: 659.25, beat: 2, dur: 1 },
      { freq: 587.33, beat: 4, dur: 1.5 },
      { freq: 523.25, beat: 6, dur: 0.8 },
      { freq: 440.00, beat: 7, dur: 1 },
      { freq: 0,      beat: 8, dur: 1 },     // rest
      { freq: 523.25, beat: 9, dur: 1 },
      { freq: 783.99, beat: 10, dur: 1.5 },
      { freq: 659.25, beat: 12, dur: 1 },
      { freq: 523.25, beat: 13, dur: 2 },
      { freq: 0,      beat: 15, dur: 1 },     // rest
    ];

    const now = ctx.currentTime + 0.05;

    // --- Pad / Chord layer ---
    chords.forEach((chord, ci) => {
      const chordStart = now + ci * beatsPerChord * beatDuration;
      const chordLen = beatsPerChord * beatDuration;

      chord.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        // Slight detune for warmth
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq + 0.7;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.04, chordStart + 0.3);
        gain.gain.setValueAtTime(0.04, chordStart + chordLen - 0.3);
        gain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(chordStart);
        osc.stop(chordStart + chordLen + 0.05);
        osc2.start(chordStart);
        osc2.stop(chordStart + chordLen + 0.05);
      });

      // Bass note
      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = chord.bass;

      const bassGain = ctx.createGain();
      // Bass plays on beat 1 and 3 of each chord
      bassGain.gain.setValueAtTime(0.001, chordStart);

      for (let b = 0; b < beatsPerChord; b += 2) {
        const bt = chordStart + b * beatDuration;
        bassGain.gain.setValueAtTime(0.12, bt);
        bassGain.gain.exponentialRampToValueAtTime(0.02, bt + beatDuration * 1.5);
      }
      bassGain.gain.setValueAtTime(0.001, chordStart + chordLen);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(chordStart);
      bassOsc.stop(chordStart + chordLen + 0.05);
    });

    // --- Melody layer ---
    melodyNotes.forEach((note) => {
      if (note.freq === 0) return; // rest
      const noteStart = now + note.beat * beatDuration;
      const noteDur = note.dur * beatDuration;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.freq;

      // Soft harmonic
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = note.freq * 2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.08, noteStart + 0.02);
      gain.gain.setValueAtTime(0.06, noteStart + noteDur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur);

      const gain2 = ctx.createGain();
      gain2.gain.setValueAtTime(0.001, noteStart);
      gain2.gain.linearRampToValueAtTime(0.02, noteStart + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur * 0.5);

      osc.connect(gain);
      osc2.connect(gain2);
      gain.connect(this.bgmGain);
      gain2.connect(this.bgmGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDur + 0.05);
      osc2.start(noteStart);
      osc2.stop(noteStart + noteDur + 0.05);
    });

    // --- Hi-hat pattern ---
    const hihatBuffer = this._createNoiseBuffer(0.05);
    const totalBeats = chords.length * beatsPerChord;
    for (let b = 0; b < totalBeats; b++) {
      // 8th notes: 2 per beat
      for (let sub = 0; sub < 2; sub++) {
        const ht = now + (b + sub * 0.5) * beatDuration;
        const src = ctx.createBufferSource();
        src.buffer = hihatBuffer;

        const hg = ctx.createGain();
        const vel = sub === 0 ? 0.04 : 0.02; // Downbeat louder
        hg.gain.setValueAtTime(vel, ht);
        hg.gain.exponentialRampToValueAtTime(0.001, ht + 0.04);

        const hf = ctx.createBiquadFilter();
        hf.type = 'highpass';
        hf.frequency.value = 7000;

        src.connect(hg);
        hg.connect(hf);
        hf.connect(this.bgmGain);

        src.start(ht);
        src.stop(ht + 0.05);
      }
    }

    // --- Vinyl crackle (continuous noise texture) ---
    const crackleLen = cycleDuration + 0.1;
    const crackleBuffer = this._createNoiseBuffer(crackleLen);
    const crackleSrc = ctx.createBufferSource();
    crackleSrc.buffer = crackleBuffer;

    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.015;

    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 800;
    crackleFilter.Q.value = 0.5;

    crackleSrc.connect(crackleGain);
    crackleGain.connect(crackleFilter);
    crackleFilter.connect(this.bgmGain);

    crackleSrc.start(now);
    crackleSrc.stop(now + crackleLen);

    // --- Schedule next loop ---
    // Gunakan setTimeout sebagai fallback scheduling, bukan audioContext
    // scheduling murni (lebih sederhana untuk implementasi loop).
    this._bgmTimeout = setTimeout(() => {
      if (this.bgmPlaying) {
        this._scheduleBGMLoop();
      }
    }, cycleDuration * 1000 - 100); // Sedikit overlap supaya seamless
  }

  // ─── BGM: Menu / Title Theme ────────────────────────────────────────
  // Tema musik KHUSUS untuk layar Title/Menu/Settings — sengaja dibuat
  // beda nuansa dari startBGM() (dipakai saat gameplay episode):
  // tempo lebih lambat, tanpa hi-hat/vinyl crackle, pad lebih mengambang
  // dan "ethereal" — supaya terasa seperti tema pembuka/menu, bukan
  // musik latar saat bermain.
  startMenuBGM() {
    if (!this._initialized) return;
    this.stopBGM();
    this.resume();
    this.bgmPlaying = true;

    if (this.bgmGain && this.ctx) {
      const t = this._now();
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this._bgmVolume ?? 0.25, t);
    }

    this._scheduleMenuBGMLoop();
  }

  _scheduleMenuBGMLoop() {
    if (!this.bgmPlaying) return;

    const ctx = this.ctx;
    const bpm = 54;
    const beatDuration = 60 / bpm;

    // Progresi lebih melankolis/ambient: Am9 - Fmaj7 - Cmaj7 - Em7
    const chords = [
      { notes: [110.00, 130.81, 164.81, 196.00, 246.94], bass: 55.00 }, // Am9
      { notes: [87.31, 110.00, 130.81, 164.81], bass: 43.65 },          // Fmaj7
      { notes: [130.81, 164.81, 196.00, 246.94], bass: 65.41 },         // Cmaj7
      { notes: [82.41, 98.00, 123.47, 164.81], bass: 41.20 },           // Em7
    ];

    const beatsPerChord = 4;
    const cycleDuration = chords.length * beatsPerChord * beatDuration;

    // Melody jarang & mengambang (banyak jeda) — kesan menunggu/tenang,
    // cocok untuk layar judul & menu, bukan mengiringi aksi seperti versi
    // gameplay.
    const melodyNotes = [
      { freq: 440.00, beat: 0, dur: 3 },
      { freq: 0, beat: 3, dur: 2 },        // rest
      { freq: 523.25, beat: 5, dur: 2.5 },
      { freq: 493.88, beat: 8, dur: 3 },
      { freq: 0, beat: 11, dur: 2 },       // rest
      { freq: 440.00, beat: 13, dur: 2 },
      { freq: 0, beat: 15, dur: 1 },       // rest
    ];

    const now = ctx.currentTime + 0.05;

    // --- Pad / Chord layer (lebih lembut & panjang decay-nya) ---
    chords.forEach((chord, ci) => {
      const chordStart = now + ci * beatsPerChord * beatDuration;
      const chordLen = beatsPerChord * beatDuration;

      chord.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq + 0.5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.035, chordStart + 0.6);
        gain.gain.setValueAtTime(0.035, chordStart + chordLen - 0.6);
        gain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(chordStart);
        osc.stop(chordStart + chordLen + 0.05);
        osc2.start(chordStart);
        osc2.stop(chordStart + chordLen + 0.05);
      });

      // Bass halus, satu tahan panjang per chord (bukan tiap 2 ketuk
      // seperti versi gameplay) — lebih "mengambang".
      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = chord.bass;

      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0.001, chordStart);
      bassGain.gain.linearRampToValueAtTime(0.08, chordStart + 0.8);
      bassGain.gain.setValueAtTime(0.08, chordStart + chordLen - 0.5);
      bassGain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(chordStart);
      bassOsc.stop(chordStart + chordLen + 0.05);
    });

    // --- Melody layer (nada tunggal lembut, decay panjang) ---
    melodyNotes.forEach((note) => {
      if (note.freq === 0) return; // rest
      const noteStart = now + note.beat * beatDuration;
      const noteDur = note.dur * beatDuration;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = note.freq;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.06, noteStart + 0.15);
      gain.gain.setValueAtTime(0.045, noteStart + noteDur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur);

      osc.connect(gain);
      gain.connect(this.bgmGain);

      osc.start(noteStart);
      osc.stop(noteStart + noteDur + 0.05);
    });

    // Catatan: sengaja TIDAK ada hi-hat / vinyl crackle di tema menu —
    // itu ciri khas tema gameplay (startBGM()) supaya keduanya terasa
    // jelas berbeda konteks bagi pemain.

    this._bgmTimeout = setTimeout(() => {
      if (this.bgmPlaying) {
        this._scheduleMenuBGMLoop();
      }
    }, cycleDuration * 1000 - 100);
  }

  // ─── BGM: Episode Intro Theme ───────────────────────────────────────
  // Tema transisi singkat sebelum gameplay dimulai — lebih membangun
  // ketegangan/antisipasi dibanding tema menu (progresi minor, tempo
  // sedang, drone bass menahan), beda juga dari tema gameplay yang lebih
  // ringan/riang.
  startIntroBGM() {
    if (!this._initialized) return;
    this.stopBGM();
    this.resume();
    this.bgmPlaying = true;

    if (this.bgmGain && this.ctx) {
      const t = this._now();
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this._bgmVolume ?? 0.25, t);
    }

    this._scheduleIntroBGMLoop();
  }

  _scheduleIntroBGMLoop() {
    if (!this.bgmPlaying) return;

    const ctx = this.ctx;
    const bpm = 64;
    const beatDuration = 60 / bpm;

    // Progresi minor menegangkan: Dm - Bbmaj7 - Am - Gm
    const chords = [
      { notes: [146.83, 174.61, 220.00], bass: 73.42 },  // Dm
      { notes: [116.54, 146.83, 220.00, 261.63], bass: 58.27 }, // Bbmaj7
      { notes: [110.00, 130.81, 164.81], bass: 55.00 },  // Am
      { notes: [98.00, 116.54, 146.83], bass: 49.00 },   // Gm
    ];
    const beatsPerChord = 4;
    const cycleDuration = chords.length * beatsPerChord * beatDuration;
    const now = ctx.currentTime + 0.05;

    // Drone bass menahan sepanjang siklus — beri kesan "menanti".
    chords.forEach((chord, ci) => {
      const chordStart = now + ci * beatsPerChord * beatDuration;
      const chordLen = beatsPerChord * beatDuration;

      chord.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        filter.Q.value = 0.8;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.03, chordStart + 0.4);
        gain.gain.setValueAtTime(0.03, chordStart + chordLen - 0.4);
        gain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(chordStart);
        osc.stop(chordStart + chordLen + 0.05);
      });

      const bassOsc = ctx.createOscillator();
      bassOsc.type = 'sine';
      bassOsc.frequency.value = chord.bass;
      const bassGain = ctx.createGain();
      bassGain.gain.setValueAtTime(0.001, chordStart);
      bassGain.gain.linearRampToValueAtTime(0.1, chordStart + 0.5);
      bassGain.gain.setValueAtTime(0.1, chordStart + chordLen - 0.4);
      bassGain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);
      bassOsc.connect(bassGain);
      bassGain.connect(this.bgmGain);
      bassOsc.start(chordStart);
      bassOsc.stop(chordStart + chordLen + 0.05);
    });

    this._bgmTimeout = setTimeout(() => {
      if (this.bgmPlaying) {
        this._scheduleIntroBGMLoop();
      }
    }, cycleDuration * 1000 - 100);
  }

  // ─── BGM: Episode 3 Suspense / Thriller Theme ───────────────────────
  // Tema audio khusus untuk Episode 3: "Pesan dari Orang Asing"
  // Nuansa: Dark psychological suspense, kamar tidur sunyi malam hari,
  // detak jantung pelan, drone bass dalam, dan denting melodi dingin.
  startSuspenseBGM() {
    if (!this._initialized) return;
    this.stopBGM();
    this.resume();
    this.bgmPlaying = true;

    if (this.bgmGain && this.ctx) {
      const t = this._now();
      this.bgmGain.gain.cancelScheduledValues(t);
      this.bgmGain.gain.setValueAtTime(this._bgmVolume ?? 0.28, t);
    }

    this._scheduleSuspenseBGMLoop();
  }

  _scheduleSuspenseBGMLoop() {
    if (!this.bgmPlaying) return;

    const ctx = this.ctx;
    const bpm = 48; // Tempo lambat mencekam
    const beatDuration = 60 / bpm;

    // Chord progresi gelap/disonan: Dm(add9) - Bbm - Ddim - Aaug
    const chords = [
      { notes: [146.83, 174.61, 220.00, 293.66], bass: 36.71 }, // Dm / D1
      { notes: [116.54, 146.83, 174.61, 233.08], bass: 29.14 }, // Bbm / Bb0
      { notes: [146.83, 174.61, 207.65, 246.94], bass: 36.71 }, // Ddim
      { notes: [110.00, 138.59, 174.61, 220.00], bass: 27.50 }, // Aaug
    ];

    const beatsPerChord = 4;
    const cycleDuration = chords.length * beatsPerChord * beatDuration;
    const now = ctx.currentTime + 0.05;

    // 1. Dark Atmospheric Drone Pad
    chords.forEach((chord, ci) => {
      const chordStart = now + ci * beatsPerChord * beatDuration;
      const chordLen = beatsPerChord * beatDuration;

      chord.notes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        // Detune halus untuk kesan dingin bergetar
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq + 0.6;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 520; // Deep muffled lowpass
        filter.Q.value = 1.2;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, chordStart);
        gain.gain.linearRampToValueAtTime(0.028, chordStart + 0.8);
        gain.gain.setValueAtTime(0.028, chordStart + chordLen - 0.8);
        gain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);

        osc.start(chordStart);
        osc.stop(chordStart + chordLen + 0.05);
        osc2.start(chordStart);
        osc2.stop(chordStart + chordLen + 0.05);
      });

      // Sub-bass rumble
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = chord.bass;

      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.001, chordStart);
      subGain.gain.linearRampToValueAtTime(0.09, chordStart + 0.6);
      subGain.gain.setValueAtTime(0.09, chordStart + chordLen - 0.6);
      subGain.gain.linearRampToValueAtTime(0.001, chordStart + chordLen);

      subOsc.connect(subGain);
      subGain.connect(this.bgmGain);
      subOsc.start(chordStart);
      subOsc.stop(chordStart + chordLen + 0.05);
    });

    // 2. Slow Heartbeat Pulse (Thump... Thump...)
    const totalBeats = chords.length * beatsPerChord;
    for (let b = 0; b < totalBeats; b += 2) {
      const beatT = now + b * beatDuration;

      // Pulse 1
      const pulse1 = ctx.createOscillator();
      pulse1.type = 'sine';
      pulse1.frequency.setValueAtTime(58, beatT);
      pulse1.frequency.exponentialRampToValueAtTime(32, beatT + 0.12);

      const pGain1 = ctx.createGain();
      pGain1.gain.setValueAtTime(0.12, beatT);
      pGain1.gain.exponentialRampToValueAtTime(0.001, beatT + 0.14);

      pulse1.connect(pGain1);
      pGain1.connect(this.bgmGain);
      pulse1.start(beatT);
      pulse1.stop(beatT + 0.15);

      // Pulse 2 (0.22s after pulse 1)
      const beatT2 = beatT + 0.22;
      const pulse2 = ctx.createOscillator();
      pulse2.type = 'sine';
      pulse2.frequency.setValueAtTime(50, beatT2);
      pulse2.frequency.exponentialRampToValueAtTime(28, beatT2 + 0.1);

      const pGain2 = ctx.createGain();
      pGain2.gain.setValueAtTime(0.08, beatT2);
      pGain2.gain.exponentialRampToValueAtTime(0.001, beatT2 + 0.12);

      pulse2.connect(pGain2);
      pGain2.connect(this.bgmGain);
      pulse2.start(beatT2);
      pulse2.stop(beatT2 + 0.13);
    }

    // 3. Eerie Music Box / Chime notes (dingin, sunyi, berjarak)
    const bellNotes = [
      { freq: 587.33, beat: 1, dur: 2.5 },  // D5
      { freq: 622.25, beat: 5, dur: 2.0 },  // Eb5 (tension!)
      { freq: 554.37, beat: 9, dur: 2.5 },  // C#5
      { freq: 440.00, beat: 13, dur: 3.0 }, // A4
    ];

    bellNotes.forEach((bell) => {
      const bStart = now + bell.beat * beatDuration;

      const bellOsc = ctx.createOscillator();
      bellOsc.type = 'triangle';
      bellOsc.frequency.value = bell.freq;

      const bellGain = ctx.createGain();
      bellGain.gain.setValueAtTime(0.0001, bStart);
      bellGain.gain.linearRampToValueAtTime(0.045, bStart + 0.02);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, bStart + bell.dur);

      const bellFilter = ctx.createBiquadFilter();
      bellFilter.type = 'bandpass';
      bellFilter.frequency.value = bell.freq;
      bellFilter.Q.value = 3.0;

      bellOsc.connect(bellFilter);
      bellFilter.connect(bellGain);
      bellGain.connect(this.bgmGain);

      bellOsc.start(bStart);
      bellOsc.stop(bStart + bell.dur + 0.05);
    });

    // 4. Subtle Night Room/Wind Tone
    const windBuffer = this._createNoiseBuffer(cycleDuration + 0.1);
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = windBuffer;

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.008, now);

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 380;
    windFilter.Q.value = 0.5;

    windSrc.connect(windGain);
    windGain.connect(windFilter);
    windFilter.connect(this.bgmGain);

    windSrc.start(now);
    windSrc.stop(now + cycleDuration + 0.1);

    this._bgmTimeout = setTimeout(() => {
      if (this.bgmPlaying) this._scheduleSuspenseBGMLoop();
    }, cycleDuration * 1000 - 100);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this._bgmTimeout) {
      clearTimeout(this._bgmTimeout);
      this._bgmTimeout = null;
    }

    if (this.bgmGain && this.ctx) {
      const t = this._now();
      try {
        this.bgmGain.gain.cancelScheduledValues(t);
        this.bgmGain.gain.setValueAtTime(0, t);
        // Putus koneksi gain lama dari masterGain agar seluruh oscillator
        // yang terlanjur di-schedule di siklus sebelumnya terputus total & tidak bertabrakan!
        this.bgmGain.disconnect();
      } catch (e) {
        // Abaikan jika sudah terputus
      }

      // Buat node bgmGain baru yang bersih untuk pemutaran musik berikutnya
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = this._bgmVolume ?? 0.25;
      this.bgmGain.connect(this.masterGain);
    }
  }

  // ─── Volume Controls ──────────────────────────────────────────────

  setMasterVolume(v) {
    if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setSFXVolume(v) {
    if (this.sfxGain) this.sfxGain.gain.value = Math.max(0, Math.min(1, v));
  }

  setBGMVolume(v) {
    this._bgmVolume = Math.max(0, Math.min(1, v));
    if (this.bgmGain) this.bgmGain.gain.value = this._bgmVolume;
  }

  destroy() {
    this.stopBGM();
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this._initialized = false;
  }
}
