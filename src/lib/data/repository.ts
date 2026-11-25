import crypto from 'node:crypto';
import { computeAnalyticsFromIssues } from '@/lib/data/analytics';
import { readDemoStore, writeDemoStore } from '@/lib/data/demo-store';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { calculatePriority } from '@/lib/domain/priority';
import { detectDuplicateIssues } from '@/lib/domain/duplicates';
import { getRuntimeMode } from '@/lib/env';
import type {
  AITriageResult,
  AnalyticsSummary,
  CivicIssuePublic,
  DuplicateMatch,
  IssueCategory,
  IssueHistoryEntry,
  IssueQueryParams,
  IssueSeverity,
  IssueStatus,
  PaginatedResult,
  PriorityBreakdown,
  SessionUser,
  UserNotification,
} from '@/types/civic';

interface SupabaseIssueRow {
  id: string;
  reference_code: string;
  reporter_id: string;
  title: string;
  description: string;
  category: IssueCategory;
  ai_predicted_category: IssueCategory | null;
  ai_category_confidence: number;
  ai_provider: 'gemini' | 'deterministic-fallback';
  severity: IssueSeverity;
  severity_explanation: string;
  urgency_score: number;
  public_impact_score: number;
  priority_score: number;
  priority_breakdown: PriorityBreakdown;
  ai_recommendations: string[];
  ai_limitations_note: string;
  location_text: string;
  ward_or_zone: string;
  latitude: number;
  longitude: number;
  image_path: string | null;
  image_alt: string | null;
  status: IssueStatus;
  assigned_department: string | null;
  assigned_to_label: string | null;
  duplicate_of_id: string | null;
  duplicate_similarity: number | null;
  upvote_count: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

function mapSupabaseRowToPublic(row: SupabaseIssueRow): CivicIssuePublic {
  return {
    id: row.id,
    referenceCode: row.reference_code,
    reporterId: row.reporter_id,
    reporterLabel: 'Verified Citizen',
    title: row.title,
    description: row.description,
    category: row.category,
    aiPredictedCategory: row.ai_predicted_category,
    aiCategoryConfidence: Number(row.ai_category_confidence ?? 0.5),
    aiProvider: row.ai_provider,
    severity: row.severity,
    severityExplanation: row.severity_explanation,
    urgencyScore: row.urgency_score,
    publicImpactScore: row.public_impact_score,
    priorityScore: Number(row.priority_score),
    priorityBreakdown: row.priority_breakdown,
    aiRecommendations: Array.isArray(row.ai_recommendations) ? row.ai_recommendations : [],
    aiLimitationsNote: row.ai_limitations_note ?? '',
    locationText: row.location_text,
    wardOrZone: row.ward_or_zone,
    latitude: row.latitude,
    longitude: row.longitude,
    imageUrl: row.image_path ? `/api/uploads/${encodeURIComponent(row.image_path)}` : null,
    imageAlt: row.image_alt,
    status: row.status,
    assignedDepartment: row.assigned_department,
    assignedToLabel: row.assigned_to_label,
    duplicateOfId: row.duplicate_of_id,
    duplicateSimilarity:
      row.duplicate_similarity !== null ? Number(row.duplicate_similarity) : null,
    upvoteCount: row.upvote_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resolvedAt: row.resolved_at,
  };
}

export async function listIssues(
  query: IssueQueryParams,
  currentUser: SessionUser | null
): Promise<PaginatedResult<CivicIssuePublic>> {
  const mode = getRuntimeMode();
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, query.pageSize ?? 9));

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { items: [], total: 0, page, pageSize, totalPages: 1 };
    }

    let req = supabase.from('civic_issues').select('*', { count: 'exact' });

    if (query.category && query.category !== 'all') {
      req = req.eq('category', query.category);
    }
    if (query.severity && query.severity !== 'all') {
      req = req.eq('severity', query.severity);
    }
    if (query.status && query.status !== 'all') {
      req = req.eq('status', query.status);
    }
    if (query.mineOnly && currentUser) {
      req = req.eq('reporter_id', currentUser.id);
    }
    if (query.search) {
      const safe = query.search.replace(/[%_,()]/g, ' ').trim();
      if (safe) {
        req = req.or(
          `title.ilike.%${safe}%,description.ilike.%${safe}%,location_text.ilike.%${safe}%,reference_code.ilike.%${safe}%`
        );
      }
    }

    const sortBy = query.sortBy ?? 'priority';
    if (sortBy === 'newest') {
      req = req.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      req = req.order('created_at', { ascending: true });
    } else if (sortBy === 'upvotes') {
      req = req.order('upvote_count', { ascending: false });
    } else {
      req = req.order('priority_score', { ascending: false }).order('created_at', { ascending: false });
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, count, error } = await req.range(from, to);

    if (error) {
      throw new Error('Failed to load civic issues from database.');
    }

    const total = count ?? 0;
    const items = ((data ?? []) as SupabaseIssueRow[]).map(mapSupabaseRowToPublic);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    let filtered = store.issues.filter((issue) => {
      if (
        issue.status === 'rejected' &&
        currentUser?.role !== 'admin' &&
        currentUser?.id !== issue.reporterId
      ) {
        return false;
      }
      if (query.mineOnly && (!currentUser || issue.reporterId !== currentUser.id)) {
        return false;
      }
      if (query.category && query.category !== 'all' && issue.category !== query.category) {
        return false;
      }
      if (query.severity && query.severity !== 'all' && issue.severity !== query.severity) {
        return false;
      }
      if (query.status && query.status !== 'all' && issue.status !== query.status) {
        return false;
      }
      if (query.search) {
        const needle = query.search.toLowerCase();
        const haystack = `${issue.referenceCode} ${issue.title} ${issue.description} ${issue.locationText} ${issue.wardOrZone}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });

    const sortBy = query.sortBy ?? 'priority';
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sortBy === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (sortBy === 'upvotes') return b.upvoteCount - a.upvoteCount;
      if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
      return b.createdAt.localeCompare(a.createdAt);
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  return { items: [], total: 0, page, pageSize, totalPages: 1 };
}

export async function listMapIssues(currentUser: SessionUser | null): Promise<CivicIssuePublic[]> {
  const result = await listIssues(
    { page: 1, pageSize: 50, sortBy: 'priority' },
    currentUser
  );
  return result.items;
}

export async function getIssueById(
  issueId: string,
  currentUser: SessionUser | null
): Promise<{ issue: CivicIssuePublic; history: IssueHistoryEntry[] } | null> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const [{ data: issueRow, error: issueErr }, { data: histRows }] = await Promise.all([
      supabase.from('civic_issues').select('*').eq('id', issueId).maybeSingle(),
      supabase
        .from('issue_history')
        .select('id, issue_id, actor_role, action, from_status, to_status, note, created_at')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: false }),
    ]);

    if (issueErr || !issueRow) return null;
    const issue = mapSupabaseRowToPublic(issueRow as SupabaseIssueRow);
    const history: IssueHistoryEntry[] = (histRows ?? []).map((h) => ({
      id: h.id,
      issueId: h.issue_id,
      actorRole: h.actor_role,
      action: h.action,
      fromStatus: h.from_status,
      toStatus: h.to_status,
      note: h.note,
      createdAt: h.created_at,
    }));

    return { issue, history };
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    const issue = store.issues.find((i) => i.id === issueId);
    if (!issue) return null;
    if (
      issue.status === 'rejected' &&
      currentUser?.role !== 'admin' &&
      currentUser?.id !== issue.reporterId
    ) {
      return null;
    }

    const history = store.history
      .filter((h) => h.issueId === issueId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { issue, history };
  }

  return null;
}

export async function findDuplicateMatches(params: {
  title: string;
  description: string;
  locationText: string;
  category: IssueCategory;
  latitude: number;
  longitude: number;
}): Promise<DuplicateMatch[]> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];

    // Bounding box filter in SQL (~600m) to avoid scanning all rows
    const latDelta = 0.006;
    const lonDelta = 0.006;
    const { data } = await supabase
      .from('civic_issues')
      .select('*')
      .neq('status', 'resolved')
      .neq('status', 'rejected')
      .gte('latitude', params.latitude - latDelta)
      .lte('latitude', params.latitude + latDelta)
      .gte('longitude', params.longitude - lonDelta)
      .lte('longitude', params.longitude + lonDelta)
      .limit(40);

    const candidates = ((data ?? []) as SupabaseIssueRow[]).map(mapSupabaseRowToPublic);
    return detectDuplicateIssues(params, candidates);
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    return detectDuplicateIssues(params, store.issues);
  }

  return [];
}

export async function createCivicIssueRecord(params: {
  reporter: SessionUser;
  title: string;
  description: string;
  category: IssueCategory;
  locationText: string;
  wardOrZone: string;
  latitude: number;
  longitude: number;
  imagePath: string | null;
  imageAlt: string | null;
  triage: AITriageResult;
  duplicates: DuplicateMatch[];
}): Promise<CivicIssuePublic> {
  const mode = getRuntimeMode();
  const priority = calculatePriority({
    severity: params.triage.severity,
    urgencyScore: params.triage.urgencyScore,
    publicImpactScore: params.triage.publicImpactScore,
    upvoteCount: 1,
  });

  const topDuplicate = params.duplicates[0] ?? null;

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      throw new Error('Supabase client is not available.');
    }

    const { data, error } = await supabase
      .from('civic_issues')
      .insert({
        reporter_id: params.reporter.id,
        title: params.title,
        description: params.description,
        category: params.category,
        ai_predicted_category: params.triage.predictedCategory,
        ai_category_confidence: params.triage.confidence,
        ai_provider: params.triage.provider,
        severity: params.triage.severity,
        severity_explanation: params.triage.severityExplanation,
        urgency_score: params.triage.urgencyScore,
        public_impact_score: params.triage.publicImpactScore,
        priority_score: priority.priorityScore,
        priority_breakdown: priority.breakdown,
        ai_recommendations: params.triage.recommendations,
        ai_limitations_note: params.triage.limitationsNote,
        location_text: params.locationText,
        ward_or_zone: params.wardOrZone,
        latitude: params.latitude,
        longitude: params.longitude,
        image_path: params.imagePath,
        image_alt: params.imageAlt,
        status: 'submitted',
        duplicate_of_id: topDuplicate ? topDuplicate.issueId : null,
        duplicate_similarity: topDuplicate ? topDuplicate.combinedSimilarity : null,
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error('Unable to persist civic issue report.');
    }

    await supabase.from('issue_history').insert({
      issue_id: data.id,
      actor_id: params.reporter.id,
      actor_role: 'citizen',
      action: 'report_submitted',
      from_status: null,
      to_status: 'submitted',
      note: topDuplicate
        ? `Submitted with potential duplicate match (${topDuplicate.referenceCode}, ${Math.round(topDuplicate.combinedSimilarity * 100)}% similarity).`
        : 'Citizen report submitted and triaged.',
    });

    return mapSupabaseRowToPublic(data as SupabaseIssueRow);
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    store.sequenceCounter += 1;
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const referenceCode = `CL-2026-${store.sequenceCounter}`;

    const created: CivicIssuePublic = {
      id,
      referenceCode,
      reporterId: params.reporter.id,
      reporterLabel: 'Verified Citizen',
      title: params.title,
      description: params.description,
      category: params.category,
      aiPredictedCategory: params.triage.predictedCategory,
      aiCategoryConfidence: params.triage.confidence,
      aiProvider: params.triage.provider,
      severity: params.triage.severity,
      severityExplanation: params.triage.severityExplanation,
      urgencyScore: params.triage.urgencyScore,
      publicImpactScore: params.triage.publicImpactScore,
      priorityScore: priority.priorityScore,
      priorityBreakdown: priority.breakdown,
      aiRecommendations: params.triage.recommendations,
      aiLimitationsNote: params.triage.limitationsNote,
      locationText: params.locationText,
      wardOrZone: params.wardOrZone,
      latitude: params.latitude,
      longitude: params.longitude,
      imageUrl: params.imagePath
        ? `/api/uploads/${encodeURIComponent(params.imagePath)}`
        : null,
      imageAlt: params.imageAlt,
      status: 'submitted',
      assignedDepartment: null,
      assignedToLabel: null,
      duplicateOfId: topDuplicate ? topDuplicate.issueId : null,
      duplicateSimilarity: topDuplicate ? topDuplicate.combinedSimilarity : null,
      upvoteCount: 1,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
    };

    store.issues.unshift(created);
    store.history.unshift({
      id: crypto.randomUUID(),
      issueId: id,
      actorRole: 'citizen',
      action: 'report_submitted',
      fromStatus: null,
      toStatus: 'submitted',
      note: topDuplicate
        ? `Submitted with potential duplicate match (${topDuplicate.referenceCode}, ${Math.round(topDuplicate.combinedSimilarity * 100)}% similarity).`
        : 'Citizen report submitted and triaged.',
      createdAt: now,
    });
    store.notifications.unshift({
      id: crypto.randomUUID(),
      userId: params.reporter.id,
      issueId: id,
      title: `${referenceCode} submitted`,
      message: `Your report "${params.title}" has been triaged with priority ${priority.priorityScore}/100.`,
      isRead: false,
      createdAt: now,
    });

    writeDemoStore(store);
    return created;
  }

  throw new Error('Application storage is not configured.');
}

export async function updateIssueByAdmin(params: {
  admin: SessionUser;
  issueId: string;
  status: IssueStatus;
  assignedDepartment?: string | null;
  assignedToLabel?: string | null;
  note?: string;
  duplicateOfId?: string | null;
}): Promise<CivicIssuePublic | null> {
  if (params.admin.role !== 'admin') {
    throw new Error('Administrator authorization required.');
  }

  const mode = getRuntimeMode();
  const now = new Date().toISOString();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const { data: existing } = await supabase
      .from('civic_issues')
      .select('id, status, reporter_id, reference_code')
      .eq('id', params.issueId)
      .maybeSingle();

    if (!existing) return null;

    const updatePayload: Record<string, unknown> = {
      status: params.status,
      updated_at: now,
    };
    if (params.assignedDepartment !== undefined) {
      updatePayload.assigned_department = params.assignedDepartment;
    }
    if (params.assignedToLabel !== undefined) {
      updatePayload.assigned_to_label = params.assignedToLabel;
    }
    if (params.duplicateOfId !== undefined) {
      updatePayload.duplicate_of_id = params.duplicateOfId;
    }
    if (params.status === 'resolved') {
      updatePayload.resolved_at = now;
    }

    const { data: updated, error } = await supabase
      .from('civic_issues')
      .update(updatePayload)
      .eq('id', params.issueId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error('Failed to update civic issue.');
    }

    await supabase.from('issue_history').insert({
      issue_id: params.issueId,
      actor_id: params.admin.id,
      actor_role: 'admin',
      action: 'admin_status_update',
      from_status: existing.status,
      to_status: params.status,
      note:
        params.note ||
        `Status updated to ${params.status}${params.assignedDepartment ? ` (${params.assignedDepartment})` : ''}.`,
    });

    await supabase.from('notifications').insert({
      user_id: existing.reporter_id,
      issue_id: params.issueId,
      title: `${existing.reference_code} updated to ${params.status.replace('_', ' ')}`,
      message:
        params.note ||
        `Municipal administrators updated your report status to ${params.status.replace('_', ' ')}.`,
    });

    return mapSupabaseRowToPublic(updated as SupabaseIssueRow);
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    const idx = store.issues.findIndex((i) => i.id === params.issueId);
    if (idx === -1) return null;

    const current = store.issues[idx]!;
    const prevStatus = current.status;
    const nextResolvedAt =
      params.status === 'resolved'
        ? current.resolvedAt ?? now
        : params.status === 'rejected'
          ? null
          : current.resolvedAt;

    const updated: CivicIssuePublic = {
      ...current,
      status: params.status,
      assignedDepartment:
        params.assignedDepartment !== undefined
          ? params.assignedDepartment
          : current.assignedDepartment,
      assignedToLabel:
        params.assignedToLabel !== undefined
          ? params.assignedToLabel
          : current.assignedToLabel,
      duplicateOfId:
        params.duplicateOfId !== undefined ? params.duplicateOfId : current.duplicateOfId,
      updatedAt: now,
      resolvedAt: nextResolvedAt,
    };

    store.issues[idx] = updated;
    store.history.unshift({
      id: crypto.randomUUID(),
      issueId: current.id,
      actorRole: 'admin',
      action: 'admin_status_update',
      fromStatus: prevStatus,
      toStatus: params.status,
      note:
        params.note ||
        `Status updated to ${params.status}${updated.assignedDepartment ? ` — ${updated.assignedDepartment}` : ''}.`,
      createdAt: now,
    });
    store.notifications.unshift({
      id: crypto.randomUUID(),
      userId: current.reporterId,
      issueId: current.id,
      title: `${current.referenceCode} updated to ${params.status.replace('_', ' ')}`,
      message:
        params.note ||
        `Municipal administrators updated your report to ${params.status.replace('_', ' ')}.`,
      isRead: false,
      createdAt: now,
    });

    writeDemoStore(store);
    return updated;
  }

  return null;
}

export async function upvoteCivicIssue(
  issueId: string,
  user: SessionUser
): Promise<{ issue: CivicIssuePublic; alreadyUpvoted: boolean } | null> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return null;

    const { data: current } = await supabase
      .from('civic_issues')
      .select('*')
      .eq('id', issueId)
      .maybeSingle();

    if (!current) return null;
    const row = current as SupabaseIssueRow;
    const nextUpvotes = row.upvote_count + 1;
    const priority = calculatePriority({
      severity: row.severity,
      urgencyScore: row.urgency_score,
      publicImpactScore: row.public_impact_score,
      upvoteCount: nextUpvotes,
    });

    const { data: updated, error } = await supabase
      .from('civic_issues')
      .update({
        upvote_count: nextUpvotes,
        priority_score: priority.priorityScore,
        priority_breakdown: priority.breakdown,
      })
      .eq('id', issueId)
      .select('*')
      .single();

    if (error || !updated) return null;
    return {
      issue: mapSupabaseRowToPublic(updated as SupabaseIssueRow),
      alreadyUpvoted: false,
    };
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    const idx = store.issues.findIndex((i) => i.id === issueId);
    if (idx === -1) return null;

    const existingList = store.upvotedByUser[user.id] ?? [];
    if (existingList.includes(issueId)) {
      return { issue: store.issues[idx]!, alreadyUpvoted: true };
    }

    const current = store.issues[idx]!;
    const nextUpvotes = current.upvoteCount + 1;
    const priority = calculatePriority({
      severity: current.severity,
      urgencyScore: current.urgencyScore,
      publicImpactScore: current.publicImpactScore,
      upvoteCount: nextUpvotes,
    });

    const updated: CivicIssuePublic = {
      ...current,
      upvoteCount: nextUpvotes,
      priorityScore: priority.priorityScore,
      priorityBreakdown: priority.breakdown,
      updatedAt: new Date().toISOString(),
    };

    store.issues[idx] = updated;
    store.upvotedByUser[user.id] = [...existingList, issueId];
    writeDemoStore(store);

    return { issue: updated, alreadyUpvoted: false };
  }

  return null;
}

export async function getAnalyticsSummary(
  currentUser: SessionUser | null
): Promise<AnalyticsSummary> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return computeAnalyticsFromIssues([]);

    const { data } = await supabase
      .from('civic_issues')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    const issues = ((data ?? []) as SupabaseIssueRow[]).map(mapSupabaseRowToPublic);
    return computeAnalyticsFromIssues(issues);
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    const visible = store.issues.filter(
      (i) =>
        i.status !== 'rejected' ||
        currentUser?.role === 'admin' ||
        currentUser?.id === i.reporterId
    );
    return computeAnalyticsFromIssues(visible);
  }

  return computeAnalyticsFromIssues([]);
}

export async function listUserNotifications(userId: string): Promise<UserNotification[]> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return [];

    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, issue_id, title, message, is_read, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);

    return (data ?? []).map((n) => ({
      id: n.id,
      userId: n.user_id,
      issueId: n.issue_id,
      title: n.title,
      message: n.message,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    return store.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 20);
  }

  return [];
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return false;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId);
    return !error;
  }

  if (mode === 'demo') {
    const store = readDemoStore();
    const target = store.notifications.find(
      (n) => n.id === notificationId && n.userId === userId
    );
    if (!target) return false;
    target.isRead = true;
    writeDemoStore(store);
    return true;
  }

  return false;
}
