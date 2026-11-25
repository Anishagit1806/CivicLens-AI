'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Bell,
  Compass,
  Globe,
  LogOut,
  Menu,
  Shield,
  X,
} from 'lucide-react';
import { useApp } from '@/components/providers/AppProvider';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, setLocale, t, user, notifications, logout, markNotificationAsRead } =
    useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        setNotifOpen(false);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const navLinks = [
    { href: '/', label: t.nav.home },
    { href: '/explore', label: t.nav.explore },
    { href: '/map', label: t.nav.map },
    { href: '/report', label: t.nav.report },
    { href: '/analytics', label: t.nav.analytics },
    ...(user ? [{ href: '/dashboard', label: t.nav.dashboard }] : []),
    ...(user?.role === 'admin' ? [{ href: '/admin', label: t.nav.admin }] : []),
  ];

  async function handleLogout() {
    await logout();
    setMobileOpen(false);
    router.push('/');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <a href="#main-content" className="skip-link">
        {t.common.skipToContent}
      </a>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 rounded-lg py-1 pr-2 font-bold text-slate-900 hover:text-[#0b4f6c]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b4f6c] text-white shadow-xs">
              <Compass className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-base tracking-tight">{t.brandName}</span>
              <span className="hidden text-[11px] font-medium text-slate-600 sm:block">
                Smart Civic Triage
              </span>
            </span>
          </Link>
        </div>

        <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
          {navLinks.map((item) => {
            const active =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#0b4f6c] text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <button
            type="button"
            onClick={() => setLocale(locale === 'en' ? 'ta' : 'en')}
            aria-label={
              locale === 'en' ? 'Switch language to Tamil' : 'Switch language to English'
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
          >
            <Globe className="h-3.5 w-3.5 text-[#0b4f6c]" aria-hidden="true" />
            <span>{locale === 'en' ? 'தமிழ்' : 'EN'}</span>
          </button>

          {/* Notifications Dropdown */}
          {user ? (
            <div className="relative">
              <button
                type="button"
                aria-expanded={notifOpen}
                aria-haspopup="true"
                aria-label={`Notifications (${unreadCount} unread)`}
                onClick={() => setNotifOpen((prev) => !prev)}
                className="relative inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 hover:bg-slate-50"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-700 px-1 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {notifOpen ? (
                <div
                  role="region"
                  aria-label="Recent notifications"
                  className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-xl"
                >
                  <div className="mb-2 flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
                      Notifications
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs font-medium text-slate-600 hover:text-slate-900"
                    >
                      Close
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="py-3 text-xs text-slate-600">No notifications yet.</p>
                  ) : (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {notifications.slice(0, 6).map((n) => (
                        <li
                          key={n.id}
                          className={`rounded-lg border p-2.5 text-xs ${
                            n.isRead
                              ? 'border-slate-100 bg-slate-50 text-slate-700'
                              : 'border-sky-200 bg-sky-50 text-slate-900'
                          }`}
                        >
                          <p className="font-semibold">{n.title}</p>
                          <p className="mt-0.5 text-slate-600">{n.message}</p>
                          <div className="mt-1.5 flex items-center justify-between">
                            {n.issueId ? (
                              <Link
                                href={`/issues/${n.issueId}`}
                                onClick={() => setNotifOpen(false)}
                                className="font-semibold text-[#0b4f6c] underline"
                              >
                                View
                              </Link>
                            ) : (
                              <span />
                            )}
                            {!n.isRead ? (
                              <button
                                type="button"
                                onClick={() => void markNotificationAsRead(n.id)}
                                className="font-medium text-slate-700 hover:underline"
                              >
                                Mark read
                              </button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Auth Controls (Desktop) */}
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-800">
                  {user.role === 'admin' ? (
                    <Shield className="h-3.5 w-3.5 text-[#0b4f6c]" aria-hidden="true" />
                  ) : null}
                  <span className="max-w-[130px] truncate">{user.fullName}</span>
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold uppercase text-slate-800">
                    {user.role}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                >
                  <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{t.nav.logout}</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-[#0b4f6c] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#093e55]"
                >
                  {t.nav.register}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-800 lg:hidden"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen ? (
        <div
          id="mobile-nav-drawer"
          className="border-t border-slate-200 bg-white px-4 py-3 lg:hidden"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1">
            {navLinks.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    active ? 'bg-[#0b4f6c] text-white' : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="mt-2 flex flex-wrap gap-2 border-t border-slate-200 pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  <span>{t.nav.logout}</span>
                </button>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800"
                  >
                    {t.nav.login}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg bg-[#0b4f6c] px-3 py-2 text-xs font-semibold text-white"
                  >
                    {t.nav.register}
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
