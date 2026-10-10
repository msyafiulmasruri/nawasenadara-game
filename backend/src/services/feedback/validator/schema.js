import Joi from 'joi';

export const createFeedbackPayloadSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'any.required': 'rating diperlukan.',
    'number.base': 'rating harus berupa angka.',
    'number.integer': 'rating harus berupa angka bulat.',
    'number.min': 'rating minimal 1.',
    'number.max': 'rating maksimal 5.',
  }),
  message: Joi.string().trim().min(3).max(1000).required().messages({
    'any.required': 'masukan diperlukan.',
    'string.empty': 'masukan tidak boleh kosong.',
    'string.min': 'masukan minimal 3 karakter.',
    'string.max': 'masukan maksimal 1000 karakter.',
  }),
});
