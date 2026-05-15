import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

// Middleware uses the edge-safe auth config (no DB imports — safe for Edge runtime)
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
