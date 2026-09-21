// Klien tipis untuk memanggil nawasenadara-nlp-service (FastAPI) dari
// backend Express. Dipakai server-to-server saja — TIDAK PERNAH
// dipanggil langsung dari frontend (sesuai README nlp-service: service
// itu "tidak untuk diakses langsung oleh frontend/pemain").
//
// Pakai `fetch` bawaan Node 18+ (tidak perlu tambah dependency axios).

const NLP_SERVICE_URL = process.env.NLP_SERVICE_URL || 'http://localhost:8001';
const NLP_INTERNAL_API_KEY = process.env.NLP_INTERNAL_API_KEY || '';
const NLP_TIMEOUT_MS = Number(process.env.NLP_TIMEOUT_MS || 15000);

class NlpServiceError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'NlpServiceError';
    this.statusCode = statusCode;
  }
}

async function callNlpService(path, body) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NLP_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${NLP_SERVICE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Header ini dicek oleh app/core/security.py di nlp-service —
        // kalau NLP_INTERNAL_API_KEY di sana kosong (dev lokal), header
        // ini diabaikan oleh nlp-service; kalau sudah diisi (production),
        // WAJIB sama persis dengan INTERNAL_API_KEY di .env nlp-service.
        'X-Internal-Api-Key': NLP_INTERNAL_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new NlpServiceError(
        'NLP service tidak merespons (timeout). Coba lagi sebentar lagi.',
        504,
      );
    }
    throw new NlpServiceError(
      'Tidak dapat terhubung ke NLP service. Pastikan service sedang berjalan.',
      502,
    );
  } finally {
    clearTimeout(timeout);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // biarkan null kalau body kosong/bukan JSON
  }

  if (res.status === 503) {
    // Model NLP belum siap dimuat di server (lihat lifespan di
    // nlp-service/app/main.py) — beri pesan yang jelas ke frontend,
    // bukan generic 502.
    throw new NlpServiceError(
      payload?.detail || 'Model NLP di server belum siap.',
      503,
    );
  }

  if (!res.ok) {
    throw new NlpServiceError(
      payload?.detail || `NLP service mengembalikan error (${res.status}).`,
      502,
    );
  }

  return payload;
}

// Mapping label emosi -> tingkat risiko. SENGAJA disalin persis dari
// `_RISK_MAP` di nlp-service (app/services/counseling.py) supaya
// endpoint /analyze (yang TIDAK mengembalikan risk_level dari nlp-
// service, beda dari /chat/counseling yang sudah menghitungnya sendiri)
// tetap konsisten menghasilkan risk_level yang sama persis.
//
// Kalau _RISK_MAP di nlp-service pernah diubah, ganti juga persis di
// sini supaya dua sisi tidak menyimpang.
const RISK_MAP = {
  aman: 'rendah',
  netral: 'rendah',
  sedih: 'sedang',
  takut: 'tinggi',
  marah: 'sedang',
  menyinggung: 'tinggi',
};

const NlpClient = {
  // Dipanggil untuk analisis teks bebas SATU ARAH (bukan percakapan) —
  // dipakai untuk jurnal refleksi akhir episode (lihat
  // NLP_INTEGRATION_DESIGN.md).
  async analyze(text) {
    const result = await callNlpService('/analyze', { text });
    return {
      label: result.label,
      confidence: result.confidence,
      scores: result.scores,
      riskLevel: RISK_MAP[result.label] || 'rendah',
    };
  },

  // Dipanggil untuk satu giliran chat di Chatbot Konseling Virtual.
  // `history` format: [{ role: 'user'|'assistant', content: string }]
  async counselingChat({ text, history, userName }) {
    const result = await callNlpService('/chat/counseling', {
      text,
      history,
      user_name: userName,
    });
    return {
      reply: result.reply,
      emotionLabel: result.emotion_detected,
      emotionConfidence: result.emotion_confidence,
      riskLevel: result.risk_level,
      escalated: result.escalated,
    };
  },

  // Menulis ULANG (parafrase) satu baris dialog NPC yang sudah diplot
  // naskah episode (lihat episode1Dialogue.js/episode2Dialogue.js,
  // node ber- `dynamic: true`) — dipanggil DialogueBox.js lewat
  // window.__nawasenadaraNlp.generateNpcLine tiap kali node semacam
  // itu dirender, supaya redaksinya bervariasi tanpa mengubah plot.
  // TIDAK ada riwayat percakapan (beda dari counselingChat) — tiap
  // panggilan independen.
  async generateNpcLine({ npcName, plottedLine, situation, playerChoiceLabel }) {
    const result = await callNlpService('/dialogue/npc-line', {
      npc_name: npcName,
      plotted_line: plottedLine,
      situation: situation || null,
      player_choice_label: playerChoiceLabel || null,
    });
    return { line: result.line };
  },
};

export { NlpServiceError };
export default NlpClient;
