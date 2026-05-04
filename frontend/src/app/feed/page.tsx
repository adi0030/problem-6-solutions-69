'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Composer from '@/components/Composer';
import PostCard, { PostT } from '@/components/PostCard';
import { Loader2 } from 'lucide-react';

export default function FeedPage() {
  const { status } = useSession();
  const router = useRouter();
  const [posts, setPosts] = useState<PostT[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  async function load(initial = false) {
    if (loading || done) return;
    setLoading(true);
    try {
      const url = `/api/posts/feed${cursor && !initial ? `?cursor=${cursor}` : ''}`;
      const res = await api<{ posts: PostT[]; nextCursor: string | null }>(url);
      setPosts((prev) => (initial ? res.posts : [...prev, ...res.posts]));
      setCursor(res.nextCursor);
      if (!res.nextCursor) setDone(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === 'authenticated') load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status !== 'authenticated') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Composer onCreate={(p) => setPosts((prev) => [p, ...prev])} />
      {posts.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/50 p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900/20">
          <span className="mb-4 text-4xl">✨</span>
          <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-slate-100">It's quiet in here</h3>
          <p className="text-sm font-medium text-slate-500">No posts yet. Be the first to share something!</p>
        </div>
      )}
      <div className="space-y-6">
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
          />
        ))}
      </div>
      {!done && (
        <div className="pt-4 pb-12 text-center">
          <button
            type="button"
            onClick={() => load(false)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-6 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/80"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading…</span>
              </>
            ) : (
              'Load older posts'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
