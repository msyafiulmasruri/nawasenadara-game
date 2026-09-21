import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const PUBLIC_FIELDS =
  'id, name, email, avatar_url, provider, role, is_verified, character_name, created_at';

class UserRepositories {
  constructor() {
    this._pool = new Pool();
  }

  async createUser({ name, email, password, avatarUrl, role }) {
    const password_hash = await bcrypt.hash(password, 12);
    const result = await this._pool.query(
      `INSERT INTO users (name, email, password_hash, avatar_url, provider, role, is_verified)
       VALUES ($1, $2, $3, $4, 'local', $5, false)
       RETURNING ${PUBLIC_FIELDS}`,
      [name.trim(), email, password_hash, avatarUrl, role || 'siswa'],
    );
    return result.rows[0];
  }

  async verifyEmail(email) {
    const result = await this._pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    return result.rows.length > 0;
  }

  async getUserById(id) {
    const result = await this._pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  }

  async getUserByEmailForAuth(email) {
    const result = await this._pool.query(
      `SELECT ${PUBLIC_FIELDS}, password_hash FROM users WHERE email = $1`,
      [email],
    );
    return result.rows[0] || null;
  }

  async getUserByGoogleIdOrEmail(googleId, email) {
    const result = await this._pool.query(
      `SELECT ${PUBLIC_FIELDS} FROM users WHERE google_id = $1 OR email = $2`,
      [googleId, email],
    );
    return result.rows[0] || null;
  }

  async upsertGoogleUser({ googleId, avatarUrl, name, existingId }) {
    const result = await this._pool.query(
      `UPDATE users
       SET google_id = $1, avatar_url = COALESCE($2, avatar_url), name = COALESCE(name, $3), updated_at = NOW()
       WHERE id = $4
       RETURNING ${PUBLIC_FIELDS}`,
      [googleId, avatarUrl, name, existingId],
    );
    return result.rows[0];
  }

  async insertGoogleUser({ name, email, googleId, avatarUrl, role }) {
    const result = await this._pool.query(
      `INSERT INTO users (name, email, google_id, avatar_url, provider, role, is_verified)
       VALUES ($1, $2, $3, $4, 'google', $5, true)
       RETURNING ${PUBLIC_FIELDS}`,
      [name, email, googleId, avatarUrl, role || 'siswa'],
    );
    return result.rows[0];
  }

  async updateName({ id, name }) {
    const result = await this._pool.query(
      `UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${PUBLIC_FIELDS}`,
      [name.trim(), id],
    );
    return result.rows[0];
  }

  // Nama TOKOH dalam game (users.character_name) — beda dari
  // updateName() di atas yang mengubah nama AKUN. Dipanggil dari
  // PUT /api/auth/character-name (lihat user-controller.js), diisi
  // sekali lewat prompt "Mulai Petualangan" sebelum episode 1.
  async updateCharacterName({ id, characterName }) {
    const result = await this._pool.query(
      `UPDATE users SET character_name = $1, updated_at = NOW() WHERE id = $2
       RETURNING ${PUBLIC_FIELDS}`,
      [characterName.trim(), id],
    );
    return result.rows[0];
  }

  async verifyCredential(email, password) {
    const user = await this.getUserByEmailForAuth(email);
    if (!user || !user.password_hash) return null;

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return null;

    return user;
  }

  async updatePassword({ userId, password, client }) {
    const password_hash = await bcrypt.hash(password, 12);
    const q = client || this._pool;
    await q.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [password_hash, userId],
    );
  }

  get pool() {
    return this._pool;
  }
}

export default new UserRepositories();
