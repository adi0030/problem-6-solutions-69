'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiJson } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

export type PostT = {
  id: string;
  body: string;
  imageUrl: string | null;
  createdAt: string;
  author: { id: string; handle: string; displayName: string; profilePicture: string | null };
  likeCount: number;
  commentCount: number;
  shareCount: number;
  likedByMe: boolean;
};

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return `${Math.floor(s)}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function PostCard({ post, onChange }: { post: PostT; onChange?: (p: PostT) => void }) {
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  async function toggleLike() {
    if (busy) return;
    setBusy(true);
    const next = !post.likedByMe;
    const optimistic = {
      ...post,
      likedByMe: next,
      likeCount: post.likeCount + (next ? 1 : -1),
    };
    onChange?.(optimistic);
    try {
      const res = await apiJson<{ count: number }>(
        '/api/likes',
        { targetType: 'POST', targetId: post.id },
        next ? 'POST' : 'DELETE',
      );
      onChange?.({ ...optimistic, likeCount: res.count });
    } catch {
      onChange?.(post);
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    try {
      const { url } = await apiJson<{ url: string }>(`/api/posts/${post.id}/share`, {});
      const full = `${window.location.origin}${url}`;
      if (navigator.share) {
        await navigator.share({ url: full, title: 'Post on Social' });
      } else {
        await navigator.clipboard.writeText(full);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
      onChange?.({ ...post, shareCount: post.shareCount + 1 });
    } catch {/* ignore */}
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <header className="mb-3 flex items-center gap-3">
        <Link href={`/u/${post.author.handle}`}>
          <img src={avatarFor(post.author)} alt="" className="h-10 w-10 rounded-full" />
        </Link>
        <div className="min-w-0">
          <Link href={`/u/${post.author.handle}`} className="block truncate text-sm font-semibold hover:underline">
            {post.author.displayName}
          </Link>
          <div className="text-xs text-slate-500">@{post.author.handle} · {timeAgo(post.createdAt)}</div>
        </div>
      </header>
      <Link href={`/p/${post.id}`} className="block">
        <p className="whitespace-pre-wrap break-words text-sm">{post.body}</p>
        {post.imageUrl && (
          <img
            src={post.imageUrl}
            alt=""
            className="mt-3 max-h-96 w-full rounded-lg border border-slate-200 object-cover dark:border-slate-800"
          />
        )}
      </Link>
      <footer className="mt-3 flex items-center gap-2 text-sm text-slate-500">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          className={`flex items-center gap-1 rounded-full px-3 py-1 transition hover:bg-rose-50 dark:hover:bg-rose-900/20 ${
            post.likedByMe ? 'text-rose-600' : ''
          }`}
        >
          <span aria-hidden>{post.likedByMe ? '❤️' : '🤍'}</span>
          <span>{post.likeCount}</span>
        </button>
        <Link
          href={`/p/${post.id}`}
          className="flex items-center gap-1 rounded-full px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span aria-hidden>💬</span>
          <span>{post.commentCount}</span>
        </Link>
        <button
          type="button"
          onClick={share}
          className="ml-auto flex items-center gap-1 rounded-full px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
        >
          <span aria-hidden>↗️</span>
          <span>{shared ? 'Copied!' : post.shareCount}</span>
        </button>
      </footer>
    </article>
  );
}
