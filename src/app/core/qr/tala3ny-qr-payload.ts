/**
 * Parses untrusted QR text into a Tala3ny public token.
 *
 * The camera (Phase B) must only pass the raw string here, then navigate with
 * Angular Router. This module never reads or writes window.location.
 */

/** 16 random bytes as unpadded base64url — matches SecureTokenGenerator. */
export const PUBLIC_TOKEN_PATTERN = /^[A-Za-z0-9_-]{22}$/;

/** Reject oversized input before any URL work. Official stickers are ~50 characters. */
export const MAX_QR_PAYLOAD_LENGTH = 512;

/**
 * Official frontend origins that may appear in printed `/c/{token}` URLs.
 * Callers in other environments pass their own list (for example localhost in dev).
 */
export const OFFICIAL_TALA3NY_ORIGINS = ['https://qrcar.pages.dev'] as const;

export type Tala3nyQrRejectReason =
  | 'empty'
  | 'too-long'
  | 'unsupported-payload'
  | 'invalid-url'
  | 'credentials'
  | 'disallowed-origin'
  | 'invalid-path'
  | 'invalid-token';

export type Tala3nyQrParseResult =
  | { ok: true; token: string }
  | { ok: false; reason: Tala3nyQrRejectReason };

const FORBIDDEN_PREFIXES = [
  'javascript:',
  'data:',
  'file:',
  'blob:',
  'about:',
  'vbscript:',
  'wifi:',
  'begin:vcard',
  'begin:vevent',
  'mecard:',
  'bitcoin:',
  'bitcoincash:',
  'ethereum:',
  'lightning:',
  'upi:',
  'payto:',
  'intent:',
  'market:',
  'tel:',
  'mailto:',
  'sms:',
  'smsto:',
  'geo:',
  'otpauth:',
  'magnet:',
  'ftp:',
  'ws:',
  'wss:',
  // Printed stickers stay on /c/{token} URLs; this scheme is not accepted yet.
  'tala3ny:',
] as const;

const SCAN_PATH_PATTERN = new RegExp(`^/c/(${PUBLIC_TOKEN_PATTERN.source.slice(1, -1)})$`);

export function parseTala3nyQrPayload(
  raw: string,
  allowedOrigins: readonly string[],
): Tala3nyQrParseResult {
  const text = raw.trim();

  if (!text) {
    return fail('empty');
  }

  if (text.length > MAX_QR_PAYLOAD_LENGTH) {
    return fail('too-long');
  }

  if (hasForbiddenPrefix(text)) {
    return fail('unsupported-payload');
  }

  if (PUBLIC_TOKEN_PATTERN.test(text)) {
    return { ok: true, token: text };
  }

  return parseOfficialScanUrl(text, allowedOrigins);
}

function parseOfficialScanUrl(
  text: string,
  allowedOrigins: readonly string[],
): Tala3nyQrParseResult {
  let url: URL;

  try {
    url = new URL(text);
  } catch {
    return fail('invalid-url');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return fail('unsupported-payload');
  }

  if (url.username || url.password) {
    return fail('credentials');
  }

  const allowed = new Set(normalizeAllowedOrigins(allowedOrigins));

  if (!allowed.has(url.origin)) {
    return fail('disallowed-origin');
  }

  // Query and fragment are ignored only after origin + exact path are approved.
  const pathMatch = SCAN_PATH_PATTERN.exec(url.pathname);

  if (!pathMatch) {
    return fail(isExactScanPathWithBadToken(url.pathname) ? 'invalid-token' : 'invalid-path');
  }

  return { ok: true, token: pathMatch[1] };
}

function normalizeAllowedOrigins(origins: readonly string[]): string[] {
  const normalized: string[] = [];

  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.username || url.password) {
        continue;
      }

      normalized.push(url.origin);
    } catch {
      // Skip unusable allowlist entries rather than widening the match.
    }
  }

  return normalized;
}

function isExactScanPathWithBadToken(pathname: string): boolean {
  const match = /^\/c\/([^/]+)$/.exec(pathname);
  return !!match && !PUBLIC_TOKEN_PATTERN.test(match[1]);
}

function hasForbiddenPrefix(text: string): boolean {
  const lower = text.toLowerCase();
  return FORBIDDEN_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

function fail(reason: Tala3nyQrRejectReason): Tala3nyQrParseResult {
  return { ok: false, reason };
}
