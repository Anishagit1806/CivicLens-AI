import { getAnalyticsSummary } from '@/lib/data/repository';
import { handleApiError, jsonOk } from '@/lib/http/responses';
import { getCurrentUser } from '@/lib/security/session';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const analytics = await getAnalyticsSummary(user);
    return jsonOk(analytics);
  } catch (error) {
    return handleApiError(error);
  }
}
