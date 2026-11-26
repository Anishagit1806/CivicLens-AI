import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
import { AnalyticsView } from '@/components/civic/AnalyticsView';
import { IssueCard } from '@/components/civic/IssueCard';
import { AppProvider } from '@/components/providers/AppProvider';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badges';
import { EmptyState, ErrorBanner, IssueGridSkeleton } from '@/components/ui/States';
import type { AnalyticsSummary, CivicIssuePublic } from '@/types/civic';

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <AppProvider
      initialUser={null}
      initialNotifications={[]}
      initialRuntimeMode="demo"
      initialGeminiConfigured={false}
    >
      {ui}
    </AppProvider>
  );
}

const sampleIssue: CivicIssuePublic = {
  id: '11111111-1111-4111-8111-111111111111',
  referenceCode: 'CL-2026-1001',
  reporterId: 'user-1',
  reporterLabel: 'Verified Citizen',
  title: 'Burst drinking water pipeline outside hospital gate',
  description: 'High pressure pipeline burst flooding ambulance approach lane.',
  category: 'water_leakage',
  aiPredictedCategory: 'water_leakage',
  aiCategoryConfidence: 0.91,
  aiProvider: 'deterministic-fallback',
  severity: 'critical',
  severityExplanation: 'Critical hospital access hazard.',
  urgencyScore: 92,
  publicImpactScore: 90,
  priorityScore: 88.1,
  priorityBreakdown: {
    severityWeight: 0.4,
    severityScore: 95,
    urgencyWeight: 0.3,
    urgencyScore: 92,
    impactWeight: 0.25,
    publicImpactScore: 90,
    communityWeight: 0.05,
    communitySignalScore: 0,
    finalScore: 88.1,
    formulaSummary: '0.40×Severity(95) + 0.30×Urgency(92) + 0.25×Impact(90) + 0.05×Community(0) = 88.1',
  },
  aiRecommendations: ['Isolate main valve'],
  aiLimitationsNote: 'Deterministic fallback.',
  locationText: 'EVR Periyar Salai',
  wardOrZone: 'Ward 58',
  latitude: 13.0815,
  longitude: 80.2755,
  imageUrl: null,
  imageAlt: null,
  status: 'in_progress',
  assignedDepartment: 'Metro Water',
  assignedToLabel: 'Crew 5',
  duplicateOfId: null,
  duplicateSimilarity: null,
  upvoteCount: 3,
  createdAt: '2026-11-22T06:30:00.000Z',
  updatedAt: '2026-11-23T09:15:00.000Z',
  resolvedAt: null,
};

const sampleAnalytics: AnalyticsSummary = {
  totalReports: 7,
  resolvedReports: 2,
  openCriticalHighReports: 3,
  averagePriorityScore: 72.4,
  averageResolutionHours: 48.5,
  resolutionRatePercent: 28.6,
  duplicateCount: 1,
  byCategory: [
    { category: 'potholes', count: 2, resolved: 0 },
    { category: 'water_leakage', count: 1, resolved: 0 },
    { category: 'garbage', count: 1, resolved: 1 },
    { category: 'damaged_streetlights', count: 2, resolved: 0 },
    { category: 'drainage', count: 1, resolved: 0 },
    { category: 'road_damage', count: 1, resolved: 1 },
    { category: 'other', count: 0, resolved: 0 },
  ],
  bySeverity: [
    { severity: 'critical', count: 2 },
    { severity: 'high', count: 3 },
    { severity: 'medium', count: 2 },
    { severity: 'low', count: 0 },
  ],
  byStatus: [
    { status: 'submitted', count: 2 },
    { status: 'verified', count: 1 },
    { status: 'assigned', count: 1 },
    { status: 'in_progress', count: 1 },
    { status: 'resolved', count: 2 },
    { status: 'rejected', count: 0 },
  ],
  byWard: [{ ward: 'Ward 58', count: 2, avgPriority: 84.1 }],
  recentTrend: [{ date: '2026-11-23', submitted: 2, resolved: 1 }],
};

describe('UI states, non-color indicators & axe-core accessibility', () => {
  it('renders loading skeleton with aria-busy', () => {
    render(<IssueGridSkeleton count={3} />);
    expect(screen.getByLabelText('Loading civic issue reports')).toHaveAttribute(
      'aria-busy',
      'true'
    );
  });

  it('renders empty state and error banner with retry action', () => {
    const onRetry = vi.fn();
    render(
      <div>
        <EmptyState title="No items" description="Nothing matched your query." />
        <ErrorBanner message="Network timeout occurred" onRetry={onRetry} />
      </div>
    );
    expect(screen.getByText('No items')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Network timeout occurred');
    screen.getByRole('button', { name: 'Retry' }).click();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('communicates severity and status with explicit text labels alongside icons', () => {
    renderWithProvider(
      <div>
        <SeverityBadge severity="critical" />
        <StatusBadge status="in_progress" />
      </div>
    );
    expect(screen.getByText('Critical Severity')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('passes axe-core automated accessibility checks on IssueCard and AnalyticsView', async () => {
    const { container } = renderWithProvider(
      <main>
        <IssueCard issue={sampleIssue} />
        <AnalyticsView analytics={sampleAnalytics} />
      </main>
    );

    const results = await axe.run(container);
    expect(results.violations).toEqual([]);
  });
});
