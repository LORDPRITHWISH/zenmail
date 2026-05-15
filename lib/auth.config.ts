import Google from 'next-auth/providers/google';
import type { NextAuthConfig } from 'next-auth';

/**
 * Auth config that DOES NOT import Mongoose/adapter.
 * Safe for Edge runtime (middleware).
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as Record<string, unknown>).role || 'user';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (session.user as any).role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const publicRoutes = ['/login', '/api/auth', '/api/webhooks'];
      const isPublicRoute = publicRoutes.some((route) =>
        pathname.startsWith(route)
      );

      if (isPublicRoute) return true;

      if (!isLoggedIn) {
        return false; // Will redirect to signIn page
      }

      // Admin route protection
      if (pathname.startsWith('/admin')) {
        const role = (auth?.user as Record<string, unknown>)?.role;
        if (role !== 'admin') {
          return Response.redirect(new URL('/inbox', nextUrl));
        }
      }

      return true;
    },
  },
  pages: {
    signIn: '/login',
  },
};
