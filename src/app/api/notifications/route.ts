import { z } from 'zod';
import { listUserNotifications, markNotificationRead } from '@/lib/data/repository';
import { handleApiError, jsonError, jsonOk, parseJsonBody } from '@/lib/http/responses';
import { requireAuth } from '@/lib/security/session';

const patchSchema = z.object({
  notificationId: z.string().min(1).max(100),
});

export async function GET() {
  try {
    const user = await requireAuth();
    const notifications = await listUserNotifications(user.id);
    return jsonOk({ notifications });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuth();
    const body = await parseJsonBody(request);
    const parsed = patchSchema.parse(body);

    const updated = await markNotificationRead(parsed.notificationId, user.id);
    if (!updated) {
      return jsonError('Notification not found.', 404);
    }

    return jsonOk({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
