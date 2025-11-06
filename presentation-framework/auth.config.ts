import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { ResendEmailProvider } from '@/lib/resend-email-provider';
import { RedisAdapter } from '@/lib/auth-adapter';

export default {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    ResendEmailProvider({
      from: process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
    }),
  ],
  // Only use Redis adapter if Redis is configured and available
  // Otherwise NextAuth will use in-memory sessions (good for development)
  adapter: RedisAdapter() || undefined,
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow all sign-ins
      return true;
    },
    async session({ session, token }) {
      // Add user ID to session
      if (token?.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

