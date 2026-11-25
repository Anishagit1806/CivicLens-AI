import fs from 'node:fs';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getUploadsDir } from '@/lib/data/demo-store';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { getRuntimeMode } from '@/lib/env';
import { jsonError } from '@/lib/http/responses';

const SAFE_LOCAL_FILENAME = /^[a-f0-9-]+\.(jpg|png|webp)$/i;
const SAFE_SUPABASE_KEY = /^[a-f0-9-]+\/[a-f0-9-]+\.(jpg|png|webp)$/i;

function mimeFromExt(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const decoded = decodeURIComponent(filename);
  const mode = getRuntimeMode();

  if (mode === 'supabase') {
    if (!SAFE_SUPABASE_KEY.test(decoded)) {
      return jsonError('Invalid evidence path.', 400);
    }
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return jsonError('Storage unavailable.', 503);
    }
    const { data, error } = await supabase.storage
      .from('issue-evidence')
      .createSignedUrl(decoded, 120);
    if (error || !data?.signedUrl) {
      return jsonError('Evidence photo not found or unauthorized.', 404);
    }
    return NextResponse.redirect(data.signedUrl);
  }

  if (!SAFE_LOCAL_FILENAME.test(decoded)) {
    return jsonError('Invalid filename.', 400);
  }

  const uploadsDir = path.resolve(getUploadsDir());
  const targetPath = path.resolve(uploadsDir, decoded);
  if (!targetPath.startsWith(uploadsDir + path.sep) && targetPath !== uploadsDir) {
    return jsonError('Forbidden path.', 403);
  }

  if (!fs.existsSync(targetPath)) {
    return jsonError('Evidence photo not found.', 404);
  }

  const fileBytes = fs.readFileSync(targetPath);
  return new NextResponse(fileBytes, {
    status: 200,
    headers: {
      'Content-Type': mimeFromExt(decoded),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
