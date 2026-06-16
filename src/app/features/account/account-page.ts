import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { Profile } from '../../shared/models/supabase';
import { SupabaseService } from '../../shared/services/supabase.service';

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
  private readonly supabase = inject(SupabaseService);

  protected readonly activeSection = signal<AccountSection>('history');
  protected readonly profile = signal<Profile | null>(null);
  protected readonly profileLoading = signal(true);
  protected readonly profileError = signal<string | null>(null);
  protected readonly signedInUser = computed(() => this.supabase.user());

  protected readonly sections: Array<{ id: AccountSection; label: string; description: string }> = [
    { id: 'history', label: 'History', description: 'Recent quiz attempts and outcomes' },
    { id: 'saved', label: 'Saved', description: 'Pinned quizzes and questions' },
    { id: 'progress', label: 'Progress', description: 'Accuracy and weak-topic trends' },
    { id: 'settings', label: 'Settings', description: 'Profile and learning preferences' },
  ];

  constructor() {
    effect(() => {
      if (!this.supabase.isReady()) {
        return;
      }

      void this.syncProfile(this.supabase.user()?.id ?? null);
    });
  }

  protected get displayName(): string {
    const profile = this.profile();
    const user = this.signedInUser();

    return profile?.display_name?.trim() || user?.user_metadata?.['full_name'] || user?.email?.split('@')[0] || 'Account';
  }

  protected get email(): string {
    return this.signedInUser()?.email ?? 'No email connected';
  }

  protected get memberSince(): string {
    const createdAt = this.profile()?.created_at || this.signedInUser()?.created_at;

    if (!createdAt) {
      return 'New member';
    }

    return new Date(createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  protected selectSection(section: AccountSection): void {
    this.activeSection.set(section);
  }

  protected async signOut(): Promise<void> {
    await this.supabase.signOut();
    void this.router.navigateByUrl('/');
  }

  protected goToQuiz(): void {
    void this.router.navigateByUrl('/quizzie');
  }

  private async syncProfile(userId: string | null): Promise<void> {
    if (!userId) {
      this.profile.set(null);
      this.profileLoading.set(false);
      this.profileError.set(null);
      return;
    }

    this.profileLoading.set(true);
    this.profileError.set(null);

    try {
      const { data, error } = await this.supabase.getProfile(userId);

      if (error && error.code !== 'PGRST116') {
        this.profileError.set(error.message);
        this.profile.set(null);
        return;
      }

      this.profile.set(data ?? null);
    } catch (error) {
      this.profileError.set(error instanceof Error ? error.message : 'Unable to load account details.');
      this.profile.set(null);
    } finally {
      this.profileLoading.set(false);
    }
  }
}