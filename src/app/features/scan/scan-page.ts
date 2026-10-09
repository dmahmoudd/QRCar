import { HttpErrorResponse } from '@angular/common/http';
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
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { OfficialScan } from '../../core/models/public-scan.models';
import { QrCameraService } from '../../core/qr/qr-camera.service';
import { parseTala3nyQrPayload } from '../../core/qr/tala3ny-qr-payload';
import { ScanResult } from './scan-result';

@Component({
  selector: 'app-scan-page',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, ScanResult],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasResult()) {
      <app-scan-result
        [scan]="scan()"
        [notFound]="notFound()"
        [retired]="retired()"
        [paused]="paused()"
        [errorMessage]="errorMessage()"
      />
      <button
        mat-stroked-button
        class="!mt-4 !h-11 w-full"
        type="button"
        (click)="resetResult()"
      >
        <mat-icon>qr_code_scanner</mat-icon>
        Scan another
      </button>
    } @else {
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
    }
  `,
})
export class ScanPage {
  private readonly camera = inject(QrCameraService);
  private readonly publicApi = inject(PublicScanApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);

  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');

  protected readonly scanning = signal(false);
  protected readonly starting = signal(false);
  protected readonly verifying = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly scan = signal<OfficialScan | null>(null);
  protected readonly notFound = signal(false);
  protected readonly retired = signal(false);
  protected readonly paused = signal(false);

  private processedToken: string | null = null;
  private verifyingToken = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      void this.camera.stop();
    });
  }

  protected hasResult(): boolean {
    return !!(this.scan() || this.notFound() || this.retired() || this.paused());
  }

  async startScanning(): Promise<void> {
    this.resetResult();
    this.errorMessage.set('');
    this.verifying.set(false);
    this.processedToken = null;
    this.verifyingToken = false;

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

  resetResult(): void {
    this.scan.set(null);
    this.notFound.set(false);
    this.retired.set(false);
    this.paused.set(false);
    this.errorMessage.set('');
    this.processedToken = null;
    this.verifyingToken = false;
  }

  /** Called by the camera callback and by tests. Never opens the QR string as a URL. */
  async onDecoded(raw: string): Promise<void> {
    const parsed = parseTala3nyQrPayload(raw, environment.scanAllowedOrigins);

    if (!parsed.ok) {
      this.errorMessage.set('This is not a valid Tala3ny QR code.');
      return;
    }

    if (this.verifyingToken || this.processedToken === parsed.token) {
      return;
    }

    this.verifyingToken = true;
    this.processedToken = parsed.token;
    this.errorMessage.set('');
    this.verifying.set(true);

    const verification = firstValueFrom(this.publicApi.createOfficialScan(parsed.token));
    await this.stopScanning();

    try {
      const scan = await verification;
      this.scan.set(scan);
      this.paused.set(!scan.acceptsRequests);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 410) {
        this.retired.set(true);
      } else if (error instanceof HttpErrorResponse && error.status === 404) {
        this.notFound.set(true);
      } else if (error instanceof HttpErrorResponse && error.status === 409) {
        this.paused.set(true);
      } else {
        this.errorMessage.set(
          extractErrorMessage(error, 'Could not verify this code. Check your connection and try again.'),
        );
      }
    } finally {
      this.verifying.set(false);
      this.verifyingToken = false;
    }
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
