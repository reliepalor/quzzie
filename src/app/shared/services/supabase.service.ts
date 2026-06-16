import { Injectable, computed, signal } from '@angular/core';
import {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
  createClient,
} from '@supabase/supabase-js';

import { supabaseConfig } from '../config/supabase';
import { Profile, QuizAttempt, SavedQuiz } from '../models/supabase';

function createSupabaseClient(): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';

  return createClient(supabaseConfig.url, supabaseConfig.anonKey, {
    auth: {
      autoRefreshToken: isBrowser,
      detectSessionInUrl: isBrowser,
      persistSession: isBrowser,
      flowType: 'pkce',
    },
  });
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private readonly client = createSupabaseClient();
  private readonly sessionState = signal<Session | null>(null);
  private readonly authReadyState = signal(false);

  readonly session = computed(() => this.sessionState());
  readonly user = computed<User | null>(() => this.sessionState()?.user ?? null);
  readonly isAuthenticated = computed(() => Boolean(this.user()));
  readonly isReady = computed(() => this.authReadyState());

  constructor() {
    void this.initializeAuth();
  }

  private async initializeAuth(): Promise<void> {
    const { data } = await this.client.auth.getSession();
    this.sessionState.set(data.session ?? null);
    this.authReadyState.set(true);

    this.client.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        this.sessionState.set(session);
        this.authReadyState.set(true);
      }
    );
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  async signUp(email: string, password: string) {
    return this.client.auth.signUp({
      email,
      password,
    });
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({
      email,
      password,
    });
  }

  async signInWithOtp(email: string) {
    return this.client.auth.signInWithOtp({
      email,
    });
  }

  async signInWithOAuth(provider: string) {
    // provider: 'google', 'github', etc.
    // PKCE flow is enabled in the client config; this will redirect to the provider.
    return this.client.auth.signInWithOAuth({ provider: provider as any });
  }

  async signOut() {
    return this.client.auth.signOut();
  }

  async getProfile(userId: string) {
    return this.client.from('profiles').select('*').eq('user_id', userId).single<Profile>();
  }

  async upsertProfile(profile: Profile) {
    return this.client.from('profiles').upsert(profile).select().single<Profile>();
  }

  async listQuizAttempts(userId: string, limit = 20) {
    return this.client
      .from('quiz_attempts')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit)
      .returns<QuizAttempt[]>();
  }

  async saveQuizAttempt(attempt: QuizAttempt) {
    return this.client.from('quiz_attempts').insert(attempt).select().single<QuizAttempt>();
  }

  async listSavedQuizzes(userId: string) {
    return this.client
      .from('saved_quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('saved_at', { ascending: false })
      .returns<SavedQuiz[]>();
  }

  async saveQuizBookmark(entry: SavedQuiz) {
    return this.client.from('saved_quizzes').upsert(entry).select().single<SavedQuiz>();
  }
}