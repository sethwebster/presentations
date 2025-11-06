import type { NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Email from 'next-auth/providers/email';
import { RedisAdapter } from './lib/auth-adapter';

export default {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    Email({
      server: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      },
      from: process.env.SMTP_FROM || 'noreply@example.com',
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

