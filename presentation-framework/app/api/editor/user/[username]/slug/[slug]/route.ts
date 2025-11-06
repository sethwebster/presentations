import { NextResponse } from 'next/server';
import { listDecks } from '@/lib/deckApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type UserSlugRouteContext = {
  params: Promise<{ username: string; slug: string }>;
};

export async function GET(request: Request, context: UserSlugRouteContext) {
  const { username, slug } = await context.params;

  if (!username || !slug) {
    return NextResponse.json(
      { error: 'Username and slug parameters required' },
      { status: 400 }
    );
  }

  try {
    // Get all decks (supports both old and new formats)
    const decks = await listDecks();

    // Find the deck with this slug or deckId that belongs to the user
    // Note: username matching would require storing username in deck metadata
    // For now, just match by slug/deckId (same as the non-user route)
    const deck = decks.find(d => d.slug === slug || d.id === slug);

    if (deck) {
      return NextResponse.json({ deckId: deck.id }, {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }

    return NextResponse.json(
      { error: 'Deck not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error finding deck by user/slug:', error);
    return NextResponse.json(
      { error: 'Failed to find deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
