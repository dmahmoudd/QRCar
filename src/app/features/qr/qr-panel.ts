import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CarsApiService } from '../../core/api/cars-api.service';
import { QrCode, QrImageFormat } from '../../core/models/car.models';
import { extractErrorMessage } from '../../core/http/problem-details';
import { NotificationService } from '../../core/services/notification.service';
import { ConfirmDialog, ConfirmDialogData } from '../../shared/ui/confirm-dialog';

@Component({
  selector: 'app-qr-panel',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card>
      <mat-card-header class="!px-6 !pt-6">
        <mat-card-title class="text-lg font-semibold">QR code</mat-card-title>
        <mat-card-subtitle>Print this and stick it on your windscreen.</mat-card-subtitle>
      </mat-card-header>

      <mat-card-content class="!px-6 !pb-6">
        @if (loading()) {
          <div class="grid h-64 place-items-center">
            <mat-spinner diameter="40" />
          </div>
        } @else if (errorMessage()) {
          <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
        } @else if (qr(); as code) {
          <div class="flex flex-col items-center gap-5">
            <div class="rounded-2xl border border-slate-200 bg-white p-4">
              @if (imageUrl()) {
                <img
                  [src]="imageUrl()"
                  alt="QR code for this car"
                  class="h-56 w-56"
                  width="224"
                  height="224"
                />
              }
            </div>

            <div class="w-full">
              <p class="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Scan destination
              </p>
              <div class="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                <code class="flex-1 truncate text-xs text-slate-600">{{ code.scanUrl }}</code>
                <button
                  mat-icon-button
                  matTooltip="Copy link"
                  aria-label="Copy scan link"
                  (click)="copyLink(code.scanUrl)"
                >
                  <mat-icon>content_copy</mat-icon>
                </button>
              </div>
              <p class="mt-2 text-xs text-slate-500">
                Sticker version {{ code.qrVersion }} · scanned {{ code.scanCount }}
                {{ code.scanCount === 1 ? 'time' : 'times' }}
              </p>
            </div>

            <div class="flex w-full flex-wrap gap-2">
              <button mat-flat-button color="primary" (click)="download('Png')">
                <mat-icon>download</mat-icon>
                PNG
              </button>
              <button mat-stroked-button (click)="download('Svg')">
                <mat-icon>download</mat-icon>
                SVG
              </button>
              <button mat-stroked-button (click)="print(code)">
                <mat-icon>print</mat-icon>
                Print
              </button>
              <span class="flex-1"></span>
              <button
                mat-stroked-button
                matTooltip="Issues a new code and disables every sticker you already printed"
                (click)="confirmRotate()"
              >
                <mat-icon>autorenew</mat-icon>
                Replace
              </button>
            </div>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class QrPanel {
  readonly carId = input.required<string>();
  readonly plateNumber = input<string>('');

  /** Fired after a successful rotation so the parent can refresh its own copy of the car. */
  readonly rotated = output<QrCode>();

  private readonly carsApi = inject(CarsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly qr = signal<QrCode | null>(null);
  protected readonly imageUrl = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const carId = this.carId();
      if (carId) {
        this.load(carId);
      }
    });

    this.destroyRef.onDestroy(() => this.releaseImageUrl());
  }

  private load(carId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.carsApi.getQrCode(carId).subscribe({
      next: (code) => {
        this.qr.set(code);
        this.loadImage(carId);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load the QR code.'));
      },
    });
  }

  /**
   * The image endpoint is authenticated, so it cannot be used as a plain `<img src>`.
   * It is fetched as a blob and handed to the template as an object URL instead.
   */
  private loadImage(carId: string): void {
    if (!this.isBrowser) {
      this.loading.set(false);
      return;
    }

    this.carsApi.getQrImage(carId, 'Png', 512).subscribe({
      next: (blob) => {
        this.releaseImageUrl();
        this.imageUrl.set(URL.createObjectURL(blob));
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not render the QR image.'));
      },
    });
  }

  protected download(format: QrImageFormat): void {
    const code = this.qr();
    if (!code || !this.isBrowser) {
      return;
    }

    this.carsApi.getQrImage(code.carId, format, 1024).subscribe({
      next: (blob) => {
        const plate = (this.plateNumber() || 'car').replace(/[^a-z0-9]+/gi, '-');
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');

        anchor.href = url;
        anchor.download = `qr-${plate}-v${code.qrVersion}.${format.toLowerCase()}`;
        anchor.click();

        URL.revokeObjectURL(url);
      },
      error: (error: unknown) =>
        this.notifications.error(extractErrorMessage(error, 'Download failed.')),
    });
  }

  protected print(code: QrCode): void {
    const imageUrl = this.imageUrl();
    if (!imageUrl || !this.isBrowser) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=520,height=680');
    if (!printWindow) {
      this.notifications.error('Your browser blocked the print window.');
      return;
    }

    const plate = this.plateNumber() || '';

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>QR sticker ${plate}</title>
    <style>
      body { font-family: system-ui, sans-serif; text-align: center; padding: 32px; }
      img { width: 320px; height: 320px; }
      h1 { font-size: 18px; margin: 16px 0 4px; }
      p { font-size: 12px; color: #555; margin: 0; }
      .frame { display: inline-block; border: 2px solid #111; border-radius: 16px; padding: 20px; }
    </style>
  </head>
  <body>
    <div class="frame">
      <img src="${imageUrl}" alt="QR code" />
      <h1>Please scan to contact the owner</h1>
      <p>${plate} · sticker v${code.qrVersion}</p>
    </div>
    <script>
      // Waiting for the image keeps the print preview from opening on a blank page.
      const img = document.querySelector('img');
      if (img.complete) { window.print(); }
      else { img.onload = () => window.print(); }
    </script>
  </body>
</html>`);

    printWindow.document.close();
  }

  protected copyLink(url: string): void {
    if (!this.isBrowser) {
      return;
    }

    void navigator.clipboard
      .writeText(url)
      .then(() => this.notifications.success('Scan link copied.'))
      .catch(() => this.notifications.error('Could not copy the link.'));
  }

  protected confirmRotate(): void {
    const data: ConfirmDialogData = {
      title: 'Replace this QR code?',
      message:
        'A new code will be issued immediately. Any sticker you have already printed will stop working, so you will need to print and fit a replacement.',
      confirmLabel: 'Replace code',
      destructive: true,
    };

    this.dialog
      .open(ConfirmDialog, { data, width: '420px' })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.rotate();
        }
      });
  }

  private rotate(): void {
    const code = this.qr();
    if (!code) {
      return;
    }

    this.loading.set(true);

    this.carsApi.rotateQrCode(code.carId).subscribe({
      next: (rotatedCode) => {
        this.qr.set(rotatedCode);
        this.loadImage(rotatedCode.carId);
        this.rotated.emit(rotatedCode);
        this.notifications.success('New QR code issued. Print the replacement sticker.');
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notifications.error(extractErrorMessage(error, 'Could not replace the code.'));
      },
    });
  }

  private releaseImageUrl(): void {
    const current = this.imageUrl();
    if (current && this.isBrowser) {
      URL.revokeObjectURL(current);
    }
  }
}
