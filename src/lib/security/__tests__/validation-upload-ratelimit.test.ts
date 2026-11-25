import { describe, expect, it } from 'vitest';
import { checkRateLimit, clearRateLimits } from '@/lib/security/rate-limit';
import { signDemoToken, verifyDemoToken } from '@/lib/security/session';
import { validateUploadedImage } from '@/lib/security/upload';
import {
  createIssueSchema,
  registerSchema,
  sanitizeText,
} from '@/lib/validation/schemas';

describe('Input validation & XSS sanitization', () => {
  it('strips HTML angle brackets while preserving Tamil Unicode text', () => {
    const sanitized = sanitizeText('<script>alert(1)</script> சாலை குழி');
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
    expect(sanitized).toContain('சாலை குழி');
  });

  it('rejects weak passwords during registration', () => {
    const parsed = registerSchema.safeParse({
      fullName: 'Citizen One',
      email: 'citizen@example.com',
      password: 'short',
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects out-of-range coordinates in issue submission', () => {
    const parsed = createIssueSchema.safeParse({
      title: 'Deep pothole on main road',
      description: 'Very deep pothole causing accidents near the bus stand.',
      category: 'potholes',
      locationText: 'Anna Salai',
      wardOrZone: 'Ward 10',
      latitude: 145,
      longitude: 80.25,
    });
    expect(parsed.success).toBe(false);
  });
});

describe('Image upload magic-byte & MIME validation', () => {
  it('accepts a valid PNG signature', () => {
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const res = validateUploadedImage('evidence.png', 'image/png', pngBytes);
    expect(res.valid).toBe(true);
    if (res.valid) {
      expect(res.extension).toBe('png');
    }
  });

  it('rejects an HTML/script payload disguised with a .jpg extension and image/jpeg MIME', () => {
    const fakeJpg = new TextEncoder().encode('<script>alert("xss")</script>');
    const res = validateUploadedImage('malicious.jpg', 'image/jpeg', fakeJpg);
    expect(res.valid).toBe(false);
  });

  it('rejects SVG extensions even if non-empty', () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    const res = validateUploadedImage('vector.svg', 'image/svg+xml', svg);
    expect(res.valid).toBe(false);
  });

  it('rejects oversized uploads (> 5 MB)', () => {
    const huge = new Uint8Array(5 * 1024 * 1024 + 10);
    huge[0] = 0xff;
    huge[1] = 0xd8;
    huge[2] = 0xff;
    const res = validateUploadedImage('big.jpg', 'image/jpeg', huge);
    expect(res.valid).toBe(false);
  });
});

describe('Rate limiting & signed demo session tokens', () => {
  it('enforces sliding-window rate limit and returns retryAfterSeconds', () => {
    clearRateLimits();
    const now = 1_700_000_000_000;
    expect(checkRateLimit('127.0.0.1:login', 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit('127.0.0.1:login', 2, 60_000, now + 100).allowed).toBe(true);
    const blocked = checkRateLimit('127.0.0.1:login', 2, 60_000, now + 200);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('verifies valid signed tokens and rejects tampered tokens', () => {
    const token = signDemoToken('user-123');
    const verified = verifyDemoToken(token);
    expect(verified?.sub).toBe('user-123');

    const tampered = `${token.slice(0, -2)}xx`;
    expect(verifyDemoToken(tampered)).toBeNull();
  });
});
