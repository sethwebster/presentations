import Redis from 'ioredis';
import type { DeckDefinition } from '@/rsc/types';
import type { UserProfile, PublicPresentation } from './types';

// Server-side function to fetch user showcase data directly from Redis
export async function getUserShowcase(username: string): Promise<{ profile: UserProfile | null; presentations: PublicPresentation[] } | null> {
  const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
  if (!redisUrl) {
    console.error('REDIS_URL or KV_URL environment variable is not set');
    return null;
  }

  const redis = new Redis(redisUrl);

  try {
    // Find user by username (check email prefix or name)
    let userId: string | null = null;
    
    const userKeys = await redis.keys('auth:user:*');
    for (const userKey of userKeys) {
      try {
        const userData = await redis.get(userKey);
        if (userData) {
          const user = JSON.parse(userData);
          const emailPrefix = user.email?.split('@')[0]?.toLowerCase();
          const userName = user.name?.toLowerCase().replace(/\s+/g, '-');
          if (
            emailPrefix === username.toLowerCase() ||
            userName === username.toLowerCase() ||
            user.id === username
          ) {
            userId = user.id;
            break;
          }
        }
      } catch {
        // Skip invalid user records
        continue;
      }
    }

    if (!userId) {
      await redis.quit();
      return null;
    }

    // Find all deck keys and fetch public presentations for this user
    const keys = await redis.keys('deck:*:data');
    const publicPresentations: PublicPresentation[] = [];

    for (const key of keys) {
      const deckId = key.replace('deck:', '').replace(':data', '');
      try {
        const deckDataJson = await redis.get(key);
        if (deckDataJson) {
          const deckData = JSON.parse(deckDataJson) as DeckDefinition;
          
          if (
            deckData.meta?.ownerId === userId &&
            deckData.meta?.public === true
          ) {
            publicPresentations.push({
              id: deckId,
              title: deckData.meta?.title || 'Untitled Presentation',
              description: deckData.meta?.description,
              createdAt: deckData.meta?.createdAt || new Date().toISOString(),
              updatedAt: deckData.meta?.updatedAt || new Date().toISOString(),
              slideCount: deckData.slides?.length || 0,
              coverImage: deckData.meta?.coverImage,
            });
          }
        }
      } catch {
        console.error(`Error loading deck ${deckId}`);
        continue;
      }
    }

    // Sort by updatedAt (most recent first)
    publicPresentations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Get user profile info
    const userDataJson = await redis.get(`auth:user:${userId}`);
    let userProfile: UserProfile | null = null;
    if (userDataJson) {
      const user = JSON.parse(userDataJson);
      // Check for bio in user profile (might be stored separately or in user data)
      const bioKey = `user:${userId}:bio`;
      const bioData = await redis.get(bioKey);
      const bio = bioData || user.bio || null;
      
      userProfile = {
        username: username,
        name: user.name,
        email: user.email,
        bio: bio,
        presentationCount: publicPresentations.length,
      };
    }

    await redis.quit();
    
    return {
      profile: userProfile,
      presentations: publicPresentations,
    };
  } catch (error) {
    console.error('Error loading user showcase:', error);
    await redis.quit();
    return null;
  }
}

