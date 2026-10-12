import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocalDatePipe } from '../../core/i18n/local-date.pipe';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { OfficialScan } from '../../core/models/public-scan.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const REQUEST_REASONS: ReadonlyArray<{ code: string; requiresMessage: boolean }> = [
  { code: 'BlockingMyCar', requiresMessage: false },
  { code: 'BlockingExit', requiresMessage: false },
  { code: 'LightsLeftOn', requiresMessage: false },
  { code: 'WindowLeftOpen', requiresMessage: false },
  { code: 'AlarmSounding', requiresMessage: false },
  { code: 'ParkedIllegally', requiresMessage: false },
  { code: 'VehicleDamaged', requiresMessage: false },
  { code: 'Other', requiresMessage: true },
];

@Component({
  selector: 'app-scan-result',
  imports: [
    LocalDatePipe,
    DecimalPipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RelativeTimePipe,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-result.html',
})
export class ScanResult {
  readonly scan = input<OfficialScan | null>(null);
  readonly unrecognized = input(false);
  readonly notFound = input(false);
  readonly retired = input(false);
  readonly paused = input(false);
  readonly errorMessage = input('');

  private readonly publicApi = inject(PublicScanApiService);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18nService);

  protected readonly reasons = REQUEST_REASONS;
  protected readonly composing = signal(false);
  protected readonly selectedReason = signal('BlockingMyCar');
  protected readonly note = signal('');
  protected readonly sending = signal(false);
  protected readonly sendError = signal('');

  protected readonly callUrl = computed(() => {
    const scanId = this.scan()?.scanId;
    return scanId ? this.publicApi.callUrl(scanId) : '';
  });

  protected readonly whatsAppUrl = computed(() => {
    const scanId = this.scan()?.scanId;
    return scanId ? this.publicApi.whatsAppUrl(scanId) : '';
  });

  protected readonly mapsUrl = computed(() => {
    const current = this.scan();
    if (!current?.shareLocation || current.lastLatitude == null || current.lastLongitude == null) {
      return null;
    }

    return `https://www.google.com/maps?q=${current.lastLatitude},${current.lastLongitude}`;
  });

  protected readonly selectedRequiresNote = computed(() => {
    const code = this.selectedReason();
    return REQUEST_REASONS.some((reason) => reason.code === code && reason.requiresMessage);
  });

  protected readonly canSend = computed(() => {
    if (this.sending()) {
      return false;
    }

    if (!this.selectedReason()) {
      return false;
    }

    return !this.selectedRequiresNote() || this.note().trim().length > 0;
  });

  protected startCompose(): void {
    this.composing.set(true);
    this.sendError.set('');
  }

  protected cancelCompose(): void {
    if (this.sending()) {
      return;
    }

    this.composing.set(false);
    this.sendError.set('');
  }

  protected selectReason(code: string): void {
    this.selectedReason.set(code);
    this.sendError.set('');
  }

  protected onNoteInput(event: Event): void {
    this.note.set((event.target as HTMLTextAreaElement).value);
  }

  protected submitRequest(): void {
    const scanId = this.scan()?.scanId;
    if (!scanId || !this.canSend()) {
      return;
    }

    this.sending.set(true);
    this.sendError.set('');

    this.publicApi
      .createRequest(scanId, {
        reason: this.selectedReason(),
        message: this.note().trim() || null,
      })
      .subscribe({
        next: (created) => {
          this.sending.set(false);
          void this.router.navigate(['/r', created.trackingRef]);
        },
        error: (error: unknown) => {
          this.sending.set(false);
          this.sendError.set(this.i18n.httpError(error, 'scanResult.sendFailed'));
        },
      });
  }
}
