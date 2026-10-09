import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PublicScanApiService } from '../../core/api/public-scan-api.service';
import { extractErrorMessage } from '../../core/http/problem-details';
import { PublicCar } from '../../core/models/public-scan.models';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'app-scan-landing',
  imports: [
    DatePipe,
    DecimalPipe,
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
    } @else if (notFound()) {
      <mat-card>
        <mat-card-content class="!p-8 text-center">
          <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100">
            <mat-icon class="!h-7 !w-7 !text-3xl text-slate-400">qr_code_2</mat-icon>
          </div>
          <h1 class="text-lg font-semibold text-slate-900">This code isn't recognised</h1>
          <p class="mt-2 text-sm text-slate-500">
            The sticker may be damaged, or the owner may have replaced the code.
          </p>
        </mat-card-content>
      </mat-card>
    } @else if (retired()) {
      <mat-card>
        <mat-card-content class="!p-8 text-center">
          <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50">
            <mat-icon class="!h-7 !w-7 !text-3xl text-amber-500">history_toggle_off</mat-icon>
          </div>
          <h1 class="text-lg font-semibold text-slate-900">This code is no longer active</h1>
          <p class="mt-2 text-sm text-slate-500">The owner removed this QR code.</p>
        </mat-card-content>
      </mat-card>
    } @else if (errorMessage() && !car()) {
      <div class="rounded-lg bg-rose-50 p-4 text-sm text-rose-900">{{ errorMessage() }}</div>
    } @else if (car(); as owner) {
      <mat-card class="mb-4">
        <mat-card-content class="!p-6 text-center">
          <div class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-50">
            <mat-icon class="text-brand-600">phone</mat-icon>
          </div>
          <h1 class="text-lg font-semibold text-slate-900">Contact the owner</h1>
          <p class="mt-3 font-mono text-2xl tracking-wide text-slate-900">{{ owner.maskedPhone }}</p>
          <p class="mt-2 text-xs text-slate-400">
            The full number stays hidden. Call or WhatsApp still works.
          </p>

          <div class="mt-6 flex flex-col gap-2">
            <a mat-flat-button color="primary" class="!h-12" [href]="callUrl()">
              <mat-icon>call</mat-icon>
              Call
            </a>
            <a mat-stroked-button class="!h-12" [href]="whatsAppUrl()">
              <mat-icon>chat</mat-icon>
              WhatsApp
            </a>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-content class="!p-6">
          <h2 class="text-sm font-semibold uppercase tracking-wide text-slate-400">Last location</h2>

          @if (mapsUrl(); as mapLink) {
            <p class="mt-2 text-sm text-slate-600">
              Reported
              {{ owner.lastLocatedAtUtc | relativeTime }}
              @if (owner.lastLocatedAtUtc) {
                · {{ owner.lastLocatedAtUtc | date: 'short' }}
              }
            </p>
            <p class="mt-1 font-mono text-xs text-slate-400">
              {{ owner.lastLatitude | number: '1.5-5' }},
              {{ owner.lastLongitude | number: '1.5-5' }}
            </p>
            <a mat-flat-button color="primary" class="!mt-4 !h-11 w-full" [href]="mapLink" target="_blank" rel="noopener">
              <mat-icon>map</mat-icon>
              Open in maps
            </a>
            <p class="mt-3 text-xs text-slate-400">
              This is the last position the owner sent while their phone was on and the app was
              open. A switched-off phone cannot be located.
            </p>
          } @else {
            <p class="mt-2 text-sm text-slate-500">
              No location yet. The owner has to turn on sharing and keep the app open on their
              phone. A closed or powered-off phone cannot be found.
            </p>
          }
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class ScanLanding {
  readonly token = input.required<string>();

  private readonly publicApi = inject(PublicScanApiService);

  protected readonly car = signal<PublicCar | null>(null);
  protected readonly loading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly notFound = signal(false);
  protected readonly retired = signal(false);

  protected readonly callUrl = computed(() => this.publicApi.callUrl(this.token()));

  protected readonly whatsAppUrl = computed(() => this.publicApi.whatsAppUrl(this.token()));

  protected readonly mapsUrl = computed(() => {
    const current = this.car();
    if (!current?.shareLocation || current.lastLatitude == null || current.lastLongitude == null) {
      return null;
    }

    return `https://www.google.com/maps?q=${current.lastLatitude},${current.lastLongitude}`;
  });

  constructor() {
    effect(() => {
      const token = this.token();
      if (token) {
        this.load(token);
      }
    });
  }

  private load(token: string): void {
    // Keep any server-rendered car on screen. Flipping to a spinner here blanks the
    // page on a phone while the API call runs (or hangs).
    if (!this.car()) {
      this.loading.set(true);
    }
    this.notFound.set(false);
    this.retired.set(false);

    this.publicApi.getCarByToken(token).subscribe({
      next: (car) => {
        this.car.set(car);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);

        if (error instanceof HttpErrorResponse && error.status === 410) {
          this.retired.set(true);
        } else if (error instanceof HttpErrorResponse && error.status === 404) {
          this.notFound.set(true);
        } else {
          this.errorMessage.set(extractErrorMessage(error, 'Could not load this code.'));
        }
      },
    });
  }
}
