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
import { I18nService } from '../../core/i18n/i18n.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { QrCode, QrImageFormat } from '../../core/models/car.models';
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
    TranslatePipe,
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
  templateUrl: './qr-panel.html',
})
export class QrPanel {
  readonly carId = input.required<string>();
  readonly plateNumber = input<string>('');

  /** Fired after a successful rotation so the parent can refresh its own copy of the car. */
  readonly rotated = output<QrCode>();

  private readonly carsApi = inject(CarsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
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
        this.errorMessage.set(this.i18n.httpError(error, 'qr.loadFailed'));
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
        this.errorMessage.set(this.i18n.httpError(error, 'qr.renderFailed'));
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
        this.notifications.error(this.i18n.httpError(error, 'qr.downloadFailed')),
    });
  }

  protected print(code: QrCode): void {
    const imageUrl = this.imageUrl();
    if (!imageUrl || !this.isBrowser) {
      return;
    }

    const printWindow = window.open('', '_blank', 'width=520,height=680');
    if (!printWindow) {
      this.notifications.error(this.i18n.t('qr.printBlocked'));
      return;
    }

    const plate = this.plateNumber() || '';

    printWindow.document.write(`<!doctype html>
<html>
  <head>
    <title>${this.i18n.t('qr.printTitle', { plate })}</title>
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
      <img src="${imageUrl}" alt="${this.i18n.t('qr.alt')}" />
      <h1>${this.i18n.t('qr.printHeading')}</h1>
      <p>${this.i18n.t('qr.printFooter', { plate, version: code.qrVersion })}</p>
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
      .then(() => this.notifications.success(this.i18n.t('qr.copied')))
      .catch(() => this.notifications.error(this.i18n.t('qr.copyFailed')));
  }

  protected confirmRotate(): void {
    const data: ConfirmDialogData = {
      title: this.i18n.t('qr.replaceTitle'),
      message: this.i18n.t('qr.replaceMessage'),
      confirmLabel: this.i18n.t('qr.replaceConfirm'),
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
        this.notifications.success(this.i18n.t('qr.replaced'));
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.notifications.error(this.i18n.httpError(error, 'qr.replaceFailed'));
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
