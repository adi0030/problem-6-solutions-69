'use client';

import { useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import type { PostT } from './PostCard';

export default function Composer({ onCreate }: { onCreate: (post: PostT) => void }) {
  const [body, setBody] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (busy) return;
    if (body.trim().length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('body', body);
      if (file) fd.append('image', file);
      const { post } = await apiUpload<{ post: PostT }>('/api/posts', fd);
      onCreate(post);
      setBody('');
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (e: any) {
      setError(e.message || 'failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 2000))}
        rows={3}
        placeholder="What's on your mind?"
        className="block w-full resize-none rounded-md border-0 bg-transparent text-sm focus:outline-none focus:ring-0"
      />
      {file && (
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span>📎 {file.name}</span>
          <button type="button" className="underline" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}>
            remove
          </button>
        </div>
      )}
      {error && <div className="mt-2 text-xs text-rose-600">{error}</div>}
      <div className="mt-2 flex items-center justify-between">
        <label className="cursor-pointer rounded-full px-3 py-1 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
          📷 Image
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{body.length}/2000</span>
          <button
            type="button"
            onClick={submit}
            disabled={busy || body.trim().length === 0}
            className="rounded-full bg-slate-900 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? 'Posting…' : 'Post'}
          </button>
        </div>
      </div>
    </div>
  );
}
