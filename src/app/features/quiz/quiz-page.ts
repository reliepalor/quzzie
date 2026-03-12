  import { Component, signal, computed, inject, OnInit, ElementRef, ViewChild, ViewChildren, QueryList, AfterViewInit} from '@angular/core';
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

  export class QuizPage implements OnInit, AfterViewInit{
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
    questionMediaType = signal<'image' | 'video' | null>(null);
    nextMediaType = signal<'image' | 'video' | null>(null);
    imageLoading = signal(true);
    imageError = signal<boolean | null>(false)
    emojiIcon = signal<string | null>(null);
    @ViewChild('questionVideo') questionVideo?: ElementRef<HTMLVideoElement>;
    @ViewChildren('anyVideo') allVideos?: QueryList<ElementRef<HTMLVideoElement>>;
    fallbackVideoUrl = '/videos/general-fallback.mp4';
    private mediaPlan: Array<'image' | 'fallback' | 'icon'> = [];

    score = signal(0);
    isFinished = signal(false);
    timer = signal<number | null>(null);
    timeLeft = signal<number>(0);
    timerInterval: any;

    currentQuestion = computed(() => this.questions()?.[this.currentIndex()]);

    private DISPLAY_TYPES: Array<'icon' | 'emoji' | 'sticker'> = ['icon', 'emoji', 'sticker'];

    private resolveMediaType(res: any): 'image' | 'video' {
      const url = String(res?.url || '').toLowerCase();
      if (url.endsWith('.mp4')) return 'video';
      return res?.type === 'video' ? 'video' : 'image';
    }

    private pickFallbackDisplay() {
      const random = this.DISPLAY_TYPES[Math.floor(Math.random() * this.DISPLAY_TYPES.length)];
      this.displayType.set(random);
    }

    progress = computed(() => {
      const total = this.questions()?.length || 1;
      return ((this.currentIndex() + 1) / total) * 100;
    });  

    isQuestionVideo = computed(() => {
      const url = this.questionImage()?.toLowerCase() || '';
      return this.questionMediaType() === 'video' || url.endsWith('.mp4');
    });

    ngOnInit(): void {
        if (!this.questions() || this.questions().length === 0 ){
          this.router.navigateByUrl('/');
          return;
        }
        this.buildMediaPlan();
        this.applyMediaForCurrentQuestion();
        this.prefetchNextImage();
        const timerSeconds = this.quizService.quizTimer();
        
        if(timerSeconds && timerSeconds > 0){
          this.timer.set(timerSeconds);
          this.timeLeft.set(timerSeconds)
          this.startTimer();
        }
    }

    ngAfterViewInit(): void {
      this.muteAllVideos();
      this.allVideos?.changes.subscribe(() => this.muteAllVideos());
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
        this.applyMediaForCurrentQuestion();
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
      this.questionMediaType.set(null);
      this.displayType.set('icon');

      this.quizService
        .getImage(q.imageQuery, q.subject)
        .subscribe({
          next: (res) => {
            this.imageLoading.set(false);
            if (res?.url) {
              const mediaType = this.resolveMediaType(res);
              const fallback = this.getSubjectFallbackVideo();
              this.questionImage.set(mediaType === 'video' ? fallback : res.url);
              this.questionMediaType.set(mediaType);
              this.emojiIcon.set(null);
              this.tryPlayQuestionVideo();
              return;
            }

            this.emojiIcon.set(q.iconKeyword);
            this.pickFallbackDisplay();
          },
          error: () => {
            this.imageLoading.set(false);
            this.questionImage.set(this.getSubjectFallbackVideo());
            this.questionMediaType.set('video');
            this.emojiIcon.set(null);
            this.tryPlayQuestionVideo();
          }
        });
    }

    private tryPlayQuestionVideo() {
      if (!this.isQuestionVideo()) return;
      setTimeout(() => {
        const el = this.questionVideo?.nativeElement;
        if (!el) return;
        el.muted = true;
        el.volume = 0;
        el.play().catch(() => {});
        this.muteAllVideos();
      }, 0);
    }

    onQuestionImageError() {
      const fallback = this.getSubjectFallbackVideo();
      this.questionImage.set(fallback);
      this.questionMediaType.set('video');
      this.imageLoading.set(false);
      this.tryPlayQuestionVideo();
    }

    onQuestionVideoError() {
      const fallback = this.getSubjectFallbackVideo();
      this.questionImage.set(fallback);
      this.questionMediaType.set('video');
      this.imageLoading.set(false);
      this.tryPlayQuestionVideo();
    }

    private muteAllVideos() {
      setTimeout(() => {
        const list = this.allVideos?.toArray() || [];
        for (const ref of list) {
          const el = ref.nativeElement;
          el.muted = true;
          el.volume = 0;
        }
      }, 0);
    }

    prefetchNextImage() {
      const nextIndex = this.currentIndex() + 1;
      const nextQuestion = this.questions()?.[nextIndex];
      const plan = this.mediaPlan[nextIndex];

      if(!nextQuestion?.imageQuery) return;
      if (plan !== 'image') {
        this.nextImage.set(null);
        this.nextMediaType.set(null);
        return;
      }

      this.quizService
        .getImage(nextQuestion.imageQuery, nextQuestion.subject)
        .subscribe({
          next: (res) => {
            if (res?.url) {
              const mediaType = this.resolveMediaType(res);
              const fallback = this.getSubjectFallbackVideo(nextQuestion.subject);
              this.nextImage.set(mediaType === 'video' ? fallback : res.url);
              this.nextMediaType.set(mediaType);
            }
          },
          error: () => {
            this.nextImage.set(null);
            this.nextMediaType.set(null);
          }
      })
    }

    iconDisplay = computed(() => {
      const key = this.emojiIcon();
      const subject = this.currentQuestion()?.subject;

      const subjectMap: Record<string, string> = {
        science: '🧪',
        mathematics: '➗',
        math: '➗',
        history: '📜',
        english: '📚',
        'computer science': '💻',
        philosophy: '🤔',
        news: '📰',
        general: '✨'
      };

      if (key) {
        const normalized = key.toLowerCase().trim();
        const primary = normalized.split(/\s+/)[0];
        return this.ICON_MAP[normalized] || this.ICON_MAP[primary] || subjectMap[normalized] || '❓';
      }

      if (subject) {
        const sub = String(subject).toLowerCase().trim();
        return subjectMap[sub] || '❓';
      }

      return '❓';
    })

    private buildMediaPlan() {
      const total = this.questions()?.length || 0;
      if (total <= 0) {
        this.mediaPlan = [];
        return;
      }

      const imageCount = Math.floor(total * 0.6);
      const fallbackCount = Math.max(0, total - imageCount);

      const plan: Array<'image' | 'fallback' | 'icon'> = [];
      for (let i = 0; i < imageCount; i++) plan.push('image');
      for (let i = 0; i < fallbackCount; i++) plan.push('fallback');

      // Shuffle to spread types across the quiz
      for (let i = plan.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [plan[i], plan[j]] = [plan[j], plan[i]];
      }

      this.mediaPlan = plan;
    }

    private applyMediaForCurrentQuestion() {
      const q = this.currentQuestion();
      if (!q) return;

      const plan = this.mediaPlan[this.currentIndex()] || 'image';

      if (plan === 'image') {
        this.loadImage();
        return;
      }

      this.imageLoading.set(false);
      this.questionImage.set(null);
      this.questionMediaType.set(null);
      this.emojiIcon.set(null);

      if (plan === 'fallback') {
        const fallback = this.getSubjectFallbackVideo();
        this.questionImage.set(fallback);
        this.questionMediaType.set('video');
        this.tryPlayQuestionVideo();
        return;
      }

      // no icon fallback
    }

    private normalizeSubject(subject?: string) {
      return String(subject || '')
        .toLowerCase()
        .replace(/[^a-z\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    getSubjectFallbackVideo(subject?: string) {
      const fromQuestion = this.currentQuestion()?.subject;
      const fromQuiz = this.quizService.quizSubject();
      const normalized = this.normalizeSubject(subject ?? fromQuestion ?? fromQuiz ?? '');
      const map: Record<string, string> = {
        'computer science': '/videos/computer-fallback.mp4',
        science: '/videos/science-fallback.mp4',
        mathematics: '/videos/math-fallback.mp4',
        math: '/videos/math-fallback.mp4',
        history: '/videos/history-fallback.mp4',
        english: '/videos/english-fallback.mp4',
        philosophy: '/videos/philosophy-fallback.mp4',
        news: '/videos/news-fallback.mp4',
        general: '/videos/general-fallback.mp4'
      };

      return map[normalized] || this.fallbackVideoUrl;
    }
  }
