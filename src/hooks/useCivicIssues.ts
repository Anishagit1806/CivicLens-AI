'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CivicIssuePublic, IssueQueryParams, PaginatedResult } from '@/types/civic';

/**
 * Reusable hook for querying paginated civic issues from /api/issues.
 * Handles cancellation on unmount and avoids synchronous setState inside effects.
 */
export function useCivicIssues(params: IssueQueryParams, enabled = true) {
  const [data, setData] = useState<PaginatedResult<CivicIssuePublic> | null>(null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const search = params.search ?? '';
  const category = params.category ?? 'all';
  const severity = params.severity ?? 'all';
  const status = params.status ?? 'all';
  const sortBy = params.sortBy ?? 'priority';
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 9;
  const mineOnly = params.mineOnly ?? false;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    const qs = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      category,
      severity,
      status,
      sortBy,
      mineOnly: String(mineOnly),
    });
    if (search.trim()) {
      qs.set('search', search.trim());
    }

    fetch(`/api/issues?${qs.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = (await res.json()) as {
          data?: PaginatedResult<CivicIssuePublic>;
          error?: string;
        };
        if (!res.ok || !json.data) {
          throw new Error(json.error || 'Failed to load civic issues.');
        }
        return json.data;
      })
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to fetch issues.');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category, enabled, mineOnly, page, pageSize, reloadTick, search, severity, sortBy, status]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }, []);

  return { data, setData, loading: enabled ? loading : false, error, reload };
}
