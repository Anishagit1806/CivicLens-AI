'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';

export default function LoginPage() {
  const router = useRouter();
  const { t, runtimeMode, refreshSession, pushToast } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitCredentials(targetEmail: string, targetPassword: string) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, password: targetPassword }),
      });
      const json = (await res.json()) as {
        data?: { user: { fullName: string; role: string } };
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Sign-in failed.');
      }

      await refreshSession();
      pushToast('success', `Signed in as ${json.data.user.fullName}`);
      router.push(json.data.user.role === 'admin' ? '/admin' : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await submitCredentials(email, password);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4f6c] text-white">
            <LogIn className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900">{t.nav.login}</h1>
            <p className="text-xs text-slate-600">
              Access your CivicLens AI citizen or municipal account
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
              htmlFor="login-email"
              className="block text-sm font-semibold text-slate-900"
            >
              Email Address
            </label>
            <input
              id="login-email"
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
              htmlFor="login-password"
              className="block text-sm font-semibold text-slate-900"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0b4f6c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093e55] disabled:opacity-50"
          >
            {submitting ? 'Signing in...' : t.nav.login}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-600">
          Need an account?{' '}
          <Link href="/register" className="font-bold text-[#0b4f6c] underline">
            {t.nav.register}
          </Link>
        </p>
      </div>

      {runtimeMode === 'demo' ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950">
          <p className="font-bold">Demo Mode Quick-Fill Accounts</p>
          <p className="mt-1">
            Available only when running in local Demo Store mode without Supabase Auth.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('citizen@civiclens.local');
                setPassword('Citizen123!');
              }}
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-950 hover:bg-amber-100"
            >
              Fill Citizen Demo
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@civiclens.local');
                setPassword('Admin123!');
              }}
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-950 hover:bg-amber-100"
            >
              Fill Admin Demo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
