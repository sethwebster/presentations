import type { Adapter } from '@auth/core/adapters';
import crypto from 'crypto';
import { getRedis } from './redis';

// Helper function to generate Gravatar URL from email
function getGravatarUrl(email: string): string {
  const normalizedEmail = email.toLowerCase().trim();
  const hash = crypto.createHash('md5').update(normalizedEmail).digest('hex');
  // d=identicon generates a unique geometric pattern as fallback
  // s=200 sets size to 200px
  return `https://www.gravatar.com/avatar/${hash}?d=identicon&s=200`;
}

export function RedisAdapter(): Adapter | undefined {
  const redisClient = getRedis();
  if (!redisClient) {
    console.warn('[RedisAdapter] No Redis client available');
    return undefined;
  }

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
    try {
      const userData = await redisClient.get(`auth:user:${id}`);
      if (!userData) {
        return null;
      }
      const user = JSON.parse(userData);

      // Convert emailVerified from ISO string back to Date object if needed
      if (user.emailVerified && typeof user.emailVerified === 'string') {
        user.emailVerified = new Date(user.emailVerified);
      }

      return user;
    } catch (error) {
      console.error('[RedisAdapter] Redis error in getUser:', error);
      return null;
    }
  };

  const adapterObject = {
    async createUser(user: any) {
      const userId = `user:${Date.now()}-${Math.random().toString(36).substring(7)}`;
      console.log('[RedisAdapter] createUser called:', {
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        generatedId: userId,
        fullUserObject: user
      });

      // For email providers, if email is missing, try to retrieve it from stored verification tokens
      let email = user.email;
      if (!email && user.emailVerified) {
        console.warn('[RedisAdapter] User missing email but has emailVerified, attempting to retrieve from verification tokens');

        // Try to get email from stored verification tokens
        try {
          // Try 1: Check the "latest" key first (most reliable)
          const latestEmail = await redisClient.get('auth:email-from-token:latest');
          if (latestEmail) {
            email = latestEmail;
            console.log('[RedisAdapter] Retrieved email from latest token:', email);
            // Clean up
            await redisClient.del('auth:email-from-token:latest');
          }

          // Try 2: Check timestamped keys
          if (!email) {
            const keys = await redisClient.keys('auth:email-from-token:*');
            if (keys.length > 0) {
              // Filter out the 'latest' key and sort by timestamp (descending)
              const timestampKeys = keys.filter(k => k !== 'auth:email-from-token:latest').sort().reverse();
              if (timestampKeys.length > 0) {
                const mostRecentKey = timestampKeys[0];
                const storedEmail = await redisClient.get(mostRecentKey);
                if (storedEmail) {
                  email = storedEmail;
                  console.log('[RedisAdapter] Retrieved email from verification token:', email);
                  // Clean up the token
                  await redisClient.del(mostRecentKey);
                }
              }
            }
          }

          // Try 3: Check callback emails if no token email found
          if (!email) {
            const callbackKeys = await redisClient.keys('auth:email-from-callback:*');
            if (callbackKeys.length > 0) {
              const mostRecentKey = callbackKeys.sort().reverse()[0];
              const storedEmail = await redisClient.get(mostRecentKey);
              if (storedEmail) {
                email = storedEmail;
                console.log('[RedisAdapter] Retrieved email from callback:', email);
                await redisClient.del(mostRecentKey);
              }
            }
          }
        } catch (err) {
          console.error('[RedisAdapter] Error retrieving email from tokens:', err);
        }
      }

      try {
        // Ensure all required fields are present - email is critical for email providers
        const userData: any = {
          id: userId,
          email: email || null,
          name: user.name || null,
          emailVerified: user.emailVerified || null,
          image: user.image || null,
          username: user.username || null,
        };

        // Auto-generate Gravatar if email exists but no image provided
        if (userData.email && !userData.image) {
          userData.image = getGravatarUrl(userData.email);
          console.log('[RedisAdapter] Generated Gravatar URL for user:', { email: userData.email });
        }

        // Validate email is present for email provider users
        if (!userData.email) {
          console.error('[RedisAdapter] Creating user without email - this will cause account linking issues');
        }

        await redisClient.set(`auth:user:${userId}`, JSON.stringify(userData));
        if (userData.email) {
          await redisClient.set(`auth:email:${userData.email}`, userId);
        }
        console.log('[RedisAdapter] User created successfully:', { userId, email: userData.email, hasImage: !!userData.image });
        return userData;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in createUser:', error);
        throw error;
      }
    },
    async getUser(id: any) {
      return getUserById(id);
    },
    async getUserByEmail(email: any) {
      console.log('[RedisAdapter] getUserByEmail called:', { email });
      try {
        const userId = await redisClient.get(`auth:email:${email}`);
        if (!userId) {
          console.log('[RedisAdapter] No user found for email:', email);
          return null;
        }

        // Get user data directly from Redis to see raw state
        const rawUserData = await redisClient.get(`auth:user:${userId}`);
        console.log('[RedisAdapter] Raw user data from Redis:', rawUserData?.substring(0, 200));

        const user = await getUserById(userId);
        console.log('[RedisAdapter] User found by email:', { userId, userEmail: user?.email, hasEmail: !!user?.email });

        // CRITICAL: Ensure user has email set
        if (user && !user.email && email) {
          console.warn('[RedisAdapter] User found by email but missing email field, fixing...');

          // Create properly structured user object
          const fixedUser = {
            ...user,
            email: email,
            emailVerified: user.emailVerified || null,
          };

          await redisClient.set(`auth:user:${user.id}`, JSON.stringify(fixedUser));
          console.log('[RedisAdapter] Fixed user object saved:', JSON.stringify(fixedUser));

          return fixedUser;
        }

        return user;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getUserByEmail:', error);
        return null;
      }
    },
    async getUserByAccount({ providerAccountId, provider }: any) {
      console.log('[RedisAdapter] getUserByAccount called:', { provider, providerAccountId });
      try {
        const accountKey = `auth:account:${provider}:${providerAccountId}`;
        const userId = await redisClient.get(accountKey);
        if (!userId) {
          console.log('[RedisAdapter] No account found:', { accountKey });
          return null;
        }
        const user = await getUserById(userId);
        console.log('[RedisAdapter] User found by account:', { userId, hasUser: !!user });
        return user;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getUserByAccount:', error);
        return null;
      }
    },
    async updateUser(user: any) {
      console.log('[RedisAdapter] updateUser called:', {
        id: user.id,
        email: user.email,
        hasEmail: !!user.email,
        keys: Object.keys(user),
      });

      try {
        // CRITICAL: Always fetch existing user data to preserve all fields
        const existingUserData = await redisClient.get(`auth:user:${user.id}`);
        let existingUser: any = {};

        if (existingUserData) {
          existingUser = JSON.parse(existingUserData);
          console.log('[RedisAdapter] Existing user data:', {
            id: existingUser.id,
            email: existingUser.email,
            username: existingUser.username,
            name: existingUser.name,
            hasImage: !!existingUser.image,
            keys: Object.keys(existingUser),
          });
        } else {
          console.log('[RedisAdapter] No existing user data found');
        }

        // Merge: Start with existing data, then override with new data
        // This preserves username, name, image, and other fields
        const userToSave = {
          ...existingUser,  // Start with ALL existing fields
          ...user,          // Override with new fields from NextAuth
          // Ensure these critical fields always exist
          id: user.id,
          email: user.email || existingUser.email || null,
          emailVerified: user.emailVerified || existingUser.emailVerified || null,
        };

        console.log('[RedisAdapter] Merged user data to save:', {
          id: userToSave.id,
          email: userToSave.email,
          username: userToSave.username,
          name: userToSave.name,
          hasImage: !!userToSave.image,
          keys: Object.keys(userToSave),
        });

        await redisClient.set(`auth:user:${user.id}`, JSON.stringify(userToSave));

        if (userToSave.email) {
          await redisClient.set(`auth:email:${userToSave.email}`, user.id);
          console.log('[RedisAdapter] Updated email mapping:', { email: userToSave.email, userId: user.id });
        }

        return userToSave;
      } catch (error) {
        console.error('Redis error in updateUser:', error);
        throw error;
      }
    },
    async linkAccount(account: any) {
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
        console.log('[RedisAdapter] Account linked successfully:', {
          accountKey,
          userId: account.userId,
          email: account.providerAccountId
        });

        // CRITICAL: For email provider, also ensure email mapping exists
        if (account.provider === 'email' && account.providerAccountId) {
          const user = await getUserById(account.userId);
          if (user) {
            let needsUpdate = false;

            // If missing email, add it
            if (!user.email) {
              user.email = account.providerAccountId;
              needsUpdate = true;
              console.log('[RedisAdapter] Updated user with email from account:', account.providerAccountId);
            }

            // If missing image, generate Gravatar
            if (!user.image && user.email) {
              user.image = getGravatarUrl(user.email);
              needsUpdate = true;
              console.log('[RedisAdapter] Generated Gravatar for user:', { email: user.email });
            }

            // Save if any updates were made
            if (needsUpdate) {
              await redisClient.set(`auth:user:${user.id}`, JSON.stringify(user));
              console.log('[RedisAdapter] Updated user with email and/or Gravatar');
            }
          }

          // Ensure email mapping exists
          await redisClient.set(`auth:email:${account.providerAccountId}`, account.userId);
          console.log('[RedisAdapter] Ensured email mapping exists:', {
            email: account.providerAccountId,
            userId: account.userId
          });
        }

        return account;
      } catch (error) {
        console.error('[RedisAdapter] Redis error in linkAccount:', error);
        throw error;
      }
    },
    async createSession({ sessionToken, userId, expires }: any) {
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
    async getSessionAndUser(sessionToken: any) {
      try {
        const sessionData = await redisClient.get(`auth:session:${sessionToken}`);
        if (!sessionData) {
          return null;
        }
        const session = JSON.parse(sessionData);

        // Convert expires from ISO string back to Date object
        if (session.expires && typeof session.expires === 'string') {
          session.expires = new Date(session.expires);
        }

        const user = await getUserById(session.userId);
        if (!user) {
          return null;
        }
        return { session, user };
      } catch (error) {
        console.error('[RedisAdapter] Redis error in getSessionAndUser:', error);
        return null;
      }
    },
    async updateSession({ sessionToken, ...data }: any) {
      try {
        const sessionData = await redisClient.get(`auth:session:${sessionToken}`);
        if (!sessionData) return null;
        const session = JSON.parse(sessionData);

        // Convert expires from ISO string back to Date object if needed
        if (session.expires && typeof session.expires === 'string') {
          session.expires = new Date(session.expires);
        }

        const updated = { ...session, ...data };

        // Ensure updated.expires is a Date object
        if (updated.expires && typeof updated.expires === 'string') {
          updated.expires = new Date(updated.expires);
        }

        const ttl = Math.floor((updated.expires.getTime() - Date.now()) / 1000);
        await redisClient.set(`auth:session:${sessionToken}`, JSON.stringify(updated), 'EX', ttl);
        return updated;
      } catch (error) {
        console.error('Redis error in updateSession:', error);
        return null;
      }
    },
    async deleteSession(sessionToken: any) {
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
    async createVerificationToken({ identifier, expires, token }: any) {
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
    async useVerificationToken({ token }: any) {
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
          // Store with multiple keys for redundancy:
          // 1. By token (for immediate use)
          await redisClient.set(`auth:email-from-token:${token}`, parsed.identifier, 'EX', 300);
          // 2. By timestamp (as a fallback, get the most recent)
          const timestamp = Date.now();
          await redisClient.set(`auth:email-from-token:${timestamp}`, parsed.identifier, 'EX', 300);
          // 3. Store as "latest" for easy retrieval
          await redisClient.set(`auth:email-from-token:latest`, parsed.identifier, 'EX', 300);

          console.log('[RedisAdapter] Stored email identifier from token with multiple keys:', {
            email: parsed.identifier,
            timestamp
          });
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

