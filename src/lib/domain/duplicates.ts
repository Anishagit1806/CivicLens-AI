import type { CivicIssuePublic, DuplicateMatch, IssueCategory } from '@/types/civic';

const EARTH_RADIUS_METERS = 6_371_000;
const MAX_GEO_RADIUS_METERS = 400;
const DUPLICATE_THRESHOLD = 0.56;

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'near',
  'from',
  'that',
  'this',
  'there',
  'here',
  'have',
  'been',
  'very',
  'area',
  'road',
  'street',
  'issue',
  'problem',
  'please',
  'urgent',
]);

export function haversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

export function tokenizeForSimilarity(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

  const grams = new Set<string>(normalized);
  for (let i = 0; i < normalized.length - 1; i++) {
    grams.add(`${normalized[i]}_${normalized[i + 1]}`);
  }
  return grams;
}

export function computeJaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  const smaller = a.size <= b.size ? a : b;
  const larger = a.size <= b.size ? b : a;
  for (const token of smaller) {
    if (larger.has(token)) intersection += 1;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function areCategoriesCompatible(a: IssueCategory, b: IssueCategory): boolean {
  if (a === b) return true;
  const roadPair = new Set<IssueCategory>(['potholes', 'road_damage']);
  if (roadPair.has(a) && roadPair.has(b)) return true;
  const waterPair = new Set<IssueCategory>(['water_leakage', 'drainage']);
  if (waterPair.has(a) && waterPair.has(b)) return true;
  return false;
}

export interface DuplicateCandidateInput {
  title: string;
  description: string;
  locationText: string;
  category: IssueCategory;
  latitude: number;
  longitude: number;
}

export function detectDuplicateIssues(
  candidate: DuplicateCandidateInput,
  existingIssues: CivicIssuePublic[],
  limit = 3
): DuplicateMatch[] {
  const candidateTokens = tokenizeForSimilarity(
    `${candidate.title} ${candidate.description} ${candidate.locationText}`
  );

  const matches: DuplicateMatch[] = [];

  for (const existing of existingIssues) {
    if (existing.status === 'resolved' || existing.status === 'rejected') {
      continue;
    }

    // Fast bounding-box pre-filter (~0.005 deg is ~550m) before Haversine
    if (
      Math.abs(existing.latitude - candidate.latitude) > 0.006 ||
      Math.abs(existing.longitude - candidate.longitude) > 0.006
    ) {
      continue;
    }

    const distanceMeters = haversineDistanceMeters(
      candidate.latitude,
      candidate.longitude,
      existing.latitude,
      existing.longitude
    );

    if (distanceMeters > MAX_GEO_RADIUS_METERS) {
      continue;
    }

    const existingTokens = tokenizeForSimilarity(
      `${existing.title} ${existing.description} ${existing.locationText}`
    );
    const textSimilarity = computeJaccardSimilarity(candidateTokens, existingTokens);
    const geoScore = Math.max(0, 1 - distanceMeters / MAX_GEO_RADIUS_METERS);
    const categoryBonus = areCategoriesCompatible(candidate.category, existing.category)
      ? 0.14
      : 0;

    const combinedSimilarity = Math.min(
      1,
      Math.round((textSimilarity * 0.46 + geoScore * 0.4 + categoryBonus) * 1000) / 1000
    );

    if (combinedSimilarity >= DUPLICATE_THRESHOLD) {
      matches.push({
        issueId: existing.id,
        referenceCode: existing.referenceCode,
        title: existing.title,
        category: existing.category,
        status: existing.status,
        distanceMeters,
        textSimilarity: Math.round(textSimilarity * 1000) / 1000,
        combinedSimilarity,
      });
    }
  }

  return matches.sort((a, b) => b.combinedSimilarity - a.combinedSimilarity).slice(0, limit);
}
