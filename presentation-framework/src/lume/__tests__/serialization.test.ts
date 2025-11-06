import { describe, it, expect } from 'vitest';
import { serializeLumePackage, deserializeLumePackage } from '../serialization';
import type { LumePackage } from '../types';

describe('Lume serialization', () => {
  it('roundtrips meta and slides through archive', async () => {
    const pkg: LumePackage = {
      meta: {
        id: 'deck-1',
        title: 'Test Deck',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: '0.0.1',
      },
      slides: [
        {
          id: 'slide-1',
          elements: [],
          notes: {
            speaker: 'Hello world',
          },
        },
      ],
      provenance: [],
    };

    const archive = await serializeLumePackage(pkg);
    expect(archive).toBeInstanceOf(Uint8Array);

    const { package: parsed, rscPayload } = await deserializeLumePackage(archive);
    expect(parsed.meta.title).toBe('Test Deck');
    expect(parsed.slides).toHaveLength(1);
    expect(parsed.slides[0].notes?.speaker).toBe('Hello world');
    expect(rscPayload).toBeNull();
  });
});
