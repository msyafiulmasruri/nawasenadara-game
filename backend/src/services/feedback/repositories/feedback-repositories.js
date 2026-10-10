import pool from '../../../config/db.js';

class FeedbackRepositories {
  async create({ userId, rating, message }) {
    const result = await pool.query(
      `INSERT INTO game_feedback (user_id, rating, message)
       VALUES ($1, $2, $3)
       RETURNING id, user_id, rating, message, created_at, updated_at`,
      [userId, rating, message],
    );

    return result.rows[0];
  }
}

export default new FeedbackRepositories();
