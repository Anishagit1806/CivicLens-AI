import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { readDemoStore, writeDemoStore, hashPassword } from '@/lib/data/demo-store';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { getRuntimeMode } from '@/lib/env';
import { handleApiError, jsonError, jsonOk, parseJsonBody } from '@/lib/http/responses';
import { checkRateLimit, getClientKey } from '@/lib/security/rate-limit';
import { DEMO_SESSION_COOKIE, signDemoToken } from '@/lib/security/session';
import { registerSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(getClientKey(request, 'register'), 8, 60_000);
    if (!rate.allowed) {
      return jsonError(
        'Too many registration attempts. Please try again shortly.',
        429,
        { 'Retry-After': String(rate.retryAfterSeconds) }
      );
    }

    const body = await parseJsonBody(request);
    const parsed = registerSchema.parse(body);
    const mode = getRuntimeMode();

    if (mode === 'supabase') {
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return jsonError('Authentication service is unavailable.', 503);
      }

      const { data, error } = await supabase.auth.signUp({
        email: parsed.email,
        password: parsed.password,
        options: {
          data: {
            full_name: parsed.fullName,
            preferred_language: parsed.preferredLanguage,
          },
        },
      });

      if (error || !data.user) {
        return jsonError(error?.message || 'Unable to create account.', 400);
      }

      return jsonOk(
        {
          user: {
            id: data.user.id,
            email: data.user.email ?? parsed.email,
            fullName: parsed.fullName,
            role: 'citizen' as const,
            preferredLanguage: parsed.preferredLanguage,
            authMode: 'supabase' as const,
          },
          requiresEmailConfirmation: !data.session,
        },
        201
      );
    }

    if (mode === 'demo') {
      const store = readDemoStore();
      const exists = store.users.some((u) => u.email.toLowerCase() === parsed.email);
      if (exists) {
        return jsonError('An account with this email already exists.', 409);
      }

      // Security: role is ALWAYS 'citizen' on public self-registration
      const newUser = {
        id: crypto.randomUUID(),
        email: parsed.email,
        fullName: parsed.fullName,
        role: 'citizen' as const,
        preferredLanguage: parsed.preferredLanguage,
        passwordHash: hashPassword(parsed.password),
        createdAt: new Date().toISOString(),
      };

      store.users.push(newUser);
      writeDemoStore(store);

      const token = signDemoToken(newUser.id);
      const cookieStore = await cookies();
      cookieStore.set(DEMO_SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      });

      return jsonOk(
        {
          user: {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            role: newUser.role,
            preferredLanguage: newUser.preferredLanguage,
            authMode: 'demo' as const,
          },
          requiresEmailConfirmation: false,
        },
        201
      );
    }

    return jsonError('Authentication backend is not configured.', 503);
  } catch (error) {
    return handleApiError(error);
  }
}
