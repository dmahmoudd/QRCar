import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { QrCameraService } from '../../core/qr/qr-camera.service';
import { parseTala3nyQrPayload } from '../../core/qr/tala3ny-qr-payload';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-scan-page',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-content class="!p-6">
        <div class="mb-5 text-center">
          <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50">
            <mat-icon class="text-brand-600">qr_code_scanner</mat-icon>
          </div>
          <h1 class="text-lg font-semibold text-slate-900">Scan a Tala3ny QR</h1>
          <p class="mt-2 text-sm text-slate-500">
            Tala3ny checks every code with its server. Other QR codes are ignored.
          </p>
          <p class="mt-2 text-xs text-slate-400">
            A recognised code does not prove the sticker is still on the original car.
          </p>
        </div>

        @if (errorMessage()) {
          <div class="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-900">
            {{ errorMessage() }}
          </div>
        }

        @if (verifying()) {
          <div class="mb-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <mat-spinner diameter="20" />
            Checking this code with Tala3ny…
          </div>
        }

        @if (scanning()) {
          <div class="overflow-hidden rounded-2xl bg-slate-900">
            <video
              #preview
              class="aspect-square w-full object-cover"
              autoplay
              muted
              playsinline
            ></video>
          </div>
          @if (starting()) {
            <div class="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
              <mat-spinner diameter="20" />
              Starting camera…
            </div>
          }
          <button
            mat-stroked-button
            class="!mt-4 !h-11 w-full"
            type="button"
            (click)="stopScanning()"
          >
            <mat-icon>close</mat-icon>
            Stop
          </button>
        } @else {
          <button
            mat-flat-button
            color="primary"
            class="!h-12 w-full"
            type="button"
            (click)="startScanning()"
          >
            <mat-icon>photo_camera</mat-icon>
            Start scanning
          </button>
          <p class="mt-3 text-center text-xs text-slate-400">
            The camera is used only while you scan. Nothing is uploaded.
          </p>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ScanPage {
  private readonly camera = inject(QrCameraService);
  private readonly router = inject(Router);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');

  protected readonly scanning = signal(false);
  protected readonly starting = signal(false);
  protected readonly verifying = signal(false);
  protected readonly errorMessage = signal('');

  private processedToken: string | null = null;
  private navigating = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      void this.camera.stop();
    });
  }

  async startScanning(): Promise<void> {
    this.errorMessage.set('');
    this.verifying.set(false);
    this.processedToken = null;
    this.navigating = false;

    if (!this.camera.isSupported()) {
      this.errorMessage.set(
        'This browser cannot use the camera. Open Tala3ny in Chrome or Safari on your phone.',
      );
      return;
    }

    this.scanning.set(true);
    this.starting.set(true);
    this.changeDetector.detectChanges();

    const video = this.preview()?.nativeElement;
    if (!video) {
      this.scanning.set(false);
      this.starting.set(false);
      this.errorMessage.set('Could not start the camera.');
      return;
    }

    try {
      await this.camera.start(video, (text) => {
        void this.onDecoded(text);
      });
      this.starting.set(false);
    } catch (error: unknown) {
      this.scanning.set(false);
      this.starting.set(false);
      this.errorMessage.set(cameraErrorMessage(error));
      await this.camera.stop();
    }
  }

  async stopScanning(): Promise<void> {
    this.scanning.set(false);
    this.starting.set(false);
    await this.camera.stop();
  }

  /** Called by the camera callback and by tests. Never opens the QR string as a URL. */
  async onDecoded(raw: string): Promise<void> {
    const parsed = parseTala3nyQrPayload(raw, environment.scanAllowedOrigins);

    if (!parsed.ok) {
      this.errorMessage.set('This is not a valid Tala3ny QR code.');
      return;
    }

    if (this.navigating || this.processedToken === parsed.token) {
      return;
    }

    this.navigating = true;
    this.processedToken = parsed.token;
    this.errorMessage.set('');
    this.verifying.set(true);

    await this.stopScanning();
    await this.router.navigate(['/c', parsed.token]);
    this.verifying.set(false);
  }
}

function cameraErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : '';

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was denied. Allow the camera to scan a Tala3ny QR code.';
  }

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'No camera was found on this device.';
  }

  if (name === 'NotReadableError') {
    return 'The camera is already in use by another app.';
  }

  if (name === 'SecurityError') {
    return 'Camera access needs a secure connection (HTTPS).';
  }

  if (name === 'NotSupportedError') {
    return 'This browser cannot use the camera. Open Tala3ny in Chrome or Safari on your phone.';
  }

  return 'Could not start the camera.';
}
