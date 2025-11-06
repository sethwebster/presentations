import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import type { EditorCommand } from '@/editor/core/Editor';
import { auth } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Create Redis client from environment variables
const redisUrl = process.env.REDIS_URL || process.env.KV_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

interface CommandHistory {
  undoStack: EditorCommand[];
  redoStack: EditorCommand[];
}

type HistoryRouteContext = {
  params: Promise<{ deckId: string }>;
};

/**
 * GET /api/editor/[deckId]/history
 * Load undo/redo command history for a deck
 */
export async function GET(request: Request, context: HistoryRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  // Get authenticated user session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Load history from Redis (access is already verified by the main deck route)
    // History is stored per deck, not per user
    const historyJson = await redis.get(`deck:${deckId}:history:${userId}`);
    
    if (!historyJson) {
      // Return empty history for new decks
      return NextResponse.json({
        undoStack: [],
        redoStack: [],
      });
    }

    const history = JSON.parse(historyJson) as CommandHistory;

    return NextResponse.json(history, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error loading command history:', error);
    return NextResponse.json(
      { error: 'Failed to load command history', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/editor/[deckId]/history
 * Save undo/redo command history for a deck
 */
export async function POST(request: Request, context: HistoryRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  // Get authenticated user session
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Parse request body (access is already verified by the main deck route)
    const requestText = await request.text();
    const requestSizeMB = new Blob([requestText]).size / (1024 * 1024);
    
    // Warn if payload is large
    if (requestSizeMB > 10) {
      console.warn(`API: Large history payload detected: ${requestSizeMB.toFixed(2)}MB`);
    }

    let history: CommandHistory;
    try {
      history = JSON.parse(requestText) as CommandHistory;
      
      // Validate structure
      if (!Array.isArray(history.undoStack) || !Array.isArray(history.redoStack)) {
        return NextResponse.json(
          { error: 'Invalid history format - must contain undoStack and redoStack arrays' },
          { status: 400 }
        );
      }
    } catch (parseError) {
      console.error('API: JSON parse error:', parseError);
      return NextResponse.json(
        { 
          error: 'Failed to parse history data', 
          details: parseError instanceof Error ? parseError.message : String(parseError),
          payloadSizeMB: requestSizeMB.toFixed(2)
        },
        { status: 400 }
      );
    }

    // Save history to Redis (per-user)
    // Note: History can be large, but Redis supports up to 512MB per value
    try {
      await redis.set(`deck:${deckId}:history:${userId}`, JSON.stringify(history));
      
      console.log('API: History saved successfully', deckId, {
        undoStackSize: history.undoStack.length,
        redoStackSize: history.redoStack.length,
        payloadSizeMB: requestSizeMB.toFixed(2)
      });
    } catch (redisError) {
      console.error('API: Redis storage error:', redisError);
      return NextResponse.json(
        { 
          error: 'Failed to save history to storage', 
          details: redisError instanceof Error ? redisError.message : String(redisError),
          payloadSizeMB: requestSizeMB.toFixed(2),
          suggestion: requestSizeMB > 50 ? 'Payload may be too large. Consider pruning old history entries.' : undefined
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API: Error saving history:', error);
    return NextResponse.json(
      { error: 'Failed to save history', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

