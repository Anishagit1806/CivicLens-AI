'use client';

import { useApp } from '@/components/providers/AppProvider';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badges';
import type { AnalyticsSummary } from '@/types/civic';

export function AnalyticsView({ analytics }: { analytics: AnalyticsSummary }) {
  const { t } = useApp();
  const maxCategoryCount = Math.max(
    1,
    ...analytics.byCategory.map((item) => item.count)
  );
  const maxWardCount = Math.max(1, ...analytics.byWard.map((item) => item.count));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
          {t.analytics.heading}
        </h1>
        <p className="mt-1 text-sm text-slate-600">{t.analytics.subheading}</p>
      </div>

      {/* KPI Cards */}
      <section aria-label="Key civic analytics metrics" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {t.analytics.totalReports}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-slate-900">
            {analytics.totalReports}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {t.analytics.resolutionRate}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-700">
            {analytics.resolutionRatePercent}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {analytics.resolvedReports} resolved
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {t.analytics.avgResolutionHours}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-[#0b4f6c]">
            {analytics.averageResolutionHours !== null
              ? `${analytics.averageResolutionHours}h`
              : 'N/A'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Computed from resolved timestamps
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold uppercase text-slate-500">
            {t.analytics.duplicateClusters}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-amber-800">
            {analytics.duplicateCount}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            Avg priority: {analytics.averagePriorityScore}/100
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Distribution */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900">
            {t.analytics.byCategoryHeading}
          </h2>
          <div className="mt-4 space-y-3">
            {analytics.byCategory.map((row) => {
              const widthPct = Math.round((row.count / maxCategoryCount) * 100);
              return (
                <div key={row.category} className="space-y-1 text-xs">
                  <div className="flex justify-between font-semibold text-slate-800">
                    <span>{t.categories[row.category]}</span>
                    <span>
                      {row.count} total ({row.resolved} resolved)
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label={`${t.categories[row.category]}: ${row.count} reports`}
                    aria-valuenow={row.count}
                    aria-valuemin={0}
                    aria-valuemax={maxCategoryCount}
                    className="h-3 w-full overflow-hidden rounded-full bg-slate-100"
                  >
                    <div
                      className="h-full rounded-full bg-[#0b4f6c]"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Severity & Workflow Status */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">
              {t.analytics.bySeverityHeading}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {analytics.bySeverity.map((row) => (
                <li
                  key={row.severity}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <SeverityBadge severity={row.severity} />
                  <span className="text-base font-extrabold text-slate-900">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-900">
              {t.analytics.byStatusHeading}
            </h2>
            <ul className="mt-4 grid grid-cols-2 gap-3">
              {analytics.byStatus.map((row) => (
                <li
                  key={row.status}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <StatusBadge status={row.status} />
                  <span className="text-base font-extrabold text-slate-900">
                    {row.count}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {/* Ward Load Table + Bars */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">
          {t.analytics.byWardHeading}
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <th className="py-2 pr-4">Ward / Zone</th>
                <th className="py-2 pr-4">Reports</th>
                <th className="py-2 pr-4">Average Priority</th>
                <th className="py-2">Relative Load</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.byWard.map((ward) => (
                <tr key={ward.ward}>
                  <td className="py-2.5 pr-4 font-semibold text-slate-900">
                    {ward.ward}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-700">{ward.count}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs font-bold text-[#0b4f6c]">
                    {ward.avgPriority}
                  </td>
                  <td className="py-2.5">
                    <div className="h-2.5 w-36 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-[#0a6e7d]"
                        style={{
                          width: `${Math.round((ward.count / maxWardCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
