'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { api, apiJson, apiUpload } from '@/lib/api';
import { avatarFor } from '@/lib/avatar';

type Me = {
  id: string;
  displayName: string;
  handle: string;
  bio: string | null;
  profilePicture: string | null;
};

export default function EditProfilePage() {
  const { status } = useSession();
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    if (status === 'authenticated') {
      api<{ user: Me }>('/api/users/me').then(({ user }) => {
        setMe(user);
        setDisplayName(user.displayName);
        setHandle(user.handle);
        setBio(user.bio || '');
      });
    }
  }, [status, router]);

  async function save() {
    if (!me || busy) return;
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const { user } = await apiJson<{ user: Me }>('/api/users/me', {
        displayName,
        handle,
        bio,
      }, 'PATCH');
      setMe(user);
      setMsg('Saved.');
    } catch (e: any) {
      const m = (e.message || '').toLowerCase();
      if (m.includes('handle_taken')) setErr('That handle is taken.');
      else if (m.includes('invalid_handle')) setErr('Handle must be 3-20 chars: a-z, 0-9, _.');
      else setErr('Could not save.');
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file: File) {
    if (!me) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const { user } = await apiUpload<{ user: Me }>('/api/users/me/avatar', fd);
      setMe(user);
    } catch {
      setErr('Upload failed.');
    }
  }

  async function clearAvatar() {
    if (!me) return;
    const { user } = await apiJson<{ user: Me }>('/api/users/me/avatar', null, 'DELETE');
    setMe(user);
  }

  if (!me) return <div className="p-6 text-center text-slate-500">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Edit profile</h1>

      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <img src={avatarFor(me)} alt="" className="h-20 w-20 rounded-full" />
          <div className="flex flex-col gap-2">
            <label className="cursor-pointer rounded-full border border-slate-300 px-4 py-2 text-sm text-center dark:border-slate-700">
              Upload photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadAvatar(f);
                }}
              />
            </label>
            {me.profilePicture && (
              <button
                type="button"
                onClick={clearAvatar}
                className="text-sm text-slate-500 underline"
              >
                Use a default
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <label className="block text-sm">
          <span className="font-medium">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 40))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().slice(0, 20))}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <span className="text-xs text-slate-500">3-20 chars: a-z, 0-9, underscore</span>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 160))}
            rows={3}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <span className="text-xs text-slate-500">{bio.length}/160</span>
        </label>

        {msg && <div className="text-sm text-emerald-600">{msg}</div>}
        {err && <div className="text-sm text-rose-600">{err}</div>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-full bg-slate-900 px-5 py-2 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-slate-900"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
