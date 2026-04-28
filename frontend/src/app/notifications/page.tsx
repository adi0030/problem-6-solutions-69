'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api, apiJson } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

type NotifT = {
  id: string;
  type: 'LIKE' | 'COMMENT' | 'REPLY' | 'MENTION' | 'MESSAGE';
  targetType: string | null;
  targetId: string | null;
  readAt: string | null;
  createdAt: string;
  actor: { id: string; handle: string; displayName: string; profilePicture: string | null };
};

const VERB: Record<NotifT['type'], string> = {
  LIKE: 'liked your',
  COMMENT: 'commented on your post',
  REPLY: 'replied to your comment',
  MENTION: 'mentioned you',
  MESSAGE: 'messaged you',
};

function linkFor(n: NotifT): string {
  if (n.targetType === 'POST' && n.targetId) return `/p/${n.targetId}`;
  if (n.type === 'MESSAGE') return '/chat';
  return `/u/${n.actor.handle}`;
}

export default function NotificationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<NotifT[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status !== 'authenticated') return;
    api<{ notifications: NotifT[] }>('/api/notifications').then((r) => setItems(r.notifications));
    apiJson('/api/notifications/read-all', {}).catch(() => {});
  }, [status, router]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
          No activity yet.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {items.map((n) => (
            <li key={n.id} className={n.readAt ? '' : 'bg-slate-50 dark:bg-slate-800/40'}>
              <Link
                href={linkFor(n)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <img src={avatarFor(n.actor)} alt="" className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className="font-semibold">{n.actor.displayName}</span>{' '}
                    <span className="text-slate-600 dark:text-slate-400">{VERB[n.type]}</span>
                    {n.type === 'LIKE' && n.targetType === 'POST' && ' post'}
                    {n.type === 'LIKE' && n.targetType === 'COMMENT' && ' comment'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
