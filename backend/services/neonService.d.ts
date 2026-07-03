export interface ProfileRecord {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface QuizAttemptRecord {
  id?: string;
  user_id: string;
  quiz_id?: string | null;
  topic: string;
  subject: string;
  level: string;
  mode: string;
  attempt_number: number;
  test_mode: string;
  score: number;
  total_questions: number;
  time_taken: number | null;
  completed_at: string;
  review_data: unknown;
}

export interface SavedQuizRecord {
  id?: string;
  user_id: string;
  quiz_id: string | null;
  topic: string;
  saved_at: string;
  notes: string | null;
}

export function getProfile(userId: string): Promise<ProfileRecord | null>;
export function upsertProfile(profile: ProfileRecord): Promise<ProfileRecord>;
export function listQuizAttempts(userId: string, limit?: number): Promise<QuizAttemptRecord[]>;
export function saveQuizAttempt(attempt: QuizAttemptRecord): Promise<QuizAttemptRecord>;
export function listSavedQuizzes(userId: string): Promise<SavedQuizRecord[]>;
export function saveQuizBookmark(entry: SavedQuizRecord): Promise<SavedQuizRecord>;