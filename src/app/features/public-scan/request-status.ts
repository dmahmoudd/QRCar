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
  template: `
    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage()) {
      <mat-card>
        <mat-card-content class="!p-8 text-center">
          <mat-icon class="!h-8 !w-8 !text-3xl text-slate-400">link_off</mat-icon>
          <h1 class="mt-2 font-semibold text-slate-800">We can't find that request</h1>
          <p class="mt-1 text-sm text-slate-500">{{ errorMessage() }}</p>
        </mat-card-content>
      </mat-card>
    } @else if (status(); as current) {
      <mat-card class="mb-4">
        <mat-card-content class="!p-6 text-center">
          <div
            class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl"
            [class]="headline().panelClass"
          >
            <mat-icon class="!h-8 !w-8 !text-4xl">{{ headline().icon }}</mat-icon>
          </div>

          <h1 class="text-xl font-semibold text-slate-900">{{ headline().title }}</h1>
          <p class="mx-auto mt-2 max-w-sm text-sm text-slate-500">{{ headline().description }}</p>

          @if (current.responseLabel) {
            <div class="mt-5 rounded-xl bg-emerald-50 p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Owner's reply
              </p>
              <p class="mt-1 text-base font-semibold text-emerald-900">
                {{ current.responseLabel }}
              </p>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-content class="!p-6">
          <ol class="space-y-4 text-sm">
            <li class="flex gap-3">
              <mat-icon class="!h-5 !w-5 !text-xl text-brand-600">check_circle</mat-icon>
              <div>
                <p class="font-medium text-slate-800">Request sent</p>
                <p class="text-xs text-slate-400">
                  {{ current.createdAtUtc | relativeTime }} ·
                  {{ current.createdAtUtc | date: 'shortTime' }}
                </p>
              </div>
            </li>

            <li class="flex gap-3">
              <mat-icon
                class="!h-5 !w-5 !text-xl"
                [class]="seenOrLater() ? 'text-brand-600' : 'text-slate-300'"
              >
                {{ seenOrLater() ? 'check_circle' : 'radio_button_unchecked' }}
              </mat-icon>
              <div>
                <p
                  class="font-medium"
                  [class]="seenOrLater() ? 'text-slate-800' : 'text-slate-400'"
                >
                  Owner opened it
                </p>
              </div>
            </li>

            <li class="flex gap-3">
              <mat-icon
                class="!h-5 !w-5 !text-xl"
                [class]="current.respondedAtUtc ? 'text-emerald-600' : 'text-slate-300'"
              >
                {{ current.respondedAtUtc ? 'check_circle' : 'radio_button_unchecked' }}
              </mat-icon>
              <div>
                <p
                  class="font-medium"
                  [class]="current.respondedAtUtc ? 'text-slate-800' : 'text-slate-400'"
                >
                  Owner replied
                </p>
                @if (current.respondedAtUtc) {
                  <p class="text-xs text-slate-400">
                    {{ current.respondedAtUtc | relativeTime }}
                  </p>
                }
              </div>
            </li>
          </ol>

          @if (isLive()) {
            <p class="mt-6 flex items-center justify-center gap-2 text-xs text-slate-400">
              <mat-spinner diameter="14" />
              Checking for a reply automatically
            </p>
          }

          <div class="mt-4 flex justify-center">
            <button mat-stroked-button (click)="refresh()">
              <mat-icon>refresh</mat-icon>
              Check now
            </button>
          </div>

          <p class="mt-6 text-center text-xs text-slate-400">
            Reference {{ current.trackingRef }} — bookmark this page to come back to it.
          </p>
        </mat-card-content>
      </mat-card>
    }
  `,
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
