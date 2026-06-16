export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface QuizAttempt {
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
}

export interface SavedQuiz {
  id?: string;
  user_id: string;
  quiz_id: string | null;
  topic: string;
  saved_at: string;
  notes: string | null;
}