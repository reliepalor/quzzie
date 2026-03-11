import { Component, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import confetti from 'canvas-confetti';

@Component({
  standalone: true,
  selector: 'app-confetti',
  template: `
    <canvas #confettiCanvas class="fixed inset-0 w-full h-full pointer-events-none z-50"></canvas>
  `,
})
export class ConfettiComponent implements AfterViewInit, OnDestroy {
  @ViewChild('confettiCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private confettiFn!: confetti.CreateTypes;
  private timeouts: ReturnType<typeof setTimeout>[] = [];

  ngAfterViewInit() {
    this.confettiFn = confetti.create(this.canvasRef.nativeElement, {
      resize: true,
      useWorker: true,
    });

    this.launch();
  }

  private launch() {
    // Big burst from left and right sides simultaneously
    this.fire(0.25, { spread: 55, origin: { x: 0.1, y: 0.6 } });
    this.fire(0.25, { spread: 55, origin: { x: 0.9, y: 0.6 } });

    // Center burst slightly after
    const t1 = setTimeout(() => {
      this.fire(0.4, { spread: 120, origin: { x: 0.5, y: 0.4 } });
    }, 250);

    // Second wave from sides
    const t2 = setTimeout(() => {
      this.fire(0.2, { spread: 60, origin: { x: 0.2, y: 0.5 } });
      this.fire(0.2, { spread: 60, origin: { x: 0.8, y: 0.5 } });
    }, 500);

    // Slow drifting snow/particles for remaining time
    const t3 = setTimeout(() => this.drift(), 700);

    this.timeouts.push(t1, t2, t3);
  }

  private fire(ratio: number, opts: confetti.Options) {
    this.confettiFn({
      particleCount: Math.floor(180 * ratio),
      startVelocity: 38,
      spread: opts.spread ?? 60,
      origin: opts.origin ?? { x: 0.5, y: 0.5 },
      colors: [
        '#4f46e5', '#818cf8', '#c7d2fe',  // indigo family
        '#fbbf24', '#fde68a',              // gold
        '#f472b6', '#fbcfe8',              // pink
        '#34d399', '#a7f3d0',              // emerald
        '#ffffff',                          // white
      ],
      ticks: 320,
      gravity: 1,
      scalar: 1,
      shapes: ['circle', 'square'],
    });
  }

  private drift() {
    let elapsed = 0;
    const totalDuration = 2400;

    const frame = () => {
      if (elapsed >= totalDuration) return;

      // Slow drifting particles from top — like snow + confetti mix
      this.confettiFn({
        particleCount: 4,
        angle: 90,
        spread: 160,
        origin: { x: Math.random(), y: -0.05 },
        colors: ['#e0e7ff', '#ffffff', '#fde68a', '#fbcfe8', '#a7f3d0', '#c7d2fe'],
        startVelocity: 10,
        gravity: 0.35,
        ticks: 280,
        scalar: 0.8,
        drift: Math.random() * 1.2 - 0.6,  // gentle left/right sway
        shapes: ['circle', 'square'],
      });

      elapsed += 28;
      const t = setTimeout(frame, 28);
      this.timeouts.push(t);
    };

    frame();
  }

  ngOnDestroy() {
    this.timeouts.forEach(clearTimeout);
    this.confettiFn?.reset();
  }
}