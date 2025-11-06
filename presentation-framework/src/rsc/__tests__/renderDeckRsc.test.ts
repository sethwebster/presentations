import { describe, it, expect, beforeAll, vi } from 'vitest';
import { demoDeck } from './fixtures';

vi.mock('react-server-dom-webpack/server.node', () => {
  const encoder = new TextEncoder();

  return {
    renderToReadableStream(model: any) {
      const deckTree = model.type(model.props);
      const snapshot = snapshotElement(deckTree);
      const payload = JSON.stringify(snapshot);

      return new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(payload));
          controller.close();
        },
      });
    },
  };
});

let renderDeckToRSC: (typeof import('@/lume/rsc/renderDeck'))['renderDeckToRSC'];
beforeAll(async () => {
  process.env.__NEXT_PRIVATE_PREBUNDLED_REACT ??= 'next';
  process.env.__NEXT_PRIVATE_PREBUNDLED_REACT_DOM ??= 'next';
  process.env.__NEXT_PRIVATE_PREBUNDLED_REACT_SERVER_DOM_WAREHOUSE ??= 'next';

  ({ renderDeckToRSC } = await import('@/lume/rsc/renderDeck'));
});


async function streamToText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let result = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      result += decoder.decode(value, { stream: true });
    }
  }

  result += decoder.decode();
  return result;
}

function snapshotElement(node: any): any {
  if (node == null || typeof node === 'boolean') {
    return null;
  }

  if (Array.isArray(node)) {
    const results: any[] = [];
    for (const child of node) {
      const value = snapshotElement(child);
      if (value == null) continue;
      if (Array.isArray(value)) {
        results.push(...value);
      } else {
        results.push(value);
      }
    }
    return results;
  }

  if (typeof node !== 'object') {
    return node;
  }

  const elementType = getDisplayName(node.type);
  const { children, ...rest } = node.props ?? {};
  let renderedChildren = snapshotElement(children);

  if (typeof node.type === 'function') {
    const rendered = node.type(node.props);
    if (rendered !== undefined) {
      renderedChildren = snapshotElement(rendered);
    }
  }

  return {
    type: elementType,
    props: rest,
    children: renderedChildren,
  };
}

function getDisplayName(type: any): string {
  if (type === Symbol.for('react.fragment')) {
    return 'Fragment';
  }

  if (typeof type === 'string') {
    return type;
  }

  if (typeof type === 'function') {
    return type.displayName || type.name || 'AnonymousComponent';
  }

  return String(type);
}

describe('renderDeckToRSC', () => {
  it('serializes deck definitions into an RSC payload with canonical components', async () => {
    const stream = await renderDeckToRSC!(demoDeck, {
      presentationName: demoDeck.meta.id,
      presentationTitle: demoDeck.meta.title,
    });

    const payload = await streamToText(stream);
    const snapshot = JSON.parse(payload);

    expect(snapshot.type).toBe('DeckComponent');
    expect(snapshot.props.meta.title).toBe(demoDeck.meta.title);
    expect(snapshot.props.assets).toHaveLength(demoDeck.assets?.length ?? 0);

    const slides = toArrayChildren(snapshot.children) as Array<{
      type: string;
      props: { id: string; layers?: any[] };
      children: any;
    }>;
    expect(slides).toHaveLength(demoDeck.slides.length);
    expect(slides[0]?.type).toBe('SlideComponent');
    expect(slides[0]?.props.id).toBe('welcome');

    const welcomeRenderedLayers = toArrayChildren(slides[0]?.children);
    const welcomeRenderedElements = toArrayChildren(welcomeRenderedLayers[0]?.children);
    const secondRenderedLayers = toArrayChildren(slides[1]?.children);
    const secondRenderedElements = toArrayChildren(secondRenderedLayers[0]?.children);

    const welcomeRenderedTypes = welcomeRenderedElements.map((el: any) => el.type);
    const secondRenderedTypes = secondRenderedElements.map((el: any) => el.type);

    expect(welcomeRenderedTypes).toEqual(
      expect.arrayContaining(['TextElement', 'MediaElement', 'GroupElement', 'ShapeElement']),
    );
    expect(secondRenderedTypes).toEqual(expect.arrayContaining(['TextElement']));
  });
});
function toArrayChildren(node: unknown): any[] {
  if (!node) return [];
  if (Array.isArray(node)) return node;
  if (typeof node !== 'object') return [];

  const record = node as { children?: unknown };
  if (Array.isArray(record.children)) {
    return record.children;
  }

  if (record.children) {
    return toArrayChildren(record.children);
  }

  return [];
}
