import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Profile } from '../../shared/models/supabase';
import { FirebaseAuthService } from '../../shared/services/firebase-auth.service';
import { QuizDataService } from '../../shared/services/quiz-data.service';

type AccountSection = 'history' | 'saved' | 'progress' | 'settings';

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
  protected readonly signedInUser = computed(() => this.auth.user());

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

      void this.syncProfile(this.auth.user());
    });
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

  protected async signOut(): Promise<void> {
    await this.auth.signOut();
    void this.router.navigateByUrl('/');
  }

  protected goToQuiz(): void {
    void this.router.navigateByUrl('/quizzie');
  }

  private async syncProfile(user: ReturnType<typeof this.signedInUser>): Promise<void> {
    if (!user) {
      this.profile.set(null);
      this.profileLoading.set(false);
      this.profileError.set(null);
      return;
    }

    this.profileLoading.set(true);
    this.profileError.set(null);

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
    } catch (error) {
      this.profileError.set(error instanceof Error ? error.message : 'Unable to load account details.');
      this.profile.set(null);
    } finally {
      this.profileLoading.set(false);
    }
  }
}