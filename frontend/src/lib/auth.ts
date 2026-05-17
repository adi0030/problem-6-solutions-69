import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000';
const INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || '';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ profile }) {
      if (!profile?.email) {
        console.error('[auth.signIn] profile.email missing');
        return false;
      }
      const url = `${BACKEND_URL}/api/users/sync`;
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-internal-token': INTERNAL_API_TOKEN,
          },
          body: JSON.stringify({
            googleId: (profile as any).sub || profile.email,
            email: profile.email,
            displayName: profile.name || profile.email.split('@')[0],
          }),
        });
        if (!r.ok) {
          const txt = await r.text().catch(() => '');
          console.error(`[auth.signIn] backend sync ${r.status} from ${url}: ${txt}`);
          return false;
        }
        return true;
      } catch (e: any) {
        console.error(`[auth.signIn] fetch failed for ${url}:`, e.code || e.message);
        return false;
      }
    },
    async jwt({ token, profile }) {
      // On first sign-in, fetch the canonical user record so the JWT carries our id.
      if (profile?.email && !token.userId) {
        try {
          const r = await fetch(
            `${BACKEND_URL}/api/users/sync`,
            {
              method: 'POST',
              headers: {
                'content-type': 'application/json',
                'x-internal-token': INTERNAL_API_TOKEN,
              },
              body: JSON.stringify({
                googleId: (profile as any).sub || profile.email,
                email: profile.email,
                displayName: profile.name || profile.email.split('@')[0],
              }),
            },
          );
          if (r.ok) {
            const { user } = await r.json();
            token.userId = user.id;
            token.handle = user.handle;
            token.sub = user.id;
          } else {
            console.error(`[auth.jwt] sync ${r.status}`);
          }
        } catch (e: any) {
          console.error('[auth.jwt] sync fetch failed:', e.code || e.message);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        (session as any).userId = token.userId;
        (session as any).handle = token.handle;
        (session as any).accessToken = token; // raw payload, will be re-signed below
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
