import { NextResponse } from 'next/server';
import { listDecks } from '@/lib/deckApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type SlugRouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: SlugRouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json(
      { error: 'Slug parameter required' },
      { status: 400 }
    );
  }

  try {
    // Get all decks (supports both old and new formats)
    const decks = await listDecks();

    // Find the deck with this slug or deckId
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
    console.error('Error finding deck by slug:', error);
    return NextResponse.json(
      { error: 'Failed to find deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

