'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, type TranslationDictionary } from '@/lib/i18n/translations';
import type { RuntimeMode } from '@/lib/env';
import type { SessionUser, SupportedLocale, UserNotification } from '@/types/civic';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface AppContextValue {
  locale: SupportedLocale;
  setLocale: (next: SupportedLocale) => void;
  t: TranslationDictionary;
  user: SessionUser | null;
  notifications: UserNotification[];
  runtimeMode: RuntimeMode;
  geminiConfigured: boolean;
  loadingAuth: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  pushToast: (type: ToastMessage['type'], text: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: React.ReactNode;
  initialUser: SessionUser | null;
  initialNotifications: UserNotification[];
  initialRuntimeMode: RuntimeMode;
  initialGeminiConfigured: boolean;
}

export function AppProvider({
  children,
  initialUser,
  initialNotifications,
  initialRuntimeMode,
  initialGeminiConfigured,
}: AppProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(
    initialUser?.preferredLanguage ?? 'en'
  );
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [notifications, setNotifications] =
    useState<UserNotification[]>(initialNotifications);
  const [runtimeMode, setRuntimeMode] = useState<RuntimeMode>(initialRuntimeMode);
  const [geminiConfigured, setGeminiConfigured] = useState<boolean>(
    initialGeminiConfigured
  );
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: SupportedLocale) => {
    setLocaleState(next);
    document.documentElement.lang = next;
    try {
      document.cookie = `civiclens_locale=${next}; path=/; max-age=31536000; samesite=lax`;
      window.localStorage.setItem('civiclens_locale', next);
    } catch {
      // Ignore
    }
  }, []);

  const pushToast = useCallback((type: ToastMessage['type'], text: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 5000);
  }, []);

  const refreshSession = useCallback(async () => {
    setLoadingAuth(true);
    try {
      const [meRes, healthRes] = await Promise.all([
        fetch('/api/auth/me', { cache: 'no-store' }),
        fetch('/api/health', { cache: 'no-store' }),
      ]);
      if (meRes.ok) {
        const json = (await meRes.json()) as {
          data: { user: SessionUser | null; notifications: UserNotification[] };
        };
        setUser(json.data.user);
        setNotifications(json.data.notifications ?? []);
      }
      if (healthRes.ok) {
        const health = (await healthRes.json()) as {
          data: { runtimeMode: RuntimeMode; geminiConfigured: boolean };
        };
        setRuntimeMode(health.data.runtimeMode);
        setGeminiConfigured(health.data.geminiConfigured);
      }
    } finally {
      setLoadingAuth(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setNotifications([]);
    pushToast('info', locale === 'ta' ? 'வெளியேறினீர்கள்.' : 'Signed out successfully.');
  }, [locale, pushToast]);

  const markNotificationAsRead = useCallback(async (id: string) => {
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId: id }),
    });
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    }
  }, []);

  const value: AppContextValue = {
    locale,
    setLocale,
    t: TRANSLATIONS[locale],
    user,
    notifications,
    runtimeMode,
    geminiConfigured,
    loadingAuth,
    refreshSession,
    logout,
    markNotificationAsRead,
    pushToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {/* Accessible Live Toast Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const styles =
            toast.type === 'error'
              ? 'border-red-300 bg-red-50 text-red-900'
              : toast.type === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                : 'border-sky-300 bg-sky-50 text-slate-900';
          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${styles}`}
            >
              <span>{toast.text}</span>
              <button
                type="button"
                onClick={() =>
                  setToasts((prev) => prev.filter((item) => item.id !== toast.id))
                }
                aria-label="Dismiss notification"
                className="rounded px-1.5 py-0.5 text-xs font-semibold hover:bg-black/5"
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return ctx;
}
