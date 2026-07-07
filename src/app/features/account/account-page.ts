import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Profile, QuizAttempt, QuizAttemptQuestionReview, SavedQuiz } from '../../shared/models/supabase';
import { FirebaseAuthService } from '../../shared/services/firebase-auth.service';
import { QuizDataService } from '../../shared/services/quiz-data.service';

type AccountSection = 'history' | 'saved' | 'progress' | 'settings';
type HistoryFilter = 'all' | 'learning' | 'exam';

@Component({
  standalone: true,
  selector: 'app-account-page',
  imports: [CommonModule],
  templateUrl: './account-page.html',
  styleUrl: './account-page.css',
})
export class AccountPage {
  private readonly router = inject(Router);
  private readonly auth = inject(FirebaseAuthService);
  private readonly data = inject(QuizDataService);

  protected readonly activeSection = signal<AccountSection>('history');
  protected readonly profile = signal<Profile | null>(null);
  protected readonly profileLoading = signal(true);
  protected readonly profileError = signal<string | null>(null);
  protected readonly quizAttempts = signal<QuizAttempt[]>([]);
  protected readonly savedQuizzes = signal<SavedQuiz[]>([]);
  protected readonly activityLoading = signal(true);
  protected readonly activityError = signal<string | null>(null);
  protected readonly signedInUser = computed(() => this.auth.user());
  protected readonly avatarUrl = computed(() => this.signedInUser()?.photoURL ?? null);

  protected readonly historyFilter = signal<HistoryFilter>('all');
  protected readonly historySearch = signal('');
  protected readonly selectedAttempt = signal<QuizAttempt | null>(null);
  protected readonly selectedSavedQuiz = signal<SavedQuiz | null>(null);

  protected readonly isEditingName = signal(false);
  protected readonly nameDraft = signal('');
  protected readonly savingProfile = signal(false);

  protected readonly filteredAttempts = computed(() => {
    const attempts = this.quizAttempts();
    const filter = this.historyFilter();
    const search = this.historySearch().trim().toLowerCase();

    return attempts.filter(attempt => {
      const mode = this.getAttemptMode(attempt);
      const matchesFilter = filter === 'all' || mode === filter;
      const matchesSearch =
        !search ||
        attempt.topic.toLowerCase().includes(search) ||
        attempt.subject.toLowerCase().includes(search);

      return matchesFilter && matchesSearch;
    });
  });

  protected readonly analytics = computed(() => {
    const attempts = this.quizAttempts();
    const saved = this.savedQuizzes();

    const practiceAttempts = attempts.filter(attempt => this.getAttemptMode(attempt) === 'learning');
    const examAttempts = attempts.filter(attempt => this.getAttemptMode(attempt) === 'exam');

    const totals = attempts.reduce(
      (acc, attempt) => {
        const scorePercent = attempt.total_questions > 0 ? Math.round((attempt.score / attempt.total_questions) * 100) : 0;
        const reviewQuestions = this.getReviewQuestions(attempt);

        acc.attempts += 1;
        acc.questions += attempt.total_questions;
        acc.correct += attempt.score;
        acc.scorePercents.push(scorePercent);
        acc.reviewQuestions.push(...reviewQuestions);

        acc.subjects.set(attempt.subject, (acc.subjects.get(attempt.subject) ?? 0) + 1);
        acc.topics.set(attempt.topic, (acc.topics.get(attempt.topic) ?? 0) + 1);
        acc.modes.set(this.getAttemptMode(attempt), (acc.modes.get(this.getAttemptMode(attempt)) ?? 0) + 1);

        return acc;
      },
      {
        attempts: 0,
        questions: 0,
        correct: 0,
        scorePercents: [] as number[],
        reviewQuestions: [] as QuizAttemptQuestionReview[],
        subjects: new Map<string, number>(),
        topics: new Map<string, number>(),
        modes: new Map<string, number>(),
      }
    );

    const averageScore = totals.questions > 0 ? Math.round((totals.correct / totals.questions) * 100) : 0;
    const bestScore = totals.scorePercents.length ? Math.max(...totals.scorePercents) : 0;
    const practiceQuestionReviews = practiceAttempts.flatMap(attempt => this.getReviewQuestions(attempt));
    const practiceFirstAttemptAccuracy = practiceQuestionReviews.length
      ? Math.round((practiceQuestionReviews.filter(question => question.firstAttemptCorrect).length / practiceQuestionReviews.length) * 100)
      : 0;

    const examScoreTotal = examAttempts.reduce((acc, attempt) => acc + attempt.score, 0);
    const examQuestionTotal = examAttempts.reduce((acc, attempt) => acc + attempt.total_questions, 0);
    const averageExamScore = examQuestionTotal > 0 ? Math.round((examScoreTotal / examQuestionTotal) * 100) : 0;

    const topicWeakness = this.getWeakestTopic(attempts);

    return {
      attempts: totals.attempts,
      questions: totals.questions,
      correct: totals.correct,
      averageScore,
      bestScore,
      practiceFirstAttemptAccuracy,
      averageExamScore,
      topWeakTopic: topicWeakness,
      savedCount: saved.length,
      recentAttempts: attempts.slice(0, 5),
      learningCount: totals.modes.get('learning') ?? 0,
      examCount: totals.modes.get('exam') ?? 0,
    };
  });

  protected readonly sections: Array<{ id: AccountSection; label: string; description: string }> = [
    { id: 'history', label: 'History', description: 'Recent quiz attempts and outcomes' },
    { id: 'saved', label: 'Saved', description: 'Pinned quizzes and questions' },
    { id: 'progress', label: 'Progress', description: 'Accuracy and weak-topic trends' },
    { id: 'settings', label: 'Settings', description: 'Profile and learning preferences' },
  ];

