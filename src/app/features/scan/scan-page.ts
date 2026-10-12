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
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OfficialScan } from '../../core/models/public-scan.models';
import { QrCameraService } from '../../core/qr/qr-camera.service';
import { parseTala3nyQrPayload } from '../../core/qr/tala3ny-qr-payload';
import { LanguageSwitcher } from '../../shared/ui/language-switcher';
import { ScanResult } from './scan-result';

@Component({
  selector: 'app-scan-page',
  imports: [MatIconModule, MatProgressSpinnerModule, ScanResult, TranslatePipe, LanguageSwitcher],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-page.html',
  styles: `
    .scan-laser {
      background: linear-gradient(90deg, transparent, #f59e0b, transparent);
      box-shadow: 0 0 16px #f59e0b;
      animation: scan-laser 2.5s ease-in-out infinite;
    }

    @keyframes scan-laser {
      0%,
      100% {
        top: 12%;
      }
      50% {
        top: 82%;
      }
    }
  `,
})
export class ScanPage {
  private readonly camera = inject(QrCameraService);
  private readonly publicApi = inject(PublicScanApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly zone = inject(NgZone);
  private readonly i18n = inject(I18nService);

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
  protected readonly torchOn = signal(false);
  protected readonly torchAvailable = signal(false);

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
        this.paused()
      ),
  );

  async startScanning(): Promise<void> {
    this.resetResult();
    this.errorMessage.set('');
    this.verifying.set(false);
    this.processedToken = null;
    this.verifyingToken = false;

    if (!this.camera.isSupported()) {
      this.errorMessage.set(this.i18n.t('scan.noCamera'));
      return;
    }

    this.scanning.set(true);
    this.starting.set(true);
    this.torchOn.set(false);
    this.torchAvailable.set(false);
    this.changeDetector.detectChanges();

    const video = this.preview()?.nativeElement;
    if (!video) {
      this.scanning.set(false);
      this.starting.set(false);
      this.errorMessage.set(this.i18n.t('scan.cameraFailed'));
      return;
    }

    try {
      await this.camera.start(video, (text) => {
        this.zone.run(() => {
          void this.onDecoded(text);
        });
      });
      this.starting.set(false);
      this.torchAvailable.set(this.camera.canTorch());
    } catch (error: unknown) {
      this.scanning.set(false);
      this.starting.set(false);
      this.errorMessage.set(this.cameraErrorMessage(error));
      await this.camera.stop();
    }
  }

  async stopScanning(): Promise<void> {
    this.scanning.set(false);
    this.starting.set(false);
    this.torchOn.set(false);
    this.torchAvailable.set(false);
    await this.camera.stop();
  }

  async toggleTorch(): Promise<void> {
    const next = !this.torchOn();
    const applied = await this.camera.setTorch(next);
    this.torchOn.set(applied && next);
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
      this.errorMessage.set(this.i18n.t('scan.unrecognized'));
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
        this.errorMessage.set(this.i18n.t('scan.notInSystem'));
      } else if (error instanceof HttpErrorResponse && error.status === 409) {
        this.paused.set(true);
      } else {
        this.errorMessage.set(this.i18n.httpError(error, 'scan.verifyFailed'));
      }
    } finally {
      this.verifying.set(false);
      this.verifyingToken = false;
      this.changeDetector.markForCheck();
    }
  }

  private cameraErrorMessage(error: unknown): string {
    const name = error instanceof DOMException ? error.name : '';

    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return this.i18n.t('scan.permissionDenied');
    }

    if (name === 'NotFoundError' || name === 'OverconstrainedError') {
      return this.i18n.t('scan.noDevice');
    }

    if (name === 'NotReadableError') {
      return this.i18n.t('scan.inUse');
    }

    if (name === 'SecurityError') {
      return this.i18n.t('scan.needHttps');
    }

    if (name === 'NotSupportedError') {
      return this.i18n.t('scan.noCamera');
    }

    return this.i18n.t('scan.cameraFailed');
  }
}
