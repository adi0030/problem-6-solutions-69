'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

type ConvT = {
  id: string;
  other: { id: string; handle: string; displayName: string; profilePicture: string | null };
  lastMessage: { body: string; createdAt: string } | null;
  lastReadAt: string | null;
};

export default function ChatListPage() {
  const { status } = useSession();
  const router = useRouter();
  const [convs, setConvs] = useState<ConvT[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated') {
      api<{ conversations: ConvT[] }>('/api/conversations').then((r) => setConvs(r.conversations));
    }
  }, [status, router]);

  if (status !== 'authenticated') return <div className="p-6 text-center text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Chats</h1>
      {convs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
          No conversations yet. Open someone's profile and tap Message.
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {convs.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <img src={avatarFor(c.other)} alt="" className="h-10 w-10 rounded-full" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{c.other.displayName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {c.lastMessage?.body || 'No messages yet'}
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
