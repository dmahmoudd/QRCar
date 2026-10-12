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
  styles: `
    :host {
      display: block;
    }

    :host ::ng-deep .qr-action.mat-mdc-button-base {
      width: 100%;
    }
  `,
  template: `
    <mat-card>
      <div class="px-4 pt-5 text-center md:px-6 md:pt-6 md:text-left">
        <h2 class="text-lg font-semibold text-slate-900">QR code</h2>
        <p class="mt-1 text-sm text-slate-500">Print this and stick it on your windscreen.</p>
      </div>

      <mat-card-content class="!px-4 !pb-5 md:!px-6 md:!pb-6">
        @if (loading()) {
          <div class="grid h-64 place-items-center">
            <mat-spinner diameter="40" />
          </div>
        } @else if (errorMessage()) {
          <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
        } @else if (qr(); as code) {
          <div class="mx-auto flex w-full max-w-sm flex-col items-center gap-5">
            <div class="mx-auto aspect-square w-full max-w-[17rem]">
              @if (imageUrl()) {
                <img
                  [src]="imageUrl()"
                  alt="QR sticker for this car"
                  class="mx-auto block h-full w-full object-contain"
                  width="288"
                  height="288"
                />
              }
            </div>

            <div class="w-full min-w-0 text-center">
              <p class="mb-1 text-xs font-medium uppercase text-slate-400">
                Scan destination
              </p>
              <div class="flex min-w-0 items-center gap-2 rounded-lg bg-slate-50 p-2 text-left">
                <code class="min-w-0 flex-1 truncate text-xs text-slate-600">{{ code.scanUrl }}</code>
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

            <div class="grid w-full grid-cols-2 gap-2">
              <button mat-flat-button class="qr-action" color="primary" (click)="download('Png')">
                <mat-icon>download</mat-icon>
                PNG
              </button>
              <button mat-stroked-button class="qr-action" (click)="download('Svg')">
                <mat-icon>download</mat-icon>
                SVG
              </button>
              <button mat-stroked-button class="qr-action" (click)="print(code)">
                <mat-icon>print</mat-icon>
                Print
              </button>
              <button
                mat-stroked-button
                class="qr-action"
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

    this.carsApi.getQrImage(carId, 'Png', 768).subscribe({
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
      img { width: 360px; height: auto; }
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
      .open(ConfirmDialog, { data, width: 'min(420px, calc(100vw - 24px))' })
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
