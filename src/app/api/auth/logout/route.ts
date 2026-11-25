import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/data/supabase-server';
import { getRuntimeMode } from '@/lib/env';
import { jsonOk } from '@/lib/http/responses';
import { DEMO_SESSION_COOKIE } from '@/lib/security/session';

export async function POST() {
  const mode = getRuntimeMode();
  if (mode === 'supabase') {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(DEMO_SESSION_COOKIE);
  return jsonOk({ signedOut: true });
}
