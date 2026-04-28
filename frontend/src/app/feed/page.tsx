'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import Composer from '@/components/Composer';
import PostCard, { PostT } from '@/components/PostCard';

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
    return <div className="p-6 text-center text-slate-500">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      <Composer onCreate={(p) => setPosts((prev) => [p, ...prev])} />
      {posts.length === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 dark:border-slate-700">
          No posts yet. Write the first one!
        </div>
      )}
      {posts.map((p) => (
        <PostCard
          key={p.id}
          post={p}
          onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
        />
      ))}
      {!done && (
        <button
          type="button"
          onClick={() => load(false)}
          disabled={loading}
          className="mx-auto block rounded-full border border-slate-300 px-4 py-2 text-sm dark:border-slate-700"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}
