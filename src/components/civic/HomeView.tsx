'use client';

import Link from 'next/link';
import {
  Activity,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  MapPin,
  PlusCircle,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { IssueCard } from '@/components/civic/IssueCard';
import { useApp } from '@/components/providers/AppProvider';
import type { AnalyticsSummary, CivicIssuePublic } from '@/types/civic';

interface HomeViewProps {
  analytics: AnalyticsSummary;
  topIssues: CivicIssuePublic[];
}

export function HomeView({ analytics, topIssues }: HomeViewProps) {
  const { t } = useApp();

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-[#083344] via-[#0b4f6c] to-[#0a6e7d] px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
        <div className="relative z-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-sky-100">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.hero.eyebrow}</span>
          </p>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {t.hero.title}
          </h1>
          <p className="mt-4 text-base leading-relaxed text-sky-100 sm:text-lg">
            {t.hero.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/report"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#083344] shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-sky-50"
            >
              <PlusCircle className="h-4 w-4" aria-hidden="true" />
              <span>{t.hero.primaryCta}</span>
            </Link>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-white/20"
            >
              <span>{t.hero.secondaryCta}</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-transparent px-5 py-3 text-sm font-semibold text-sky-100 transition-colors hover:bg-white/10"
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>{t.nav.map}</span>
            </Link>
          </div>
        </div>

        {/* Live Stored KPI Strip */}
        <div className="relative z-10 mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xs">
            <p className="text-xs font-medium text-sky-100">{t.hero.statReports}</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {analytics.totalReports}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xs">
            <p className="text-xs font-medium text-sky-100">{t.hero.statResolved}</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {analytics.resolvedReports}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xs">
            <p className="text-xs font-medium text-sky-100">{t.hero.statAvgPriority}</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {analytics.averagePriorityScore}
            </p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-xs">
            <p className="text-xs font-medium text-sky-100">{t.hero.statCriticalOpen}</p>
            <p className="mt-1 text-3xl font-extrabold text-white">
              {analytics.openCriticalHighReports}
            </p>
          </div>
        </div>
      </section>

      {/* End-to-End Civic Workflow */}
      <section aria-labelledby="workflow-heading" className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              id="workflow-heading"
              className="text-2xl font-extrabold tracking-tight text-slate-900"
            >
              {t.workflow.heading}
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {t.workflow.subheading}
            </p>
          </div>
          <Link
            href="/analytics"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0b4f6c] hover:underline"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span>{t.nav.analytics}</span>
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.workflow.steps.map((step, idx) => {
            const icons = [
              <MapPin key="m" className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />,
              <Sparkles key="s" className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />,
              <Activity key="a" className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />,
              <ShieldCheck key="sh" className="h-5 w-5 text-[#0b4f6c]" aria-hidden="true" />,
            ];
            return (
              <div
                key={step.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#0b4f6c]/10">
                  {icons[idx]}
                </div>
                <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
                  {step.detail}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top Priority Issues */}
      <section aria-labelledby="top-issues-heading" className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="top-issues-heading"
              className="text-2xl font-extrabold tracking-tight text-slate-900"
            >
              Highest Priority Active Reports
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Ranked transparently by severity, urgency, public impact, and corroboration.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
          >
            <span>View all issues</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {topIssues.map((issue) => (
            <IssueCard key={issue.id} issue={issue} />
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700"
                aria-hidden="true"
              />
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Built for Municipal Accountability & Citizen Safety
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  Citizens can corroborate reports and track every transition from Submitted
                  through Verified, Assigned, In Progress, and Resolved.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/register"
                className="rounded-lg bg-[#0b4f6c] px-4 py-2 text-xs font-bold text-white hover:bg-[#093e55]"
              >
                {t.nav.register}
              </Link>
              <Link
                href="/admin"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50"
              >
                {t.nav.admin}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
