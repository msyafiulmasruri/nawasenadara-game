/**
 * SpeechVoiceManager (Disabled)
 * Voice-over audio telah dinonaktifkan sepenuhnya sesuai arahan revisi.
 * Stub ini dipertahankan agar impor lama tetap aman tanpa memicu suara TTS.
 */
class SpeechVoiceManager {
  constructor() {
    this.enabled = false;
  }

  stop() {}

  toggle() {
    return false;
  }

  speak(_text, { onEnd = null } = {}) {
    onEnd?.();
  }
}

export const speechVoiceManager = new SpeechVoiceManager();
export default speechVoiceManager;
