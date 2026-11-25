import { z } from 'zod';
import { upvoteCivicIssue } from '@/lib/data/repository';
import { handleApiError, jsonError, jsonOk } from '@/lib/http/responses';
import { checkRateLimit, getClientKey } from '@/lib/security/rate-limit';
import { requireAuth } from '@/lib/security/session';

const idParamSchema = z.string().uuid('Invalid issue ID.');

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const rate = checkRateLimit(getClientKey(request, `upvote:${user.id}`), 20, 60_000);
    if (!rate.allowed) {
      return jsonError('Too many requests. Please wait briefly.', 429, {
        'Retry-After': String(rate.retryAfterSeconds),
      });
    }

    const { id } = await context.params;
    const validId = idParamSchema.safeParse(id);
    if (!validId.success) {
      return jsonError('Invalid issue ID.', 400);
    }

    const result = await upvoteCivicIssue(validId.data, user);
    if (!result) {
      return jsonError('Civic issue report not found.', 404);
    }

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
