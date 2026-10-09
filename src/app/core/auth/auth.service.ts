import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthResponse,
  AuthUserSummary,
  LoginRequest,
  RegisterRequest,
  StoredSession,
} from '../models/auth.models';
import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);

  private readonly session = signal<StoredSession | null>(this.storage.read());

  readonly user = computed<AuthUserSummary | null>(() => this.session()?.user ?? null);

  readonly isAuthenticated = computed<boolean>(() => {
    const current = this.session();
    return !!current && new Date(current.expiresAtUtc).getTime() > Date.now();
  });

  get accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/register`, request)
      .pipe(tap((response) => this.startSession(response)));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${environment.apiBaseUrl}/auth/login`, request)
      .pipe(tap((response) => this.startSession(response)));
  }

  /**
   * There is no refresh token yet, so signing out is purely local: drop the stored token
   * and let it expire server-side.
   */
  logout(): void {
    this.storage.clear();
    this.session.set(null);
  }

  /** Keeps the in-memory user name in step after a profile edit. */
  patchDisplayName(fullName: string): void {
    const current = this.session();
    if (!current) {
      return;
    }

    const updated: StoredSession = { ...current, user: { ...current.user, fullName } };
    this.storage.write(updated);
    this.session.set(updated);
  }

  private startSession(response: AuthResponse): void {
    const session: StoredSession = {
      accessToken: response.accessToken,
      expiresAtUtc: response.expiresAtUtc,
      user: response.user,
    };

    this.storage.write(session);
    this.session.set(session);
  }
}
