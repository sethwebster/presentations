import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { listDecks } from '@/lib/deckApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
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
    // Get all decks (supports both old and new formats)
    const allDecks = await listDecks();

    // Filter decks by access permissions
    const accessibleDecks = allDecks.filter((deck) => {
      // User owns the deck
      if (deck.ownerId === userId) return true;

      // User is in sharedWith list
      if (deck.sharedWith?.includes(userId)) return true;

      // Legacy deck with no owner - allow access for now
      if (!deck.ownerId && !deck.sharedWith) return true;

      return false;
    });

    // Filter out deleted decks and format response
    const validDecks = accessibleDecks
      .filter((deck) => !deck.deletedAt)
      .map((deck) => ({
        id: deck.id,
        slug: deck.slug,
        title: deck.title || 'Untitled Presentation',
        createdAt: deck.createdAt || new Date().toISOString(),
        updatedAt: deck.updatedAt || new Date().toISOString(),
        slideCount: 0, // Will be populated from meta in future if needed
      }))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return NextResponse.json(validDecks, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error('Error listing decks:', error);
    return NextResponse.json(
      { error: 'Failed to list decks', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

