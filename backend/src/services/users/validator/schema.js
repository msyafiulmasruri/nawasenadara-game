import Joi from 'joi';

export const updateMePayloadSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Nama diperlukan.',
    'string.empty': 'Nama tidak boleh kosong.',
  }),
});

export const updateCharacterNamePayloadSchema = Joi.object({
  character_name: Joi.string().trim().min(1).max(50).required().messages({
    'any.required': 'Nama tokoh diperlukan.',
    'string.empty': 'Nama tokoh tidak boleh kosong.',
    'string.max': 'Nama tokoh maksimal 50 karakter.',
  }),
});
