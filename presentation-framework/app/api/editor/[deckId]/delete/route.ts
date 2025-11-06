import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import type { DeckDefinition } from '@/rsc/types';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const redis = getRedis();

type DeckDeleteRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function DELETE(_request: Request, context: DeckDeleteRouteContext) {
  const { deckId } = await context.params;

  if (!redis) {
    return NextResponse.json(
      { error: 'Redis not configured' },
      { status: 500 }
    );
  }

  // Require authentication for delete
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Load the deck
    const deckDataJson = await redis.get(`deck:${deckId}:data`);
    if (!deckDataJson) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    const deckData = JSON.parse(deckDataJson) as DeckDefinition;

    // Verify ownership
    const isOwner = deckData.meta?.ownerId === userId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - You must be the owner to delete this presentation' },
        { status: 403 }
      );
    }

    // Soft delete by setting deletedAt timestamp
    const updatedDeck: DeckDefinition = {
      ...deckData,
      meta: {
        ...deckData.meta,
        deletedAt: new Date().toISOString(),
      },
    };

    // Save the updated deck
    await redis.set(`deck:${deckId}:data`, JSON.stringify(updatedDeck));

    console.log('API: Deleted deck', deckId, { title: deckData.meta.title });

    return NextResponse.json({ success: true }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error deleting deck:', error);
    return NextResponse.json(
      { error: 'Failed to delete deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

