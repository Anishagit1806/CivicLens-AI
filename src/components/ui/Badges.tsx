'use client';

import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Construction,
  Cpu,
  Droplets,
  Info,
  Lightbulb,
  MapPin,
  ShieldAlert,
  Trash2,
  UserCheck,
  Waves,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';
import type {
  AIProvider,
  IssueCategory,
  IssueSeverity,
  IssueStatus,
} from '@/types/civic';

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const { t } = useApp();
  const config: Record<
    IssueSeverity,
    { style: string; icon: React.ReactNode }
  > = {
    critical: {
      style: 'border-red-300 bg-red-50 text-red-900',
      icon: <AlertOctagon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    high: {
      style: 'border-amber-300 bg-amber-50 text-amber-950',
      icon: <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    medium: {
      style: 'border-sky-300 bg-sky-50 text-sky-950',
      icon: <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    low: {
      style: 'border-slate-300 bg-slate-100 text-slate-800',
      icon: <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const item = config[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.style}`}
    >
      {item.icon}
      <span>{t.severities[severity]}</span>
    </span>
  );
}

export function StatusBadge({ status }: { status: IssueStatus }) {
  const { t } = useApp();
  const config: Record<IssueStatus, { style: string; icon: React.ReactNode }> = {
    submitted: {
      style: 'border-slate-300 bg-slate-100 text-slate-800',
      icon: <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    verified: {
      style: 'border-indigo-300 bg-indigo-50 text-indigo-950',
      icon: <ClipboardCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    assigned: {
      style: 'border-cyan-300 bg-cyan-50 text-cyan-950',
      icon: <UserCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    in_progress: {
      style: 'border-amber-300 bg-amber-50 text-amber-950',
      icon: <Wrench className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    resolved: {
      style: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      icon: <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
    rejected: {
      style: 'border-rose-300 bg-rose-50 text-rose-950',
      icon: <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    },
  };

  const item = config[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.style}`}
    >
      {item.icon}
      <span>{t.statuses[status]}</span>
    </span>
  );
}

export function CategoryBadge({ category }: { category: IssueCategory }) {
  const { t } = useApp();
  const icons: Record<IssueCategory, React.ReactNode> = {
    potholes: <Construction className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    garbage: <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    water_leakage: <Droplets className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    damaged_streetlights: <Lightbulb className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    drainage: <Waves className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    road_damage: <ShieldAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
    other: <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />,
  };

  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-800">
      {icons[category]}
      <span>{t.categories[category]}</span>
    </span>
  );
}

export function AIProviderBadge({ provider }: { provider: AIProvider }) {
  const { t } = useApp();
  if (provider === 'gemini') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900">
        <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>{t.common.geminiLabel}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      <Cpu className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{t.common.fallbackLabel}</span>
    </span>
  );
}
