/**
 * Visual Critique API Route
 * Receives slide screenshots from client and returns OpenAI Vision critiques
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { critiqueDeck } from '@/ai/studio/critique/visualCritic';
import { auth } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Check authentication (optional, remove if you want public access)
    const session = await auth();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { deckId, images, context } = body;

    if (!deckId || !images || !Array.isArray(images)) {
      return NextResponse.json(
        { error: 'Missing required fields: deckId, images' },
        { status: 400 }
      );
    }

    // Convert images array back to Map
    const slideImages = new Map<string, string>(
      images.map((img: { slideId: string; imageData: string }) => [img.slideId, img.imageData])
    );

    // Load the deck to get metadata
    // TODO: Fetch deck from database using deckId
    // For now, we'll require the deck to be passed in context
    if (!context?.deck) {
      return NextResponse.json(
        { error: 'Deck data required in context' },
        { status: 400 }
      );
    }

    const deck = context.deck;

    // Run visual critique
    const critiques = await critiqueDeck(slideImages, deck, {
      presentationTheme: context.theme || deck.meta?.title || 'Presentation',
      targetAudience: context.audience || 'General audience',
      designLanguage: context.designLanguage || 'Modern',
    });

    return NextResponse.json({
      success: true,
      critiques,
      summary: {
        totalSlides: critiques.length,
        averageScore: critiques.reduce((sum, c) => sum + c.overallScore, 0) / critiques.length,
        highPriorityIssues: critiques.flatMap(c => c.issues.filter(i => i.severity === 'high')).length,
      },
    });

  } catch (error) {
    console.error('Visual critique API error:', error);
    return NextResponse.json(
      { error: 'Failed to process visual critique', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if visual critique is available
export async function GET() {
  const hasApiKey = !!process.env.OPENAI_API_KEY;

  return NextResponse.json({
    available: hasApiKey,
    model: 'gpt-4-vision-preview',
    features: [
      'Typography analysis',
      'Color contrast (WCAG)',
      'Visual hierarchy',
      'Layout assessment',
      'Accessibility review',
    ],
  });
}
