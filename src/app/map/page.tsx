'use client';

import { useCallback, useEffect, useState } from 'react';
import { InteractiveMap } from '@/components/civic/InteractiveMap';
import { useApp } from '@/components/providers/AppProvider';
import { ErrorBanner } from '@/components/ui/States';
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  type CivicIssuePublic,
  type IssueCategory,
  type IssueSeverity,
  type PaginatedResult,
} from '@/types/civic';

export default function MapPage() {
  const { t } = useApp();
  const [category, setCategory] = useState<IssueCategory | 'all'>('all');
  const [severity, setSeverity] = useState<IssueSeverity | 'all'>('all');
  const [issues, setIssues] = useState<CivicIssuePublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMapIssues = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '50',
        category,
        severity,
        sortBy: 'priority',
      });
      const res = await fetch(`/api/issues?${params.toString()}`, {
        cache: 'no-store',
      });
      const json = (await res.json()) as {
        data?: PaginatedResult<CivicIssuePublic>;
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to load map data.');
      }
      setIssues(json.data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load map.');
    } finally {
      setLoading(false);
    }
  }, [category, severity]);

  useEffect(() => {
    void loadMapIssues();
  }, [loadMapIssues]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            {t.nav.map}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Interactive spatial view of civic infrastructure issues filtered by category and severity.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div>
            <label htmlFor="map-category" className="sr-only">
              Filter map by category
            </label>
            <select
              id="map-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as IssueCategory | 'all')}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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
            <label htmlFor="map-severity" className="sr-only">
              Filter map by severity
            </label>
            <select
              id="map-severity"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as IssueSeverity | 'all')}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="all">{t.explorer.allSeverities}</option>
              {ISSUE_SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {t.severities[sev]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend (Color + Text, never color alone) */}
      <div
        aria-label="Map marker severity legend"
        className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#b91c1c]" aria-hidden="true" />
          <span>{t.severities.critical}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#b45309]" aria-hidden="true" />
          <span>{t.severities.high}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#0369a1]" aria-hidden="true" />
          <span>{t.severities.medium}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#475569]" aria-hidden="true" />
          <span>{t.severities.low}</span>
        </span>
      </div>

      {error ? <ErrorBanner message={error} onRetry={() => void loadMapIssues()} /> : null}

      {loading ? (
        <div
          aria-busy="true"
          className="h-[440px] animate-pulse rounded-2xl border border-slate-200 bg-slate-200"
        />
      ) : (
        <InteractiveMap issues={issues} heightClass="h-[460px]" />
      )}
    </div>
  );
}
