import { HomeView } from '@/components/civic/HomeView';
import { getAnalyticsSummary, listIssues } from '@/lib/data/repository';
import { getCurrentUser } from '@/lib/security/session';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();
  const [analytics, topResult] = await Promise.all([
    getAnalyticsSummary(user),
    listIssues({ page: 1, pageSize: 3, sortBy: 'priority' }, user),
  ]);

  return <HomeView analytics={analytics} topIssues={topResult.items} />;
}
