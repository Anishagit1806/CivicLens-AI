export type RuntimeMode = 'supabase' | 'demo' | 'unconfigured';

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return (
    trimmed.length === 0 ||
    trimmed.includes('placeholder') ||
    trimmed.includes('your-project-ref') ||
    trimmed.includes('your-supabase') ||
    trimmed.includes('your-gemini')
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return !isPlaceholder(url) && !isPlaceholder(anonKey);
}

export function isSupabaseServiceRoleConfigured(): boolean {
  return !isPlaceholder(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isGeminiConfigured(): boolean {
  return !isPlaceholder(process.env.GEMINI_API_KEY);
}

export function isDemoModeAllowed(): boolean {
  if (process.env.NODE_ENV === 'test') return true;
  return process.env.CIVICLENS_ALLOW_DEMO_MODE === 'true';
}

export function getRuntimeMode(): RuntimeMode {
  if (isSupabaseConfigured()) return 'supabase';
  if (isDemoModeAllowed()) return 'demo';
  return 'unconfigured';
}

export function getGeminiModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
}

export function getAdminEmailAllowlist(): Set<string> {
  const raw = process.env.CIVICLENS_ADMIN_EMAILS ?? 'admin@civiclens.local';
  return new Set(
    raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}
