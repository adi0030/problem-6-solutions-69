'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Socket } from 'socket.io-client';
import { useSession } from 'next-auth/react';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { avatarFor } from '@/lib/avatar';
import EmojiPicker from '@/components/EmojiPicker';

type Sender = { id: string; handle: string; displayName: string; profilePicture: string | null };
type MessageT = { id: string; conversationId: string; senderId: string; body: string; createdAt: string; sender: Sender };

export default function ChatThreadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { status, data: session } = useSession();
  const [messages, setMessages] = useState<MessageT[]>([]);
  const [draft, setDraft] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const meId = (session as any)?.userId;

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    let cancelled = false;

    api<{ messages: MessageT[] }>(`/api/conversations/${params.id}/messages`).then((r) => {
      if (!cancelled) setMessages(r.messages);
    });

    getSocket().then((s) => {
      socketRef.current = s;
      s.emit('conversation:join', params.id, () => {});
      s.on('message:new', (m: MessageT) => {
        if (m.conversationId === params.id) {
          setMessages((prev) => [...prev, m]);
        }
      });
      s.on('typing:start', () => setTyping(true));
      s.on('typing:stop', () => setTyping(false));
    });

    return () => {
      cancelled = true;
      const s = socketRef.current;
      if (s) {
        s.emit('conversation:leave', params.id);
        s.off('message:new');
        s.off('typing:start');
        s.off('typing:stop');
      }
    };
  }, [params.id, status]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setError(null);
    socketRef.current?.emit(
      'message:send',
      { conversationId: params.id, body },
      (ack: any) => {
        if (!ack?.ok) {
          if (ack?.error === 'emoji_only') setError('Only emoji are allowed in chat.');
          else if (ack?.error === 'rate_limited') setError('Slow down a bit.');
          else setError('Could not send.');
        } else {
          setDraft('');
        }
      },
    );
  }

  const other = messages.find((m) => m.senderId !== meId)?.sender;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-3">
      <header className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <Link href="/chat" className="text-sm text-slate-500 hover:underline">← Back</Link>
        {other && (
          <Link href={`/u/${other.handle}`} className="ml-2 flex items-center gap-2">
            <img src={avatarFor(other)} alt="" className="h-8 w-8 rounded-full" />
            <span className="text-sm font-semibold">{other.displayName}</span>
          </Link>
        )}
      </header>

      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
      >
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-500">No messages yet — say hi 👋</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-2xl ${
                  mine
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800'
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        {typing && <div className="text-xs italic text-slate-500">typing…</div>}
      </div>

      {error && <div className="rounded-md bg-rose-50 p-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{error}</div>}

      {pickerOpen && (
        <EmojiPicker onPick={(e) => setDraft((d) => (d + e).slice(0, 500))} />
      )}

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="rounded-full bg-slate-100 px-3 py-2 text-lg hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
          aria-label="Emoji picker"
        >
          😊
        </button>
        <div
          className="flex-1 select-none truncate rounded-full bg-slate-50 px-3 py-2 text-2xl dark:bg-slate-800"
          aria-label="Outgoing emoji buffer"
        >
          {draft || <span className="text-sm text-slate-400">Tap an emoji to add…</span>}
        </div>
        {draft && (
          <button
            type="button"
            onClick={() => setDraft('')}
            className="rounded-full px-3 py-2 text-sm text-slate-500"
          >
            Clear
          </button>
        )}
        <button
          type="button"
          onClick={send}
          disabled={!draft.trim()}
          className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
        >
          Send
        </button>
      </div>
    </div>
  );
}
