'use client';

import Link from 'next/link';
import { useApp } from '@/components/providers/AppProvider';

export function Footer() {
  const { t } = useApp();

  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 px-4 py-8 text-sm text-slate-600 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className="font-bold text-slate-900">{t.brandName}</p>
          <p className="mt-0.5 text-xs text-slate-600">{t.brandTagline}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-xs font-medium">
          <Link href="/explore" className="hover:text-slate-950 hover:underline">
            {t.nav.explore}
          </Link>
          <Link href="/map" className="hover:text-slate-950 hover:underline">
            {t.nav.map}
          </Link>
          <Link href="/report" className="hover:text-slate-950 hover:underline">
            {t.nav.report}
          </Link>
          <Link href="/analytics" className="hover:text-slate-950 hover:underline">
            {t.nav.analytics}
          </Link>
        </div>
      </div>
    </footer>
  );
}
