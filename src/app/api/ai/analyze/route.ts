import { analyzeCivicIssue } from '@/lib/ai/gemini';
import { findDuplicateMatches } from '@/lib/data/repository';
import { calculatePriority } from '@/lib/domain/priority';
import { handleApiError, jsonError, jsonOk, parseJsonBody } from '@/lib/http/responses';
import { checkRateLimit, getClientKey } from '@/lib/security/rate-limit';
import { requireAuth } from '@/lib/security/session';
import { aiAnalyzeRequestSchema } from '@/lib/validation/schemas';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const rate = checkRateLimit(getClientKey(request, `ai:${user.id}`), 15, 60_000);
    if (!rate.allowed) {
      return jsonError(
        'AI triage rate limit reached. Please wait a few seconds before retrying.',
        429,
        { 'Retry-After': String(rate.retryAfterSeconds) }
      );
    }

    const body = await parseJsonBody(request);
    const parsed = aiAnalyzeRequestSchema.parse(body);

    const triage = await analyzeCivicIssue({
      title: parsed.title,
      description: parsed.description,
      selectedCategory: parsed.selectedCategory,
      locationText: parsed.locationText,
    });

    const priority = calculatePriority({
      severity: triage.severity,
      urgencyScore: triage.urgencyScore,
      publicImpactScore: triage.publicImpactScore,
      upvoteCount: 1,
    });

    const duplicates =
      typeof parsed.latitude === 'number' && typeof parsed.longitude === 'number'
        ? await findDuplicateMatches({
            title: parsed.title,
            description: parsed.description,
            locationText: parsed.locationText ?? '',
            category: parsed.selectedCategory ?? triage.predictedCategory,
            latitude: parsed.latitude,
            longitude: parsed.longitude,
          })
        : [];

    return jsonOk({
      triage,
      priority,
      duplicates,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
