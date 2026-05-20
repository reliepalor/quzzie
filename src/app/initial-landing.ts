import { NgFor, NgIf } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-initial-landing',
  imports: [RouterLink, NgIf, NgFor],
  templateUrl: './initial-landing.html',
  styleUrl: './app.css'
})
export class InitialLanding {
  private router = inject(Router);
  protected showLanding = false;
  protected isExitingGate = false;
  protected factCardVersion = 0;
  protected activeFactIndex = 0;

  protected readonly triviaFacts: string[] = [
    'Quizzie turns your topic into quick quizzes.',
    'Each run can feel a little different.',
    'It is smart to verify key facts too.'
  ];

  protected get activeFact(): string {
    return this.triviaFacts[this.activeFactIndex];
  }

  protected get isLastFact(): boolean {
    return this.activeFactIndex === this.triviaFacts.length - 1;
  }

  protected advanceFact(): void {
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
    if (!this.isLastFact || this.isExitingGate) {
      return;
    }

    this.isExitingGate = true;

    window.setTimeout(() => {
      void this.router.navigateByUrl('/quizzie');
      this.isExitingGate = false;
    }, 280);
  }
}