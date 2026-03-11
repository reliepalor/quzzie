  import { Component, signal, computed, inject, OnInit} from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router } from '@angular/router';
  import { FormsModule } from '@angular/forms';
  import { QuizService } from '../../shared/services/quiz.service';
  import { ConfettiComponent } from '../components/confetti';

  @Component({
      standalone: true,
      selector: 'app-quiz-page',
      imports: [CommonModule, FormsModule, ConfettiComponent],
      templateUrl: './quiz-page.html'
  })

  export class QuizPage implements OnInit{
    private router = inject(Router);
    private quizService = inject(QuizService);

    questions = this.quizService.currentQuiz;

    showConfetti = signal(false);
    currentIndex = signal(0);
    selectedAnswer = signal<string | null>(null);
    userInput = signal('');
    score = signal(0);
    isFinished = signal(false);
    timer = signal<number | null>(null);
    timeLeft = signal<number>(0);
    timerInterval: any;


    currentQuestion = computed(() => this.questions()?.[this.currentIndex()]);
    progress = computed(() => {
      const total = this.questions()?.length || 1;
      return ((this.currentIndex() + 1) / total) * 100;
    });  

    ngOnInit(): void {
        if (!this.questions() || this.questions().length === 0 ){
          this.router.navigateByUrl('/');
        }

        const timerSeconds = this.quizService.quizTimer();
        
        if(timerSeconds && timerSeconds > 0){
          this.timer.set(timerSeconds);
          this.timeLeft.set(timerSeconds)
          this.startTimer();
        }
    }
    selectOption(option: string) {
      if (this.selectedAnswer()) return;
      this.selectedAnswer.set(option);

      if (option === this.currentQuestion().answer) {
        this.score.update(s => s + 1);
      }
    }

    submitTextAnswer() {
      const userAnswer = this.userInput().trim().toLowerCase();
      const correctAnswer = this.currentQuestion().answer.trim().toLowerCase();

      this.selectedAnswer.set(this.userInput());

      if(userAnswer === correctAnswer) {
          this.score.update(s => s +1 );
      }
    }

    nextQuestion() {
      if (this.currentIndex() < this.questions().length - 1) {
        this.currentIndex.update(i => i + 1);
        this.selectedAnswer.set(null);
        this.userInput.set('');
        return;
      }
      if (this.score() === this.questions().length) {
        this.showConfetti.set(true);
        setTimeout(() => this.showConfetti.set(false), 3500);
      }
      this.isFinished.set(true);
    }

    restart() {
    this.quizService.currentQuiz.set(null);
    this.router.navigateByUrl('/');
    }

    startTimer() {

      this.timerInterval = setInterval(() => {
        const remaining = this.timeLeft();

        if (this.timeLeft() <= 0) {
          clearInterval(this.timerInterval);
          this.isFinished.set(true);
          return;
        }

        this.timeLeft.update(t => t - 1);

      }, 1000);

    }

    formattedTime = computed(() => {

      const t = this.timeLeft();
      const minutes = Math.floor(t / 60);
      const seconds = t % 60;
      return `${minutes}:${seconds.toString().padStart(2,'0')}`;

    });
  }

