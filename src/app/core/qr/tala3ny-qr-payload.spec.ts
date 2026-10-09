import {
  MAX_QR_PAYLOAD_LENGTH,
  OFFICIAL_TALA3NY_ORIGINS,
  parseTala3nyQrPayload,
} from './tala3ny-qr-payload';

const TOKEN = 'AbcdefghijkLMNOP12345-';
const ORIGIN = 'https://qrcar.pages.dev';
const ALLOWED = [ORIGIN] as const;

describe('parseTala3nyQrPayload', () => {
  describe('bare tokens', () => {
    it('accepts a 22-character base64url token', () => {
      expect(parseTala3nyQrPayload(TOKEN, ALLOWED)).toEqual({ ok: true, token: TOKEN });
    });

    it('trims surrounding whitespace before accepting a token', () => {
      expect(parseTala3nyQrPayload(`  ${TOKEN}\n`, ALLOWED)).toEqual({ ok: true, token: TOKEN });
    });

    it('accepts a bare token even when the origin allowlist is empty', () => {
      expect(parseTala3nyQrPayload(TOKEN, [])).toEqual({ ok: true, token: TOKEN });
    });

    it('rejects a short token', () => {
      expect(parseTala3nyQrPayload(TOKEN.slice(0, 21), ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });

    it('rejects a long token', () => {
      expect(parseTala3nyQrPayload(`${TOKEN}x`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });

    it('rejects a token with spaces inside', () => {
      expect(parseTala3nyQrPayload('Abcdefghijk LMNOP12345', ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });

    it('rejects a token with characters outside base64url', () => {
      expect(parseTala3nyQrPayload('AbcdefghijkLMNOP12345+', ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });
  });

  describe('official scan URLs', () => {
    it('accepts an official https /c/{token} URL', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: true,
        token: TOKEN,
      });
    });

    it('uses the documented official origin list', () => {
      expect(
        parseTala3nyQrPayload(`${OFFICIAL_TALA3NY_ORIGINS[0]}/c/${TOKEN}`, OFFICIAL_TALA3NY_ORIGINS),
      ).toEqual({ ok: true, token: TOKEN });
    });

    it('strips a query string only after the URL is approved', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}?utm=1&x=y`, ALLOWED)).toEqual({
        ok: true,
        token: TOKEN,
      });
    });

    it('strips a fragment only after the URL is approved', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}#section`, ALLOWED)).toEqual({
        ok: true,
        token: TOKEN,
      });
    });

    it('accepts a trailing slash on the allowlisted origin value', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}`, [`${ORIGIN}/`])).toEqual({
        ok: true,
        token: TOKEN,
      });
    });

    it('accepts an explicit default https port because origin comparison drops it', () => {
      expect(parseTala3nyQrPayload(`https://qrcar.pages.dev:443/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: true,
        token: TOKEN,
      });
    });

    it('accepts a localhost origin only when that origin is allowlisted', () => {
      const local = ['http://localhost:4200'] as const;
      expect(parseTala3nyQrPayload(`http://localhost:4200/c/${TOKEN}`, local)).toEqual({
        ok: true,
        token: TOKEN,
      });
    });
  });

  describe('rejected URLs', () => {
    it('rejects an empty string', () => {
      expect(parseTala3nyQrPayload('   ', ALLOWED)).toEqual({ ok: false, reason: 'empty' });
    });

    it('rejects oversized input', () => {
      const payload = 'a'.repeat(MAX_QR_PAYLOAD_LENGTH + 1);
      expect(parseTala3nyQrPayload(payload, ALLOWED)).toEqual({ ok: false, reason: 'too-long' });
    });

    it('rejects an external URL even when the path looks like /c/{token}', () => {
      expect(parseTala3nyQrPayload(`https://evil.example/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'disallowed-origin',
      });
    });

    it('rejects a lookalike host that contains the official domain', () => {
      expect(parseTala3nyQrPayload(`https://qrcar.pages.dev.evil.example/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'disallowed-origin',
      });
    });

    it('rejects the official host over http when only https is allowlisted', () => {
      expect(parseTala3nyQrPayload(`http://qrcar.pages.dev/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'disallowed-origin',
      });
    });

    it('rejects an unexpected port on an otherwise official host', () => {
      expect(parseTala3nyQrPayload(`https://qrcar.pages.dev:8443/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'disallowed-origin',
      });
    });

    it('rejects credentials in the URL', () => {
      expect(parseTala3nyQrPayload(`https://user:pass@qrcar.pages.dev/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'credentials',
      });
    });

    it('rejects a username-only credential that spoofs the official host', () => {
      expect(parseTala3nyQrPayload(`https://qrcar.pages.dev@evil.example/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'credentials',
      });
    });

    it('rejects extra path segments', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}/extra`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-path',
      });
    });

    it('rejects a trailing slash after the token', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/${TOKEN}/`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-path',
      });
    });

    it('rejects /C/{token} because the path is case-sensitive', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/C/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-path',
      });
    });

    it('rejects /c/ without a token', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-path',
      });
    });

    it('rejects a malformed token in an official URL', () => {
      expect(parseTala3nyQrPayload(`${ORIGIN}/c/not-a-valid-token`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-token',
      });
    });

    it('rejects a relative /c/{token} path that has no origin', () => {
      expect(parseTala3nyQrPayload(`/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });

    it('rejects a host without a protocol', () => {
      expect(parseTala3nyQrPayload(`qrcar.pages.dev/c/${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'invalid-url',
      });
    });
  });

  describe('unsupported payloads', () => {
    it('rejects javascript:', () => {
      expect(parseTala3nyQrPayload('javascript:alert(1)', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects data:', () => {
      expect(parseTala3nyQrPayload('data:text/html,hi', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects file:', () => {
      expect(parseTala3nyQrPayload('file:///etc/passwd', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects a Wi-Fi payload', () => {
      expect(parseTala3nyQrPayload('WIFI:T:WPA;S:Office;P:secret;;', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects a vCard payload', () => {
      expect(parseTala3nyQrPayload('BEGIN:VCARD\nFN:Owner\nEND:VCARD', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects a bitcoin payment payload', () => {
      expect(parseTala3nyQrPayload('bitcoin:bc1qexample', ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });

    it('rejects tala3ny: because that format is not in this release', () => {
      expect(parseTala3nyQrPayload(`tala3ny:${TOKEN}`, ALLOWED)).toEqual({
        ok: false,
        reason: 'unsupported-payload',
      });
    });
  });
});
