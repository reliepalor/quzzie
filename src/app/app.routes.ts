import { Routes } from '@angular/router';
import { AccountPage } from './features/account/account-page';
import { LandingPage } from './features/landing/page';
import { QuizPage } from './features/quiz/quiz-page';
import { InitialLanding } from './initial-landing';

export const routes: Routes = [
  { path: '', component: InitialLanding },
  { path: 'quizzie', component: LandingPage },
  { path: 'account', component: AccountPage },
  { path: 'play', component: QuizPage },
  { path: '**', redirectTo: '' },
];
