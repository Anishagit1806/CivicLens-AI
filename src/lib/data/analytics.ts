import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  type AnalyticsSummary,
  type CivicIssuePublic,
} from '@/types/civic';

/**
 * Computes real analytics directly from stored issue records.
 * Never fabricates counts, resolution times, or trends.
 */
export function computeAnalyticsFromIssues(issues: CivicIssuePublic[]): AnalyticsSummary {
  const totalReports = issues.length;
  const resolvedIssues = issues.filter((i) => i.status === 'resolved');
  const resolvedReports = resolvedIssues.length;

  const openCriticalHighReports = issues.filter(
    (i) =>
      i.status !== 'resolved' &&
      i.status !== 'rejected' &&
      (i.severity === 'critical' || i.severity === 'high')
  ).length;

  const averagePriorityScore =
    totalReports > 0
      ? Math.round(
          (issues.reduce((acc, item) => acc + item.priorityScore, 0) / totalReports) * 10
        ) / 10
      : 0;

  const resolutionDurationsHours: number[] = [];
  for (const item of resolvedIssues) {
    if (item.resolvedAt) {
      const start = new Date(item.createdAt).getTime();
      const end = new Date(item.resolvedAt).getTime();
      if (Number.isFinite(start) && Number.isFinite(end) && end >= start) {
        resolutionDurationsHours.push((end - start) / (1000 * 60 * 60));
      }
    }
  }

  const averageResolutionHours =
    resolutionDurationsHours.length > 0
      ? Math.round(
          (resolutionDurationsHours.reduce((a, b) => a + b, 0) /
            resolutionDurationsHours.length) *
            10
        ) / 10
      : null;

  const resolutionRatePercent =
    totalReports > 0 ? Math.round((resolvedReports / totalReports) * 1000) / 10 : 0;

  const duplicateCount = issues.filter((i) => i.duplicateOfId !== null).length;

  const byCategory = ISSUE_CATEGORIES.map((category) => {
    const group = issues.filter((i) => i.category === category);
    return {
      category,
      count: group.length,
      resolved: group.filter((i) => i.status === 'resolved').length,
    };
  });

  const bySeverity = ISSUE_SEVERITIES.map((severity) => ({
    severity,
    count: issues.filter((i) => i.severity === severity).length,
  }));

  const byStatus = ISSUE_STATUSES.map((status) => ({
    status,
    count: issues.filter((i) => i.status === status).length,
  }));

  const wardMap = new Map<string, { count: number; prioritySum: number }>();
  for (const item of issues) {
    const existing = wardMap.get(item.wardOrZone) ?? { count: 0, prioritySum: 0 };
    existing.count += 1;
    existing.prioritySum += item.priorityScore;
    wardMap.set(item.wardOrZone, existing);
  }

  const byWard = Array.from(wardMap.entries())
    .map(([ward, data]) => ({
      ward,
      count: data.count,
      avgPriority: Math.round((data.prioritySum / data.count) * 10) / 10,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const dayMap = new Map<string, { submitted: number; resolved: number }>();
  for (const item of issues) {
    const createdDay = item.createdAt.slice(0, 10);
    const createdEntry = dayMap.get(createdDay) ?? { submitted: 0, resolved: 0 };
    createdEntry.submitted += 1;
    dayMap.set(createdDay, createdEntry);

    if (item.resolvedAt) {
      const resolvedDay = item.resolvedAt.slice(0, 10);
      const resolvedEntry = dayMap.get(resolvedDay) ?? { submitted: 0, resolved: 0 };
      resolvedEntry.resolved += 1;
      dayMap.set(resolvedDay, resolvedEntry);
    }
  }

  const recentTrend = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-10)
    .map(([date, counts]) => ({
      date,
      submitted: counts.submitted,
      resolved: counts.resolved,
    }));

  return {
    totalReports,
    resolvedReports,
    openCriticalHighReports,
    averagePriorityScore,
    averageResolutionHours,
    resolutionRatePercent,
    duplicateCount,
    byCategory,
    bySeverity,
    byStatus,
    byWard,
    recentTrend,
  };
}
