import { notFound } from 'next/navigation';
import { IssueDetailView } from '@/components/civic/IssueDetailView';
import { getIssueById } from '@/lib/data/repository';
import { getCurrentUser } from '@/lib/security/session';

export const dynamic = 'force-dynamic';

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const record = await getIssueById(id, user);

  if (!record) {
    notFound();
  }

  return <IssueDetailView initialIssue={record.issue} history={record.history} />;
}
