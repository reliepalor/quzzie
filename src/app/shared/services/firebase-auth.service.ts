import { Injectable, computed, signal } from '@angular/core';
import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  User,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from 'firebase/auth';

import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseAuthService {
  private readonly app = initializeApp(environment.firebase);
  private readonly auth = getAuth(this.app);
  private readonly userState = signal<User | null>(null);
  private readonly readyState = signal(false);

  readonly user = computed(() => this.userState());
  readonly isAuthenticated = computed(() => Boolean(this.userState()));
  readonly isReady = computed(() => this.readyState());

  constructor() {
    if (typeof window === 'undefined') {
      this.readyState.set(true);
      return;
    }

    void this.initializeAuthState();
  }

  private async initializeAuthState(): Promise<void> {
    await setPersistence(this.auth, browserLocalPersistence);

    onAuthStateChanged(this.auth, (user) => {
      this.userState.set(user);
      this.readyState.set(true);
    });
  }

  async signUp(email: string, password: string, displayName?: string) {
    const credential = await createUserWithEmailAndPassword(this.auth, email, password);
    const fallbackName = displayName?.trim() || email.split('@')[0] || 'Quizzie user';

    if (fallbackName) {
      await updateProfile(credential.user, { displayName: fallbackName });
    }

    return credential;
  }

  async signIn(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async signInWithGoogle() {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    return signInWithPopup(this.auth, provider);
  }

  async signOut() {
    return signOut(this.auth);
  }
}