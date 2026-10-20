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

  // Pembangkitan Soal Kuis Asertif AI untuk Runner Boss (SMP & SMA)
  async generateRunnerQuestions({ count = 10, targetAudience = 'smp_sma', topics = [] } = {}) {
    const groqApiKey = process.env.GROQ_API_KEY;
    const groqModel = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

    if (!groqApiKey) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 14000);

      const audienceDesc = targetAudience === 'smp'
        ? 'usia SMP (12-15 tahun)'
        : targetAudience === 'sma'
        ? 'usia SMA (15-18 tahun)'
        : 'usia remaja SMP dan SMA (12-18 tahun)';

      const promptSystem = `Kamu adalah konselor psikologi anak dan remaja ahli pencegahan kekerasan sekolah (SMP & SMA) untuk game edukasi "Nawasena Dara".
Tugasmu adalah menghasilkan ${count} butir soal kuis pilihan ganda yang cerdas, aplikatif, dan kontekstual untuk remaja ${audienceDesc}.

FOKUS TOPIK EDUKASI:
1. Batasan Fisik & Privasi Sentuhan (Consent)
2. Privasi Medsos & Perlindungan Password/Foto Pribadi
3. Menolak Pelecehan Verbal & Catcalling di Sekolah
4. Menghadapi Gaslighting & Manipulasi Emosi ("Cuma Canda/Baperan")
5. Pencegahan Cyberbullying, Doxxing, & Prank Medsos Berbahaya
6. Menghadapi Tekanan Teman Sebaya (Peer Pressure merokok/nongkrong berisiko)
7. Tindakan Bystander Aktif (Mendukung & Membela Teman yang Dipojokkan)
8. Batasan Sehat dalam Relasi & Pertemanan Remaja
9. Bukti Digital & Penanganan Pesan Intimidasi
10. Akses Bantuan Resmi: Konseling Guru BK & Satgas TPPK Sekolah

SYARAT FORMAT OUTPUT (WAJIB JSON valid):
Kembalikan JSON object dengan key "questions" yang berisi array of objects. Setiap object:
- "topic": string (nama topik singkat)
- "question": string (skenario kasus konkret 1-2 kalimat yang sangat dekat dengan realita remaja sekolah)
- "options": array of 3 objects:
    [
      { "text": "A. ...", "isCorrect": boolean },
      { "text": "B. ...", "isCorrect": boolean },
      { "text": "C. ...", "isCorrect": boolean }
    ] (HANYA ADA 1 OPSI DENGAN isCorrect: true, 2 LAINNYA false)
- "explanation": string (ulasan singkat 1 kalimat yang memberdayakan dan menjelaskan mengapa sikap asertif tersebut tepat)

Gunakan bahasa Indonesia yang santai, edukatif, dan empatik bagi remaja. Jangan kaku.`;

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${groqApiKey}`,
          'User-Agent': 'NawasenaDara/1.0',
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [
            { role: 'system', content: promptSystem },
            { role: 'user', content: `Buatkan ${count} butir soal kuis skenario konkret asertif untuk ${audienceDesc}. Jawab dalam JSON valid.` },
          ],
          temperature: 0.75,
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const rawQuestions = parsed.questions || parsed.data || (Array.isArray(parsed) ? parsed : null);
          if (Array.isArray(rawQuestions) && rawQuestions.length > 0) {
            // Acak letak jawaban benar pada opsi setiap soal
            const randomized = rawQuestions.slice(0, count).map((q, idx) => {
              const options = Array.isArray(q.options) ? [...q.options] : [];
              for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
              }
              const prefixes = ['A. ', 'B. ', 'C. '];
              const cleanOptions = options.map((opt, oIdx) => ({
                text: `${prefixes[oIdx] || ''}${opt.text.replace(/^[A-C]\.\s*/, '')}`,
                isCorrect: Boolean(opt.isCorrect),
              }));

              return {
                id: idx + 1,
                source: 'ai_generated',
                topic: q.topic || 'Edukasi Asertif',
                question: q.question,
                options: cleanOptions,
                explanation: q.explanation || 'Tetapkan batasanmu dengan tenang dan tegas.',
              };
            });

            return {
              source: 'ai_generated',
              model: groqModel,
              questions: randomized,
            };
          }
        }
      }
    } catch (err) {
      console.warn('[NlpClient] Groq AI quiz question generation warning, falling back to curated bank:', err.message);
    }

    return null;
  },
};

export { NlpServiceError };
export default NlpClient;
