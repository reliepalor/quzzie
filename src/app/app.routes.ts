import { Routes } from '@angular/router';
import { LandingPage } from './features/landing/page';
import { QuizPage } from './features/quiz/quiz-page';
import { InitialLanding } from './initial-landing';

export const routes: Routes = [
  { path: '', component: InitialLanding },
  { path: 'quizzie', component: LandingPage },
  { path: 'play', component: QuizPage },
  { path: '**', redirectTo: '' },
];
