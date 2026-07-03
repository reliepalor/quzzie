import { TestMode } from './quiz';

export interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface QuizAttemptQuestionReview {
  id: string;
  question: string;
  answer: string;
  userAnswer: string | null;
  correct: boolean;
  firstAttemptCorrect: boolean;
  attemptNumber: number;
  subject: string;
}

export interface QuizAttemptReviewData {
  mode: TestMode;
  attemptNumber: number;
  questions: QuizAttemptQuestionReview[];
}

export interface QuizAttempt {
  id?: string;
  user_id: string;
  quiz_id?: string | null;
  topic: string;
  subject: string;
  level: string;
  mode: TestMode;
  attempt_number: number;
  test_mode: string;
  score: number;
  total_questions: number;
  time_taken: number | null;
  completed_at: string;
  review_data: QuizAttemptReviewData;
}

export interface SavedQuiz {
  id?: string;
  user_id: string;
  quiz_id: string | null;
  topic: string;
  saved_at: string;
  notes: string | null;
}