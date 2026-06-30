import { Pool } from 'pg';

type ProfileRecord = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

type QuizAttemptRecord = {
  id?: string;
  user_id: string;
  quiz_id?: string | null;
  topic: string;
  subject: string;
  level: string;
  test_mode: string;
  score: number;
  total_questions: number;
  time_taken: number | null;
  completed_at: string;
  review_data: unknown;
};

type SavedQuizRecord = {
  id?: string;
  user_id: string;
  quiz_id: string | null;
  topic: string;
  saved_at: string;
  notes: string | null;
};

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

let schemaReady: Promise<void> | null = null;

async function ensureSchema(): Promise<void> {
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
          test_mode text NOT NULL,
          score integer NOT NULL,
          total_questions integer NOT NULL,
          time_taken integer,
          completed_at timestamptz NOT NULL,
          review_data jsonb NOT NULL DEFAULT '{}'::jsonb
        )
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

export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  await ensureSchema();

  const result = await pool.query<ProfileRecord>(
    'SELECT user_id, display_name, avatar_url, created_at::text AS created_at FROM profiles WHERE user_id = $1 LIMIT 1',
    [userId]
  );

  return result.rows[0] ?? null;
}

export async function upsertProfile(profile: ProfileRecord): Promise<ProfileRecord> {
  await ensureSchema();

  const result = await pool.query<ProfileRecord>(
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

export async function listQuizAttempts(userId: string, limit = 20): Promise<QuizAttemptRecord[]> {
  await ensureSchema();

  const result = await pool.query<QuizAttemptRecord>(
    `
      SELECT
        id::text AS id,
        user_id,
        quiz_id,
        topic,
        subject,
        level,
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

export async function saveQuizAttempt(attempt: QuizAttemptRecord): Promise<QuizAttemptRecord> {
  await ensureSchema();

  const result = await pool.query<QuizAttemptRecord>(
    `
      INSERT INTO quiz_attempts (
        id,
        user_id,
        quiz_id,
        topic,
        subject,
        level,
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
        COALESCE($11::timestamptz, now()),
        COALESCE($12::jsonb, '{}'::jsonb)
      )
      ON CONFLICT (id)
      DO UPDATE SET
        quiz_id = EXCLUDED.quiz_id,
        topic = EXCLUDED.topic,
        subject = EXCLUDED.subject,
        level = EXCLUDED.level,
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

export async function listSavedQuizzes(userId: string): Promise<SavedQuizRecord[]> {
  await ensureSchema();

  const result = await pool.query<SavedQuizRecord>(
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

export async function saveQuizBookmark(entry: SavedQuizRecord): Promise<SavedQuizRecord> {
  await ensureSchema();

  const result = await pool.query<SavedQuizRecord>(
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