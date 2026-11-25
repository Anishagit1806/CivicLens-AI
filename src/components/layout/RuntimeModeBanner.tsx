'use client';

import { Database, FlaskConical, Sparkles } from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';

export function RuntimeModeBanner() {
  const { runtimeMode, geminiConfigured, t } = useApp();

  if (runtimeMode === 'supabase') {
    return (
      <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Database className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t.modeBanner.supabaseTitle}</span>
          </span>
          <span className="inline-flex items-center gap-1 font-medium">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {geminiConfigured
                ? 'Gemini AI Server Triage Active'
                : 'Gemini Key Missing — Deterministic Fallback Active'}
            </span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-950">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <FlaskConical className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>
            {runtimeMode === 'demo'
              ? `${t.modeBanner.demoTitle}: ${t.modeBanner.demoSubtitle}`
              : t.modeBanner.unconfiguredTitle}
          </span>
        </span>
        <span className="rounded bg-amber-200/70 px-2 py-0.5 font-semibold text-amber-950">
          {geminiConfigured ? 'Gemini API Ready' : 'AI: Deterministic Fallback'}
        </span>
      </div>
    </div>
  );
}
