import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ParkingRequestsApiService } from '../api/parking-requests-api.service';
import { I18nService } from '../i18n/i18n.service';
import { ParkingRequest } from '../models/parking-request.models';
import { NotificationService } from './notification.service';

const POLL_MS = 15_000;

@Injectable({ providedIn: 'root' })
export class IncomingRequestAlertService {
  private readonly requestsApi = inject(ParkingRequestsApiService);
  private readonly notifications = inject(NotificationService);
  private readonly i18n = inject(I18nService);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly pendingCount = signal(0);

  private knownIds = new Set<string>();
  private primed = false;
  private poll?: Subscription;

  start(): void {
    if (!this.isBrowser || this.poll) {
      return;
    }

    this.refresh(false);
    document.addEventListener('visibilitychange', this.onVisibility);

    this.poll = interval(POLL_MS)
      .pipe(switchMap(() => this.requestsApi.list({ status: 'Pending' }, 1, 20)))
      .subscribe({
        next: (page) => this.apply(page.items, true),
        error: () => undefined,
      });
  }

  stop(): void {
    this.poll?.unsubscribe();
    this.poll = undefined;
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.primed = false;
    this.knownIds.clear();
    this.pendingCount.set(0);
  }

  private refresh(announce: boolean): void {
    this.requestsApi.list({ status: 'Pending' }, 1, 20).subscribe({
      next: (page) => this.apply(page.items, announce),
      error: () => undefined,
    });
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') {
      this.refresh(true);
    }
  };

  private apply(items: readonly ParkingRequest[], announce: boolean): void {
    this.pendingCount.set(items.length);

    const nextIds = new Set(items.map((item) => item.id));
    const newcomers = items.filter((item) => this.primed && !this.knownIds.has(item.id));
    this.knownIds = nextIds;
    this.primed = true;

    if (!announce || newcomers.length === 0) {
      return;
    }

    const latest = newcomers[0];
    const reason = this.i18n.reason(latest.reason, latest.reasonLabel);
    this.notifications.success(this.i18n.t('ownerAlert.title'));
    this.showBrowserNotification(reason);
  }

  private showBrowserNotification(reason: string): void {
    if (typeof Notification === 'undefined') {
      return;
    }

    const show = () => {
      try {
        const popup = new Notification(this.i18n.t('ownerAlert.title'), {
          body: this.i18n.t('ownerAlert.body', { reason }),
          icon: 'logo-mark.svg',
        });
        popup.onclick = () => {
          window.focus();
          void this.router.navigate(['/requests']);
          popup.close();
        };
      } catch {
        // Permission or browser policy — in-app toast is enough.
      }
    };

    if (Notification.permission === 'granted') {
      show();
      return;
    }

    if (Notification.permission === 'default') {
      void Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          show();
        }
      });
    }
  }
}
