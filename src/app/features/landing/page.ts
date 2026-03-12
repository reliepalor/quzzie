import { Component, signal, inject, computed, ElementRef, ViewChild, HostListener} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router'; 
import { FormsModule, ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { AcademicLevel, LEVELS, QuizSettings, TestType} from '../../shared/models/quiz';
import { QuizService } from '../../shared/services/quiz.service';

@Component({
  standalone: true,
  selector: 'app-landing',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './page.html'
})



export class LandingPage {
  private quizService = inject(QuizService);
  private router = inject(Router);

  isLoading = signal(false);
  validationMessage = signal<string | null>(null);

  allLevels = LEVELS;
  subjects = ['General','News', 'Science', 'Mathematics', 'History', 'English', 'Computer Science', 'Philosophy'];
  testTypes: TestType[] = ['Multiple Choice', 'Enumeration', 'True/False'];
  questionCounts = [5, 10, 15, 20];

  //signals for fetching data
  selectedLevel = signal<AcademicLevel | null>(null);
  selectedSubLevel = signal<string | null>(null);
  fileName = signal<string | null>(null);

  showFailedGenerationModal = signal(false);
  showDifficultyModal = signal(false);


  difficultyMessage = signal<string | null>(null);
  pendingSettings = signal<QuizSettings | null>(null);

  @ViewChild('dropdownRef') dropdownRef!: ElementRef;
  
  dropdownOpen = signal(false);


  quizForm = new FormGroup({
    topic: new FormControl('', [Validators.required]),
    subject: new FormControl('General'),
    testType: new FormControl<TestType>('Multiple Choice'),
    questionCount: new FormControl(10),
    fileBase64: new FormControl<string | null>(null),
    timer: new FormControl<number | null>(null)
  });

  selectLevel(level: AcademicLevel) {
    this.selectedLevel.set(level);
    this.selectedSubLevel.set(null); 
  }

  setSubLevel(sub: string) {
    this.selectedSubLevel.set(sub);
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
      

      // Set loading to true immediately
      this.isLoading.set(true);
      console.log('Generating quiz...');

      const settings = {
        ...this.quizForm.value,
        topic,
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
    if (!this.dropdownRef?.nativeElement.contains(event.target)) {
      this.dropdownOpen.set(false);
    }
  }
}
