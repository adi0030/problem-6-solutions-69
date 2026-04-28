// Deterministic default avatar selection. 12 SVGs ship in /public/avatars.

export const AVATAR_COUNT = 12;

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function defaultAvatar(userId: string) {
  const idx = (hash(userId) % AVATAR_COUNT) + 1;
  return `/avatars/avatar-${String(idx).padStart(2, '0')}.svg`;
}

export function avatarFor(user: { id: string; profilePicture?: string | null } | null | undefined) {
  if (!user) return '/avatars/avatar-01.svg';
  return user.profilePicture || defaultAvatar(user.id);
}
