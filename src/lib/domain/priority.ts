import type { IssueSeverity, PriorityBreakdown } from '@/types/civic';

const SEVERITY_BASE_SCORE: Record<IssueSeverity, number> = {
  low: 20,
  medium: 45,
  high: 75,
  critical: 95,
};

const WEIGHTS = {
  severity: 0.4,
  urgency: 0.3,
  impact: 0.25,
  community: 0.05,
} as const;

export interface PriorityInput {
  severity: IssueSeverity;
  urgencyScore: number;
  publicImpactScore: number;
  upvoteCount?: number;
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(100, Math.round(value)));
}

/**
 * Computes a transparent, reproducible priority score in [0..100] from
 * severity, urgency, public impact, and verified community corroboration.
 */
export function calculatePriority(input: PriorityInput): {
  priorityScore: number;
  breakdown: PriorityBreakdown;
} {
  const severityScore = SEVERITY_BASE_SCORE[input.severity];
  const urgencyScore = clampScore(input.urgencyScore);
  const publicImpactScore = clampScore(input.publicImpactScore);
  const upvotes = Math.max(1, Math.floor(input.upvoteCount ?? 1));
  const communitySignalScore = Math.min(100, (upvotes - 1) * 15);

  const rawScore =
    severityScore * WEIGHTS.severity +
    urgencyScore * WEIGHTS.urgency +
    publicImpactScore * WEIGHTS.impact +
    communitySignalScore * WEIGHTS.community;

  const priorityScore = Math.round(Math.max(0, Math.min(100, rawScore)) * 100) / 100;

  return {
    priorityScore,
    breakdown: {
      severityWeight: WEIGHTS.severity,
      severityScore,
      urgencyWeight: WEIGHTS.urgency,
      urgencyScore,
      impactWeight: WEIGHTS.impact,
      publicImpactScore,
      communityWeight: WEIGHTS.community,
      communitySignalScore,
      finalScore: priorityScore,
      formulaSummary: `0.40×Severity(${severityScore}) + 0.30×Urgency(${urgencyScore}) + 0.25×Impact(${publicImpactScore}) + 0.05×Community(${communitySignalScore}) = ${priorityScore}`,
    },
  };
}
