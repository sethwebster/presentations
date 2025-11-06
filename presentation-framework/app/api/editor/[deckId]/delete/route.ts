import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDeck, deleteDeck } from '@/lib/deckApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type DeckDeleteRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function DELETE(_request: Request, context: DeckDeleteRouteContext) {
  const { deckId } = await context.params;

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
    // Load the deck (supports both old and new formats)
    const deckData = await getDeck(deckId);
    if (!deckData) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    const isOwner = deckData.meta?.ownerId === userId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Forbidden - You must be the owner to delete this presentation' },
        { status: 403 }
      );
    }

    // Delete the deck (handles both old and new formats)
    await deleteDeck(deckId);

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

