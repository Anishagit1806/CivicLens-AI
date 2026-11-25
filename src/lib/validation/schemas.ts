import { z } from 'zod';
import {
  ISSUE_CATEGORIES,
  ISSUE_SEVERITIES,
  ISSUE_STATUSES,
  SUPPORTED_LOCALES,
} from '@/types/civic';

/**
 * Strips ASCII control characters (except newlines/tabs) and collapses excessive whitespace.
 * Preserves Unicode ranges including Tamil (\u0B80-\u0BFF) safely.
 */
export function sanitizeText(input: string, maxLength = 2500): string {
  const cleaned = input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[<>]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be under 100 characters')
    .transform((v) => sanitizeText(v, 100)),
  email: z.string().trim().toLowerCase().email('Please enter a valid email address').max(180),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  preferredLanguage: z.enum(SUPPORTED_LOCALES).default('en'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required').max(128),
});

export const createIssueSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(160, 'Title must be at most 160 characters')
    .transform((v) => sanitizeText(v, 160)),
  description: z
    .string()
    .trim()
    .min(15, 'Description must be at least 15 characters to allow accurate triage')
    .max(2500, 'Description must be at most 2500 characters')
    .transform((v) => sanitizeText(v, 2500)),
  category: z.enum(ISSUE_CATEGORIES),
  locationText: z
    .string()
    .trim()
    .min(3, 'Location address or landmark is required')
    .max(240, 'Location text must be at most 240 characters')
    .transform((v) => sanitizeText(v, 240)),
  wardOrZone: z
    .string()
    .trim()
    .min(2, 'Ward or zone is required')
    .max(80, 'Ward or zone must be at most 80 characters')
    .default('Central Zone')
    .transform((v) => sanitizeText(v, 80)),
  latitude: z.coerce
    .number()
    .finite()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  longitude: z.coerce
    .number()
    .finite()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  imageAlt: z
    .string()
    .trim()
    .max(240, 'Image alternative text must be at most 240 characters')
    .optional()
    .transform((v) => (v ? sanitizeText(v, 240) : undefined)),
});

export const aiAnalyzeRequestSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(160)
    .transform((v) => sanitizeText(v, 160)),
  description: z
    .string()
    .trim()
    .min(15, 'Description must be at least 15 characters')
    .max(2500)
    .transform((v) => sanitizeText(v, 2500)),
  selectedCategory: z.enum(ISSUE_CATEGORIES).optional(),
  locationText: z
    .string()
    .trim()
    .max(240)
    .optional()
    .transform((v) => (v ? sanitizeText(v, 240) : undefined)),
  latitude: z.coerce.number().finite().min(-90).max(90).optional(),
  longitude: z.coerce.number().finite().min(-180).max(180).optional(),
});

export const aiTriageResponseSchema = z.object({
  predictedCategory: z.enum(ISSUE_CATEGORIES),
  confidence: z.number().min(0).max(1),
  severity: z.enum(ISSUE_SEVERITIES),
  severityExplanation: z.string().min(10).max(500),
  urgencyScore: z.number().int().min(1).max(100),
  publicImpactScore: z.number().int().min(1).max(100),
  recommendations: z.array(z.string().min(5).max(240)).min(1).max(5),
});

export const updateIssueAdminSchema = z.object({
  status: z.enum(ISSUE_STATUSES),
  assignedDepartment: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v ? sanitizeText(v, 120) : null)),
  assignedToLabel: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform((v) => (v ? sanitizeText(v, 120) : null)),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? sanitizeText(v, 500) : undefined)),
  duplicateOfId: z.string().uuid().nullable().optional(),
});

export const issueQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? sanitizeText(v, 120) : undefined)),
  category: z.union([z.literal('all'), z.enum(ISSUE_CATEGORIES)]).default('all'),
  severity: z.union([z.literal('all'), z.enum(ISSUE_SEVERITIES)]).default('all'),
  status: z.union([z.literal('all'), z.enum(ISSUE_STATUSES)]).default('all'),
  sortBy: z.enum(['priority', 'newest', 'oldest', 'upvotes']).default('priority'),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(9),
  mineOnly: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((v) => v === true || v === 'true'),
});
