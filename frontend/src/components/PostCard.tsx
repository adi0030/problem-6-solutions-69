'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiJson } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';
import { Heart, MessageCircle, Share, MoreHorizontal } from 'lucide-react';

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
    <article className="group overflow-hidden rounded-3xl border border-slate-200/60 bg-white p-5 shadow-soft transition-all hover:shadow-soft-lg dark:border-slate-800/60 dark:bg-slate-900/50">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author.handle}`}>
            <img src={avatarFor(post.author)} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-transparent transition-all group-hover:ring-rose-100 dark:group-hover:ring-rose-900/30" />
          </Link>
          <div className="min-w-0">
            <Link href={`/u/${post.author.handle}`} className="block truncate text-sm font-bold text-slate-900 hover:underline dark:text-slate-100">
              {post.author.displayName}
            </Link>
            <div className="text-[13px] font-medium text-slate-500">@{post.author.handle} · {timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <button type="button" className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </header>
      <Link href={`/p/${post.id}`} className="block">
        <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">
          {post.body}
        </p>
        {post.imageUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-50 dark:border-slate-800/60 dark:bg-slate-900/80">
            <img
              src={post.imageUrl}
              alt=""
              className="max-h-[32rem] w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </div>
        )}
      </Link>
      <footer className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4 text-[13px] font-medium text-slate-500 dark:border-slate-800/60">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20 ${
            post.likedByMe ? 'text-rose-600 dark:text-rose-500' : 'hover:text-rose-600 dark:hover:text-rose-400'
          }`}
        >
          <Heart className={`h-5 w-5 ${post.likedByMe ? 'fill-current' : ''}`} />
          <span>{post.likeCount > 0 ? post.likeCount : 'Like'}</span>
        </button>
        <Link
          href={`/p/${post.id}`}
          className="flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.commentCount > 0 ? post.commentCount : 'Comment'}</span>
        </Link>
        <button
          type="button"
          onClick={share}
          className="ml-auto flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-300"
        >
          <Share className="h-5 w-5" />
          <span>{shared ? 'Copied!' : post.shareCount > 0 ? post.shareCount : 'Share'}</span>
        </button>
      </footer>
    </article>
  );
}
