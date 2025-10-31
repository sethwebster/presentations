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
    }),
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
      console.log('[NextAuth] session callback:', { 
        hasUser: !!user, 
        userId: user?.id, 
        hasToken: !!token,
        tokenSub: token?.sub,
        sessionUser: session.user?.email,
        strategy: adapter ? 'database' : 'jwt'
      });
      
      // Database sessions (with adapter)
      if (user) {
        session.user.id = user.id;
        if (user.email) {
          session.user.email = user.email;
        }
        if (user.name) {
          session.user.name = user.name;
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
      }
      
      return token;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      console.log('[NextAuth] Redirect callback called:', { url, baseUrl });
      
      // Extract email from callback URL if present (we added it as 'e' parameter)
      try {
        const urlObj = new URL(url, baseUrl);
        const emailEncoded = urlObj.searchParams.get('e');
        if (emailEncoded) {
          try {
            const email = Buffer.from(emailEncoded, 'base64url').toString('utf-8');
            console.log('[NextAuth] Extracted email from callback URL:', email);
            // Store in a temporary Redis key so adapter methods can access it
            // We'll clean this up after use
            if (adapter && typeof (adapter as any).storeEmailFromCallback === 'function') {
              await (adapter as any).storeEmailFromCallback(email);
            }
          } catch (err) {
            console.error('[NextAuth] Failed to decode email from URL:', err);
          }
        }
      } catch (error) {
        console.error('[NextAuth] Error parsing URL:', error);
      }
      
      // Extract callbackUrl from query parameters if present
      try {
        const urlObj = new URL(url, baseUrl);
        const callbackUrl = urlObj.searchParams.get('callbackUrl');
        
        console.log('[NextAuth] Extracted callbackUrl:', callbackUrl);
        
        if (callbackUrl) {
          // If callbackUrl is a relative URL, make it absolute
          if (callbackUrl.startsWith('/')) {
            const redirectUrl = `${baseUrl}${callbackUrl}`;
            console.log('[NextAuth] Redirecting to relative callbackUrl:', redirectUrl);
            return redirectUrl;
          }
          // If callbackUrl is on the same origin, allow it
          try {
            const callbackUrlObj = new URL(callbackUrl);
            if (callbackUrlObj.origin === baseUrl) {
              console.log('[NextAuth] Redirecting to absolute callbackUrl:', callbackUrl);
              return callbackUrl;
            }
          } catch {
            // Invalid URL, fall through to default
          }
        }
      } catch (error) {
        console.error('[NextAuth] Error parsing URL:', error);
        // URL parsing failed, fall through to default handling
      }
      
      // If url is a relative URL, make it absolute
      if (url.startsWith('/')) {
        const redirectUrl = `${baseUrl}${url}`;
        console.log('[NextAuth] Redirecting to relative URL:', redirectUrl);
        return redirectUrl;
      }
      
      // If url is on the same origin, allow it
      try {
        const urlObj = new URL(url);
        if (urlObj.origin === baseUrl) {
          console.log('[NextAuth] Redirecting to same-origin URL:', url);
          return url;
        }
      } catch {
        // Invalid URL, fall through to default
      }
      
      // Default: redirect to account page
      const defaultRedirect = `${baseUrl}/account`;
      console.log('[NextAuth] Default redirect to:', defaultRedirect);
      return defaultRedirect;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'development-nextauth-secret',
} as any;

const { handlers, auth } = NextAuth(authOptions);

export const GET = handlers.GET;
export const POST = handlers.POST;
export { auth };

