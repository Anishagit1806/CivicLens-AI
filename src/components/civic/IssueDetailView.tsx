'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  Link2,
  MapPin,
  ThumbsUp,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import {
  AIProviderBadge,
  CategoryBadge,
  SeverityBadge,
  StatusBadge,
} from '@/components/ui/Badges';
import type { CivicIssuePublic, IssueHistoryEntry } from '@/types/civic';

interface IssueDetailViewProps {
  initialIssue: CivicIssuePublic;
  history: IssueHistoryEntry[];
}

export function IssueDetailView({ initialIssue, history }: IssueDetailViewProps) {
  const { t, user, pushToast } = useApp();
  const [issue, setIssue] = useState(initialIssue);
  const [upvoting, setUpvoting] = useState(false);

  async function handleUpvote() {
    if (!user) {
      pushToast('info', 'Please sign in to corroborate this issue.');
      return;
    }
    setUpvoting(true);
    try {
      const res = await fetch(`/api/issues/${issue.id}/upvote`, { method: 'POST' });
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
        setIssue(json.data.issue);
        pushToast('success', 'Corroboration recorded and priority updated.');
      }
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Unable to corroborate.');
    } finally {
      setUpvoting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b4f6c] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>{t.detail.backToExplore}</span>
        </Link>

        {user?.role === 'admin' ? (
          <Link
            href={`/admin?issue=${issue.id}`}
            className="rounded-xl bg-[#0b4f6c] px-4 py-2 text-xs font-bold text-white hover:bg-[#093e55]"
          >
            Open in Admin Triage
          </Link>
        ) : null}
      </div>

      {/* Main Header Card */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono text-sm font-bold text-slate-600">
            {issue.referenceCode}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <AIProviderBadge provider={issue.aiProvider} />
            <span className="rounded-xl bg-[#0b4f6c] px-3 py-1 text-sm font-extrabold text-white">
              {t.common.priorityScore}: {issue.priorityScore.toFixed(1)}/100
            </span>
          </div>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {issue.title}
        </h1>

        <div className="mt-4 flex flex-wrap gap-2">
          <CategoryBadge category={issue.category} />
          <SeverityBadge severity={issue.severity} />
          <StatusBadge status={issue.status} />
        </div>

        <p className="mt-5 text-base leading-relaxed text-slate-700">
          {issue.description}
        </p>

        {issue.imageUrl ? (
          <figure className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={issue.imageUrl}
              alt={issue.imageAlt || `Submitted evidence for ${issue.title}`}
              className="max-h-[380px] w-full rounded-2xl border border-slate-200 object-cover"
            />
            {issue.imageAlt ? (
              <figcaption className="mt-2 text-xs text-slate-600">
                {issue.imageAlt}
              </figcaption>
            ) : null}
          </figure>
        ) : null}

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#0b4f6c]" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                {t.detail.wardLabel}
              </p>
              <p className="font-semibold text-slate-900">{issue.locationText}</p>
              <p className="text-xs text-slate-600">
                {issue.wardOrZone} · ({issue.latitude.toFixed(4)},{' '}
                {issue.longitude.toFixed(4)})
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Building2
              className="mt-0.5 h-4 w-4 shrink-0 text-[#0b4f6c]"
              aria-hidden="true"
            />
            <div>
              <p className="text-xs font-bold uppercase text-slate-500">
                {t.detail.assignedDept}
              </p>
              <p className="font-semibold text-slate-900">
                {issue.assignedDepartment || 'Pending Municipal Assignment'}
              </p>
              {issue.assignedToLabel ? (
                <p className="text-xs text-slate-600">{issue.assignedToLabel}</p>
              ) : null}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              type="button"
              disabled={upvoting}
              onClick={() => void handleUpvote()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
            >
              <ThumbsUp className="h-4 w-4 text-[#0b4f6c]" aria-hidden="true" />
              <span>
                {t.explorer.upvote} ({issue.upvoteCount})
              </span>
            </button>
          </div>
        </div>

        {issue.duplicateOfId ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-950">
            <div className="flex items-center gap-2 font-semibold">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              <span>
                {t.detail.duplicateNotice}
                {issue.duplicateSimilarity
                  ? ` (${Math.round(issue.duplicateSimilarity * 100)}% combined match)`
                  : ''}
              </span>
            </div>
            <Link
              href={`/issues/${issue.duplicateOfId}`}
              className="font-bold text-[#0b4f6c] underline"
            >
              View parent report &rarr;
            </Link>
          </div>
        ) : null}
      </section>

      {/* AI Triage + Priority Formula */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-slate-900">
              {t.detail.aiTriageHeading}
            </h2>
          </div>

          <div className="mt-4 space-y-3 text-sm text-slate-700">
            <p className="leading-relaxed">{issue.severityExplanation}</p>

            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
              <div>
                <p className="text-slate-500">AI Predicted Category</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {issue.aiPredictedCategory
                    ? t.categories[issue.aiPredictedCategory]
                    : t.categories[issue.category]}
                </p>
              </div>
              <div>
                <p className="text-slate-500">{t.common.confidence}</p>
                <p className="mt-0.5 font-bold text-slate-900">
                  {Math.round(issue.aiCategoryConfidence * 100)}%
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t.detail.recommendationsHeading}
              </h3>
              <ul className="mt-2 space-y-2">
                {issue.aiRecommendations.map((rec) => (
                  <li key={rec} className="flex items-start gap-2 text-xs text-slate-700">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                      aria-hidden="true"
                    />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              <p className="font-bold text-slate-800">{t.detail.limitationsHeading}</p>
              <p className="mt-1">{issue.aiLimitationsNote}</p>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">
              {t.detail.priorityBreakdownHeading}
            </h2>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Severity (40%)</dt>
                <dd className="mt-1 text-base font-extrabold text-slate-900">
                  {issue.priorityBreakdown.severityScore}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Urgency (30%)</dt>
                <dd className="mt-1 text-base font-extrabold text-slate-900">
                  {issue.priorityBreakdown.urgencyScore}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Impact (25%)</dt>
                <dd className="mt-1 text-base font-extrabold text-slate-900">
                  {issue.priorityBreakdown.publicImpactScore}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <dt className="text-slate-500">Community (5%)</dt>
                <dd className="mt-1 text-base font-extrabold text-slate-900">
                  {issue.priorityBreakdown.communitySignalScore}
                </dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg bg-slate-100 p-2.5 font-mono text-xs text-slate-800">
              {issue.priorityBreakdown.formulaSummary}
            </p>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-2">
              <CalendarClock
                className="h-5 w-5 text-[#0b4f6c]"
                aria-hidden="true"
              />
              <h2 className="text-lg font-bold text-slate-900">
                {t.detail.historyHeading}
              </h2>
            </div>

            {history.length === 0 ? (
              <p className="mt-3 text-xs text-slate-600">No history events recorded.</p>
            ) : (
              <ol className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
                {history.map((entry) => (
                  <li key={entry.id} className="text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold uppercase text-slate-800">
                        {entry.action.replace(/_/g, ' ')} ({entry.actorRole})
                      </span>
                      <time className="text-slate-500" dateTime={entry.createdAt}>
                        {new Date(entry.createdAt).toLocaleString()}
                      </time>
                    </div>
                    {entry.toStatus ? (
                      <p className="mt-0.5 font-medium text-[#0b4f6c]">
                        {entry.fromStatus ? `${entry.fromStatus} → ` : ''}
                        {entry.toStatus}
                      </p>
                    ) : null}
                    {entry.note ? (
                      <p className="mt-1 text-slate-600">{entry.note}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