  constructor() {
    effect(() => {
      if (!this.auth.isReady()) {
        return;
      }

      void this.syncDashboard(this.auth.user());
    });
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.selectedAttempt.set(null);
    this.selectedSavedQuiz.set(null);
  }

  protected get displayName(): string {
    const profile = this.profile();
    const user = this.signedInUser();

    return profile?.display_name?.trim() || user?.displayName || user?.email?.split('@')[0] || 'Account';
  }

  protected get email(): string {
    return this.signedInUser()?.email ?? 'No email connected';
  }

  protected get memberSince(): string {
    const createdAt = this.profile()?.created_at || this.signedInUser()?.metadata.creationTime;

    if (!createdAt) {
      return 'New member';
    }

    return new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  protected selectSection(section: AccountSection): void {
    this.activeSection.set(section);
  }

  protected setHistoryFilter(filter: HistoryFilter): void {
    this.historyFilter.set(filter);
  }

  protected onSearchInput(event: Event): void {
    this.historySearch.set((event.target as HTMLInputElement).value);
  }

  protected openAttempt(attempt: QuizAttempt): void {
    this.selectedAttempt.set(attempt);
  }

  protected closeAttemptModal(): void {
    this.selectedAttempt.set(null);
  }

  protected openSavedQuiz(savedQuiz: SavedQuiz): void {
    this.selectedSavedQuiz.set(savedQuiz);
  }

  protected closeSavedQuizModal(): void {
    this.selectedSavedQuiz.set(null);
  }

  protected startEditName(): void {
    this.nameDraft.set(this.displayName);
    this.isEditingName.set(true);
  }

  protected cancelEditName(): void {
    this.isEditingName.set(false);
  }

  protected onNameDraftInput(event: Event): void {
    this.nameDraft.set((event.target as HTMLInputElement).value);
  }

  protected async saveDisplayName(): Promise<void> {
    const user = this.signedInUser();
    const draft = this.nameDraft().trim();

    if (!user || !draft) {
      return;
    }

    this.savingProfile.set(true);

    try {
      const updated = await this.data.upsertProfile({
        user_id: user.uid,
        display_name: draft,
        avatar_url: this.profile()?.avatar_url ?? user.photoURL ?? null,
        created_at: this.profile()?.created_at ?? user.metadata.creationTime ?? new Date().toISOString(),
      });

      this.profile.set(updated);
      this.isEditingName.set(false);
    } catch (error) {
      console.error('Failed to update display name', error);
    } finally {
      this.savingProfile.set(false);
    }
  }

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/');
  }

  protected attemptScorePercent(attempt: QuizAttempt): number {
    if (!attempt.total_questions) {
      return 0;
    }

    return Math.round((attempt.score / attempt.total_questions) * 100);
  }

  protected formatDuration(seconds: number | null): string {
    if (!seconds && seconds !== 0) {
      return 'Untimed';
    }

    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes}:${remaining.toString().padStart(2, '0')}`;
  }

  protected getAttemptMode(attempt: QuizAttempt): 'learning' | 'exam' {
    return (attempt.mode || attempt.test_mode || 'learning') as 'learning' | 'exam';
  }

  protected goToQuiz(): void {
    void this.router.navigateByUrl('/quizzie');
  }

  private async syncDashboard(user: ReturnType<typeof this.signedInUser>): Promise<void> {
    if (!user) {
      this.profile.set(null);
      this.quizAttempts.set([]);
      this.savedQuizzes.set([]);
      this.profileLoading.set(false);
      this.activityLoading.set(false);
      this.profileError.set(null);
      this.activityError.set(null);
      return;
    }

    this.profileLoading.set(true);
    this.activityLoading.set(true);
    this.profileError.set(null);
    this.activityError.set(null);

    try {
      let profile = await this.data.getProfile(user.uid);

      if (!profile) {
        profile = await this.data.upsertProfile({
          user_id: user.uid,
          display_name: user.displayName || user.email?.split('@')[0] || 'Quizzie user',
          avatar_url: user.photoURL || null,
          created_at: user.metadata.creationTime || new Date().toISOString(),
        });
      }

      this.profile.set(profile);

      const [attempts, savedQuizzes] = await Promise.all([
        this.data.listQuizAttempts(user.uid, 10),
        this.data.listSavedQuizzes(user.uid),
      ]);

      this.quizAttempts.set(attempts);
      this.savedQuizzes.set(savedQuizzes);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load account details.';
      this.profileError.set(message);
      this.activityError.set(message);
      this.profile.set(null);
      this.quizAttempts.set([]);
      this.savedQuizzes.set([]);
    } finally {
      this.profileLoading.set(false);
      this.activityLoading.set(false);
    }
  }

  private getReviewQuestions(attempt: QuizAttempt): QuizAttemptQuestionReview[] {
    const reviewData = attempt.review_data as { questions?: QuizAttemptQuestionReview[] } | null | undefined;

    if (!reviewData?.questions || !Array.isArray(reviewData.questions)) {
      return [];
    }

    return reviewData.questions;
  }

  private getWeakestTopic(attempts: QuizAttempt[]): string {
    const topicStats = new Map<string, { score: number; total: number }>();

    for (const attempt of attempts) {
      const current = topicStats.get(attempt.topic) ?? { score: 0, total: 0 };
      current.score += attempt.score;
      current.total += attempt.total_questions;
      topicStats.set(attempt.topic, current);
    }

    let weakest: { topic: string; percent: number } | null = null;

    for (const [topic, stats] of topicStats.entries()) {
      if (!stats.total) continue;
      const percent = Math.round((stats.score / stats.total) * 100);

      if (!weakest || percent < weakest.percent) {
        weakest = { topic, percent };
      }
    }

    return weakest?.topic ?? 'No quizzes yet';
  }
}