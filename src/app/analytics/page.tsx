import { AnalyticsView } from '@/components/civic/AnalyticsView';
import { getAnalyticsSummary } from '@/lib/data/repository';
import { getCurrentUser } from '@/lib/security/session';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const user = await getCurrentUser();
  const analytics = await getAnalyticsSummary(user);

  return <AnalyticsView analytics={analytics} />;
}
