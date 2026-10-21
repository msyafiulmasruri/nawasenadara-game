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

  // ------------------------------------------------------------------
  // MINI BOSS: CLOSE-UP DIALOGUE BATTLE & ASSERTIVE RESPONSE EVALUATOR
  // ------------------------------------------------------------------

  async getMiniBossDialogues() {
    const groqApiKey = process.env.GROQ_API_KEY || '';
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (groqApiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const promptSystem = `Kamu adalah penulis naskah kreatif game edukasi remaja "Nawasena Dara".
Buatkan 5 dialog percakapan yang dilontarkan oleh karakter "Reno", seorang siswa SMA laki-laki yang nakal/iseng dan suka meremehkan batasan orang lain.

GAYA BAHASA:
- Wajib menggunakan bahasa gaul obrolan anak SMA zaman sekarang di Jakarta/kota besar Indonesia (santai, pakai kata seperti 'lu', 'gue', 'napa', 'baperan', 'kali', 'cuma', 'ngapain', 'parah').
- TIDAK BOLEH formal atau kaku seperti buku teks.
- Dialog harus mengalir alami seperti anak tongkrongan yang sedang memojokkan/iseng ke temannya.

5 TOPIK RONDE (WAJIB SESUAI URUTAN INI):
1. Ejekan stereotip gender & meremehkan perempuan di kelas
2. Foto aib teman yang dijadikan lelucon di grup chat WhatsApp angkatan
3. Memaksa meminta nomor WA pribadi dan foto (PAP)
4. Catcalling dan komentar fisik saat jam istirahat kantin
5. Paksaan fisik mengajak ke tempat sepi dekat gerbang sekolah

Format output JSON valid:
{
  "dialogues": [
    {
      "round": 1,
      "topic": "...",
      "npc_name": "Reno (Siswa Nakal)",
      "npc_line": "...",
      "context": "...",
      "guide_hint": "..."
    }
  ]
}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: 'system', content: promptSystem },
              { role: 'user', content: 'Buatkan 5 dialog Reno untuk mini boss. Jawab dalam format JSON.' },
            ],
            temperature: 0.8,
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
            const dialogues = parsed.dialogues || parsed.data || (Array.isArray(parsed) ? parsed : null);
            if (Array.isArray(dialogues) && dialogues.length >= 5) {
              return {
                source: 'ai_generated',
                dialogues: dialogues.slice(0, 5).map((d, i) => ({
                  round: i + 1,
                  topic: d.topic || DEFAULT_MINIBOSS_DIALOGUES[i].topic,
                  npc_name: 'Reno (Siswa Nakal)',
                  npc_line: d.npc_line || DEFAULT_MINIBOSS_DIALOGUES[i].npc_line,
                  context: d.context || DEFAULT_MINIBOSS_DIALOGUES[i].context,
                  guide_hint: d.guide_hint || DEFAULT_MINIBOSS_DIALOGUES[i].guide_hint,
                })),
              };
            }
          }
        }
      } catch (err) {
        console.warn('[NlpClient] Groq miniboss dialogues generation warning:', err.message);
      }
    }

    return {
      source: 'curated_fallback',
      dialogues: DEFAULT_MINIBOSS_DIALOGUES,
    };
  },

  async evaluateMiniBossResponse({ text, round = 1, topic = '', npcLine = '', currentEmotionTier = 2 }) {
    // 1. Analisis Emosi teks menggunakan IndoBERT
    let nlpResult = { label: 'netral', confidence: 0.85, riskLevel: 'rendah' };
    try {
      nlpResult = await this.analyze(text);
    } catch (err) {
      console.warn('[NlpClient] IndoBERT direct analyze fallback:', err.message);
      const lower = text.toLowerCase();
      if (/marah|benci|anjing|babi|bangsat|tolol|goblok|bacot|brengsek|mati/i.test(lower)) {
        nlpResult = { label: 'marah', confidence: 0.95, riskLevel: 'tinggi' };
      } else if (/risih|ganggu|jijik|gak jelas|nyebelin|muak/i.test(lower)) {
        nlpResult = { label: 'menyinggung', confidence: 0.88, riskLevel: 'sedang' };
      } else if (/takut|gemetar|cemas|panik|ancam/i.test(lower)) {
        nlpResult = { label: 'takut', confidence: 0.85, riskLevel: 'sedang' };
      } else if (/sedih|kecewa|sakit hati|hancur/i.test(lower)) {
        nlpResult = { label: 'sedih', confidence: 0.82, riskLevel: 'sedang' };
      } else if (/tenang|baik|sopan|mohon|terima kasih|hargai|hak saya|batasan|maaf/i.test(lower)) {
        nlpResult = { label: 'aman', confidence: 0.90, riskLevel: 'rendah' };
      }
    }

    const LABEL_TO_TIER = {
      aman: 1,
      netral: 2,
      sedih: 3,
      takut: 4,
      menyinggung: 5,
      marah: 6,
    };

    const TIER_META = {
      1: { id: 1, label: 'aman', name: 'Aman', description: 'Paling Baik (Sangat Positif & Asertif)', color: '#22c55e' },
      2: { id: 2, label: 'netral', name: 'Netral', description: 'Baik (Objektif / Stabil)', color: '#10b981' },
      3: { id: 3, label: 'sedih', name: 'Sedih', description: 'Cukup Buruk (Rentan / Terluka)', color: '#38bdf8' },
      4: { id: 4, label: 'takut', name: 'Takut', description: 'Buruk (Cemas / Terintimidasi)', color: '#eab308' },
      5: { id: 5, label: 'menyinggung', name: 'Menyinggung', description: 'Buruk (Risih / Terganggu)', color: '#f97316' },
      6: { id: 6, label: 'marah', name: 'Marah', description: 'Paling Buruk (Agresif / Distres Tinggi)', color: '#ef4444' },
    };

    const detectedTier = LABEL_TO_TIER[nlpResult.label] || 2;
    const currentTier = Math.max(1, Math.min(6, Number(currentEmotionTier) || 2));

    // Aturan de-eskalasi emosi berjenjang:
    // - Jika terdeteksi emosi marah/buruk (tier lebih tinggi): langsung naik ke tingkat tersebut
    // - Jika respon tenang/asertif (tier lebih rendah): turun perlahan 1 tingkat per ronde
    let newTier = currentTier;
    if (detectedTier > currentTier) {
      newTier = detectedTier;
    } else if (detectedTier < currentTier) {
      newTier = Math.max(detectedTier, currentTier - 1);
    }

    // 2. Evaluasi Asertivitas menggunakan Groq LLM (dengan fallback cerdas)
    let isAssertive = true;
    let score = 80;
    let feedback = 'Kamu berhasil menyampaikan batasan dirimu dengan tenang dan tegas.';
    let bossReaction = 'Cih... kok lu malah natap gue berani gitu sih?!';

    const groqApiKey = process.env.GROQ_API_KEY || '';
    const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    if (groqApiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9000);

        const promptSystem = `Kamu adalah psikolog konselor sekolah ahli komunikasi asertif remaja SMA (usia 15-16 tahun).
Dalam game edukasi "Nawasena Dara", seorang siswi (Dara) sedang menghadapi intimidasi/candaan merendahkan dari siswa laki-laki nakal (Reno).

Situasi Kasus Ronde ${round}: "${topic}"
Ucapan Siswa Nakal (Reno): "${npcLine}"

Siswa mengetik kalimat respon balasan berikut:
"${text}"

TUGASMU:
Evaluasi apakah respon siswa memenuhi prinsip KOMUNIKASI ASERTIF & BATASAN DIRI:
1. Menetapkan batasan (boundary) pribadi secara jelas, lugas, dan tenang.
2. Berani menolak atau menegur perlakuan tidak sopan tanpa tunduk/pasif/merasa bersalah.
3. TIDAK membalas dengan kata-kata kotor, makian kasar (anjing, babi, bangsat, dll), atau ancaman fisik balik (bukan agresif/toksik).
4. Jika situasi mendesak/bahaya, berani menyatakan akan mencari bantuan ke Guru BK / Pos Satpam.

Kembalikan HANYA JSON valid:
{
  "is_assertive": boolean (true jika asertif & berkepala dingin, false jika pasrah/takut berlebihan atau membalas kasar dengan makian),
  "score": number (0-100),
  "boss_reaction": string (1 kalimat balasan spontan dari Reno dalam bahasa gaul anak SMA zaman sekarang; jika is_assertive true maka Reno tertegun/keki/kalah argumen, jika false maka Reno makin pongah/menertawakan),
  "feedback": string (1-2 kalimat ringkas dari perspektif Guru BK yang mengapresiasi keberanian atau memberikan saran perbaikan lembut)
}`;

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: groqModel,
            messages: [
              { role: 'system', content: promptSystem },
              { role: 'user', content: 'Evaluasi respon siswa di atas. Jawab dalam JSON valid.' },
            ],
            temperature: 0.4,
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
            isAssertive = Boolean(parsed.is_assertive);
            score = Math.max(0, Math.min(100, Number(parsed.score) || (isAssertive ? 85 : 35)));
            feedback = parsed.feedback || feedback;
            bossReaction = parsed.boss_reaction || bossReaction;
          }
        }
      } catch (e) {
        console.warn('[NlpClient] Groq LLM assertive eval warning, using heuristics:', e.message);
      }
    }

    // Heuristik fallback jika Groq tidak aktif/gagal
    const lower = text.toLowerCase();
    const hasCurse = /anjing|babi|bangsat|tolol|goblok|bacot|brengsek|kampret|mati lu/i.test(lower);
    const isTooShort = text.trim().length < 4;
    const isTooPassive = /^(ya udah|maaf|terserah|ampun|jangan ganggu aku ya|iya deh)$/i.test(lower.trim());

    if (hasCurse) {
      isAssertive = false;
      score = 25;
      feedback = 'Hindari membalas makian dengan makian kasar. Latihlah berbicara lugas dan tegas dengan kepala dingin.';
      bossReaction = 'Hahaha! Tuh kan, kepancing emosi juga lu! Emang baperan lu mah!';
    } else if (isTooPassive || isTooShort) {
      isAssertive = false;
      score = 30;
      feedback = 'Jangan langsung mengalah atau pasrah. Nyatakan dengan jelas apa yang membuatmu tidak nyaman.';
      bossReaction = 'Tuh kan, cuma bisa diam doang! Makanya gak usah sok jual mahal!';
    }

    const damageBoss = isAssertive;
    const damagePlayer = !isAssertive;

    return {
      is_assertive: isAssertive,
      score,
      feedback,
      boss_reaction: bossReaction,
      damage_boss: damageBoss,
      damage_player: damagePlayer,
      detected_emotion: nlpResult.label,
      confidence: nlpResult.confidence,
      previous_emotion_tier: currentTier,
      current_emotion_tier: newTier,
      tier_info: TIER_META[newTier] || TIER_META[2],
    };
  },
};

export const DEFAULT_MINIBOSS_DIALOGUES = [
  {
    round: 1,
    topic: 'Candaan Seksis & Stereotip Gender',
    npc_name: 'Reno',
    npc_line: 'Halah, baperan amat sih lu jadi cewek! Lagian cewek ngapain sih sok ambis mimpin kelompok, ujungnya kan paling cuma ngurus dapur doang, haha!',
    context: 'Reno meremehkan kepemimpinan perempuan dengan stereotip kolot di depan teman-teman kelas.',
    guide_hint: 'Tegur dia bahwa cewek juga bisa memimpin dan minta dia stop meremehkan.',
  },
  {
    round: 2,
    topic: 'Penyebaran Foto Aib & Rumor di Grup Chat',
    npc_name: 'Reno',
    npc_line: 'Woy santai napa! Foto lu di grup angkatan tuh cuma buat lucu-lucuan doang kali. Gitu aja ngambek pengen ngadu ke wali kelas, gak asik lu parah!',
    context: 'Reno melakukan gaslighting setelah menyebarkan foto aib teman di grup chat sekolah.',
    guide_hint: 'Tolak leluconnya dan minta foto aibmu segera dihapus dari grup.',
  },
  {
    round: 3,
    topic: 'Pelanggaran Privasi & Desakan PAP Foto Pribadi',
    npc_name: 'Reno',
    npc_line: 'Bagi nomor WA pribadi lu lah, sama kirim PAP muka lu sekarang juga! Jangan sok jual mahal deh, masa sama temen seangkatan doang pelit amat!',
    context: 'Reno memaksa meminta kontak pribadi dan foto diri secara agresif.',
    guide_hint: 'Tolak tegas permintaan nomor WA dan fotomu karena itu privasimu.',
  },
  {
    round: 4,
    topic: 'Catcalling & Komentar Fisik di Tempat Umum Sekolah',
    npc_name: 'Reno',
    npc_line: 'Cuit cuit... Cewek manis lewat nih! Mukanya jangan judes-judes gitu napa, senyum dikit kek biar enak diliat anak-anak cowok di kantin!',
    context: 'Reno melakukan catcalling dan mengomentari penampilan fisik di area umum sekolah.',
    guide_hint: 'Tegur langsung bahwa kamu risih dan minta dia berhenti menggoda.',
  },
  {
    round: 5,
    topic: 'Paksaan Fisik & Hadangan di Tempat Sepi Dekat Gerbang',
    npc_name: 'Reno',
    npc_line: 'Heh, buruan ikut gue ke gang samping pos satpam sekarang! Gak usah lebay mau teriak atau manggil orang, tinggal nurut apa susahnya sih?!',
    context: 'Reno memaksa secara fisik untuk ikut ke tempat sepi saat pulang sekolah.',
    guide_hint: 'Tolak ikut ke tempat sepi dan katakan kamu akan lapor ke satpam atau guru.',
  },
];

export { NlpServiceError };
export default NlpClient;
