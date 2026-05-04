'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';
import { MessageCircle, ChevronRight, Loader2 } from 'lucide-react';

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

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
          <MessageCircle className="h-5 w-5" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Chats</h1>
      </div>

      {convs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/20">
          <MessageCircle className="mb-4 h-12 w-12 text-slate-300 dark:text-slate-600" />
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">No conversations</h3>
          <p className="text-[15px] font-medium text-slate-500">Open someone's profile and tap Message to start chatting.</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-soft dark:divide-slate-800/60 dark:border-slate-800/60 dark:bg-slate-900/50">
          {convs.map((c) => (
            <li key={c.id}>
              <Link
                href={`/chat/${c.id}`}
                className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              >
                <img src={avatarFor(c.other)} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-rose-100 dark:group-hover:ring-rose-900/30" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-bold text-slate-900 dark:text-slate-100">{c.other.displayName}</div>
                  <div className="truncate text-[14px] font-medium text-slate-500">
                    {c.lastMessage?.body || 'No messages yet'}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
