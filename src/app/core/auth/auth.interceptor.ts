import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

/**
 * Attaches the bearer token to our own API calls and reacts to a rejected token.
 *
 * Requests to /public/ are skipped deliberately: the scan flow must stay anonymous even when
 * an owner happens to be signed in on the same device, otherwise scanning your own sticker
 * would behave differently from scanning a stranger's.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const isOwnApi = req.url.startsWith(environment.apiBaseUrl);
  const isPublicEndpoint = req.url.includes('/public/');
  const token = auth.accessToken;

  const request =
    isOwnApi && !isPublicEndpoint && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;

  return next(request).pipe(
    catchError((error: unknown) => {
      const isRejectedToken =
        error instanceof HttpErrorResponse && error.status === 401 && isOwnApi && !isPublicEndpoint;

      if (isRejectedToken && auth.accessToken) {
        // The token is expired or no longer accepted. With no refresh token to fall back on,
        // the only correct move is to end the session and send the user to sign in again.
        auth.logout();
        void router.navigate(['/login'], {
          queryParams: { returnUrl: router.url, expired: '1' },
        });
      }

      return throwError(() => error);
    }),
  );
};
