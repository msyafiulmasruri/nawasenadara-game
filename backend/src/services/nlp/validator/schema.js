import Joi from 'joi';

export const analyzeReflectionPayloadSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required().messages({
    'any.required': 'Teks refleksi diperlukan.',
    'string.empty': 'Teks refleksi tidak boleh kosong.',
    'string.max': 'Teks refleksi maksimal 2000 karakter.',
  }),
  // Episode tempat jurnal refleksi ini diisi (1-9) — dipakai untuk
  // menandai konteks di sentiment_analyses.episode_id dan menentukan
  // apakah risk_alert perlu mencantumkan info episode.
  episode_id: Joi.number().integer().min(1).max(9).required().messages({
    'any.required': 'episode_id diperlukan.',
  }),
});

export const counselingChatPayloadSchema = Joi.object({
  text: Joi.string().trim().min(1).max(2000).required().messages({
    'any.required': 'Pesan diperlukan.',
    'string.empty': 'Pesan tidak boleh kosong.',
  }),
  // Opsional — kalau dikirim, backend akan melanjutkan sesi yang sudah
  // ada (dipakai frontend supaya history percakapan chat tetap
  // nyambung antar-request). Kalau kosong, backend otomatis pakai/buat
  // sesi aktif milik user ini (lihat getOrCreateActiveSession).
  // .allow(null) WAJIB di sini — frontend (GameUIBridge.jsx) mengirim
  // sessionId literal `null` (bukan cuma tidak mengirim key-nya sama
  // sekali) saat memulai sesi chat baru, jadi .optional() saja tidak
  // cukup karena Joi menolak null walau key-nya optional.
  session_id: Joi.string().uuid().allow(null).optional(),
  // 'manual' (default) kalau dibuka lewat ikon chatbot biasa,
  // 'reflection_flag' kalau dibuka lewat ajakan setelah refleksi
  // episode, 'episode7_phone' kalau auto-muncul di scene telepon
  // Episode 7, atau 'episode_summary' kalau ini giliran pembuka
  // OTOMATIS berisi ringkasan obrolan NPC episode ybs (dikirim
  // frontend sendiri tanpa pemain mengetik apa pun, lihat
  // GameUIBridge.jsx openChatbot() & buildEpisode1CounselingContext())
  // — lihat NLP_INTEGRATION_DESIGN.md untuk penjelasan lengkap tiap
  // trigger.
  trigger_source: Joi.string()
    .valid('manual', 'reflection_flag', 'episode7_phone', 'episode_summary')
    .default('manual'),
  episode_id: Joi.number().integer().min(1).max(9).allow(null).optional(),
});

// Dipakai endpoint POST /api/nlp/npc-dialogue — menulis ulang
// (parafrase) satu baris dialog NPC yang sudah diplot naskah episode
// (lihat episode1Dialogue.js/episode2Dialogue.js, node ber-
// `dynamic: true`). `plotted_line` WAJIB (baris asli untuk
// diparafrase), `situation`/`player_choice_label` opsional (konteks
// tambahan supaya hasilnya nyambung).
export const npcDialogueLinePayloadSchema = Joi.object({
  npc_name: Joi.string().trim().min(1).max(60).required().messages({
    'any.required': 'npc_name diperlukan.',
    'string.empty': 'npc_name tidak boleh kosong.',
  }),
  plotted_line: Joi.string().trim().min(1).max(600).required().messages({
    'any.required': 'plotted_line diperlukan.',
    'string.empty': 'plotted_line tidak boleh kosong.',
  }),
  situation: Joi.string().trim().max(400).allow(null, '').optional(),
  player_choice_label: Joi.string().trim().max(200).allow(null, '').optional(),
  // Episode tempat baris ini muncul — opsional, murni buat konteks
  // logging/analitik di masa depan (belum ada tabel penyimpanan khusus
  // untuk ini, tidak wajib divalidasi ketat).
  episode_id: Joi.number().integer().min(1).max(9).optional(),
});
