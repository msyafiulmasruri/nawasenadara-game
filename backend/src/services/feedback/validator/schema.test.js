import test from 'node:test';
import assert from 'node:assert/strict';
import { createFeedbackPayloadSchema } from './schema.js';

test('menerima rating 1-5 dan memangkas spasi masukan', () => {
  const { error, value } = createFeedbackPayloadSchema.validate({
    rating: 5,
    message: '  Ceritanya mudah dipahami.  ',
  });

  assert.equal(error, undefined);
  assert.deepEqual(value, {
    rating: 5,
    message: 'Ceritanya mudah dipahami.',
  });
});

test('menolak rating di luar rentang 1-5', () => {
  const { error } = createFeedbackPayloadSchema.validate({
    rating: 6,
    message: 'Masukan yang valid.',
  });

  assert.equal(error?.details[0].message, 'rating maksimal 5.');
});

test('menolak masukan kosong atau terlalu pendek', () => {
  const { error } = createFeedbackPayloadSchema.validate({
    rating: 4,
    message: '  a  ',
  });

  assert.equal(error?.details[0].message, 'masukan minimal 3 karakter.');
});
