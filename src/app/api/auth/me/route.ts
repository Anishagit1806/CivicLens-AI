import { listUserNotifications } from '@/lib/data/repository';
import { jsonOk } from '@/lib/http/responses';
import { getCurrentUser } from '@/lib/security/session';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return jsonOk({ user: null, notifications: [] });
  }

  const notifications = await listUserNotifications(user.id);
  return jsonOk({ user, notifications });
}
