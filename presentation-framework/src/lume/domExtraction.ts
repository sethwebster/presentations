import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LumeElement, LumeElementType } from './types';

type SupportedTag =
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'P'
  | 'LI'
  | 'UL'
  | 'OL'
  | 'IMG'
  | 'FIGURE'
  | 'BLOCKQUOTE'
  | 'SPAN'
  | 'DIV'
  | 'SECTION'
  | 'ARTICLE';

const TAG_TO_ELEMENT_TYPE: Partial<Record<SupportedTag, LumeElementType>> = {
  H1: 'text',
  H2: 'text',
  H3: 'text',
  H4: 'text',
  H5: 'text',
  H6: 'text',
  P: 'text',
  LI: 'text',
  BLOCKQUOTE: 'text',
  SPAN: 'text',
  DIV: 'text',
  SECTION: 'text',
  ARTICLE: 'text',
  UL: 'text',
  OL: 'text',
  IMG: 'image',
  FIGURE: 'image',
};

const BLOCK_TAGS = new Set<SupportedTag>([
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'P',
  'LI',
  'BLOCKQUOTE',
  'DIV',
  'SECTION',
  'ARTICLE',
  'UL',
  'OL',
]);

const IMAGE_TAGS = new Set<SupportedTag>(['IMG', 'FIGURE']);

/**
 * Extract best-effort Lume elements from a React slide node. This is a stopgap
 * implementation until the dedicated editor provides structured element data.
 */
export function extractElementsFromSlideContent(content: React.ReactNode): LumeElement[] {
  if (!content) {
    return [];
  }

  const html = renderToStaticMarkup(React.createElement(React.Fragment, null, content));
  const document = parseHTML(html);

  if (!document) {
    const text = normalizeTextPreservingBreaks(stripHTML(html));
    if (!text) return [];

    return [createTextElement('auto-text', text, 0)];
  }

  const elements: LumeElement[] = [];
  let elementCounter = 0;

  const nextId = (prefix: string) => `${prefix}-${elementCounter++}`;
  const bodyChildren = Array.from(document.body.childNodes);

  bodyChildren.forEach((node) => {
    const created = convertNodeToElements(node as HTMLElement | ChildNode, nextId);
    created.forEach((elem) => {
      const withPosition = {
        ...elem,
        position: defaultPosition(elements.length),
      };
      elements.push(withPosition);
    });
  });

  if (elements.length === 0) {
    const fallback = normalizeTextPreservingBreaks(document.body.textContent ?? '');
    if (!fallback) return [];

    elements.push({
      id: 'fallback-text',
      type: 'text',
      content: fallback,
      position: defaultPosition(0),
    });
  }

  return elements;
}

function parseHTML(html: string): Document | null {
  if (typeof window !== 'undefined' && 'DOMParser' in window) {
    const parser = new window.DOMParser();
    return parser.parseFromString(html, 'text/html');
  }
  return null;
}

function convertNodeToElements(
  node: ChildNode,
  nextId: (prefix: string) => string,
): LumeElement[] {
  if (node.nodeType === node.TEXT_NODE) {
    const text = normalizeTextPreservingBreaks(node.textContent ?? '');
    if (!text) return [];

    return [
      {
        id: nextId('text'),
        type: 'text',
        content: text,
      },
    ];
  }

  if (node.nodeType !== node.ELEMENT_NODE) {
    return [];
  }

  const element = node as HTMLElement;
  const tagName = element.tagName as SupportedTag;

  if (IMAGE_TAGS.has(tagName)) {
    const src =
      element.getAttribute('src') ?? element.querySelector('img')?.getAttribute('src');
    if (!src) return [];

    const alt =
      element.getAttribute('alt') ?? element.querySelector('img')?.getAttribute('alt');

    return [
      {
        id: element.id || nextId('image'),
        type: 'image',
        assetRef: src,
        metadata: {
          inferred: true,
          alt,
        },
      },
    ];
  }

  if (BLOCK_TAGS.has(tagName) || tagName === 'SPAN') {
    const text = normalizeTextPreservingBreaks(getTextWithBreaks(element));
    if (text) {
      return [
        {
          id: element.id || nextId('text'),
          type: 'text',
          content: text,
          style: {
            tagName,
          },
          metadata: {
            sourceTag: tagName,
          },
        },
      ];
    }
  }

  // Fallback: process children recursively.
  const childElements: LumeElement[] = [];
  element.childNodes.forEach((child) => {
    childElements.push(...convertNodeToElements(child, nextId));
  });

  return childElements;
}

function defaultPosition(index: number) {
  const gap = 120;
  const top = 120 + index * gap;

  return {
    x: 120,
    y: top,
    width: 1280,
    height: 100,
    zIndex: index,
  };
}

function stripHTML(html: string): string {
  return html.replace(/<[^>]+>/g, ' ');
}

function normalizeTextPreservingBreaks(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

function getTextWithBreaks(element: HTMLElement): string {
  const chunks: string[] = [];

  element.childNodes.forEach((node) => {
    if (node.nodeType === node.TEXT_NODE) {
      const text = node.textContent ?? '';
      if (text.trim()) {
        chunks.push(text);
      }
      return;
    }

    if (node.nodeType !== node.ELEMENT_NODE) {
      return;
    }

    const child = node as HTMLElement;
    const childTag = child.tagName as SupportedTag;

    if (childTag === 'BR') {
      chunks.push('\n');
      return;
    }

    const childText = getTextWithBreaks(child);
    if (!childText) return;

    const isBlock = BLOCK_TAGS.has(childTag);
    if (isBlock) {
      chunks.push('\n');
      chunks.push(childText);
      chunks.push('\n');
    } else {
      chunks.push(childText);
    }
  });

  if (chunks.length === 0) {
    return element.textContent ?? '';
  }

  // Collapse any duplicate newlines that may have been inserted.
  return chunks
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+|\n+$/g, '');
}

function createTextElement(id: string, text: string, index: number, tagName?: string): LumeElement {
  return {
    id,
    type: 'text',
    content: text,
    position: defaultPosition(index),
    style: tagName ? { tagName } : undefined,
    metadata: tagName
      ? {
          sourceTag: tagName,
        }
      : undefined,
  };
}
