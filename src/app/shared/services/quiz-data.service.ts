import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Profile, QuizAttempt, SavedQuiz } from '../models/supabase';

@Injectable({ providedIn: 'root' })
export class QuizDataService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiBaseUrl;

  async getProfile(userId: string): Promise<Profile | null> {
    try {
      return await firstValueFrom(
        this.http.get<Profile | null>(`${this.baseUrl}/profile/${encodeURIComponent(userId)}`)
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }

      throw error;
    }
  }

  async upsertProfile(profile: Profile): Promise<Profile> {
    return firstValueFrom(
      this.http.put<Profile>(`${this.baseUrl}/profile/${encodeURIComponent(profile.user_id)}`, profile)
    );
  }

  async listQuizAttempts(userId: string, limit = 20): Promise<QuizAttempt[]> {
    return firstValueFrom(
      this.http.get<QuizAttempt[]>(
        `${this.baseUrl}/quiz-attempts/${encodeURIComponent(userId)}?limit=${limit}`
      )
    );
  }

  async saveQuizAttempt(attempt: QuizAttempt): Promise<QuizAttempt> {
    return firstValueFrom(this.http.post<QuizAttempt>(`${this.baseUrl}/quiz-attempts`, attempt));
  }

  async listSavedQuizzes(userId: string): Promise<SavedQuiz[]> {
    return firstValueFrom(
      this.http.get<SavedQuiz[]>(`${this.baseUrl}/saved-quizzes/${encodeURIComponent(userId)}`)
    );
  }

  async saveQuizBookmark(entry: SavedQuiz): Promise<SavedQuiz> {
    return firstValueFrom(this.http.post<SavedQuiz>(`${this.baseUrl}/saved-quizzes`, entry));
  }
}