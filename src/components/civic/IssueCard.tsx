'use client';

import Link from 'next/link';
import { ArrowUpRight, MapPin, ThumbsUp } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import {
  AIProviderBadge,
  CategoryBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import type { CivicIssuePublic } from '@/types/civic';

interface IssueCardProps {
  issue: CivicIssuePublic;
  onUpvote?: (issueId: string) => void;
  upvoting?: boolean;
}

export function IssueCard({ issue, onUpvote, upvoting }: IssueCardProps) {
  const { t } = useApp();

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition-shadow hover:shadow-md">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold text-slate-600">
            {issue.referenceCode}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="rounded-lg bg-[#0b4f6c]/10 px-2.5 py-1 text-xs font-bold text-[#0b4f6c]">
              {t.common.priorityScore}: {issue.priorityScore.toFixed(1)}
            </span>
          </div>
        </div>

        <h3 className="text-base font-bold leading-snug text-slate-900">
          <Link
            href={`/issues/${issue.id}`}
            className="hover:text-[#0b4f6c] hover:underline"
          >
            {issue.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-sm text-slate-600">{issue.description}</p>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <CategoryBadge category={issue.category} />
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className="truncate">
            {issue.locationText} · {issue.wardOrZone}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <AIProviderBadge provider={issue.aiProvider} />

          <div className="flex items-center gap-2">
            {onUpvote ? (
              <button
                type="button"
                disabled={upvoting}
                onClick={() => onUpvote(issue.id)}
                aria-label={`${t.explorer.upvote}: ${issue.title} (${issue.upvoteCount})`}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
              >
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{issue.upvoteCount}</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{issue.upvoteCount}</span>
              </span>
            )}

            <Link
              href={`/issues/${issue.id}`}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#0b4f6c]"
            >
              <span>{t.explorer.viewDetails}</span>
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
