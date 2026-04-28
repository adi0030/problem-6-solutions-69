'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

type UserHit = { id: string; handle: string; displayName: string; profilePicture: string | null; bio: string | null };
type PostHit = { id: string; body: string; createdAt: string; author: { id: string; handle: string; displayName: string; profilePicture: string | null } };

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [type, setType] = useState<'users' | 'posts'>('users');
  const [users, setUsers] = useState<UserHit[]>([]);
  const [posts, setPosts] = useState<PostHit[]>([]);

  useEffect(() => {
    if (!q.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }
    const t = setTimeout(() => {
      api<any>(`/api/search?q=${encodeURIComponent(q)}&type=${type}`).then((r) => {
        setUsers(r.users || []);
        setPosts(r.posts || []);
      });
    }, 200);
    return () => clearTimeout(t);
  }, [q, type]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Search</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search users or posts…"
        className="block w-full rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
      />
      <div className="flex gap-2 text-sm">
        {(['users', 'posts'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 ${
              type === t
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'border border-slate-300 dark:border-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {type === 'users' && (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id}>
              <Link
                href={`/u/${u.handle}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <img src={avatarFor(u)} alt="" className="h-10 w-10 rounded-full" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{u.displayName}</div>
                  <div className="truncate text-xs text-slate-500">@{u.handle}</div>
                  {u.bio && <div className="truncate text-xs text-slate-500">{u.bio}</div>}
                </div>
              </Link>
            </li>
          ))}
          {q && users.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">No users found.</li>
          )}
        </ul>
      )}

      {type === 'posts' && (
        <ul className="space-y-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                href={`/p/${p.id}`}
                className="block rounded-xl border border-slate-200 bg-white p-3 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
              >
                <div className="mb-1 flex items-center gap-2">
                  <img src={avatarFor(p.author)} alt="" className="h-6 w-6 rounded-full" />
                  <span className="text-sm font-semibold">{p.author.displayName}</span>
                  <span className="text-xs text-slate-500">@{p.author.handle}</span>
                </div>
                <p className="line-clamp-3 text-sm">{p.body}</p>
              </Link>
            </li>
          ))}
          {q && posts.length === 0 && (
            <li className="p-4 text-center text-sm text-slate-500">No posts found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
