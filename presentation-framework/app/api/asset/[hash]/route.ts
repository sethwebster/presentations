/**
 * API Route: GET /api/asset/[hash]
 * Serves binary assets from the AssetStore by SHA-256 hash
 */

import { NextRequest, NextResponse } from 'next/server';
import { AssetStore } from '../../../../src/repositories/AssetStore';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> }
) {
  try {
    const { hash } = await params;

    // Validate hash format (SHA-256 is 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(hash)) {
      return NextResponse.json(
        { error: 'Invalid asset hash format' },
        { status: 400 }
      );
    }

    const assetStore = new AssetStore();

    // Get asset metadata
    const info = await assetStore.info(hash);
    if (!info) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    // Get asset data
    const data = await assetStore.get(hash);
    if (!data) {
      return NextResponse.json(
        { error: 'Asset data not found' },
        { status: 404 }
      );
    }

    // Convert Uint8Array to Buffer for Next.js response
    const buffer = Buffer.from(data);

    // Return the asset with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': info.mimeType || 'application/octet-stream',
        'Content-Length': info.byteSize.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable', // Assets are immutable by hash
        'ETag': `"${hash}"`,
      },
    });
  } catch (error) {
    console.error('[Asset API] Error serving asset:', error);
    return NextResponse.json(
      { error: 'Failed to serve asset' },
      { status: 500 }
    );
  }
}
