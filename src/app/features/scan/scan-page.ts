import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  NgZone,
  computed,
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
  templateUrl: './scan-page.html',
})
export class ScanPage {
  private readonly camera = inject(QrCameraService);
  private readonly publicApi = inject(PublicScanApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);

  private readonly preview = viewChild<ElementRef<HTMLVideoElement>>('preview');

  protected readonly scanning = signal(false);
  protected readonly starting = signal(false);
  protected readonly verifying = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly scan = signal<OfficialScan | null>(null);
  protected readonly unrecognized = signal(false);
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

  protected readonly hasResult = computed(
    () =>
      !!(
        this.scan() ||
        this.unrecognized() ||
        this.notFound() ||
        this.retired() ||
        this.paused() ||
        this.errorMessage()
      ),
  );

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
        this.zone.run(() => {
          void this.onDecoded(text);
        });
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
    this.unrecognized.set(false);
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
      const rejectedKey = `rejected:${raw.trim()}`;
      if (this.processedToken === rejectedKey) {
        return;
      }

      this.processedToken = rejectedKey;
      this.unrecognized.set(true);
      this.errorMessage.set(
        'This QR code is not a Tala3ny sticker, so Tala3ny cannot look it up or contact a car owner.',
      );
      this.scanning.set(false);
      this.starting.set(false);
      this.changeDetector.detectChanges();
      await this.camera.stop();
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
        this.errorMessage.set('This code is not in the Tala3ny system.');
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
      this.changeDetector.markForCheck();
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
