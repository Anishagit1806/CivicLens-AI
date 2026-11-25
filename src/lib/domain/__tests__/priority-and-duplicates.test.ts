import { describe, expect, it } from 'vitest';
import {
  detectDuplicateIssues,
  haversineDistanceMeters,
  tokenizeForSimilarity,
} from '@/lib/domain/duplicates';
import { calculatePriority } from '@/lib/domain/priority';
import type { CivicIssuePublic } from '@/types/civic';

function makeIssue(overrides: Partial<CivicIssuePublic>): CivicIssuePublic {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    referenceCode: 'CL-2026-2001',
    reporterId: 'user-1',
    reporterLabel: 'Verified Citizen',
    title: 'Deep pothole near Anna Flyover bus bay',
    description: 'Large waterlogged pothole causing two wheeler accidents near bus stop.',
    category: 'potholes',
    aiPredictedCategory: 'potholes',
    aiCategoryConfidence: 0.88,
    aiProvider: 'deterministic-fallback',
    severity: 'high',
    severityExplanation: 'High hazard.',
    urgencyScore: 80,
    publicImpactScore: 80,
    priorityScore: 74,
    priorityBreakdown: {
      severityWeight: 0.4,
      severityScore: 75,
      urgencyWeight: 0.3,
      urgencyScore: 80,
      impactWeight: 0.25,
      publicImpactScore: 80,
      communityWeight: 0.05,
      communitySignalScore: 0,
      finalScore: 74,
      formulaSummary: '',
    },
    aiRecommendations: ['Patch pothole'],
    aiLimitationsNote: 'Deterministic',
    locationText: 'Anna Salai, Gemini Circle',
    wardOrZone: 'Ward 114',
    latitude: 13.0524,
    longitude: 80.2512,
    imageUrl: null,
    imageAlt: null,
    status: 'submitted',
    assignedDepartment: null,
    assignedToLabel: null,
    duplicateOfId: null,
    duplicateSimilarity: null,
    upvoteCount: 1,
    createdAt: '2026-11-24T08:00:00.000Z',
    updatedAt: '2026-11-24T08:00:00.000Z',
    resolvedAt: null,
    ...overrides,
  };
}

describe('calculatePriority', () => {
  it('computes exact weighted priority and transparent breakdown', () => {
    const result = calculatePriority({
      severity: 'critical',
      urgencyScore: 90,
      publicImpactScore: 80,
      upvoteCount: 3,
    });

    // 0.4*95 + 0.3*90 + 0.25*80 + 0.05*30 = 38 + 27 + 20 + 1.5 = 86.5
    expect(result.priorityScore).toBe(86.5);
    expect(result.breakdown.severityScore).toBe(95);
    expect(result.breakdown.communitySignalScore).toBe(30);
    expect(result.breakdown.formulaSummary).toContain('86.5');
  });

  it('clamps out-of-range urgency and impact values safely', () => {
    const result = calculatePriority({
      severity: 'low',
      urgencyScore: 500,
      publicImpactScore: -10,
      upvoteCount: 1,
    });
    expect(result.breakdown.urgencyScore).toBe(100);
    expect(result.breakdown.publicImpactScore).toBe(1);
    expect(result.priorityScore).toBe(38.25);
  });
});

describe('detectDuplicateIssues & geospatial utilities', () => {
  it('measures Haversine distance accurately for nearby points', () => {
    const samePoint = haversineDistanceMeters(13.0524, 80.2512, 13.0524, 80.2512);
    const nearbyPoint = haversineDistanceMeters(13.0524, 80.2512, 13.053, 80.2515);
    expect(samePoint).toBe(0);
    expect(nearbyPoint).toBeGreaterThan(50);
    expect(nearbyPoint).toBeLessThan(120);
  });

  it('preserves Tamil Unicode tokens alongside English tokens', () => {
    const tokens = tokenizeForSimilarity('தெருவிளக்கு பழுது Anna Salai');
    expect(tokens.has('தெருவிளக்கு')).toBe(true);
    expect(tokens.has('anna')).toBe(true);
  });

  it('flags geographically close & textually similar open issues as duplicates', () => {
    const existing = [
      makeIssue({}),
      makeIssue({
        id: '22222222-2222-4222-8222-222222222222',
        referenceCode: 'CL-2026-2002',
        status: 'resolved',
      }),
      makeIssue({
        id: '33333333-3333-4333-8333-333333333333',
        referenceCode: 'CL-2026-2003',
        latitude: 13.2,
        longitude: 80.4,
      }),
    ];

    const matches = detectDuplicateIssues(
      {
        title: 'Waterlogged pothole near Anna Flyover bus bay',
        description: 'Large pothole near bus stop causing two wheeler accidents',
        locationText: 'Anna Salai Gemini Circle',
        category: 'potholes',
        latitude: 13.0526,
        longitude: 80.2513,
      },
      existing
    );

    expect(matches).toHaveLength(1);
    expect(matches[0]?.referenceCode).toBe('CL-2026-2001');
    expect(matches[0]?.distanceMeters).toBeLessThan(50);
    expect(matches[0]?.combinedSimilarity).toBeGreaterThanOrEqual(0.56);
  });
});
