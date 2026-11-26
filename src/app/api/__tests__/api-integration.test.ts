// @vitest-environment node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const cookieJar = new Map<string, string>();

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieJar.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    getAll: () =>
      Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

import { POST as analyzePost } from '@/app/api/ai/analyze/route';
import { GET as analyticsGet } from '@/app/api/analytics/route';
import { POST as loginPost } from '@/app/api/auth/login/route';
import { POST as logoutPost } from '@/app/api/auth/logout/route';
import { GET as meGet } from '@/app/api/auth/me/route';
import { POST as registerPost } from '@/app/api/auth/register/route';
import { GET as healthGet } from '@/app/api/health/route';
import { GET as issueGet, PATCH as issuePatch } from '@/app/api/issues/[id]/route';
import { POST as upvotePost } from '@/app/api/issues/[id]/upvote/route';
import { GET as issuesGet, POST as issuesPost } from '@/app/api/issues/route';
import { GET as uploadGet } from '@/app/api/uploads/[filename]/route';
import { resetDemoStore } from '@/lib/data/demo-store';
import { clearRateLimits } from '@/lib/security/rate-limit';

describe('CivicLens AI API & Integration Suite', () => {
  beforeAll(() => {
    const tempDir = path.join(os.tmpdir(), `civiclens-api-test-${process.pid}`);
    fs.mkdirSync(tempDir, { recursive: true });
    process.env.CIVICLENS_DATA_DIR = tempDir;
    process.env.CIVICLENS_ALLOW_DEMO_MODE = 'true';
  });

  beforeEach(() => {
    cookieJar.clear();
    clearRateLimits();
    resetDemoStore();
  });

  it('reports health status without exposing secrets', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      data: { status: string; runtimeMode: string };
    };
    expect(json.data.status).toBe('ok');
    expect(json.data.runtimeMode).toBe('demo');
    expect(JSON.stringify(json)).not.toContain('SESSION_SECRET');
  });

  it('rejects malformed JSON payloads with 400 instead of 500', async () => {
    const req = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{invalid-json',
    });
    const res = await loginPost(req);
    expect(res.status).toBe(400);
  });

  it('enforces auth on protected routes and prevents role escalation on register', async () => {
    // Unauthenticated issue submission -> 401
    const unauthCreate = await issuesPost(
      new Request('http://localhost/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Unauthenticated pothole report',
          description: 'Trying to create a report without logging in first.',
          category: 'potholes',
          locationText: 'Main Street',
          wardOrZone: 'Ward 1',
          latitude: 13.05,
          longitude: 80.25,
        }),
      })
    );
    expect(unauthCreate.status).toBe(401);

    // Public registration ignores injected role:'admin' and enforces 'citizen'
    const regRes = await registerPost(
      new Request('http://localhost/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Priya Raman',
          email: 'priya@example.com',
          password: 'Password123!',
          preferredLanguage: 'ta',
          role: 'admin',
        }),
      })
    );
    expect(regRes.status).toBe(201);
    const regJson = (await regRes.json()) as {
      data: { user: { role: string; preferredLanguage: string } };
    };
    expect(regJson.data.user.role).toBe('citizen');
    expect(regJson.data.user.preferredLanguage).toBe('ta');

    // Registered citizen cannot execute admin workflow update -> 403
    const forbiddenPatch = await issuePatch(
      new Request('http://localhost/api/issues/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      }),
      { params: Promise.resolve({ id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' }) }
    );
    expect(forbiddenPatch.status).toBe(403);
  });

  it('supports end-to-end citizen report creation with PNG upload, duplicate check, corroboration, and admin resolution', async () => {
    // 1. Login as seeded citizen
    const loginRes = await loginPost(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'citizen@civiclens.local',
          password: 'Citizen123!',
        }),
      })
    );
    expect(loginRes.status).toBe(200);

    // 2. Reject spoofed image upload (HTML disguised as .jpg)
    const badForm = new FormData();
    badForm.append('title', 'Spoofed upload test issue');
    badForm.append(
      'description',
      'Testing server magic-byte image validation against malicious scripts.'
    );
    badForm.append('category', 'garbage');
    badForm.append('locationText', 'Market Road');
    badForm.append('wardOrZone', 'Ward 10');
    badForm.append('latitude', '13.0600');
    badForm.append('longitude', '80.2400');
    badForm.append(
      'image',
      new File([new TextEncoder().encode('<script>alert(1)</script>')], 'evil.jpg', {
        type: 'image/jpeg',
      })
    );
    const badUploadRes = await issuesPost(
      new Request('http://localhost/api/issues', { method: 'POST', body: badForm })
    );
    expect(badUploadRes.status).toBe(400);

    // 3. Preview AI triage & nearby duplicate detection against seeded issue CL-2026-1002
    const previewRes = await analyzePost(
      new Request('http://localhost/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Deep waterlogged pothole cluster near Anna Flyover bus bay',
          description:
            'Large craters on the commuter lane near Anna Salai Gemini Circle causing bike skids.',
          selectedCategory: 'potholes',
          locationText: 'Anna Salai, Gemini Circle',
          latitude: 13.0525,
          longitude: 80.2513,
        }),
      })
    );
    expect(previewRes.status).toBe(200);
    const previewJson = (await previewRes.json()) as {
      data: { duplicates: Array<{ referenceCode: string }> };
    };
    expect(previewJson.data.duplicates.length).toBeGreaterThanOrEqual(1);

    // 4. Create valid report with genuine PNG magic bytes
    const validPng = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    const goodForm = new FormData();
    goodForm.append('title', 'Collapsed drainage slab near school entrance');
    goodForm.append(
      'description',
      'Stormwater slab collapsed right beside the primary school gate creating a dangerous pedestrian gap.'
    );
    goodForm.append('category', 'drainage');
    goodForm.append('locationText', 'Cathedral Road, Gate 1');
    goodForm.append('wardOrZone', 'Ward 114 - Teynampet');
    goodForm.append('latitude', '13.0480');
    goodForm.append('longitude', '80.2550');
    goodForm.append('imageAlt', 'Collapsed concrete drainage slab beside sidewalk');
    goodForm.append('image', new File([validPng], 'drain.png', { type: 'image/png' }));

    const createRes = await issuesPost(
      new Request('http://localhost/api/issues', { method: 'POST', body: goodForm })
    );
    expect(createRes.status).toBe(201);
    const createdJson = (await createRes.json()) as {
      data: {
        issue: {
          id: string;
          status: string;
          priorityScore: number;
          imageUrl: string | null;
        };
      };
    };
    const issueId = createdJson.data.issue.id;
    expect(createdJson.data.issue.status).toBe('submitted');
    expect(createdJson.data.issue.imageUrl).toMatch(/^\/api\/uploads\/.+\.png$/);

    // Verify stored upload retrieval & path traversal rejection
    const fileName = createdJson.data.issue.imageUrl!.split('/').pop()!;
    const fileRes = await uploadGet(
      new Request(`http://localhost/api/uploads/${fileName}`),
      { params: Promise.resolve({ filename: fileName }) }
    );
    expect(fileRes.status).toBe(200);
    expect(fileRes.headers.get('Content-Type')).toBe('image/png');

    const traversalRes = await uploadGet(
      new Request('http://localhost/api/uploads/..%2Fstore.json'),
      { params: Promise.resolve({ filename: '..%2Fstore.json' }) }
    );
    expect(traversalRes.status).toBe(400);

    // 5. Upvote / Corroborate once, then verify duplicate vote is flagged
    const upvote1 = await upvotePost(
      new Request(`http://localhost/api/issues/${issueId}/upvote`, { method: 'POST' }),
      { params: Promise.resolve({ id: issueId }) }
    );
    expect(upvote1.status).toBe(200);
    const upvote1Json = (await upvote1.json()) as {
      data: { alreadyUpvoted: boolean; issue: { upvoteCount: number } };
    };
    expect(upvote1Json.data.alreadyUpvoted).toBe(false);
    expect(upvote1Json.data.issue.upvoteCount).toBe(2);

    const upvote2 = await upvotePost(
      new Request(`http://localhost/api/issues/${issueId}/upvote`, { method: 'POST' }),
      { params: Promise.resolve({ id: issueId }) }
    );
    const upvote2Json = (await upvote2.json()) as {
      data: { alreadyUpvoted: boolean };
    };
    expect(upvote2Json.data.alreadyUpvoted).toBe(true);

    // 6. Logout and sign in as admin to verify & resolve the issue
    await logoutPost();
    const adminLogin = await loginPost(
      new Request('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@civiclens.local',
          password: 'Admin123!',
        }),
      })
    );
    expect(adminLogin.status).toBe(200);

    const patchRes = await issuePatch(
      new Request(`http://localhost/api/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          assignedDepartment: 'Stormwater Civil Division',
          assignedToLabel: 'Zone 9 Slab Crew',
          note: 'Precast RCC slab installed and inspected.',
        }),
      }),
      { params: Promise.resolve({ id: issueId }) }
    );
    expect(patchRes.status).toBe(200);

    // 7. Confirm history, analytics, and pagination
    const detailRes = await issueGet(
      new Request(`http://localhost/api/issues/${issueId}`),
      { params: Promise.resolve({ id: issueId }) }
    );
    expect(detailRes.status).toBe(200);
    const detailJson = (await detailRes.json()) as {
      data: { issue: { status: string }; history: Array<{ action: string }> };
    };
    expect(detailJson.data.issue.status).toBe('resolved');
    expect(detailJson.data.history.length).toBeGreaterThanOrEqual(2);

    const listRes = await issuesGet(
      new Request('http://localhost/api/issues?status=resolved&page=1&pageSize=5')
    );
    expect(listRes.status).toBe(200);

    const analyticsRes = await analyticsGet();
    expect(analyticsRes.status).toBe(200);
    const analyticsJson = (await analyticsRes.json()) as {
      data: { totalReports: number; resolvedReports: number };
    };
    expect(analyticsJson.data.totalReports).toBe(8);
    expect(analyticsJson.data.resolvedReports).toBe(3);

    // 8. Check /api/auth/me returns admin session without leaking passwordHash
    const meRes = await meGet();
    const meText = await meRes.text();
    expect(meText).not.toContain('passwordHash');
  });

  it('returns 400 for invalid issue UUID and 404 for unknown UUID', async () => {
    const badId = await issueGet(new Request('http://localhost/api/issues/not-a-uuid'), {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    expect(badId.status).toBe(400);

    const missingId = await issueGet(
      new Request('http://localhost/api/issues/99999999-9999-4999-8999-999999999998'),
      {
        params: Promise.resolve({
          id: '99999999-9999-4999-8999-999999999998',
        }),
      }
    );
    expect(missingId.status).toBe(404);
  });
});
