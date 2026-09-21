import Joi from 'joi';

// Dipakai di PUT /api/progress/:episodeId. Frontend memanggil ini di
// dua titik: (1) saat scene episode dimulai -> status 'in_progress',
// dan (2) saat episode selesai (setelah jurnal refleksi disubmit) ->
// status 'completed', ikut kirim `choices` akumulasi dari seluruh
// percabangan dialog di episode itu (lihat proposal Bab 2.2.3/2.2.4).
export const updateProgressPayloadSchema = Joi.object({
  status: Joi.string()
    .valid('in_progress', 'completed')
    .required()
    .messages({
      'any.required': 'status diperlukan.',
      'any.only': "status harus 'in_progress' atau 'completed'.",
    }),
  // Array bebas (bentuknya ditentukan Groq/prompt engineering di sisi
  // frontend, backend tidak perlu tahu skema persisnya) — cukup
  // divalidasi sebagai array objek generik.
  choices: Joi.array().items(Joi.object().unknown(true)).default([]),
});
