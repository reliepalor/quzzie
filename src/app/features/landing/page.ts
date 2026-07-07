  import { Component, signal, inject, computed, ElementRef, ViewChild, HostListener} from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { Router } from '@angular/router'; 
  import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
  import { AcademicLevel, LEVELS, QuizSettings, TestMode, TestType } from '../../shared/models/quiz';
  import { FirebaseAuthService } from '../../shared/services/firebase-auth.service';
  import { GuestTrialService } from '../../shared/services/guest-trial.service';
  import { QuizService } from '../../shared/services/quiz.service';
  import { LEVEL_YEAR_CONTENT } from '../../shared/models/quiz';

  @Component({
    standalone: true,
    selector: 'app-landing',
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './page.html',
    styleUrl: './page.css'

  })



  export class LandingPage {
    private quizService = inject(QuizService);
    private router = inject(Router);
    private auth = inject(FirebaseAuthService);
    private guestTrial = inject(GuestTrialService);

    isLoading = signal(false);
    validationMessage = signal<string | null>(null);

    allLevels = LEVELS;
    testTypes: TestType[] = ['Multiple Choice', 'Enumeration', 'True/False'];
    testModes: Array<{ id: TestMode; label: string; icon: string; shortLabel: string }> = [
      { id: 'learning', label: 'Learning Mode', icon: '🧠', shortLabel: 'Practice' },
      { id: 'exam', label: 'Exam Mode', icon: '⏱️', shortLabel: 'Simulation' }
    ];
    questionCounts = [5, 10, 15, 20];

    //signals for fetching data
    selectedTestMode = signal<TestMode>('learning');
    selectedLevel = signal<AcademicLevel | null>(null);
    selectedSubLevel = signal<string | null>(null);
    fileName = signal<string | null>(null);

    showFailedGenerationModal = signal(false);
    showDifficultyModal = signal(false);
    showGuestLimitModal = signal(false);
    guestTrialStatus = computed(() => this.guestTrial.getStatusLabel());
    guestTrialRemaining = computed(() => this.guestTrial.getRemainingLabel());


    difficultyMessage = signal<string | null>(null);
    pendingSettings = signal<QuizSettings | null>(null);

    private readonly recentTopicsKey = 'quizzie_recent_topics';
    recentTopics = signal<string[]>(this.loadRecentTopics());

    private loadRecentTopics(): string[] {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        return [];
      }

      try {
        const raw = localStorage.getItem(this.recentTopicsKey);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }

    private rememberTopic(topic: string): void {
      const trimmed = topic.trim();
      if (!trimmed) return;

      const withoutDuplicate = this.recentTopics().filter(
        existing => existing.toLowerCase() !== trimmed.toLowerCase()
      );
      const updated = [trimmed, ...withoutDuplicate].slice(0, 6);

      this.recentTopics.set(updated);

      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(this.recentTopicsKey, JSON.stringify(updated));
        } catch {
          // storage unavailable — recent topics just won't persist across sessions
        }
      }
    }

    selectRecentTopic(topic: string): void {
      this.quizForm.patchValue({ topic });
      this.topicSearch.set(topic);
    }
    protected readonly signedInUser = computed(() => this.auth.user());
    protected readonly profileLabel = computed(() => {
      const user = this.signedInUser();
      return user?.displayName || user?.email?.split('@')[0] || 'Profile';
    });
    protected readonly avatarUrl = computed(() => this.signedInUser()?.photoURL ?? null);

    @ViewChild('dropdownRef') dropdownRef!: ElementRef;
    @ViewChild('subjectDropdownRef') subjectDropdownRef!: ElementRef;
    @ViewChild('topicDropdownRef') topicDropdownRef!: ElementRef;
    @ViewChild('accountMenuRef') accountMenuRef!: ElementRef;
    
    dropdownOpen = signal(false);
    accountMenuOpen = signal(false);
    subjectDropdownOpen = signal(false);
    topicDropdownOpen = signal(false);
    subjectSearch = signal('');
    topicSearch = signal('');


    quizForm = new FormGroup({
      topic: new FormControl('', [Validators.required]),
      subject: new FormControl('', [Validators.required]),
      testType: new FormControl<TestType>('Multiple Choice'),
      questionCount: new FormControl(10),
      fileBase64: new FormControl<string | null>(null),
      timer: new FormControl<number | null>(null)
    });

    availableContent = computed(() => {
      const level = this.selectedLevel();
      const subLevel = this.selectedSubLevel();
      if (!level || !subLevel) return { subjects: [], suggestedTopics: [] };

      const levelMap = LEVEL_YEAR_CONTENT[level.id] || {};
      return levelMap[subLevel] || { subjects: [], suggestedTopics: [] };
    });

    subjects = computed(() => this.availableContent().subjects);
    suggestedTopics = computed(() => this.availableContent().suggestedTopics);
    filteredSubjects = computed(() => {
      const query = this.subjectSearch().trim().toLowerCase();
      if (!query) return this.subjects();
      return this.subjects().filter(subject => subject.toLowerCase().includes(query));
    });
    filteredSuggestedTopics = computed(() => {
      const query = this.topicSearch().trim().toLowerCase();
      if (!query) return this.suggestedTopics();
      return this.suggestedTopics().filter(topic => topic.toLowerCase().includes(query));
    });

    testModeExplanation = computed(() => {
      return this.selectedTestMode() === 'learning'
        ? 'Learning Mode: In this mode, you will receive immediate feedback after each answer. The system will show if your answer is correct or incorrect right away, along with a clear explanation. This mode is designed to help you learn and understand each concept step by step.'
        : 'Exam Mode: In this mode, no feedback or correct answers will be shown during the test. You will complete all questions first, and your score and explanations will only appear after submitting the test. This mode simulates a real exam environment.';
    });

    selectTestMode(mode: TestMode) {
      this.selectedTestMode.set(mode);
    }

    toggleAccountMenu() {
      this.accountMenuOpen.update(v => !v);
    }

    closeAccountMenu() {
      this.accountMenuOpen.set(false);
    }

    goToProfile() {
      this.closeAccountMenu();

      if (this.signedInUser()) {
        void this.router.navigateByUrl('/account');
        return;
      }

      void this.router.navigate(['/'], { queryParams: { auth: 'sign-in' } });
    }

    async signOut(): Promise<void> {
      this.closeAccountMenu();

      try {
        await this.auth.signOut();
        void this.router.navigateByUrl('/');
      } catch {
        // ignore sign-out errors for the dropdown flow
      }
    }

    openAuthEntry() {
      this.closeAccountMenu();
      void this.router.navigate(['/'], { queryParams: { auth: 'sign-in' } });
    }

    
    selectLevel(level: AcademicLevel) {
      this.selectedLevel.set(level);
      this.selectedSubLevel.set(null); 
      this.subjectDropdownOpen.set(false);
      this.topicDropdownOpen.set(false);
      this.subjectSearch.set('');
      this.topicSearch.set('');

      this.quizForm.patchValue({
        subject: '',
        topic: ''
      });
    }

    setSubLevel(sub: string) {
      this.selectedSubLevel.set(sub);

      const level = this.selectedLevel();
      if (!level) return;

      const alignedContent = LEVEL_YEAR_CONTENT[level.id]?.[sub];

      this.quizForm.patchValue({
        subject: alignedContent?.subjects[0] ?? '',
        topic: ''
      });

      this.subjectSearch.set('');
      this.topicSearch.set('');
    }

    toggleSubjectDropdown() {
      this.subjectDropdownOpen.update(v => !v);
      this.topicDropdownOpen.set(false);
    }

    toggleTopicDropdown() {
      this.topicDropdownOpen.update(v => !v);
      this.subjectDropdownOpen.set(false);
    }

    onSubjectSearchInput(event: Event) {
      const value = (event.target as HTMLInputElement).value;
      this.subjectSearch.set(value);
    }

    onTopicSearchInput(event: Event) {
      const value = (event.target as HTMLInputElement).value;
      this.topicSearch.set(value);
    }

    selectSubject(subject: string) {
      this.quizForm.patchValue({ subject });
      this.subjectSearch.set(subject);
      this.subjectDropdownOpen.set(false);
    }

    selectTopic(topic: string) {
      this.quizForm.patchValue({ topic });
      this.topicSearch.set(topic);
      this.topicDropdownOpen.set(false);
    }

    useTypedSubject() {
      const typed = this.subjectSearch().trim();
      if (!typed) return;
      this.quizForm.patchValue({ subject: typed });
      this.subjectDropdownOpen.set(false);
    }

    useTypedTopic() {
      const typed = this.topicSearch().trim();
      if (!typed) return;
      this.quizForm.patchValue({ topic: typed });
      this.topicDropdownOpen.set(false);
    }

    clearSubject(event: MouseEvent) {
      event.stopPropagation();
      this.quizForm.patchValue({ subject: '' });
      this.subjectSearch.set('');
    }

    clearTopic(event: MouseEvent) {
      event.stopPropagation();
      this.quizForm.patchValue({ topic: '' });
      this.topicSearch.set('');
    }

    isTopicTooAdvanced(topic: string, level: string): boolean{

      const advancedKeywords = [
        'sex',
        'nudes',
        'quantum',
        'neural',
        'algorithm',
        'philosophy',
        'calculus',
        'machine learning',
        'blockchain',
        'data structures',
        'computer architecture',
        'cybersecurity'
      ];

      const isElementary = level.toLowerCase().includes('elementary');

      if(!isElementary) return false;

      const topicLower = topic.toLowerCase();

      return advancedKeywords.some(keyword => topicLower.includes(keyword))
    }

    async onFileSelected(event: Event) {
      const input = event.target as HTMLInputElement;
      if (input.files && input.files.length > 0) {
        const file = input.files[0];
        this.fileName.set(file.name);

        const reader = new FileReader();
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          this.quizForm.patchValue({ fileBase64: base64String })
        };
        reader.readAsDataURL(file);
      }
    }

    async generateQuiz(topicInputValue?: string) {
        if (this.isLoading()) return;

        this.validationMessage.set(null);

        if (!this.selectedLevel() || !this.selectedSubLevel()) {
          this.validationMessage.set('Please select your level and grade/year.');
          return;
        }

        const topic = (topicInputValue ?? this.quizForm.controls.topic.value ?? '').trim();
        
        if (!topic) {
          this.quizForm.controls.topic.markAsTouched();
          this.validationMessage.set('Please enter a topic before generating a quiz.');
          return;
        }

        if (!this.auth.user() && !this.guestTrial.canUseAnotherGeneration()) {
          this.showGuestLimitModal.set(true);
          return;
        }
        

        // Set loading to true immediately
        this.isLoading.set(true);
        console.log('Generating quiz...');

        const settings = {
          ...this.quizForm.value,
          topic,
          testMode: this.selectedTestMode(),
          level: this.selectedLevel()?.name,
          subLevel: this.selectedSubLevel()
        } as QuizSettings;

        this.quizService.quizTimer.set(settings.timer ?? null);

        // difficulty check
        if(this.isTopicTooAdvanced(topic, settings.level!)) {
          this.pendingSettings.set(settings);
          this.showDifficultyModal.set(true);
          return;
        }

        this.quizService.checkTopicDifficulty(topic, settings.level!, settings.subLevel!).subscribe({
          
          next: (analysis) => {
            if( analysis.tooAdvanced || analysis.sensitive){
              this.pendingSettings.set(settings);

              this.difficultyMessage.set(
                analysis.reason || 
                  "This topic may be too advanced or sensitive for the selected grade."
              );

              this.showDifficultyModal.set(true);
              this.isLoading.set(false);
              return;
            } 

            console.log("Generating quiz...");
            this.executeQuizGeneration(settings);

          },
          error: (err) => {
            console.error("Topic check failed", err);

            this.validationMessage.set('Failed to generate quiz. Please try again.');
            this.showFailedGenerationModal.set(true);
            this.isLoading.set(false);
          }
        });
    }

    executeQuizGeneration(settings: QuizSettings){
      this.isLoading.set(true);

      this.quizService.generateQuiz(settings).subscribe({

        next: (result) => {
          if (!this.auth.user()) {
            this.guestTrial.consumeOneGeneration();
          }

          this.rememberTopic(settings.topic);
          this.quizService.currentQuiz.set(result.quiz);
          this.router.navigate(['/play']);
        },

        error: (err) => {
          console.error(err);
          this.validationMessage.set('Failed to generate quiz. Please try again.');
          this.showFailedGenerationModal.set(true);
          this.isLoading.set(false);
        }
      });
    }

    confirmProceed() {
      const settings = this.pendingSettings();

      if(!settings) return;

      this.showDifficultyModal.set(false);
      this.executeQuizGeneration(settings);

    }

    cancelProceed() {
      this.showDifficultyModal.set(false);
      this.pendingSettings.set(null);
    }

    //-- TOPIC WARNING MODAL BUTTONS
    confirmDifficulty() {
      const settings = this.pendingSettings();

      if (!settings) return;

      this.showDifficultyModal.set(false);
      this.executeQuizGeneration(settings);
    }

    cancelDifficulty() {
      this.showDifficultyModal.set(false);
      this.pendingSettings.set(null);
      this.isLoading.set(false);
    }

    //-FAILED GENERATION MODAL
    confirmFailedGeneration() {
      this.showFailedGenerationModal.set(false);
      this.validationMessage.set(null);
      this.isLoading.set(false);
    }

    closeGuestLimitModal() {
      this.showGuestLimitModal.set(false);
    }

    openLoginRegisterModal() {
      this.showGuestLimitModal.set(false);
      void this.router.navigate(['/'], { queryParams: { auth: 'sign-in' } });
    }

    //-- TIMER 
    timerPresets = [
      { label: '5 min',  seconds: 300  },
      { label: '10 min', seconds: 600  },
      { label: '15 min', seconds: 900  },
      { label: '30 min', seconds: 1800 },
    ];

    isCustomTimerActive() {
      const t =this.quizForm.value.timer;
      return t !== null && !this.timerPresets.some(p => p.seconds === t);
    }

    formatTimer(seconds: number): string {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${String(m).padStart(2, '0')}: ${String(s).padStart(2, '0')}`;
    }

      setCustomTimer(min: number, sec: number ) {
      const totalSeconds = (min * 60 ) + sec;
      this.quizForm.patchValue({
        timer: totalSeconds
      })
    }

    //DROPDOWN BUTTON TIMER
    toggleDropdown() {
      this.dropdownOpen.update(v => !v);
    }

    selectPreset(seconds: number) {
      this.quizForm.patchValue({ timer: seconds });
      this.dropdownOpen.set(false);
    }

    isPresetActive = computed(() =>
      this.timerPresets.some(p => p.seconds === this.quizForm.value.timer)
    );

    activePresetLabel = computed(() => {
      const match = this.timerPresets.find(p => p.seconds === this.quizForm.value.timer);
      return match ? match.label : 'Presets';
    });

    @HostListener('document:click', ['$event'])
    onOutsideClick(event: MouseEvent) {
      const target = event.target as Node;

      if (this.accountMenuRef && !this.accountMenuRef.nativeElement.contains(target)) {
        this.accountMenuOpen.set(false);
      }

      if (this.dropdownRef && !this.dropdownRef.nativeElement.contains(target)) {
        this.dropdownOpen.set(false);
      }

      if (this.subjectDropdownRef && !this.subjectDropdownRef.nativeElement.contains(target)) {
        this.subjectDropdownOpen.set(false);
      }

      if (this.topicDropdownRef && !this.topicDropdownRef.nativeElement.contains(target)) {
        this.topicDropdownOpen.set(false);
      }
    }

    @HostListener('document:keydown.escape')
    onEscapeKey() {
      this.closeAccountMenu();
    }
  }
