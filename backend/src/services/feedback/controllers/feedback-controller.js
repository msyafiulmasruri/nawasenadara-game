import FeedbackRepositories from '../repositories/feedback-repositories.js';
import { created } from '../../../utils/response.js';

// POST /api/feedback
// Hanya menerima rating dan masukan. Identitas pengguna diperoleh dari
// access token sehingga klien tidak dapat mengirim user_id milik orang lain.
export const createFeedback = async (req, res, next) => {
  try {
    const { rating, message } = req.validated;
    const feedback = await FeedbackRepositories.create({
      userId: req.user.id,
      rating,
      message,
    });

    return created(
      res,
      {
        id: feedback.id,
        rating: feedback.rating,
        message: feedback.message,
        created_at: feedback.created_at,
      },
      'Terima kasih, masukanmu berhasil dikirim.',
    );
  } catch (err) {
    next(err);
  }
};
