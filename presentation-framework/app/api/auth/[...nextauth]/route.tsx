import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import { ResendEmailProvider } from '@/lib/resend-email-provider';
import { RedisAdapter } from '@/lib/auth-adapter';

// Check if Redis adapter is available
const adapter = RedisAdapter();
console.log('[NextAuth] Adapter status:', adapter ? 'Redis adapter active' : 'No adapter (will use JWT sessions)');

const authOptions = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    } as any),
    ResendEmailProvider({
      from: process.env.EMAIL_FROM || process.env.RESEND_FROM || 'onboarding@resend.dev',
    }),
  ],
  adapter: adapter || undefined,
  session: {
    strategy: adapter ? 'database' : 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    verifyRequest: '/auth/verify-request',
  },
  callbacks: {
    async signIn({ user, account, profile }: { user: any; account: any; profile?: any }) {
      console.log('[NextAuth] signIn callback:', {
        userId: user.id,
        email: user.email,
        hasAccount: !!account,
        accountProvider: account?.provider,
        accountId: account?.providerAccountId,
        accountType: account?.type,
        accountObject: account
      });

      // Auto-link OAuth accounts when email matches existing user
      if (account?.provider !== 'email' && user.email && adapter && adapter.getUserByEmail && adapter.linkAccount) {
        try {
          // Check if a user with this email already exists
          const existingUser = await adapter.getUserByEmail(user.email);

          if (existingUser && existingUser.id !== user.id) {
            console.log('[NextAuth] Auto-linking OAuth account to existing user:', {
              existingUserId: existingUser.id,
              newUserId: user.id,
              provider: account.provider,
              email: user.email
            });

            // Link the OAuth account to the existing user
            await adapter.linkAccount({
              userId: existingUser.id,
              type: account.type,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token,
              access_token: account.access_token,
              expires_at: account.expires_at,
              token_type: account.token_type,
              scope: account.scope,
              id_token: account.id_token,
              session_state: account.session_state,
            });

            // Update user object to point to existing user
            user.id = existingUser.id;
            user.name = user.name || existingUser.name;
            user.image = user.image || existingUser.image;
          }
        } catch (error) {
          console.error('[NextAuth] Error during auto-linking:', error);
          // Continue with sign-in even if auto-linking fails
        }
      }

      // For email provider, NextAuth should automatically set providerAccountId to the email
      // But if it's missing, we can't fix it here as the account is already being processed
      // The issue is likely that user.email is undefined when NextAuth creates the account
      if (account?.provider === 'email' && !account.providerAccountId) {
        console.error('[NextAuth] Email account missing providerAccountId. User email:', user.email);
        // This shouldn't happen - NextAuth should set providerAccountId to the email address
        // The issue is likely in how the user is being created or retrieved
      }

      return true;
    },
    async session({ session, user, token }: { session: any; user?: any; token?: any }) {
      // Database sessions (with adapter)
      if (user) {
        session.user.id = user.id;
        if (user.email) {
          session.user.email = user.email;
        }
        if (user.name) {
          session.user.name = user.name;
        }
        if (user.username) {
          session.user.username = user.username as string;
        }
        if (user.image) {
          session.user.image = user.image as string;
        }
      }

      // JWT sessions (without adapter)
      if (token && !user) {
        if (token.sub) {
          session.user.id = token.sub as string;
        }
        if (token.email) {
          session.user.email = token.email as string;
        }
        if (token.name) {
          session.user.name = token.name as string;
        }
        if (token.username) {
          session.user.username = token.username as string;
        }
        if (token.image) {
          session.user.image = token.image as string;
        }
      }
      
      return session;
    },
    async jwt({ token, user, account }: { token: any; user?: any; account?: any }) {
      console.log('[NextAuth] jwt callback:', { 
        hasToken: !!token, 
        hasUser: !!user, 
        userId: user?.id, 
        email: user?.email,
        tokenSub: token?.sub 
      });
      
      // On first sign in, add user info to token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.username = user.username;
        token.image = user.image;
      }
      
      return token;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // IMPORTANT: Only log and handle during actual auth flows
      // Minimize processing to avoid redirect loops

      // Extract email from callback URL if present (we added it as 'e' parameter)
      try {
        const urlObj = new URL(url, baseUrl);
        const emailEncoded = urlObj.searchParams.get('e');
        if (emailEncoded) {
          try {
            const email = Buffer.from(emailEncoded, 'base64url').toString('utf-8');
            // Store in a temporary Redis key so adapter methods can access it
            if (adapter && typeof (adapter as any).storeEmailFromCallback === 'function') {
              await (adapter as any).storeEmailFromCallback(email);
            }
          } catch (err) {
            // Silently fail
          }
        }
      } catch (error) {
        // Silently fail
      }

      // Extract callbackUrl from query parameters if present
      try {
        const urlObj = new URL(url, baseUrl);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');

        if (callbackUrl) {
          // If callbackUrl is a relative URL, make it absolute
          if (callbackUrl.startsWith('/')) {
            return `${baseUrl}${callbackUrl}`;
          }
          // If callbackUrl is on the same origin, allow it
          try {
            const callbackUrlObj = new URL(callbackUrl);
            if (callbackUrlObj.origin === baseUrl) {
              return callbackUrl;
            }
          } catch {
            // Invalid URL, fall through
          }
        }
      } catch (error) {
        // Silently fail
      }

      // If url is a relative URL, make it absolute
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }

      // If url is on the same origin, allow it
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          return url;
        }
      } catch {
        // Invalid URL, fall through to default
      }

      // Default: redirect to home page
      return baseUrl;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-nextauth-secret',
} as any;

const { handlers, auth } = NextAuth(authOptions);

export const GET = handlers.GET;
export const POST = handlers.POST;
export { auth, authOptions };

