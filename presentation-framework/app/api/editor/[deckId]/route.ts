import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import type { DeckDefinition } from '@/rsc/types';

export const runtime = 'edge';

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function GET(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  try {
    // Try to load deck from KV storage
    const deckData = await kv.get<DeckDefinition>(`deck:${deckId}:data`);

    if (!deckData) {
      // Return empty deck structure if not found (new presentation)
      const emptyDeck: DeckDefinition = {
        meta: {
          id: deckId,
          title: 'Untitled Presentation',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: 'Slide 1',
            layers: [],
            elements: [],
          },
        ],
      };

      // Save the new deck
      await kv.set(`deck:${deckId}:data`, emptyDeck);

      return NextResponse.json(emptyDeck);
    }

    return NextResponse.json(deckData);
  } catch (error) {
    console.error('Error loading deck:', error);
    return NextResponse.json(
      { error: 'Failed to load deck' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;

  try {
    const deckData = await request.json() as DeckDefinition;
    
    console.log('API: Saving deck', deckId, { 
      slides: deckData.slides.length, 
      title: deckData.meta.title,
      updatedAt: deckData.meta.updatedAt 
    });

    // Save deck to KV storage
    await kv.set(`deck:${deckId}:data`, deckData);
    
    console.log('API: Deck saved successfully', deckId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API: Error saving deck:', error);
    return NextResponse.json(
      { error: 'Failed to save deck', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

