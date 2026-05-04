'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signIn, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { useApi } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';
import { Home, Search, MessageCircle, Bell, User, Sun, Moon, LogOut, LogIn } from 'lucide-react';

const NAV = [
  { href: '/feed', label: 'Feed', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/notifications', label: 'Alerts', icon: Bell },
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
      className="flex items-center justify-center rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
      aria-label="Toggle theme"
    >
      {dark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '/';
  const isAuthPage = pathname === '/login' || pathname === '/';

  const { data: meData } = useApi<{ user: any }>(status === 'authenticated' ? '/api/users/me' : null);
  const me = meData?.user;

  const { data: notifData } = useApi<{ unread: number }>(
    status === 'authenticated' ? '/api/notifications' : null,
  );
  const unread = notifData?.unread || 0;

  if (isAuthPage) return <>{children}</>;

  return (
    <div className="mx-auto flex min-h-screen max-w-7xl relative">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:py-6 md:px-4">
        <div className="flex h-full flex-col rounded-3xl border border-slate-200/60 bg-white/50 backdrop-blur-xl p-4 shadow-soft dark:border-slate-800/60 dark:bg-slate-900/50">
          <Link href="/feed" className="mb-8 mt-2 px-3 text-2xl font-extrabold tracking-tight">Social<span className="text-rose-500">.</span></Link>
          <nav className="flex flex-1 flex-col gap-2">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.href);
              const Icon = n.icon;
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${active ? '' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white'}`} />
                  <span>{n.label}</span>
                  {n.href === '/notifications' && unread > 0 && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {unread}
                    </span>
                  )}
                </Link>
              );
            })}
            {me && (
              <Link
                href={`/u/${me.handle}`}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  pathname.startsWith('/u/') ? 'bg-slate-900 text-white shadow-md dark:bg-white dark:text-slate-900' : 'text-slate-600 hover:bg-white hover:shadow-sm dark:text-slate-400 dark:hover:bg-slate-800/80 dark:hover:text-white'
                }`}
              >
                <img src={avatarFor(me)} alt="" className="h-6 w-6 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" />
                <span>Profile</span>
              </Link>
            )}
          </nav>
          <div className="mt-4 flex items-center justify-between border-t border-slate-200/60 pt-4 dark:border-slate-800/60">
            <ThemeToggle />
            {status === 'authenticated' ? (
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="flex items-center gap-2 rounded-xl p-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Sign out</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => signIn('google')}
                className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-transform hover:scale-105 dark:bg-white dark:text-slate-900"
              >
                <LogIn className="h-4 w-4" />
                <span>Sign in</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-950/80 md:hidden">
        <Link href="/feed" className="text-xl font-extrabold tracking-tight">Social<span className="text-rose-500">.</span></Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {status === 'authenticated' ? (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="rounded-xl p-2 text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <LogOut className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signIn('google')}
              className="rounded-xl bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
            >
              Sign in
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 pb-24 pt-4 md:ml-64 md:py-6">
        <div className="mx-auto max-w-2xl px-4">{children}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-slate-200/60 bg-white/90 backdrop-blur-xl pb-safe dark:border-slate-800/60 dark:bg-slate-950/90 md:hidden">
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`relative flex flex-col items-center justify-center py-3 text-[10px] font-semibold transition-colors ${
                active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Icon className={`mb-1 h-6 w-6 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span>{n.label}</span>
              {n.href === '/notifications' && unread > 0 && (
                <span className="absolute top-2 right-4 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-bold text-white">
                  {unread}
                </span>
              )}
            </Link>
          );
        })}
        {me ? (
          <Link
            href={`/u/${me.handle}`}
            className="flex flex-col items-center justify-center py-3 text-[10px] font-semibold text-slate-500 transition-colors dark:text-slate-400"
          >
            <img src={avatarFor(me)} alt="" className="mb-1 h-6 w-6 rounded-full object-cover ring-2 ring-transparent" />
            <span>Me</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => signIn('google')}
            className="flex flex-col items-center justify-center py-3 text-[10px] font-semibold text-slate-500 transition-colors dark:text-slate-400"
          >
            <User className="mb-1 h-6 w-6 stroke-2" />
            <span>Sign in</span>
          </button>
        )}
      </nav>
    </div>
  );
}
