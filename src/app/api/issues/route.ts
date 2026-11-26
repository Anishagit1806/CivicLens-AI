import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { analyzeCivicIssue } from '@/lib/ai/gemini';
import { getUploadsDir } from '@/lib/data/demo-store';
import {
  createCivicIssueRecord,
  findDuplicateMatches,
  listIssues,
} from '@/lib/data/repository';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { getRuntimeMode } from '@/lib/env';
import {
  handleApiError,
  jsonError,
  jsonOk,
  parseFormData,
  parseJsonBody,
} from '@/lib/http/responses';
import { checkRateLimit, getClientKey } from '@/lib/security/rate-limit';
import { getCurrentUser, requireAuth } from '@/lib/security/session';
import { validateUploadedImage } from '@/lib/security/upload';
import { createIssueSchema, issueQuerySchema } from '@/lib/validation/schemas';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const parsedQuery = issueQuerySchema.parse({
      search: url.searchParams.get('search') ?? undefined,
      category: url.searchParams.get('category') ?? 'all',
      severity: url.searchParams.get('severity') ?? 'all',
      status: url.searchParams.get('status') ?? 'all',
      sortBy: url.searchParams.get('sortBy') ?? 'priority',
      page: url.searchParams.get('page') ?? 1,
      pageSize: url.searchParams.get('pageSize') ?? 9,
      mineOnly: url.searchParams.get('mineOnly') ?? false,
    });

    const user = await getCurrentUser();
    const result = await listIssues(parsedQuery, user);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const rate = checkRateLimit(getClientKey(request, `issue:${user.id}`), 10, 60_000);
    if (!rate.allowed) {
      return jsonError(
        'Too many issue submissions in a short period. Please wait and try again.',
        429,
        { 'Retry-After': String(rate.retryAfterSeconds) }
      );
    }

    const contentType = request.headers.get('content-type') ?? '';
    let payload: Record<string, unknown>;
    let validatedImage: ReturnType<typeof validateUploadedImage> | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await parseFormData(request);
      payload = {
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        locationText: formData.get('locationText'),
        wardOrZone: formData.get('wardOrZone') || 'Central Zone',
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
        imageAlt: formData.get('imageAlt') || undefined,
      };

      const fileEntry = formData.get('image');
      if (
        fileEntry &&
        typeof fileEntry === 'object' &&
        'arrayBuffer' in fileEntry &&
        fileEntry.size > 0
      ) {
        const buffer = new Uint8Array(await fileEntry.arrayBuffer());
        validatedImage = validateUploadedImage(
          fileEntry.name || 'upload.jpg',
          fileEntry.type || '',
          buffer
        );
        if (!validatedImage.valid) {
          return jsonError(validatedImage.error, 400);
        }
      }
    } else {
      const jsonBody = await parseJsonBody(request);
      if (!jsonBody || typeof jsonBody !== 'object') {
        return jsonError('Invalid JSON request payload.', 400);
      }
      payload = jsonBody as Record<string, unknown>;
    }

    const parsed = createIssueSchema.parse(payload);

    let imagePath: string | null = null;
    let imageBase64: string | undefined;
    let imageMimeType: 'image/jpeg' | 'image/png' | 'image/webp' | undefined;

    if (validatedImage && validatedImage.valid) {
      const safeFileName = `${crypto.randomUUID()}.${validatedImage.extension}`;
      const mode = getRuntimeMode();

      if (mode === 'supabase') {
        const supabase = await createSupabaseServerClient();
        if (!supabase) {
          return jsonError('Storage service unavailable.', 503);
        }
        const storageObjectKey = `${user.id}/${safeFileName}`;
        const { error: uploadError } = await supabase.storage
          .from('issue-evidence')
          .upload(storageObjectKey, validatedImage.bytes, {
            contentType: validatedImage.mimeType,
            upsert: false,
          });
        if (uploadError) {
          return jsonError('Failed to securely store uploaded image.', 500);
        }
        imagePath = storageObjectKey;
      } else {
        const uploadsDir = getUploadsDir();
        fs.mkdirSync(uploadsDir, { recursive: true });
        fs.writeFileSync(path.join(uploadsDir, safeFileName), validatedImage.bytes);
        imagePath = safeFileName;
      }

      imageBase64 = Buffer.from(validatedImage.bytes).toString('base64');
      imageMimeType = validatedImage.mimeType;
    }

    const [triage, duplicates] = await Promise.all([
      analyzeCivicIssue({
        title: parsed.title,
        description: parsed.description,
        selectedCategory: parsed.category,
        locationText: parsed.locationText,
        imageBase64,
        imageMimeType,
      }),
      findDuplicateMatches({
        title: parsed.title,
        description: parsed.description,
        locationText: parsed.locationText,
        category: parsed.category,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
      }),
    ]);

    const created = await createCivicIssueRecord({
      reporter: user,
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      locationText: parsed.locationText,
      wardOrZone: parsed.wardOrZone,
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      imagePath,
      imageAlt: parsed.imageAlt ?? (imagePath ? `Evidence photo for ${parsed.title}` : null),
      triage,
      duplicates,
    });

    return jsonOk(
      {
        issue: created,
        duplicates,
      },
      201
    );
  } catch (error) {
    console.error('[CivicLens] ISSUE SUBMISSION ERROR:', error);
    return handleApiError(error);
  }
}
