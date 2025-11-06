import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

export async function GET(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');
  const conversationId = searchParams.get('conversationId');

  if (!deckId) {
    return NextResponse.json(
      { error: 'deckId is required' },
      { status: 400 }
    );
  }

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    // Get conversation history
    const historyKey = conversationId 
      ? `conversation:${conversationId}:messages`
      : `conversation:${deckId}-${session.user.id}:messages`;
    
    let conversationHistory: Array<{ role: string; content: string; timestamp?: string }> = [];
    
    try {
      const historyData = await redis.get(historyKey);
      if (historyData) {
        conversationHistory = JSON.parse(historyData);
      }
    } catch (err) {
      console.error('Failed to load conversation history:', err);
    }

    // Convert to the format expected by the frontend
    const messages = conversationHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }));

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('Error loading conversation history:', error);
    return NextResponse.json(
      {
        error: 'Failed to load conversation history',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const deckId = searchParams.get('deckId');
  const conversationId = searchParams.get('conversationId');

  if (!deckId) {
    return NextResponse.json(
      { error: 'deckId is required' },
      { status: 400 }
    );
  }

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  try {
    // Delete conversation history
    const historyKey = conversationId 
      ? `conversation:${conversationId}:messages`
      : `conversation:${deckId}-${session.user.id}:messages`;
    
    await redis.del(historyKey);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error clearing conversation history:', error);
    return NextResponse.json(
      {
        error: 'Failed to clear conversation history',
        detail: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}

