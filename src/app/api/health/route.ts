import { getRuntimeMode, isGeminiConfigured, isSupabaseConfigured } from '@/lib/env';
import { jsonOk } from '@/lib/http/responses';

export async function GET() {
  return jsonOk({
    status: 'ok',
    runtimeMode: getRuntimeMode(),
    supabaseConfigured: isSupabaseConfigured(),
    geminiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
}
