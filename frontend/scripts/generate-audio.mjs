/**
 * generate-audio.mjs
 *
 * Script untuk generate file WAV secara programatis (tanpa dependency eksternal).
 * Menghasilkan:
 *   - sfx_footstep_walk.wav  – langkah kaki pelan
 *   - sfx_footstep_run.wav   – langkah kaki cepat / berat
 *   - sfx_jump.wav           – efek lompat (swoosh naik)
 *   - bgm_chill.wav          – backsound lofi chill loop (~30 detik)
 *
 * Jalankan: node scripts/generate-audio.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outDir = join(__dirname, '..', 'public', 'audio');

mkdirSync(outDir, { recursive: true });

// ─── WAV Writer ────────────────────────────────────────────────────────
const SAMPLE_RATE = 44100;

function createWavBuffer(samples, sampleRate = SAMPLE_RATE, numChannels = 1) {
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const bufferSize = 44 + dataSize;
  const buffer = Buffer.alloc(bufferSize);
  let offset = 0;

  // RIFF header
  buffer.write('RIFF', offset); offset += 4;
  buffer.writeUInt32LE(bufferSize - 8, offset); offset += 4;
  buffer.write('WAVE', offset); offset += 4;

  // fmt  sub-chunk
  buffer.write('fmt ', offset); offset += 4;
  buffer.writeUInt32LE(16, offset); offset += 4;        // sub-chunk size
  buffer.writeUInt16LE(1, offset); offset += 2;         // PCM
  buffer.writeUInt16LE(numChannels, offset); offset += 2;
  buffer.writeUInt32LE(sampleRate, offset); offset += 4;
  buffer.writeUInt32LE(byteRate, offset); offset += 4;
  buffer.writeUInt16LE(blockAlign, offset); offset += 2;
  buffer.writeUInt16LE(bitsPerSample, offset); offset += 2;

  // data sub-chunk
  buffer.write('data', offset); offset += 4;
  buffer.writeUInt32LE(dataSize, offset); offset += 4;

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.round(val), offset);
    offset += 2;
  }

  return buffer;
}

function saveWav(filename, samples, sampleRate = SAMPLE_RATE) {
  const filepath = join(outDir, filename);
  writeFileSync(filepath, createWavBuffer(samples, sampleRate));
  console.log(`✅ ${filepath}`);
}

// ─── Audio Helpers ─────────────────────────────────────────────────────
function noise() {
  return Math.random() * 2 - 1;
}

function sine(t, freq) {
  return Math.sin(2 * Math.PI * freq * t);
}

function triangle(t, freq) {
  const p = (t * freq) % 1;
  return 4 * Math.abs(p - 0.5) - 1;
}

function square(t, freq, duty = 0.5) {
  return ((t * freq) % 1) < duty ? 1 : -1;
}

function sawtooth(t, freq) {
  return 2 * ((t * freq) % 1) - 1;
}

function envelope(t, attack, decay, sustain, release, duration) {
  if (t < attack) return t / attack;
  if (t < attack + decay) return 1 - (1 - sustain) * ((t - attack) / decay);
  if (t < duration - release) return sustain;
  if (t < duration) return sustain * (1 - (t - (duration - release)) / release);
  return 0;
}

function lowPassFilter(samples, cutoff, sampleRate = SAMPLE_RATE) {
  const rc = 1 / (2 * Math.PI * cutoff);
  const dt = 1 / sampleRate;
  const alpha = dt / (rc + dt);
  const out = new Float64Array(samples.length);
  out[0] = samples[0] * alpha;
  for (let i = 1; i < samples.length; i++) {
    out[i] = out[i - 1] + alpha * (samples[i] - out[i - 1]);
  }
  return out;
}

function mixSamples(...arrays) {
  const maxLen = Math.max(...arrays.map((a) => a.length));
  const out = new Float64Array(maxLen);
  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      out[i] += arr[i];
    }
  }
  // Normalize
  let peak = 0;
  for (let i = 0; i < out.length; i++) {
    if (Math.abs(out[i]) > peak) peak = Math.abs(out[i]);
  }
  if (peak > 0) {
    for (let i = 0; i < out.length; i++) {
      out[i] /= peak;
    }
  }
  return out;
}

// ─── SFX: Footstep Walk ───────────────────────────────────────────────
// Langkah pelan — bunyi "tok" ringan seperti sepatu di lantai kayu
function generateFootstepWalk() {
  const duration = 0.12;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.002, 0.03, 0.1, 0.06, duration);
    // Low thud + some noise for texture
    const thud = sine(t, 120 + (1 - t / duration) * 80) * 0.7;
    const click = noise() * 0.3 * envelope(t, 0.001, 0.01, 0, 0, 0.015);
    samples[i] = (thud + click) * env * 0.8;
  }

  return lowPassFilter(samples, 2000);
}

// ─── SFX: Footstep Run ────────────────────────────────────────────────
// Langkah cepat — lebih berat & impactful
function generateFootstepRun() {
  const duration = 0.1;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, 0.001, 0.02, 0.15, 0.05, duration);
    // Heavier thud with more bass
    const thud = sine(t, 90 + (1 - t / duration) * 120) * 0.8;
    const impact = noise() * 0.4 * envelope(t, 0.001, 0.008, 0, 0, 0.012);
    const sub = sine(t, 50) * 0.3 * envelope(t, 0.001, 0.04, 0, 0, 0.05);
    samples[i] = (thud + impact + sub) * env * 0.9;
  }

  return lowPassFilter(samples, 2500);
}

// ─── SFX: Jump ─────────────────────────────────────────────────────────
// Swoosh naik — pitch naik cepat lalu fade
function generateJump() {
  const duration = 0.3;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float64Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = t / duration;
    const env = envelope(t, 0.01, 0.08, 0.3, 0.15, duration);
    // Frequency sweep up (200 -> 800 Hz)
    const freq = 200 + progress * 600;
    const swoosh = sine(t, freq) * 0.5;
    const breathy = noise() * 0.2 * (1 - progress * 0.7);
    // Subtle harmonic
    const harmonic = sine(t, freq * 1.5) * 0.15;
    samples[i] = (swoosh + breathy + harmonic) * env * 0.8;
  }

  return lowPassFilter(samples, 4000);
}

// ─── BGM: Chill Lo-fi Loop ────────────────────────────────────────────
// ~30 detik backsound lo-fi chill dengan progresi akor sederhana
function generateChillBGM() {
  const duration = 30;
  const numSamples = Math.floor(SAMPLE_RATE * duration);
  const bpm = 75;
  const beatDuration = 60 / bpm;

  // Progresi akor: Cmaj7 - Am7 - Fmaj7 - G7 (lo-fi staple)
  const chords = [
    [261.63, 329.63, 392.00, 493.88],  // Cmaj7: C E G B
    [220.00, 261.63, 329.63, 392.00],  // Am7: A C E G
    [174.61, 220.00, 261.63, 329.63],  // Fmaj7: F A C E
    [196.00, 246.94, 293.66, 349.23],  // G7: G B D F
  ];

  // Melody notes (pentatonic C, ada rests juga)
  const melodyNotes = [
    523.25, 587.33, 659.25, 783.99, 880.00, // C5 D5 E5 G5 A5
    783.99, 659.25, 587.33, 523.25, 440.00,
    523.25, 659.25, 783.99, 880.00, 783.99,
    659.25, 523.25, 440.00, 392.00, 523.25,
    0, 659.25, 0, 783.99, 523.25, 880.00, 0, 659.25,
    523.25, 587.33, 0, 783.99, 659.25, 523.25, 0, 440.00,
  ];

  // --- Generate pad/chord layer ---
  const padSamples = new Float64Array(numSamples);
  const beatsPerChord = 8;
  const chordDuration = beatsPerChord * beatDuration;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const chordIndex = Math.floor((t / chordDuration) % chords.length);
    const chord = chords[chordIndex];
    const chordT = t % chordDuration;
    // Smooth fade in/out for each chord
    const chordEnv = Math.min(chordT / 0.3, 1) * Math.min((chordDuration - chordT) / 0.3, 1);

    let sample = 0;
    for (const note of chord) {
      // Warm triangle wave with slight detune for richness
      sample += triangle(t, note * 0.5) * 0.12; // Lower octave
      sample += sine(t, note * 0.5 + 0.5) * 0.08; // Slight detune
    }
    padSamples[i] = sample * chordEnv * 0.4;
  }

  // --- Generate bass line ---
  const bassSamples = new Float64Array(numSamples);
  const bassNotes = [130.81, 110.00, 87.31, 98.00]; // C3 A2 F2 G2

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const chordIndex = Math.floor((t / chordDuration) % bassNotes.length);
    const noteFreq = bassNotes[chordIndex];
    const beatPos = (t % beatDuration) / beatDuration;
    // Simple rhythmic envelope: note hits at start of each beat, decays
    const beatEnv = Math.exp(-beatPos * 4);
    // Every other beat, play bass note
    const beatNum = Math.floor(t / beatDuration) % 4;
    const play = beatNum === 0 || beatNum === 2 ? 1 : 0.3;

    bassSamples[i] = sine(t, noteFreq) * beatEnv * play * 0.25;
  }

  // --- Generate melody (soft piano-like) ---
  const melodySamples = new Float64Array(numSamples);
  const melodyBeatLen = 2; // Each melody note lasts 2 beats
  const melodyNoteDuration = melodyBeatLen * beatDuration;

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const noteIndex = Math.floor(t / melodyNoteDuration) % melodyNotes.length;
    const noteFreq = melodyNotes[noteIndex];
    if (noteFreq === 0) continue; // Rest

    const noteT = t % melodyNoteDuration;
    const noteEnv = envelope(noteT, 0.01, 0.2, 0.3, 0.4, melodyNoteDuration);
    // Soft bell/piano-like tone
    const tone = sine(t, noteFreq) * 0.35 +
      sine(t, noteFreq * 2) * 0.1 * Math.exp(-noteT * 3) + // Harmonics decay fast
      sine(t, noteFreq * 3) * 0.05 * Math.exp(-noteT * 5);

    melodySamples[i] = tone * noteEnv * 0.35;
  }

  // --- Generate vinyl crackle (lo-fi texture) ---
  const crackleSamples = new Float64Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    // Sparse random crackle
    if (Math.random() < 0.002) {
      crackleSamples[i] = noise() * 0.08;
    }
    // Very subtle continuous hiss
    crackleSamples[i] += noise() * 0.012;
  }

  // --- Generate hi-hat pattern (soft, lofi) ---
  const hihatSamples = new Float64Array(numSamples);
  const hihatInterval = beatDuration / 2; // 8th notes
  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE;
    const hihatPos = t % hihatInterval;
    const hihatEnv = Math.exp(-hihatPos * 50) * 0.08;
    // Alternate velocity (softer on off-beats)
    const hihatBeat = Math.floor(t / hihatInterval) % 2;
    const velocity = hihatBeat === 0 ? 1 : 0.5;
    hihatSamples[i] = noise() * hihatEnv * velocity;
  }

  // --- Mix and apply lo-fi processing ---
  let mixed = mixSamples(padSamples, bassSamples, melodySamples, crackleSamples, hihatSamples);

  // Lo-fi: cut highs and lows
  mixed = lowPassFilter(mixed, 3500);

  // Gentle fade in/out for seamless loop
  const fadeLen = Math.floor(SAMPLE_RATE * 1.5);
  for (let i = 0; i < fadeLen; i++) {
    const fade = i / fadeLen;
    mixed[i] *= fade;
    mixed[mixed.length - 1 - i] *= fade;
  }

  // Final volume normalization to ~0.7 peak
  let peak = 0;
  for (let i = 0; i < mixed.length; i++) {
    if (Math.abs(mixed[i]) > peak) peak = Math.abs(mixed[i]);
  }
  if (peak > 0) {
    const targetPeak = 0.7;
    for (let i = 0; i < mixed.length; i++) {
      mixed[i] = (mixed[i] / peak) * targetPeak;
    }
  }

  return mixed;
}

// ─── Generate all files ────────────────────────────────────────────────
console.log('🎵 Generating audio files...\n');

saveWav('sfx_footstep_walk.wav', generateFootstepWalk());
saveWav('sfx_footstep_run.wav', generateFootstepRun());
saveWav('sfx_jump.wav', generateJump());
saveWav('bgm_chill.wav', generateChillBGM());

console.log('\n🎮 Done! All audio files saved to public/audio/');
