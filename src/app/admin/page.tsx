'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import { SeverityBadge, StatusBadge } from '@/components/ui/Badges';
import { ErrorBanner } from '@/components/ui/States';
import { useCivicIssues } from '@/hooks/useCivicIssues';
import {
  ISSUE_STATUSES,
  type CivicIssuePublic,
  type IssueStatus,
} from '@/types/civic';

export default function AdminDashboardPage() {
  const { user, t, pushToast } = useApp();
  const isAdmin = user?.role === 'admin';
  const { data, setData, loading, error, reload } = useCivicIssues(
    { pageSize: 50, sortBy: 'priority' },
    isAdmin
  );

  const issues = data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string>('');
  const [status, setStatus] = useState<IssueStatus>('verified');
  const [department, setDepartment] = useState('');
  const [assignee, setAssignee] = useState('');
  const [note, setNote] = useState('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeIssue =
    issues.find((i) => i.id === selectedId) ?? issues[0] ?? null;

  function selectIssue(issue: CivicIssuePublic) {
    setSelectedId(issue.id);
    setStatus(issue.status);
    setDepartment(issue.assignedDepartment ?? '');
    setAssignee(issue.assignedToLabel ?? '');
    setDuplicateOfId(issue.duplicateOfId ?? '');
    setNote('');
    setSaveError(null);
  }

  async function handleSaveDecision(e: React.FormEvent) {
    e.preventDefault();
    if (!activeIssue) return;

    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/issues/${activeIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          assignedDepartment: department.trim() || null,
          assignedToLabel: assignee.trim() || null,
          note: note.trim() || undefined,
          duplicateOfId: duplicateOfId.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        data?: { issue: CivicIssuePublic };
        error?: string;
      };
      if (!res.ok || !json.data) {
        throw new Error(json.error || 'Failed to update issue.');
      }

      const updatedIssue = json.data.issue;
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((item) =>
                item.id === updatedIssue.id ? updatedIssue : item
              ),
            }
          : prev
      );
      setNote('');
      pushToast(
        'success',
        `${updatedIssue.referenceCode} updated to ${t.statuses[updatedIssue.status]}.`
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  if (!isAdmin) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-xl rounded-2xl border border-red-300 bg-white p-8 text-center shadow-xs"
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-800">
          <ShieldAlert className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900">
          {t.admin.unauthorizedTitle}
        </h1>
        <p className="mt-2 text-sm text-slate-600">{t.admin.unauthorizedBody}</p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/login"
            className="rounded-xl bg-[#0b4f6c] px-5 py-2.5 text-sm font-bold text-white"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/explore"
            className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-800"
          >
            {t.nav.explore}
          </Link>
        </div>
      </div>
    );
  }

  const displayError = saveError || error;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-slate-900">
            <ShieldCheck className="h-7 w-7 text-[#0b4f6c]" aria-hidden="true" />
            <span>{t.admin.heading}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">{t.admin.subheading}</p>
        </div>
      </div>

      {displayError ? <ErrorBanner message={displayError} onRetry={reload} /> : null}

      {loading ? (
        <div
          aria-busy="true"
          className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-200"
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Priority Queue Table/List */}
          <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 lg:col-span-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-700">
              Prioritized Triage Queue ({issues.length})
            </h2>
            <ul className="max-h-[580px] space-y-2 overflow-y-auto pr-1">
              {issues.map((issue) => {
                const active = activeIssue?.id === issue.id;
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => selectIssue(issue)}
                      className={`w-full rounded-xl border p-3.5 text-left transition-colors ${
                        active
                          ? 'border-[#0b4f6c] bg-[#0b4f6c]/5'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-slate-600">
                          {issue.referenceCode}
                        </span>
                        <span className="rounded bg-[#0b4f6c]/10 px-2 py-0.5 text-xs font-bold text-[#0b4f6c]">
                          Priority {issue.priorityScore.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-bold text-slate-900">
                        {issue.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-600">
                        {issue.locationText} · {issue.wardOrZone}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <SeverityBadge severity={issue.severity} />
                        <StatusBadge status={issue.status} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Admin Workflow Editor */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900">
              {t.admin.verifyAndAssign}
            </h2>

            {activeIssue ? (
              <form
                onSubmit={(e) => void handleSaveDecision(e)}
                className="mt-4 space-y-4"
              >
                <div className="rounded-xl bg-slate-50 p-3 text-xs">
                  <p className="font-mono font-bold text-slate-600">
                    {activeIssue.referenceCode}
                  </p>
                  <p className="mt-1 font-bold text-slate-900">{activeIssue.title}</p>
                  <Link
                    href={`/issues/${activeIssue.id}`}
                    className="mt-1 inline-block font-semibold text-[#0b4f6c] underline"
                  >
                    Inspect full report & AI explanation &rarr;
                  </Link>
                </div>

                <div>
                  <label
                    htmlFor="admin-status"
                    className="block text-xs font-bold text-slate-800"
                  >
                    {t.admin.updateStatus}
                  </label>
                  <select
                    id="admin-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as IssueStatus)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    {ISSUE_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {t.statuses[st]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-dept"
                    className="block text-xs font-bold text-slate-800"
                  >
                    {t.admin.departmentLabel}
                  </label>
                  <input
                    id="admin-dept"
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g., Metro Water Rapid Response"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-assignee"
                    className="block text-xs font-bold text-slate-800"
                  >
                    {t.admin.assigneeLabel}
                  </label>
                  <input
                    id="admin-assignee"
                    type="text"
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                    placeholder="e.g., Zone 5 Civil Squad"
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="admin-duplicate"
                    className="block text-xs font-bold text-slate-800"
                  >
                    Link as Duplicate of Existing Report (Optional)
                  </label>
                  <select
                    id="admin-duplicate"
                    value={duplicateOfId}
                    onChange={(e) => setDuplicateOfId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  >
                    <option value="">None (Primary Report)</option>
                    {issues
                      .filter((i) => i.id !== activeIssue.id)
                      .map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.referenceCode} — {candidate.title.slice(0, 48)}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="admin-note"
                    className="block text-xs font-bold text-slate-800"
                  >
                    {t.admin.noteLabel}
                  </label>
                  <textarea
                    id="admin-note"
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Document verification findings or crew dispatch details..."
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-[#0b4f6c] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#093e55] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : t.admin.saveDecision}
                </button>
              </form>
            ) : (
              <p className="mt-4 text-xs text-slate-600">
                Select an issue from the queue to update its status.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
