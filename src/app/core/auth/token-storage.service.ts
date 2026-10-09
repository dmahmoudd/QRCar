import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { StoredSession } from '../models/auth.models';

const STORAGE_KEY = 'qrcar.session';

/**
 * Every access to localStorage is guarded, because this app is server-rendered and
 * `localStorage` does not exist during the server pass.
 */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  read(): StoredSession | null {
    if (!this.isBrowser) {
      return null;
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }

      const parsed = JSON.parse(raw) as StoredSession;
      return parsed?.accessToken ? parsed : null;
    } catch {
      // Corrupted or unreadable storage should log the user out, not crash the app.
      return null;
    }
  }

  write(session: StoredSession): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  clear(): void {
    if (!this.isBrowser) {
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
  }
}
