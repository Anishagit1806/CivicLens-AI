'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import type { SupportedLocale } from '@/types/civic';

export default function RegisterPage() {
  const router = useRouter();
  const { t, refreshSession, pushToast } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<SupportedLocale>('en');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          preferredLanguage,
        }),
      });
      const json = (await res.json()) as {
        data?: { requiresEmailConfirmation?: boolean };
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Registration failed.');
      }

      if (json.data.requiresEmailConfirmation) {
        pushToast(
          'info',
          'Account created. Please check your email to confirm before signing in.'
        );
        router.push('/login');
      } else {
        await refreshSession();
        pushToast('success', 'Citizen account registered and signed in.');
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to register.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4f6c] text-white">
            <UserPlus className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">
              {t.nav.register}
            </h1>
            <p className="text-xs text-slate-600">
              Create a verified citizen account to submit & track civic reports
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="mt-6 space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-xl border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-900"
            >
              {error}
            </div>
          ) : null}

          <div>
            <label
              htmlFor="register-name"
              className="block text-sm font-semibold text-slate-900"
            >
              Full Name
            </label>
            <input
              id="register-name"
              name="fullName"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="register-email"
              className="block text-sm font-semibold text-slate-900"
            >
              Email Address
            </label>
            <input
              id="register-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="register-password"
              className="block text-sm font-semibold text-slate-900"
            >
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
            <p className="mt-1 text-[11px] text-slate-600">
              Minimum 8 characters with at least one letter and one number.
            </p>
          </div>

          <div>
            <label
              htmlFor="register-language"
              className="block text-sm font-semibold text-slate-900"
            >
              Preferred Language
            </label>
            <select
              id="register-language"
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value as SupportedLocale)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0b4f6c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093e55] disabled:opacity-50"
          >
            {submitting ? 'Creating account...' : t.nav.register}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-600">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-[#0b4f6c] underline">
            {t.nav.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
