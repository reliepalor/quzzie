import { Pool } from 'pg';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL is required for Neon database access.');
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
});

let schemaReady = null;

async function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await pool.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

      await pool.query(`
        CREATE TABLE IF NOT EXISTS profiles (
          user_id text PRIMARY KEY,
          display_name text,
          avatar_url text,
          created_at timestamptz NOT NULL DEFAULT now()
        )
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          quiz_id text,
          topic text NOT NULL,
          subject text NOT NULL,
          level text NOT NULL,
          mode text NOT NULL DEFAULT 'learning',
          attempt_number integer NOT NULL DEFAULT 1,
          test_mode text NOT NULL,
          score integer NOT NULL,
          total_questions integer NOT NULL,
          time_taken integer,
          completed_at timestamptz NOT NULL,
          review_data jsonb NOT NULL DEFAULT '{}'::jsonb
        )
      `);

      await pool.query('ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS mode text');
      await pool.query('ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS attempt_number integer');
      await pool.query(`
        UPDATE quiz_attempts
        SET
          mode = COALESCE(mode, test_mode, 'learning'),
          attempt_number = COALESCE(attempt_number, 1)
        WHERE mode IS NULL OR attempt_number IS NULL
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS saved_quizzes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id text NOT NULL,
          quiz_id text,
          topic text NOT NULL,
          saved_at timestamptz NOT NULL DEFAULT now(),
          notes text
        )
      `);

      await pool.query('CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_id ON quiz_attempts(user_id)');
      await pool.query('CREATE INDEX IF NOT EXISTS idx_saved_quizzes_user_id ON saved_quizzes(user_id)');
    })();
  }

  return schemaReady;
}

export async function getProfile(userId) {
  await ensureSchema();

  const result = await pool.query(
    'SELECT user_id, display_name, avatar_url, created_at::text AS created_at FROM profiles WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function upsertProfile(profile) {
  await ensureSchema();

  const result = await pool.query(
    `
      INSERT INTO profiles (user_id, display_name, avatar_url, created_at)
      VALUES ($1, $2, $3, COALESCE($4::timestamptz, now()))
      ON CONFLICT (user_id)
      DO UPDATE SET
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url
      RETURNING user_id, display_name, avatar_url, created_at::text AS created_at
    `,
    [profile.user_id, profile.display_name, profile.avatar_url, profile.created_at]
  );

  return result.rows[0];
}

export async function listQuizAttempts(userId, limit = 20) {
  await ensureSchema();

  const result = await pool.query(
    `
      SELECT
        id::text AS id,
        user_id,
        quiz_id,
        topic,
        subject,
        level,
        mode,
        attempt_number,
        test_mode,
        score,
        total_questions,
        time_taken,
        completed_at::text AS completed_at,
        review_data
      FROM quiz_attempts
      WHERE user_id = $1
      ORDER BY completed_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );

  return result.rows;
}

export async function saveQuizAttempt(attempt) {
  await ensureSchema();

  const result = await pool.query(
    `
      INSERT INTO quiz_attempts (
        id,
        user_id,
        quiz_id,
        topic,
        subject,
        level,
        mode,
        attempt_number,
        test_mode,
        score,
        total_questions,
        time_taken,
        completed_at,
        review_data
      )
      VALUES (
        COALESCE($1::uuid, gen_random_uuid()),
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        COALESCE($13::timestamptz, now()),
        COALESCE($14::jsonb, '{}'::jsonb)
      )
      ON CONFLICT (id)
      DO UPDATE SET
        quiz_id = EXCLUDED.quiz_id,
        topic = EXCLUDED.topic,
        subject = EXCLUDED.subject,
        level = EXCLUDED.level,
        mode = EXCLUDED.mode,
        attempt_number = EXCLUDED.attempt_number,
        test_mode = EXCLUDED.test_mode,
        score = EXCLUDED.score,
        total_questions = EXCLUDED.total_questions,
        time_taken = EXCLUDED.time_taken,
        completed_at = EXCLUDED.completed_at,
        review_data = EXCLUDED.review_data
      RETURNING
        id::text AS id,
        user_id,
        quiz_id,
        topic,
        subject,
        level,
        mode,
        attempt_number,
        test_mode,
        score,
        total_questions,
        time_taken,
        completed_at::text AS completed_at,
        review_data
    `,
    [
      attempt.id ?? null,
      attempt.user_id,
      attempt.quiz_id ?? null,
      attempt.topic,
      attempt.subject,
      attempt.level,
      attempt.mode,
      attempt.attempt_number,
      attempt.test_mode,
      attempt.score,
      attempt.total_questions,
      attempt.time_taken ?? null,
      attempt.completed_at ?? null,
      JSON.stringify(attempt.review_data ?? {}),
    ]
  );

  return result.rows[0];
}

export async function listSavedQuizzes(userId) {
  await ensureSchema();

  const result = await pool.query(
    `
      SELECT
        id::text AS id,
        user_id,
        quiz_id,
        topic,
        saved_at::text AS saved_at,
        notes
      FROM saved_quizzes
      WHERE user_id = $1
      ORDER BY saved_at DESC
    `,
    [userId]
  );

  return result.rows;
}

export async function saveQuizBookmark(entry) {
  await ensureSchema();

  const result = await pool.query(
    `
      INSERT INTO saved_quizzes (id, user_id, quiz_id, topic, saved_at, notes)
      VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, COALESCE($5::timestamptz, now()), $6)
      ON CONFLICT (id)
      DO UPDATE SET
        quiz_id = EXCLUDED.quiz_id,
        topic = EXCLUDED.topic,
        saved_at = EXCLUDED.saved_at,
        notes = EXCLUDED.notes
      RETURNING id::text AS id, user_id, quiz_id, topic, saved_at::text AS saved_at, notes
    `,
    [entry.id ?? null, entry.user_id, entry.quiz_id, entry.topic, entry.saved_at ?? null, entry.notes]
  );

  return result.rows[0];
}