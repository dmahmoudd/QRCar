import { DatePipe, isPlatformBrowser } from '@angular/common';
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
import { extractErrorMessage } from '../../core/http/problem-details';
import { PublicRequestStatus } from '../../core/models/public-scan.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const POLL_INTERVAL_MS = 10_000;

/** Statuses that can still change, and therefore are worth polling for. */
const LIVE_STATUSES = new Set(['Pending', 'Seen']);

@Component({
  selector: 'app-request-status',
  imports: [
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './request-status.html',
})
export class RequestStatus {
  readonly trackingRef = input.required<string>();

  private readonly publicApi = inject(PublicScanApiService);
  private readonly destroyRef = inject(DestroyRef);
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
          title: 'The owner replied',
          description: 'They have seen your request and answered below.',
          panelClass: 'bg-emerald-50 text-emerald-600',
        };
      case 'Resolved':
        return {
          icon: 'task_alt',
          title: 'All done',
          description: 'The owner marked this request as handled.',
          panelClass: 'bg-emerald-50 text-emerald-600',
        };
      case 'Seen':
        return {
          icon: 'visibility',
          title: 'The owner has seen it',
          description: 'They opened your request. Hang on for a reply.',
          panelClass: 'bg-sky-50 text-sky-600',
        };
      case 'Expired':
        return {
          icon: 'hourglass_disabled',
          title: 'This request expired',
          description: 'Nobody answered in time. You can scan the code again to retry.',
          panelClass: 'bg-slate-100 text-slate-500',
        };
      default:
        return {
          icon: 'notifications_active',
          title: 'The owner has been notified',
          description: "Keep this page open and you'll see their reply as soon as it arrives.",
          panelClass: 'bg-brand-50 text-brand-600',
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

  private load(trackingRef: string): void {
    this.publicApi.getRequestStatus(trackingRef).subscribe({
      next: (status) => {
        this.status.set(status);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(
          extractErrorMessage(error, 'The reference may be wrong or the request may have expired.'),
        );
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
