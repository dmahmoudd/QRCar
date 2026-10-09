import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '../models/api.models';

/**
 * Turns any HTTP failure into a single sentence worth showing a user. Prefers the API's
 * per-field validation messages, then its problem detail, and only falls back to a generic
 * message when the server said nothing useful.
 */
export function extractErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'Cannot reach the server. Check that the API is running.';
  }

  const problem = error.error as ProblemDetails | string | null;

  if (typeof problem === 'string' && problem.trim()) {
    return problem;
  }

  if (problem && typeof problem === 'object') {
    const fieldErrors = problem.errors
      ? Object.values(problem.errors).flat().filter(Boolean)
      : [];

    if (fieldErrors.length) {
      return fieldErrors.join(' ');
    }

    if (problem.detail) {
      return problem.detail;
    }

    if (problem.title) {
      return problem.title;
    }
  }

  return fallback;
}

/** Field-level errors keyed by property name, for painting individual form controls. */
export function extractFieldErrors(error: unknown): Record<string, string[]> {
  if (!(error instanceof HttpErrorResponse)) {
    return {};
  }

  const problem = error.error as ProblemDetails | null;
  return problem?.errors ?? {};
}
