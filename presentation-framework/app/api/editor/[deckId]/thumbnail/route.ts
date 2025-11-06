import { NextResponse } from 'next/server';
import { getDeckThumbnail } from '@/lib/deckApi';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type ThumbnailRouteContext = {
  params: Promise<{ deckId: string }>;
};

/**
 * GET /api/editor/[deckId]/thumbnail
 *
 * Returns the thumbnail image for a deck (WebP format, 320x180)
 * Thumbnails are automatically generated when decks are saved.
 *
 * Response:
 * - 200: Returns WebP image data
 * - 404: Thumbnail not found
 * - 500: Server error
 */
export async function GET(request: Request, context: ThumbnailRouteContext) {
  const { deckId } = await context.params;

  try {
    const thumbnail = await getDeckThumbnail(deckId);

    if (!thumbnail) {
      return NextResponse.json(
        { error: 'Thumbnail not found' },
        { status: 404 }
      );
    }

    // Return the thumbnail as WebP image
    // Convert Buffer to Uint8Array for NextResponse
    return new NextResponse(new Uint8Array(thumbnail), {
      headers: {
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error(`[Thumbnail API] Error loading thumbnail for ${deckId}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to load thumbnail',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
