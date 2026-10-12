import { isPlatformBrowser, registerLocaleData } from '@angular/common';
import localeAr from '@angular/common/locales/ar';
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { extractErrorMessage } from '../http/problem-details';
import { LOCALES, Locale, TRANSLATIONS, apiMessageKey } from './translations';

const STORAGE_KEY = 'tala3ny.locale';

registerLocaleData(localeAr);

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  readonly locale = signal<Locale>(this.readInitialLocale());

  t(key: string, params?: Record<string, string | number>): string {
    const table = TRANSLATIONS[this.locale()];
    let text = table[key] ?? TRANSLATIONS.en[key] ?? key;

    if (params) {
      for (const [name, value] of Object.entries(params)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }

    return text;
  }

  has(key: string): boolean {
    return key in TRANSLATIONS.en;
  }

  setLocale(locale: Locale): void {
    if (!LOCALES.includes(locale) || locale === this.locale()) {
      return;
    }

    this.locale.set(locale);
    this.applyDocument(locale);

    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, locale);
    }
  }

  dateLocale(): string {
    return this.locale() === 'ar' ? 'ar' : 'en-US';
  }

  reason(code: string | null | undefined, fallback = ''): string {
    if (!code) {
      return fallback;
    }

    const key = `reason.${code}`;
    return this.has(key) ? this.t(key) : fallback || code;
  }

  response(code: string | null | undefined, fallback = '—'): string {
    const keys: Record<string, string> = {
      OnMyWay: 'requests.responseOnMyWay',
      CantMoveNow: 'requests.responseCantMove',
      NotMyCar: 'requests.responseNotMyCar',
      Ignored: 'requests.responseDismiss',
    };

    const key = code ? keys[code] : undefined;
    return key ? this.t(key) : fallback;
  }

  status(code: string | null | undefined): string {
    const keys: Record<string, string> = {
      Pending: 'status.pending',
      Seen: 'status.seen',
      Acknowledged: 'status.acknowledged',
      Resolved: 'status.resolved',
      Expired: 'status.expired',
    };

    const key = code ? keys[code] : undefined;
    return key ? this.t(key) : (code ?? '');
  }

  statusShort(code: string | null | undefined): string {
    const keys: Record<string, string> = {
      Pending: 'status.pendingShort',
      Seen: 'status.seenShort',
      Acknowledged: 'status.acknowledgedShort',
      Resolved: 'status.resolvedShort',
      Expired: 'status.expiredShort',
    };

    const key = code ? keys[code] : undefined;
    return key ? this.t(key) : (code ?? '').toLowerCase();
  }

  httpError(error: unknown, fallbackKey: string): string {
    const raw = extractErrorMessage(error, this.t(fallbackKey));
    const mapped = apiMessageKey(raw);
    return mapped ? this.t(mapped) : raw;
  }

  applyDocument(locale: Locale = this.locale()): void {
    if (!this.isBrowser) {
      return;
    }

    const root = document.documentElement;
    root.lang = locale === 'ar' ? 'ar' : 'en';
    root.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }

  private readInitialLocale(): Locale {
    if (!this.isBrowser) {
      return 'en';
    }

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ar') {
      this.applyDocument(saved);
      return saved;
    }

    const browser = navigator.language?.toLowerCase() ?? '';
    const locale: Locale = browser.startsWith('ar') ? 'ar' : 'en';
    this.applyDocument(locale);
    return locale;
  }
}
