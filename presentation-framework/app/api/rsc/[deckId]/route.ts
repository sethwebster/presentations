import path from 'node:path';
import { promises as fs } from 'node:fs';
import JSZip from 'jszip';
import { NextResponse } from 'next/server';
import type { DeckDefinition } from '@/rsc/types';

const FALLBACK_DECKS: Record<string, () => Promise<DeckDefinition>> = {};

type DeckRouteContext = {
  params: Promise<{ deckId: string }>;
};

export async function GET(_request: Request, context: DeckRouteContext) {
  const { deckId } = await context.params;
  const archivePath = path.join(process.cwd(), 'dist', `${deckId}.lume`);

  try {
    const data = await fs.readFile(archivePath);
    const zip = await JSZip.loadAsync(data);
    const rscFile = zip.file('lume.rsc');

    if (rscFile) {
      const buffer = await rscFile.async('nodebuffer');
      const arrayBuffer = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      ) as ArrayBuffer;

      return new NextResponse(arrayBuffer, {
        headers: {
          'Content-Type': 'text/x-component',
          'Cache-Control': 'no-store',
        },
      });
    }
  } catch (error) {
    // If the archive is missing we fall back below
    console.warn(`RSC archive read failed for deck ${deckId}:`, error);
  }

  const fallbackLoader = FALLBACK_DECKS[deckId];
  if (!fallbackLoader) {
    return NextResponse.json({ error: 'lume.rsc not found in archive' }, { status: 404 });
  }

  try {
    const deckDefinition = await fallbackLoader();
    return NextResponse.json(deckDefinition, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error(`Fallback deck generation failed for ${deckId}:`, error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
