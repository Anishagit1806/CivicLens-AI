'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Bell, PlusCircle } from 'lucide-react';
import { IssueCard } from '@/components/civic/IssueCard';
import { useApp } from '@/components/providers/AppProvider';
import { EmptyState, ErrorBanner, IssueGridSkeleton } from '@/components/ui/States';
import type { CivicIssuePublic, PaginatedResult } from '@/types/civic';

export default function CitizenDashboardPage() {
  const { user, notifications, markNotificationAsRead, t } = useApp();
  const [issues, setIssues] = useState<CivicIssuePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMyIssues = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/issues?mineOnly=true&pageSize=24&sortBy=newest', {
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        data?: PaginatedResult<CivicIssuePublic>;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to load your reports.');
      }
      setIssues(json.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadMyIssues();
  }, [loadMyIssues]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900">{t.nav.dashboard}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to track your submitted civic reports and municipal status notifications.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[#0b4f6c] px-5 py-2.5 text-sm font-bold text-white"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/register"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800"
          >
            {t.nav.register}
          </Link>
        </div>
      </div>
    );
  }

  const resolvedCount = issues.filter((i) => i.status === 'resolved').length;
  const openCount = issues.filter(
    (i) => i.status !== 'resolved' && i.status !== 'rejected'
  ).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome, {user.fullName}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Your submitted civic reports, real-time status updates, and notifications.
          </p>
        </div>
        <Link
          href="/report"
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b4f6c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093e55]"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>{t.nav.report}</span>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">
            My Submitted Reports
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">{issues.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Active Open</p>
          <p className="mt-1 text-3xl font-extrabold text-[#0b4f6c]">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-slate-500">Resolved</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">{resolvedCount}</p>
        </div>
      </div>

      {/* Notifications Panel */}
      <section
        aria-labelledby="citizen-notifs"
        className="rounded-2xl border border-slate-200 bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[#0b4f6c]" aria-hidden="true" />
          <h2 id="citizen-notifs" className="text-base font-bold text-slate-900">
            Status Notifications
          </h2>
        </div>

        {notifications.length === 0 ? (
          <p className="mt-2 text-xs text-slate-600">No notifications recorded yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs ${
                  n.isRead
                    ? 'border-slate-200 bg-slate-50 text-slate-700'
                    : 'border-sky-200 bg-sky-50 text-slate-900'
                }`}
              >
                <div>
                  <p className="font-bold">{n.title}</p>
                  <p className="mt-0.5 text-slate-600">{n.message}</p>
                </div>
                <div className="flex items-center gap-3">
                  {n.issueId ? (
                    <Link
                      href={`/issues/${n.issueId}`}
                      className="font-semibold text-[#0b4f6c] underline"
                    >
                      Inspect
                    </Link>
                  ) : null}
                  {!n.isRead ? (
                    <button
                      type="button"
                      onClick={() => void markNotificationAsRead(n.id)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-semibold text-slate-800 hover:bg-slate-100"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {error ? <ErrorBanner message={error} onRetry={() => void loadMyIssues()} /> : null}

      <section aria-labelledby="my-reports-heading" className="space-y-4">
        <h2 id="my-reports-heading" className="text-xl font-bold text-slate-900">
          My Civic Reports
        </h2>
        {loading ? (
          <IssueGridSkeleton count={3} />
        ) : issues.length === 0 ? (
          <EmptyState
            title="You have not submitted any civic issues yet"
            description="Report a pothole, water leakage, drainage clog, or broken streetlight to start tracking resolution."
            action={
              <Link
                href="/report"
                className="rounded-xl bg-[#0b4f6c] px-4 py-2 text-xs font-bold text-white"
              >
                {t.nav.report}
              </Link>
            }
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
