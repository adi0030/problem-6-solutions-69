'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, apiJson } from '@/lib/api';
import PostCard, { PostT } from '@/components/PostCard';
import { avatarFor } from '@/lib/avatar';

type CommentT = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  parentCommentId: string | null;
  author: { id: string; handle: string; displayName: string; profilePicture: string | null };
  likeCount: number;
  likedByMe: boolean;
  replies?: CommentT[];
};

function CommentRow({
  c,
  onChange,
  onReply,
}: {
  c: CommentT;
  onChange: (c: CommentT) => void;
  onReply?: (c: CommentT) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState('');

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !c.likedByMe;
    const optim = { ...c, likedByMe: next, likeCount: c.likeCount + (next ? 1 : -1) };
    onChange(optim);
    try {
      const res = await apiJson<{ count: number }>(
        '/api/likes',
        { targetType: 'COMMENT', targetId: c.id },
        next ? 'POST' : 'DELETE',
      );
      onChange({ ...optim, likeCount: res.count });
    } catch {
      onChange(c);
    } finally {
      setBusy(false);
    }
  }

  async function postReply() {
    if (replyBody.trim().length === 0) return;
    try {
      const { comment } = await apiJson<{ comment: CommentT }>(`/api/comments/${c.id}/replies`, {
        body: replyBody,
      });
      onReply?.({ ...comment, likeCount: 0, likedByMe: false });
      setReplyBody('');
      setShowReply(false);
    } catch {/* ignore */}
  }

  return (
    <div className="flex gap-3">
      <Link href={`/u/${c.author.handle}`}>
        <img src={avatarFor(c.author)} alt="" className="h-8 w-8 rounded-full" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-slate-100 px-3 py-2 dark:bg-slate-800">
          <Link href={`/u/${c.author.handle}`} className="text-sm font-semibold hover:underline">
            {c.author.displayName}
          </Link>
          <p className="whitespace-pre-wrap break-words text-sm">{c.body}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={toggle}
            className={c.likedByMe ? 'text-rose-600' : ''}
          >
            {c.likedByMe ? '❤️' : '🤍'} {c.likeCount}
          </button>
          {onReply && (
            <button type="button" onClick={() => setShowReply((v) => !v)}>
              Reply
            </button>
          )}
        </div>
        {showReply && (
          <div className="mt-2 flex gap-2">
            <input
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value.slice(0, 500))}
              placeholder="Write a reply…"
              className="flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <button
              type="button"
              onClick={postReply}
              className="rounded-full bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-white dark:text-slate-900"
            >
              Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailPage() {
  const params = useParams<{ postId: string }>();
  const [post, setPost] = useState<PostT | null>(null);
  const [comments, setComments] = useState<CommentT[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ post: PostT }>(`/api/posts/${params.postId}`).then((r) => setPost(r.post)).catch(() => setPost(null));
    api<{ comments: CommentT[] }>(`/api/posts/${params.postId}/comments`).then((r) =>
      setComments(r.comments),
    );
  }, [params.postId]);

  async function postComment() {
    if (busy || body.trim().length === 0) return;
    setBusy(true);
    try {
      const { comment } = await apiJson<{ comment: CommentT }>(
        `/api/posts/${params.postId}/comments`,
        { body },
      );
      setComments((prev) => [...prev, { ...comment, likeCount: 0, likedByMe: false, replies: [] }]);
      setBody('');
      setPost((p) => (p ? { ...p, commentCount: p.commentCount + 1 } : p));
    } finally {
      setBusy(false);
    }
  }

  if (!post) return <div className="p-6 text-center text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <PostCard post={post} onChange={setPost} />

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 500))}
            placeholder="Add a comment…"
            className="flex-1 rounded-full border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={postComment}
            disabled={busy || body.trim().length === 0}
            className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            Post
          </button>
        </div>

        {comments.length === 0 && <p className="text-sm text-slate-500">No comments yet.</p>}

        <div className="space-y-4">
          {comments.map((c) => (
            <div key={c.id} className="space-y-3">
              <CommentRow
                c={c}
                onChange={(nc) =>
                  setComments((prev) => prev.map((x) => (x.id === nc.id ? { ...nc, replies: x.replies } : x)))
                }
                onReply={(reply) =>
                  setComments((prev) =>
                    prev.map((x) =>
                      x.id === c.id ? { ...x, replies: [...(x.replies || []), reply] } : x,
                    ),
                  )
                }
              />
              {c.replies && c.replies.length > 0 && (
                <div className="ml-11 space-y-3">
                  {c.replies.map((r) => (
                    <CommentRow
                      key={r.id}
                      c={r}
                      onChange={(nr) =>
                        setComments((prev) =>
                          prev.map((x) =>
                            x.id === c.id
                              ? { ...x, replies: x.replies!.map((y) => (y.id === nr.id ? nr : y)) }
                              : x,
                          ),
                        )
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
