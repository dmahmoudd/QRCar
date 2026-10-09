import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { ParkingRequestsApiService } from '../../core/api/parking-requests-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import {
  ParkingRequest,
  ParkingResponseType,
  RESPONSE_OPTIONS,
} from '../../core/models/parking-request.models';
import { NotificationService } from '../../core/services/notification.service';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';
import { StatusChip } from '../../shared/ui/status-chip';

@Component({
  selector: 'app-request-detail',
  imports: [
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    StatusChip,
    RelativeTimePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      class="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      routerLink="/requests"
    >
      <mat-icon class="!h-5 !w-5 !text-xl">arrow_back</mat-icon>
      All requests
    </a>

    @if (loading()) {
      <div class="grid h-64 place-items-center"><mat-spinner diameter="40" /></div>
    } @else if (errorMessage()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (request(); as item) {
      <div class="grid max-w-4xl gap-6 lg:grid-cols-5">
        <mat-card class="lg:col-span-3">
          <mat-card-content class="!p-6">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 class="text-xl font-semibold text-slate-900">{{ item.reasonLabel }}</h1>
                <p class="mt-1 text-sm text-slate-500">
                  {{ item.carLabel }} ·
                  <span class="font-mono">{{ item.carPlate }}</span>
                </p>
              </div>
              <app-status-chip [status]="item.status" />
            </div>

            @if (item.message) {
              <blockquote class="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                "{{ item.message }}"
              </blockquote>
            }

            <p class="mt-4 text-xs text-slate-400">
              Sent {{ item.createdAtUtc | relativeTime }} ·
              {{ item.createdAtUtc | date: 'medium' }}
            </p>

            @if (isOpen(item)) {
              <div class="mt-6 border-t border-slate-100 pt-5">
                <p class="mb-3 text-sm font-medium text-slate-700">
                  Let them know what you're doing
                </p>
                <div class="flex flex-wrap gap-2">
                  @for (option of responseOptions; track option.value) {
                    <button
                      mat-stroked-button
                      [disabled]="saving()"
                      (click)="respond(option.value)"
                    >
                      <mat-icon>{{ option.icon }}</mat-icon>
                      {{ option.label }}
                    </button>
                  }
                </div>
                <p class="mt-3 text-xs text-slate-400">
                  They see your reply on the page they used to contact you. Your number is not
                  shared.
                </p>
              </div>
            } @else if (item.status === 'Acknowledged') {
              <div class="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-5">
                <p class="text-sm text-slate-600">
                  You replied
                  <span class="font-medium">{{ responseLabel(item.responseType) }}</span>
                  {{ item.respondedAtUtc | relativeTime }}.
                </p>
                <span class="flex-1"></span>
                <button mat-flat-button color="primary" [disabled]="saving()" (click)="resolve()">
                  <mat-icon>check</mat-icon>
                  Mark resolved
                </button>
              </div>
            } @else {
              <div class="mt-6 border-t border-slate-100 pt-5 text-sm text-slate-500">
                This request is {{ item.status.toLowerCase() }} and no longer needs an answer.
              </div>
            }
          </mat-card-content>
        </mat-card>

        <mat-card class="lg:col-span-2">
          <mat-card-content class="!p-6">
            <h2 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Timeline
            </h2>

            <ol class="space-y-4 text-sm">
              <li class="flex gap-3">
                <mat-icon class="!h-5 !w-5 !text-xl text-brand-600">qr_code_scanner</mat-icon>
                <div>
                  <p class="font-medium text-slate-800">Scanned and sent</p>
                  <p class="text-xs text-slate-400">{{ item.createdAtUtc | date: 'short' }}</p>
                </div>
              </li>

              @if (item.seenAtUtc) {
                <li class="flex gap-3">
                  <mat-icon class="!h-5 !w-5 !text-xl text-sky-600">visibility</mat-icon>
                  <div>
                    <p class="font-medium text-slate-800">You opened it</p>
                    <p class="text-xs text-slate-400">{{ item.seenAtUtc | date: 'short' }}</p>
                  </div>
                </li>
              }

              @if (item.respondedAtUtc) {
                <li class="flex gap-3">
                  <mat-icon class="!h-5 !w-5 !text-xl text-emerald-600">reply</mat-icon>
                  <div>
                    <p class="font-medium text-slate-800">
                      You replied: {{ responseLabel(item.responseType) }}
                    </p>
                    <p class="text-xs text-slate-400">{{ item.respondedAtUtc | date: 'short' }}</p>
                  </div>
                </li>
              }

              <li class="flex gap-3">
                <mat-icon class="!h-5 !w-5 !text-xl text-slate-400">hourglass_bottom</mat-icon>
                <div>
                  <p class="font-medium text-slate-800">Expires</p>
                  <p class="text-xs text-slate-400">{{ item.expiresAtUtc | date: 'short' }}</p>
                </div>
              </li>
            </ol>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
})
export class RequestDetail {
  readonly requestId = input.required<string>();

  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly notifications = inject(NotificationService);

  protected readonly responseOptions = RESPONSE_OPTIONS;
  protected readonly request = signal<ParkingRequest | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');

  constructor() {
    effect(() => {
      const requestId = this.requestId();
      if (requestId) {
        this.load(requestId);
      }
    });
  }

  private load(requestId: string): void {
    this.loading.set(true);
    this.errorMessage.set('');

    // This GET also marks the request as seen server-side.
    this.requestsApi.getById(requestId).subscribe({
      next: (request) => {
        this.request.set(request);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(extractErrorMessage(error, 'Could not load this request.'));
      },
    });
  }

  protected isOpen(request: ParkingRequest): boolean {
    return request.status === 'Pending' || request.status === 'Seen';
  }

  protected responseLabel(responseType: ParkingResponseType | null): string {
    return RESPONSE_OPTIONS.find((option) => option.value === responseType)?.label ?? '—';
  }

  protected respond(responseType: ParkingResponseType): void {
    this.saving.set(true);

    this.requestsApi.respond(this.requestId(), responseType).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success('Reply sent. They can see it now.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(extractErrorMessage(error, 'Could not send your reply.'));
      },
    });
  }

  protected resolve(): void {
    this.saving.set(true);

    this.requestsApi.resolve(this.requestId()).subscribe({
      next: (updated) => {
        this.request.set(updated);
        this.saving.set(false);
        this.notifications.success('Marked as resolved.');
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.notifications.error(extractErrorMessage(error, 'Could not resolve this request.'));
      },
    });
  }
}
