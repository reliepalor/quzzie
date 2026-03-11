  import { Component, signal, computed, inject, OnInit} from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router } from '@angular/router';
  import { FormsModule } from '@angular/forms';
  import { QuizService } from '../../shared/services/quiz.service';
  import { ConfettiComponent } from '../components/confetti';
  import { ICON_MAP } from '../../shared/utils/icon-map';

  @Component({
      standalone: true,
      selector: 'app-quiz-page',
      imports: [CommonModule, FormsModule, ConfettiComponent],
      templateUrl: './quiz-page.html'
  })

  export class QuizPage implements OnInit{
    private router = inject(Router);
    private quizService = inject(QuizService);


    ICON_MAP = ICON_MAP;

    displayType = signal<'image' | 'icon' | 'emoji' | 'sticker'>('icon');

    questions = this.quizService.currentQuiz;

    showConfetti = signal(false);
    currentIndex = signal(0);
    selectedAnswer = signal<string | null>(null);
    userInput = signal('');

    questionImage = signal<string | null>(null);
    nextImage = signal<string | null>(null);
    imageLoading = signal(true);
    imageError = signal<boolean | null>(false)
    emojiIcon = signal<string | null>(null);

    score = signal(0);
    isFinished = signal(false);
    timer = signal<number | null>(null);
    timeLeft = signal<number>(0);
    timerInterval: any;

    currentQuestion = computed(() => this.questions()?.[this.currentIndex()]);

    private DISPLAY_TYPES: Array<'icon' | 'emoji' | 'sticker'> = ['icon', 'emoji', 'sticker'];

    private pickFallbackDisplay() {
      const random = this.DISPLAY_TYPES[Math.floor(Math.random() * this.DISPLAY_TYPES.length)];
      this.displayType.set(random);
    }

    progress = computed(() => {
      const total = this.questions()?.length || 1;
      return ((this.currentIndex() + 1) / total) * 100;
    });  

    ngOnInit(): void {
        if (!this.questions() || this.questions().length === 0 ){
          this.router.navigateByUrl('/');
          return;
        }
        
        this.loadImage();
        this.prefetchNextImage();
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
        
        if(this.nextImage()) {
          this.questionImage.set(this.nextImage());
          this.imageLoading.set(false);
        }else {
          this.loadImage();
        }

        this.prefetchNextImage();

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

    loadImage() {
      const q = this.currentQuestion();
      if (!q) return;

      this.imageLoading.set(true);
      this.questionImage.set(null);
      this.displayType.set('icon');

      this.quizService
        .getImage(q.imageQuery, q.subject)
        .subscribe({
          next: (res) => {
            this.imageLoading.set(false);
            if (res?.url) {
              this.questionImage.set(res.url);
              this.emojiIcon.set(null);
              return;
            }

            this.emojiIcon.set(q.iconKeyword);
            this.pickFallbackDisplay();
          },
          error: () => {
            this.imageLoading.set(false);
            this.emojiIcon.set(q.iconKeyword);
            this.pickFallbackDisplay();
          }
        });
    }

    prefetchNextImage() {
      const nextIndex = this.currentIndex() + 1;
      const nextQuestion = this.questions()?.[nextIndex];

      if(!nextQuestion?.imageQuery) return;

      this.quizService
        .getImage(nextQuestion.imageQuery, nextQuestion.subject)
        .subscribe({
          next: (res) => {
            if(res.type === "image")
            this.nextImage.set(res.url);
          },
          error: () => {
            this.nextImage.set(null);
          }
      })
    }

    iconDisplay = computed(() => {
      const key = this.emojiIcon();
      if (!key) return null;

      const normalized = key.toLowerCase().trim();
      const primary = normalized.split(/\s+/)[0];

      return this.ICON_MAP[normalized] || this.ICON_MAP[primary] || '❓';
    })
  }
