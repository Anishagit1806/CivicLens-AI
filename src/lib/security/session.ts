import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { getRuntimeMode } from '@/lib/env';
import { readDemoStore } from '@/lib/data/demo-store';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import type { SessionUser, SupportedLocale, UserRole } from '@/types/civic';

export const DEMO_SESSION_COOKIE = 'civiclens_demo_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSigningSecret(): string {
  return (
    process.env.CIVICLENS_SESSION_SECRET?.trim() ||
    'civiclens-local-demo-fallback-secret-change-me'
  );
}

interface TokenPayload {
  sub: string;
  exp: number;
}

export function signDemoToken(userId: string): string {
  const payload: TokenPayload = {
    sub: userId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyDemoToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encoded)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, 'base64url').toString('utf8')
    ) as TokenPayload;
    if (!parsed.sub || typeof parsed.exp !== 'number') return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, preferred_language')
      .eq('id', user.id)
      .maybeSingle();

    const role: UserRole = profile?.role === 'admin' ? 'admin' : 'citizen';
    const preferredLanguage: SupportedLocale =
      profile?.preferred_language === 'ta' ? 'ta' : 'en';

    return {
      id: user.id,
      email: user.email ?? '',
      fullName: profile?.full_name ?? 'Verified Citizen',
      role,
      preferredLanguage,
      authMode: 'supabase',
    };
  }

  if (mode === 'demo') {
    const cookieStore = await cookies();
    const rawCookie = cookieStore.get(DEMO_SESSION_COOKIE)?.value;
    if (!rawCookie) return null;
    const payload = verifyDemoToken(rawCookie);
    if (!payload) return null;

    const store = readDemoStore();
    const user = store.users.find((u) => u.id === payload.sub);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      preferredLanguage: user.preferredLanguage,
      authMode: 'demo',
    };
  }

  return null;
}

export class AuthorizationError extends Error {
  public readonly statusCode: 401 | 403;
  constructor(statusCode: 401 | 403, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function requireAuth(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthorizationError(401, 'Authentication required. Please sign in.');
  }
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'admin') {
    throw new AuthorizationError(403, 'Administrator privileges are required.');
  }
  return user;
}
