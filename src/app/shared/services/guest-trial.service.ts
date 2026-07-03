import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class GuestTrialService {
  private readonly guestRemainingKey = 'quizzie_guest_remaining_generations';
  private readonly maxGuestGenerations = 3;

  getMaxGenerations(): number {
    return this.maxGuestGenerations;
  }

  getRemainingGenerations(): number {
    if (typeof window === 'undefined') {
      return this.maxGuestGenerations;
    }

    const raw = window.localStorage.getItem(this.guestRemainingKey);
    if (raw === null) {
      return this.maxGuestGenerations;
    }

    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return this.maxGuestGenerations;
    }

    return Math.floor(parsed);
  }

  getUsedGenerations(): number {
    return Math.max(0, this.maxGuestGenerations - this.getRemainingGenerations());
  }

  getStatusLabel(): string {
    return `${this.getUsedGenerations()}/${this.maxGuestGenerations} done`;
  }

  getRemainingLabel(): string {
    const remaining = this.getRemainingGenerations();
    return remaining === 1 ? '1 trial left' : `${remaining} trials left`;
  }

  canUseAnotherGeneration(): boolean {
    return this.getRemainingGenerations() > 0;
  }

  isLimitReached(): boolean {
    return !this.canUseAnotherGeneration();
  }

  consumeOneGeneration(): number {
    const currentRemaining = this.getRemainingGenerations();
    const next = Math.max(0, currentRemaining - 1);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(this.guestRemainingKey, String(next));
    }

    return next;
  }

  ensureGuestTrialInitialized(): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.localStorage.getItem(this.guestRemainingKey) === null) {
      window.localStorage.setItem(this.guestRemainingKey, String(this.maxGuestGenerations));
    }
  }
}
