'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { IssueCard } from '@/components/civic/IssueCard';
import { useApp } from '@/components/providers/AppProvider';
import { EmptyState, ErrorBanner, IssueGridSkeleton } from '@/components/ui/States';
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type CivicIssuePublic,
  type IssueCategory,
  type IssueSeverity,
  type IssueStatus,
  type PaginatedResult,
} from '@/types/civic';

export default function ExplorePage() {
  const { t, user, pushToast } = useApp();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<IssueCategory | 'all'>('all');
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all');
  const [status, setStatus] = useState<IssueStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'newest' | 'oldest' | 'upvotes'>(
    'priority'
  );
  const [page, setPage] = useState(1);

  const [data, setData] = useState<PaginatedResult<CivicIssuePublic> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: '6',
        category,
        severity,
        status,
        sortBy,
      });
      if (search.trim()) {
        params.set('search', search.trim());
      }
      const res = await fetch(`/api/issues?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        data?: PaginatedResult<CivicIssuePublic>;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to load civic issues.');
      }
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch issues.');
    } finally {
      setLoading(false);
    }
  }, [category, page, search, severity, sortBy, status]);

  useEffect(() => {
    void fetchIssues();
  }, [fetchIssues]);

  async function handleUpvote(issueId: string) {
    if (!user) {
      pushToast('info', 'Please sign in to corroborate a civic report.');
      return;
    }
    setUpvotingId(issueId);
    try {
      const res = await fetch(`/api/issues/${issueId}/upvote`, { method: 'POST' });
      const json = (await res.json()) as {
        data?: { issue: CivicIssuePublic; alreadyUpvoted: boolean };
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to corroborate issue.');
      }
      if (json.data.alreadyUpvoted) {
        pushToast('info', 'You have already corroborated this issue.');
      } else {
        pushToast('success', 'Corroboration recorded and priority recalculated.');
        setData((prev) =>
          prev
            ? {
                ...prev,
                items: prev.items.map((item) =>
                  item.id === issueId ? json.data!.issue : item
                ),
              }
            : prev
        );
      }
    } catch (err) {
      pushToast(
        'error',
        err instanceof Error ? err.message : 'Unable to corroborate issue.'
      );
    } finally {
      setUpvotingId(null);
    }
  }

  function resetFilters() {
    setSearch('');
    setCategory('all');
    setSeverity('all');
    setStatus('all');
    setSortBy('priority');
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t.explorer.heading}
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.explorer.subheading}</p>
        </div>
        {data ? (
          <p className="text-xs font-semibold text-slate-600">
            Showing {data.items.length} of {data.total} reports
          </p>
        ) : null}
      </div>

      {/* Search & Filter Controls */}
      <section
        aria-label="Search and filter civic issues"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label htmlFor="explore-search" className="sr-only">
              {t.explorer.searchPlaceholder}
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden="true"
              />
              <input
                id="explore-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder={t.explorer.searchPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="explore-category" className="sr-only">
              Category filter
            </label>
            <select
              id="explore-category"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as IssueCategory | 'all');
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">{t.explorer.allCategories}</option>
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t.categories[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="explore-severity" className="sr-only">
              Severity filter
            </label>
            <select
              id="explore-severity"
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as IssueSeverity | 'all');
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">{t.explorer.allSeverities}</option>
              {ISSUE_SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {t.severities[sev]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="explore-status" className="sr-only">
                Status filter
              </label>
              <select
                id="explore-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as IssueStatus | 'all');
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900"
              >
                <option value="all">{t.explorer.allStatuses}</option>
                {ISSUE_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {t.statuses[st]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="explore-sort" className="sr-only">
                Sort issues
              </label>
              <select
                id="explore-sort"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(
                    e.target.value as 'priority' | 'newest' | 'oldest' | 'upvotes'
                  );
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900"
              >
                <option value="priority">{t.explorer.sortByPriority}</option>
                <option value="newest">{t.explorer.sortByNewest}</option>
                <option value="oldest">{t.explorer.sortByOldest}</option>
                <option value="upvotes">{t.explorer.sortByUpvotes}</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {error ? <ErrorBanner message={error} onRetry={() => void fetchIssues()} /> : null}

      {loading ? (
        <IssueGridSkeleton count={6} />
      ) : data && data.items.length === 0 ? (
        <EmptyState
          title={t.explorer.emptyTitle}
          description={t.explorer.emptyBody}
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-xl bg-[#0b4f6c] px-4 py-2 text-xs font-bold text-white hover:bg-[#093e55]"
            >
              Clear filters
            </button>
          }
        />
      ) : data ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.items.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onUpvote={handleUpvote}
                upvoting={upvotingId === issue.id}
              />
            ))}
          </div>

          {/* Pagination */}
          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
          >
            <p className="text-xs font-semibold text-slate-600">
              {t.common.pageOf} {data.page} / {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>{t.common.previous}</span>
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
              >
                <span>{t.common.next}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
