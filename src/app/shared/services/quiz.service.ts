import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { QuizSettings } from '../models/quiz';
import { catchError, tap, throwError } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class QuizService {
    private http = inject(HttpClient);

    currentQuiz = signal<any>(null);
    isLoading = signal<boolean>(false);
    errorMessage = signal<string | null>(null);
    quizTimer = signal<number | null>(null);
    quizSubject = signal<string | null>(null);

    generateQuiz(settings: QuizSettings) {
        this.isLoading.set(true);
        this.errorMessage.set(null);
        this.quizTimer.set(settings.timer ?? null)
        this.quizSubject.set(settings.subject ?? null);

        return this.http.post<any>('/api/generate', settings).pipe(
            tap(response => {
                this.currentQuiz.set(response.quiz);
                this.isLoading.set(false);
            }),
            catchError((error: HttpErrorResponse) => {
                this.isLoading.set(false);
                if (error.status === 429) {
                    this.errorMessage.set("Slow down! You've reached the AI's limit. Try again in 60 seconds.");
                } else {
                    this.errorMessage.set("Failed to generate quiz. Please check your connection.");
                }
                return throwError(() => error);
            })
        );
    }

    checkTopicDifficulty(topic: string, level: string, subLevel: string) {
        return this.http.post<any>('/api/check-topic', {
            topic,
            level,
            subLevel
        });     
    }

    getImage(query: string, subject: any) {
        return this.http.get<any>
        (    `/api/image?q=${encodeURIComponent(query)}&subject=${encodeURIComponent(subject)}`
);
    }
}
