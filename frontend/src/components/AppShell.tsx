'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

const NAV = [
  { href: '/feed', label: 'Feed', icon: '🏠' },
  { href: '/search', label: 'Search', icon: '🔎' },
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/notifications', label: 'Alerts', icon: '🔔' },
];

function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('theme');
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = stored ? stored === 'dark' : sys;
    setDark(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
        localStorage.setItem('theme', next ? 'dark' : 'light');
      }}
      className="rounded-full p-2 text-lg hover:bg-slate-100 dark:hover:bg-slate-800"
      aria-label="Toggle theme"
    >
      {dark ? '🌙' : '☀️'}
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '/';
  const isAuthPage = pathname === '/login' || pathname === '/';
  const [authPending, setAuthPending] = useState(false);

  async function startGoogleSignIn() {
    if (authPending) return;
    setAuthPending(true);
    try {
      await signIn('google', { callbackUrl: '/feed' });
    } catch {
      setAuthPending(false);
    }
  }

  const { data: meData } = useApi<{ user: any }>(status === 'authenticated' ? '/api/users/me' : null);
  const me = meData?.user;

  const { data: notifData } = useApi<{ unread: number }>(
    status === 'authenticated' ? '/api/notifications' : null,
  );
  const unread = notifData?.unread || 0;

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:border-r md:border-slate-200 md:p-4 md:dark:border-slate-800">
        <Link href="/feed" className="mb-6 text-2xl font-bold">Social</Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span aria-hidden>{n.icon}</span>
                <span>{n.label}</span>
                {n.href === '/notifications' && unread > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-xs text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
          {me && (
            <Link
              href={`/u/${me.handle}`}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                pathname.startsWith('/u/') ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <img src={avatarFor(me)} alt="" className="h-6 w-6 rounded-full" />
              <span>Profile</span>
            </Link>
          )}
        </nav>
        <div className="mt-4 flex items-center gap-2">
          <ThemeToggle />
          {status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-md px-3 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              disabled={authPending}
              onClick={startGoogleSignIn}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900"
            >
              {authPending ? 'Signing in...' : 'Sign in'}
            </button>
          )}
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 md:hidden">
        <Link href="/feed" className="text-xl font-bold">Social</Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-md px-2 py-1 text-sm"
            >
              Sign out
            </button>
          ) : (
            <button
              type="button"
              disabled={authPending}
              onClick={startGoogleSignIn}
              className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white dark:bg-white dark:text-slate-900"
            >
              {authPending ? 'Signing in...' : 'Sign in'}
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-6">
        <div className="mx-auto max-w-2xl px-4 py-4 md:py-6">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex flex-col items-center justify-center py-2 text-xs ${
                active ? 'text-slate-900 dark:text-white' : 'text-slate-500'
              }`}
            >
              <span className="text-lg" aria-hidden>{n.icon}</span>
              <span>{n.label}</span>
              {n.href === '/notifications' && unread > 0 && (
                <span className="absolute mt-1 ml-6 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
        {me ? (
          <Link
            href={`/u/${me.handle}`}
            className="flex flex-col items-center justify-center py-2 text-xs"
          >
            <img src={avatarFor(me)} alt="" className="h-6 w-6 rounded-full" />
            <span>Me</span>
          </Link>
        ) : (
          <button
            type="button"
            disabled={authPending}
            onClick={startGoogleSignIn}
            className="flex flex-col items-center justify-center py-2 text-xs"
          >
            <span className="text-lg" aria-hidden>👤</span>
            <span>{authPending ? 'Signing in...' : 'Sign in'}</span>
          </button>
        )}
      </nav>
    </div>
  );
}
