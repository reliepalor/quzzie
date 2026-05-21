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
    this.playCuteSound();

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
    this.openLandingWithGateCheck(false);
  }

  protected skipToStart(): void {
    this.openLandingWithGateCheck(true);
  }

  private openLandingWithGateCheck(force: boolean): void {
    if ((!force && !this.isLastFact) || this.isExitingGate) {
      return;
    }

    this.isExitingGate = true;

    window.setTimeout(() => {
      void this.router.navigateByUrl('/quizzie');
      this.isExitingGate = false;
    }, 280);
  }

  private playCuteSound(): void {
    const AudioContextClass = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(920, audioContext.currentTime + 0.09);

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.08, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.16);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.18);

    oscillator.onended = () => {
      gainNode.disconnect();
      audioContext.close().catch(() => undefined);
    };
  }
}