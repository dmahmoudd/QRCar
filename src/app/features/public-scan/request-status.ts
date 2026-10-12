import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { interval, switchMap } from 'rxjs';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { LocalDatePipe } from '../../core/i18n/local-date.pipe';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { PublicRequestStatus } from '../../core/models/public-scan.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const POLL_INTERVAL_MS = 10_000;

/** Statuses that can still change, and therefore are worth polling for. */
const LIVE_STATUSES = new Set(['Pending', 'Seen']);

@Component({
  selector: 'app-request-status',
  imports: [
    LocalDatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RelativeTimePipe,
    TranslatePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-status.html',
})
export class RequestStatus {
  readonly trackingRef = input.required<string>();

  private readonly publicApi = inject(PublicScanApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly status = signal<PublicRequestStatus | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly isLive = computed(() => {
    const current = this.status();
    return !!current && LIVE_STATUSES.has(current.status);
  });

  protected readonly seenOrLater = computed(() => {
    const current = this.status();
    return !!current && current.status !== 'Pending';
  });

  protected readonly headline = computed(() => {
    const current = this.status();

    switch (current?.status) {
      case 'Acknowledged':
        return {
          icon: 'mark_email_read',
          titleKey: 'tracker.ackTitle',
          descriptionKey: 'tracker.ackBody',
          panelClass: 'bg-emerald-50 text-emerald-600',
        };
      case 'Resolved':
        return {
          icon: 'task_alt',
          titleKey: 'tracker.resolvedTitle',
          descriptionKey: 'tracker.resolvedBody',
          panelClass: 'bg-emerald-50 text-emerald-600',
        };
      case 'Seen':
        return {
          icon: 'visibility',
          titleKey: 'tracker.seenTitle',
          descriptionKey: 'tracker.seenBody',
          panelClass: 'bg-sky-50 text-sky-600',
        };
      case 'Expired':
        return {
          icon: 'hourglass_disabled',
          titleKey: 'tracker.expiredTitle',
          descriptionKey: 'tracker.expiredBody',
          panelClass: 'bg-slate-100 text-slate-500',
        };
      default:
        return {
          icon: 'notifications_active',
          titleKey: 'tracker.pendingTitle',
          descriptionKey: 'tracker.pendingBody',
          panelClass: 'bg-accent-50 text-accent-600',
        };
    }
  });

  constructor() {
    effect(() => {
      const trackingRef = this.trackingRef();
      if (trackingRef) {
        this.load(trackingRef);
      }
    });

    this.startPolling();
  }

  protected refresh(): void {
    this.load(this.trackingRef());
  }

  protected responseLabel(status: PublicRequestStatus): string {
    return this.i18n.response(status.responseType, status.responseLabel ?? '');
  }

  private load(trackingRef: string): void {
    this.publicApi.getRequestStatus(trackingRef).subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.i18n.httpError(error, 'tracker.loadFailed'));
      },
    });
  }

  /**
   * Polls only in the browser and only while the status can still change, so a page left open
   * on a resolved request stops talking to the server.
   */
  private startPolling(): void {
    if (!this.isBrowser) {
      return;
    }

    interval(POLL_INTERVAL_MS)
      .pipe(
        switchMap(() => this.publicApi.getRequestStatus(this.trackingRef())),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (status) => {
          if (this.isLive() || !this.status()) {
            this.status.set(status);
          }
        },
        // A transient poll failure should not replace a page that is already rendering fine.
        error: () => undefined,
      });
  }
}
