import { cookies } from 'next/headers';
import { readDemoStore, verifyPassword } from '@/lib/data/demo-store';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { getRuntimeMode } from '@/lib/env';
import { handleApiError, jsonError, jsonOk } from '@/lib/http/responses';
import { checkRateLimit, getClientKey } from '@/lib/security/rate-limit';
import { DEMO_SESSION_COOKIE, signDemoToken } from '@/lib/security/session';
import { loginSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(getClientKey(request, 'login'), 12, 60_000);
    if (!rate.allowed) {
      return jsonError(
        'Too many sign-in attempts. Please wait before trying again.',
        429,
        { 'Retry-After': String(rate.retryAfterSeconds) }
      );
    }

    const body: unknown = await request.json();
    const parsed = loginSchema.parse(body);
    const mode = getRuntimeMode();

    if (mode === 'supabase') {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return jsonError('Authentication service is unavailable.', 503);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.email,
        password: parsed.password,
      });

      if (error || !data.user) {
        return jsonError('Invalid email or password.', 401);
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, role, preferred_language')
        .eq('id', data.user.id)
        .maybeSingle();

      return jsonOk({
        user: {
          id: data.user.id,
          email: data.user.email ?? parsed.email,
          fullName: profile?.full_name ?? 'Verified Citizen',
          role: profile?.role === 'admin' ? 'admin' : 'citizen',
          preferredLanguage: profile?.preferred_language === 'ta' ? 'ta' : 'en',
          authMode: 'supabase' as const,
        },
      });
    }

    if (mode === 'demo') {
      const store = readDemoStore();
      const user = store.users.find((u) => u.email.toLowerCase() === parsed.email);
      if (!user || !verifyPassword(parsed.password, user.passwordHash)) {
        return jsonError('Invalid email or password.', 401);
      }

      const token = signDemoToken(user.id);
      const cookieStore = await cookies();
      cookieStore.set(DEMO_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return jsonOk({
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          authMode: 'demo' as const,
        },
      });
    }

    return jsonError('Authentication backend is not configured.', 503);
  } catch (error) {
    return handleApiError(error);
  }
}
