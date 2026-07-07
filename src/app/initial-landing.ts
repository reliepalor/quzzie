import { NgFor, NgIf } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseAuthService } from './shared/services/firebase-auth.service';
import { GuestTrialService } from './shared/services/guest-trial.service';

@Component({
  selector: 'app-initial-landing',
  imports: [NgIf, NgFor, FormsModule],
  templateUrl: './initial-landing.html',
  styleUrl: './initial-landing.css'
})
export class InitialLanding {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private guestTrial = inject(GuestTrialService);
  protected showLanding = false;
  protected isExitingGate = false;
  protected showAccessModal = false;
  protected factCardVersion = 0;
  protected activeFactIndex = 0;
  protected authMode: 'sign-in' | 'register' = 'sign-in';
  protected signInEmail = '';
  protected signInPassword = '';
  protected registerEmail = '';
  protected registerPassword = '';
  protected registerConfirm = '';
  protected authLoading = false;
  protected authError: string | null = null;
  private readonly auth = inject(FirebaseAuthService);
  protected readonly showSignInPassword = signal(false);
  protected readonly showRegisterPassword = signal(false);

  protected toggleSignInPassword(): void {
    this.showSignInPassword.update(v => !v);
  }

  protected toggleRegisterPassword(): void {
    this.showRegisterPassword.update(v => !v);
  }
  protected isSignedIn(): boolean {
    return Boolean(this.auth.user());
  }

  protected signedInEmail(): string | null {
    return this.auth.user()?.email ?? null;
  }

  protected get hasUsedGuestAccess(): boolean {
    return this.guestTrial.isLimitReached();
  }

  protected async signOut(): Promise<void> {
    try {
      await this.auth.signOut();
    } catch (e) {
      // ignore
    }
  }

protected readonly triviaFacts: string[] = [
  'Type a topic. Get a quiz in seconds.',
  'Same topic, different quiz each time.',
  'Check key facts yourself too.'
];

  

  constructor() {
    this.guestTrial.ensureGuestTrialInitialized();

    this.route.queryParamMap.subscribe((params) => {
      const authMode = params.get('auth');
      if (authMode === 'register' || authMode === 'sign-in') {
        this.authMode = authMode;
        this.authError = null;
        this.showAccessModal = true;
      }
    });
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
      await this.auth.signIn(email, password);
      this.closeLoginPrompt();
      void this.router.navigateByUrl('/account');
    } catch (error: any) {
      this.authError = this.describeAuthError(error);
    } finally {
      this.authLoading = false;
    }
  }

  protected async signInWithGoogle(): Promise<void> {
    this.authLoading = true;
    this.authError = null;

    try {
      await this.auth.signInWithGoogle();
      this.closeLoginPrompt();
      void this.router.navigateByUrl('/account');
    } catch (error: any) {
      this.authError = this.describeAuthError(error);
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
      await this.auth.signUp(email, password);
      this.closeLoginPrompt();
      void this.router.navigateByUrl('/account');
    } catch (error: any) {
      this.authError = this.describeAuthError(error);
    } finally {
      this.authLoading = false;
    }
  }

  protected skipToStart(): void {
    if (!this.isSignedIn() && this.hasUsedGuestAccess) {
      this.showAccessModal = true;
      return;
    }

    this.openLandingWithGateCheck(true);
  }

  private openLandingWithGateCheck(force: boolean): void {
    if ((!force && !this.isLastFact) || this.isExitingGate) {
      return;
    }

    if (!force && !this.isSignedIn() && this.hasUsedGuestAccess) {
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

  private describeAuthError(error: { message?: string; code?: string; status?: number }): string {
    if (error.code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please sign in instead.';
    }

    if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.status === 400) {
      return error.message || 'Invalid email or password.';
    }

    if (error.code === 'auth/weak-password') {
      return 'Use a stronger password with at least 6 characters.';
    }

    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      return 'Google sign-in was closed before finishing.';
    }

    return error.message ? `${error.message}${error.code ? ` (${error.code})` : ''}` : 'Authentication failed. Please try again.';
  }
}