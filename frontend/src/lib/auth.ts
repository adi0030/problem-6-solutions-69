import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:4000';
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
      if (!profile?.email) return false;
      try {
        const r = await fetch(`${BACKEND_URL}/api/users/sync`, {
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
        return r.ok;
      } catch {
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
          }
        } catch {
          /* leave token alone */
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
