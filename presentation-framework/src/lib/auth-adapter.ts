import Redis from 'ioredis';
import type { Adapter } from '@auth/core/adapters';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;

// Lazy Redis connection - only create when needed
let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (!redisUrl) {
    return null;
  }
  if (!redis) {
    try {
      // Configure Redis to not auto-connect to prevent hangs
      redis = new Redis(redisUrl, {
        lazyConnect: true,
        retryStrategy: () => null, // Don't retry on connection failure
        maxRetriesPerRequest: 1,
        enableReadyCheck: false,
      });
    } catch (error) {
      console.warn('Failed to create Redis client for NextAuth adapter:', error);
      return null;
    }
  }
  return redis;
}

export function RedisAdapter(): Adapter | undefined {
  const redisClient = getRedis();
  if (!redisClient) return undefined;

  // Store email from callback URL temporarily (expires in 5 minutes)
  // This allows adapter methods to access the email even if NextAuth doesn't pass it
  let emailFromCallback: string | null = null;
  const storeEmailFromCallback = async (email: string) => {
    emailFromCallback = email;
    // Also store in Redis as backup (expires in 5 minutes)
    await redisClient.set(`auth:email-from-callback:${Date.now()}`, email, 'EX', 300);
    console.log('[RedisAdapter] Stored email from callback URL:', email);
  };

  // Helper function to get user by ID
  const getUserById = async (id: string) => {
    console.log('[RedisAdapter] getUserById called:', { id });
    try {
      const userData = await redisClient.get(`auth:user:${id}`);
      if (!userData) {
        console.log('[RedisAdapter] No user data found for id:', id);
        return null;
      }
      const user = JSON.parse(userData);
      console.log('[RedisAdapter] User retrieved:', { id: user.id, email: user.email });
      return user;
    } catch (error) {
      console.error('[RedisAdapter] Redis error in getUser:', error);
      return null;
    }
  };

  const adapterObject = {
    async createUser(user) {
      const userId = `user:${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log('[RedisAdapter] createUser called:', { 
        email: user.email, 
        name: user.name, 
        emailVerified: user.emailVerified,
        generatedId: userId,
        fullUserObject: user
      });
      
      // For email providers, ensure email is set (NextAuth should provide it, but be defensive)
      if (!user.email && user.emailVerified) {
        console.warn('[RedisAdapter] User missing email but has emailVerified, this shouldn\'t happen');
      }
      
      try {
        // Ensure all required fields are present - email is critical for email providers
        const userData: any = {
          id: userId,
          email: user.email || null,
          name: user.name || null,
          emailVerified: user.emailVerified || null,
          image: user.image || null,
          username: user.username || null,
        };
        
        // Validate email is present for email provider users
        if (!userData.email) {
          console.error('[RedisAdapter] Creating user without email - this will cause account linking issues');
        }
        
        await redisClient.set(`auth:user:${userId}`, JSON.stringify(userData));
        if (userData.email) {
          await redisClient.set(`auth:email:${userData.email}`, userId);
        }
        console.log('[RedisAdapter] User created successfully:', { userId, email: userData.email });
        return userData;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in createUser:', error);
        throw error;
      }
    },
    async getUser(id) {
      return getUserById(id);
    },
    async getUserByEmail(email) {
      console.log('[RedisAdapter] getUserByEmail called:', { email });
      try {
        const userId = await redisClient.get(`auth:email:${email}`);
        if (!userId) {
          console.log('[RedisAdapter] No user found for email:', email);
          return null;
        }
        const user = await getUserById(userId);
        console.log('[RedisAdapter] User found by email:', { userId, userEmail: user?.email });
        
        // Ensure user has email set (should always be true when retrieved by email, but be defensive)
        if (user && !user.email && email) {
          console.warn('[RedisAdapter] User found by email but missing email field, updating...');
          user.email = email;
          await redisClient.set(`auth:user:${user.id}`, JSON.stringify(user));
        }
        
        return user;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getUserByEmail:', error);
        return null;
      }
    },
    async getUserByAccount({ providerAccountId, provider }) {
      try {
        const accountKey = `auth:account:${provider}:${providerAccountId}`;
        const userId = await redisClient.get(accountKey);
        if (!userId) return null;
        return getUserById(userId);
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getUserByAccount:', error);
        return null;
      }
    },
    async updateUser(user) {
      try {
        await redisClient.set(`auth:user:${user.id}`, JSON.stringify(user));
        if (user.email) {
          await redisClient.set(`auth:email:${user.email}`, user.id);
        }
      } catch (error) {
        console.error('Redis error in updateUser:', error);
        throw error;
      }
      return user;
    },
    async linkAccount(account) {
      console.log('[RedisAdapter] linkAccount called:', { 
        provider: account.provider, 
        providerAccountId: account.providerAccountId, 
        userId: account.userId,
        type: account.type,
        accessToken: account.accessToken ? 'present' : 'missing',
        refreshToken: account.refreshToken ? 'present' : 'missing',
        expiresAt: account.expiresAt
      });
      
      // Validate required fields
      if (!account.provider) {
        console.error('[RedisAdapter] Account missing provider');
        throw new Error('Account missing provider');
      }
      
      // For email provider, if providerAccountId is missing, try multiple fallback sources
      if (account.provider === 'email' && !account.providerAccountId && account.userId) {
        console.log('[RedisAdapter] Email account missing providerAccountId, trying fallback sources...');
        
        // Try 1: Get from user object
        const user = await getUserById(account.userId);
        if (user?.email) {
          account.providerAccountId = user.email;
          console.log('[RedisAdapter] Set providerAccountId from user email:', user.email);
        } else {
          // Try 2: Get from stored callback email
          if (emailFromCallback) {
            account.providerAccountId = emailFromCallback;
            console.log('[RedisAdapter] Set providerAccountId from callback email:', emailFromCallback);
            // Clear it after use
            emailFromCallback = null;
          } else {
            // Try 3: Get from Redis (check recent entries)
            const keys = await redisClient.keys('auth:email-from-callback:*');
            if (keys.length > 0) {
              // Get the most recent one
              const mostRecentKey = keys.sort().reverse()[0];
              const storedEmail = await redisClient.get(mostRecentKey);
              if (storedEmail) {
                account.providerAccountId = storedEmail;
                console.log('[RedisAdapter] Set providerAccountId from Redis stored email:', storedEmail);
                // Clean up
                await redisClient.del(mostRecentKey);
              }
            }
          }
        }
      }
      
      if (!account.providerAccountId) {
        console.error('[RedisAdapter] Account missing providerAccountId');
        throw new Error('Account missing providerAccountId');
      }
      if (!account.userId) {
        console.error('[RedisAdapter] Account missing userId');
        throw new Error('Account missing userId');
      }
      
      try {
        const accountKey = `auth:account:${account.provider}:${account.providerAccountId}`;
        await redisClient.set(accountKey, account.userId);
        await redisClient.set(`auth:account:data:${account.provider}:${account.providerAccountId}`, JSON.stringify(account));
        console.log('[RedisAdapter] Account linked successfully');
        return account;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in linkAccount:', error);
        throw error;
      }
    },
    async createSession({ sessionToken, userId, expires }) {
      console.log('[RedisAdapter] createSession called:', { sessionToken: sessionToken.substring(0, 20) + '...', userId, expires });
      try {
        const session = { sessionToken, userId, expires };
        const ttl = Math.floor((expires.getTime() - Date.now()) / 1000);
        await redisClient.set(`auth:session:${sessionToken}`, JSON.stringify(session), 'EX', ttl);
        await redisClient.set(`auth:user-sessions:${userId}`, sessionToken);
        console.log('[RedisAdapter] Session created successfully');
        return session;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in createSession:', error);
        throw error;
      }
    },
    async getSessionAndUser(sessionToken) {
      console.log('[RedisAdapter] getSessionAndUser called:', { sessionToken: sessionToken?.substring(0, 20) + '...' });
      try {
        const sessionData = await redisClient.get(`auth:session:${sessionToken}`);
        if (!sessionData) {
          console.log('[RedisAdapter] No session found for token');
          return null;
        }
        const session = JSON.parse(sessionData);
        const user = await getUserById(session.userId);
        if (!user) {
          console.log('[RedisAdapter] No user found for session userId:', session.userId);
          return null;
        }
        console.log('[RedisAdapter] Session and user found:', { userId: user.id, email: user.email });
        return { session, user };
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getSessionAndUser:', error);
        return null;
      }
    },
    async updateSession({ sessionToken, ...data }) {
      try {
        const sessionData = await redisClient.get(`auth:session:${sessionToken}`);
        if (!sessionData) return null;
        const session = JSON.parse(sessionData);
        const updated = { ...session, ...data };
        const ttl = Math.floor((updated.expires.getTime() - Date.now()) / 1000);
        await redisClient.set(`auth:session:${sessionToken}`, JSON.stringify(updated), 'EX', ttl);
        return updated;
      } catch (error) {
        console.error('Redis error in updateSession:', error);
        return null;
      }
    },
    async deleteSession(sessionToken) {
      try {
        const sessionData = await redisClient.get(`auth:session:${sessionToken}`);
        if (sessionData) {
          const session = JSON.parse(sessionData);
          await redisClient.del(`auth:user-sessions:${session.userId}`);
        }
        await redisClient.del(`auth:session:${sessionToken}`);
      } catch (error) {
        console.error('Redis error in deleteSession:', error);
      }
    },
    async createVerificationToken({ identifier, expires, token }) {
      console.log('[RedisAdapter] createVerificationToken called:', { identifier, token: token.substring(0, 20) + '...' });
      try {
        const verificationToken = { identifier, expires, token };
        const ttl = Math.floor((expires.getTime() - Date.now()) / 1000);
        await redisClient.set(`auth:verification:${token}`, JSON.stringify(verificationToken), 'EX', ttl);
        console.log('[RedisAdapter] Verification token created successfully');
        return verificationToken;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in createVerificationToken:', error);
        throw error;
      }
    },
    async useVerificationToken({ token }) {
      console.log('[RedisAdapter] useVerificationToken called:', { token: token.substring(0, 20) + '...' });
      try {
        const tokenData = await redisClient.get(`auth:verification:${token}`);
        if (!tokenData) {
          console.log('[RedisAdapter] Verification token not found');
          return null;
        }
        await redisClient.del(`auth:verification:${token}`);
        const parsed = JSON.parse(tokenData);
        console.log('[RedisAdapter] Verification token used successfully:', { identifier: parsed.identifier });
        
        // Store the email identifier for later use in user creation/retrieval
        // This ensures we can set it on the user even if NextAuth doesn't pass it correctly
        if (parsed.identifier) {
          // Store in a temporary key that expires in 5 minutes
          // This allows us to retrieve the email when creating/linking the account
          await redisClient.set(`auth:email-from-token:${token}`, parsed.identifier, 'EX', 300);
          console.log('[RedisAdapter] Stored email identifier from token:', parsed.identifier);
        }
        
        return parsed;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in useVerificationToken:', error);
        return null;
      }
    },
  };
  
  // Expose helper method for storing email from callback URL
  (adapterObject as any).storeEmailFromCallback = storeEmailFromCallback;
  
  return adapterObject as Adapter & { storeEmailFromCallback?: (email: string) => Promise<void> };
}

