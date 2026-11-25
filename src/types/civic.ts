export const ISSUE_CATEGORIES = [
  'potholes',
  'garbage',
  'water_leakage',
  'damaged_streetlights',
  'drainage',
  'road_damage',
  'other',
] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];

export const ISSUE_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
export type IssueSeverity = (typeof ISSUE_SEVERITIES)[number];

export const ISSUE_STATUSES = [
  'submitted',
  'verified',
  'assigned',
  'in_progress',
  'resolved',
  'rejected',
] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const USER_ROLES = ['citizen', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const SUPPORTED_LOCALES = ['en', 'ta'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export type AIProvider = 'gemini' | 'deterministic-fallback';

export interface PriorityBreakdown {
  severityWeight: number;
  severityScore: number;
  urgencyWeight: number;
  urgencyScore: number;
  impactWeight: number;
  publicImpactScore: number;
  communityWeight: number;
  communitySignalScore: number;
  finalScore: number;
  formulaSummary: string;
}

export interface AITriageResult {
  predictedCategory: IssueCategory;
  confidence: number;
  severity: IssueSeverity;
  severityExplanation: string;
  urgencyScore: number;
  publicImpactScore: number;
  recommendations: string[];
  provider: AIProvider;
  limitationsNote: string;
  cached?: boolean;
}

export interface DuplicateMatch {
  issueId: string;
  referenceCode: string;
  title: string;
  category: IssueCategory;
  status: IssueStatus;
  distanceMeters: number;
  textSimilarity: number;
  combinedSimilarity: number;
}

export interface CivicIssuePublic {
  id: string;
  referenceCode: string;
  reporterId: string;
  reporterLabel: string;
  title: string;
  description: string;
  category: IssueCategory;
  aiPredictedCategory: IssueCategory | null;
  aiCategoryConfidence: number;
  aiProvider: AIProvider;
  severity: IssueSeverity;
  severityExplanation: string;
  urgencyScore: number;
  publicImpactScore: number;
  priorityScore: number;
  priorityBreakdown: PriorityBreakdown;
  aiRecommendations: string[];
  aiLimitationsNote: string;
  locationText: string;
  wardOrZone: string;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  imageAlt: string | null;
  status: IssueStatus;
  assignedDepartment: string | null;
  assignedToLabel: string | null;
  duplicateOfId: string | null;
  duplicateSimilarity: number | null;
  upvoteCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
}

export interface IssueHistoryEntry {
  id: string;
  issueId: string;
  actorRole: 'citizen' | 'admin' | 'system';
  action: string;
  fromStatus: IssueStatus | null;
  toStatus: IssueStatus | null;
  note: string | null;
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  issueId: string | null;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  preferredLanguage: SupportedLocale;
  authMode: 'supabase' | 'demo';
}

export interface IssueQueryParams {
  search?: string;
  category?: IssueCategory | 'all';
  severity?: IssueSeverity | 'all';
  status?: IssueStatus | 'all';
  sortBy?: 'priority' | 'newest' | 'oldest' | 'upvotes';
  page?: number;
  pageSize?: number;
  mineOnly?: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyticsSummary {
  totalReports: number;
  resolvedReports: number;
  openCriticalHighReports: number;
  averagePriorityScore: number;
  averageResolutionHours: number | null;
  resolutionRatePercent: number;
  duplicateCount: number;
  byCategory: Array<{ category: IssueCategory; count: number; resolved: number }>;
  bySeverity: Array<{ severity: IssueSeverity; count: number }>;
  byStatus: Array<{ status: IssueStatus; count: number }>;
  byWard: Array<{ ward: string; count: number; avgPriority: number }>;
  recentTrend: Array<{ date: string; submitted: number; resolved: number }>;
}
