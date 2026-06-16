import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from './shared/services/supabase.service';

@Component({
  selector: 'app-initial-landing',
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './initial-landing.html',
  styleUrl: './app.css'
})
export class InitialLanding {
  private router = inject(Router);
  protected showLanding = false;
  protected isExitingGate = false;
  protected showAccessModal = false;
  protected factCardVersion = 0;
  protected activeFactIndex = 0;
  protected hasUsedGuestAccess = false;
  private readonly guestAccessKey = 'quizzie_guest_access_used';
  private readonly guestQuizCountKey = 'quizzie_guest_quiz_count';
  protected authMode: 'sign-in' | 'register' = 'sign-in';
  protected signInEmail = '';
  protected signInPassword = '';
  protected registerEmail = '';
  protected registerPassword = '';
  protected registerConfirm = '';
  protected authLoading = false;
  protected authError: string | null = null;
  private readonly supabase = inject(SupabaseService);
  protected isSignedIn(): boolean {
    return Boolean(this.supabase.isAuthenticated());
  }

  protected signedInEmail(): string | null {
    return this.supabase.user()?.email ?? null;
  }

  protected async signOut(): Promise<void> {
    try {
      await this.supabase.signOut();
      // clear any UI guest state
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(this.guestAccessKey);
        window.localStorage.removeItem(this.guestQuizCountKey);
      }
    } catch (e) {
      // ignore
    }
  }

  protected readonly triviaFacts: string[] = [
    'Quizzie turns your topic into quick quizzes.',
    'Each run can feel a little different.',
    'It is smart to verify key facts too.'
  ];

  constructor() {
    if (typeof window !== 'undefined') {
      this.hasUsedGuestAccess = window.localStorage.getItem(this.guestAccessKey) === 'true';
    }
  }

  protected get activeFact(): string {
    return this.triviaFacts[this.activeFactIndex];
  }

  protected get isLastFact(): boolean {
    return this.activeFactIndex === this.triviaFacts.length - 1;
  }

  protected advanceFact(): void {
    this.playCuteSound();

    if (this.isLastFact) {
      this.openLanding();
      return;
    }

    const nextIndex = this.activeFactIndex + 1;
    this.selectFact(nextIndex);
  }

  protected selectFact(index: number): void {
    if (index < 0 || index >= this.triviaFacts.length || index === this.activeFactIndex) {
      return;
    }

    this.activeFactIndex = index;
    this.factCardVersion += 1;
  }

  protected openLanding(): void {
    this.openLandingWithGateCheck(false);
  }

  protected openLoginPrompt(): void {
    this.authMode = 'sign-in';
    this.authError = null;
    this.showAccessModal = true;
  }

  protected closeLoginPrompt(): void {
    this.showAccessModal = false;
  }

  protected continueAsGuest(): void {
    if (this.hasUsedGuestAccess) {
      this.showAccessModal = true;
      return;
    }

    this.markGuestAccessUsed();
    this.closeLoginPrompt();
    this.openLandingWithGateCheck(true);
  }

  protected showRegisterFlow(): void {
    this.authMode = 'register';
    this.authError = null;
    this.showAccessModal = true;
  }

  protected openAccountShell(): void {
    void this.router.navigateByUrl('/account');
  }

  protected async submitSignIn(): Promise<void> {
    this.authLoading = true;
    this.authError = null;

    const email = this.signInEmail.trim();
    const password = this.signInPassword;

    if (!email || !password) {
      this.authError = 'Enter both your email and password.';
      this.authLoading = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.signIn(email, password);

      if (error) {
        console.error('Supabase sign-in failed', error);
        this.authError = this.describeAuthError(error);
      } else {
        if (!data.session) {
          this.authError = 'Check your email to confirm the account before signing in.';
          return;
        }

        this.closeLoginPrompt();
        void this.router.navigateByUrl('/account');
      }
    } catch (err: any) {
      this.authError = err?.message || String(err);
    } finally {
      this.authLoading = false;
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    void this.sendEmailLink();
  }

  protected async sendEmailLink(): Promise<void> {
    const email = this.signInEmail.trim() || this.registerEmail.trim();

    if (!email) {
      this.authError = 'Enter your email first.';
      return;
    }

    this.authLoading = true;
    this.authError = null;

    try {
      const result = await this.supabase.signInWithOtp(email);

      if (result.error) {
        this.authError = result.error.message;
        return;
      }

      this.authError = 'Check your email for the sign-in link.';
      this.authMode = 'sign-in';
    } catch (err: any) {
      this.authError = err?.message || String(err);
    } finally {
      this.authLoading = false;
    }
  }

  protected async submitRegister(): Promise<void> {
    this.authLoading = true;
    this.authError = null;

    const email = this.registerEmail.trim();
    const password = this.registerPassword;
    const confirm = this.registerConfirm;

    if (!email || !password || !confirm) {
      this.authError = 'Enter your email, password, and confirmation.';
      this.authLoading = false;
      return;
    }

    if (password !== confirm) {
      this.authError = 'Passwords do not match';
      this.authLoading = false;
      return;
    }

    try {
      const { data, error } = await this.supabase.signUp(email, password);

      if (error) {
        console.error('Supabase sign-up failed', error);
        this.authError = this.describeAuthError(error);
      } else {
        if (data.session) {
          this.closeLoginPrompt();
          void this.router.navigateByUrl('/account');
          return;
        }

        this.authMode = 'sign-in';
        this.authError = 'Account created. Check your email to confirm it, then sign in.';
      }
    } catch (err: any) {
      this.authError = err?.message || String(err);
    } finally {
      this.authLoading = false;
    }
  }

  protected skipToStart(): void {
    this.openLandingWithGateCheck(true);
  }

  private openLandingWithGateCheck(force: boolean): void {
    if ((!force && !this.isLastFact) || this.isExitingGate) {
      return;
    }

    if (!force && this.hasUsedGuestAccess) {
      this.showAccessModal = true;
      return;
    }

    this.isExitingGate = true;

    window.setTimeout(() => {
      void this.router.navigateByUrl('/quizzie');
      this.isExitingGate = false;
    }, 280);
  }

  private playCuteSound(): void {
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(920, audioContext.currentTime + 0.09);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);

    oscillator.onended = () => {
      gainNode.disconnect();
      audioContext.close().catch(() => undefined);
    };
  }

  private markGuestAccessUsed(): void {
    this.hasUsedGuestAccess = true;

    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(this.guestAccessKey, 'true');

    const currentCount = Number(window.localStorage.getItem(this.guestQuizCountKey) ?? '0');
    window.localStorage.setItem(this.guestQuizCountKey, String(currentCount + 1));
  }

  private describeAuthError(error: { message?: string; code?: string; status?: number }): string {
    if (error.code === 'email_not_confirmed') {
      return 'Confirm your email first, then sign in.';
    }

    if (error.code === 'invalid_credentials' || error.status === 400) {
      return error.message || 'Invalid email or password. If you signed up recently, confirm your email first.';
    }

    return error.message ? `${error.message}${error.code ? ` (${error.code})` : ''}` : 'Authentication failed. Please try again.';
  }
}