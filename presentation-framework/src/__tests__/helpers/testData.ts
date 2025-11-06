/**
 * Test data generators for integration tests
 */

import type { DeckDefinition } from '../../rsc/types';
import { hashBytes } from '../../utils/hash';

/**
 * Generate a simple 1x1 PNG image as a data URI
 * This is a real PNG that can be parsed and hashed
 */
export function generateTestImage(color: 'red' | 'blue' | 'green' = 'red'): string {
  // 1x1 PNG images (actual valid PNGs)
  const pngs = {
    // 1x1 red PNG
    red: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
    // 1x1 blue PNG
    blue: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    // 1x1 green PNG
    green: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  };

  return pngs[color];
}

/**
 * Generate a test JPEG image as a data URI
 */
export function generateTestJpeg(): string {
  // Minimal 1x1 JPEG
  return 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDAREAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/wA//2Q==';
}

/**
 * Extract the binary data from a data URI for hashing
 */
export function dataUriToBytes(dataUri: string): Uint8Array {
  const base64 = dataUri.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  return new Uint8Array(buffer);
}

/**
 * Get the expected SHA-256 hash for a test image
 */
export function getTestImageHash(color: 'red' | 'blue' | 'green' = 'red'): string {
  const dataUri = generateTestImage(color);
  const bytes = dataUriToBytes(dataUri);
  return hashBytes(bytes);
}

/**
 * Create a minimal DeckDefinition for testing
 */
export function createTestDeck(options: {
  id?: string;
  title?: string;
  slideCount?: number;
  includeImages?: boolean;
  includeCoverImage?: boolean;
  includeBackgrounds?: boolean;
  includeBranding?: boolean;
} = {}): DeckDefinition {
  const {
    id = 'test-deck-001',
    title = 'Test Deck',
    slideCount = 3,
    includeImages = false,
    includeCoverImage = false,
    includeBackgrounds = false,
    includeBranding = false,
  } = options;

  const deck: DeckDefinition = {
    meta: {
      id,
      title,
      description: 'A test deck for integration testing',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    slides: [],
    settings: {},
  };

  // Add cover image if requested
  if (includeCoverImage) {
    deck.meta.coverImage = generateTestImage('red');
  }

  // Generate slides
  for (let i = 0; i < slideCount; i++) {
    const slideId = `slide-${i + 1}`;
    const slide: DeckDefinition['slides'][0] = {
      id: slideId,
      title: `Slide ${i + 1}`,
      elements: [
        {
          id: `${slideId}-text-1`,
          type: 'text',
          content: `This is slide ${i + 1}`,
          bounds: {
            x: 100,
            y: 100,
            width: 800,
            height: 100,
          },
        },
      ],
    };

    // Add background if requested
    if (includeBackgrounds) {
      slide.background = {
        type: 'image',
        value: generateTestImage(i === 0 ? 'red' : i === 1 ? 'blue' : 'green'),
      };
    }

    // Add image element if requested
    if (includeImages) {
      slide.elements?.push({
        id: `${slideId}-image-1`,
        type: 'image',
        src: generateTestImage('blue'),
        bounds: {
          x: 200,
          y: 300,
          width: 400,
          height: 300,
        },
      });
    }

    deck.slides.push(slide);
  }

  // Add branding logo if requested
  if (includeBranding) {
    deck.settings = {
      ...deck.settings,
      branding: {
        logo: {
          src: generateTestImage('green'),
          alt: 'Company Logo',
          position: 'top-right',
        },
      },
    };
  }

  return deck;
}

/**
 * Create a DeckDefinition with the same image used multiple times
 * for deduplication testing
 */
export function createDeckWithDuplicateAssets(): DeckDefinition {
  const sharedImage = generateTestImage('red');

  return {
    meta: {
      id: 'test-dedupe-deck',
      title: 'Deduplication Test Deck',
      coverImage: sharedImage, // Used 1st time
    },
    slides: [
      {
        id: 'slide-1',
        title: 'Slide 1',
        background: {
          type: 'image',
          value: sharedImage, // Used 2nd time (same image)
        },
        elements: [
          {
            id: 'slide-1-image-1',
            type: 'image',
            src: sharedImage, // Used 3rd time (same image)
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
          {
            id: 'slide-1-text-1',
            type: 'text',
            content: 'Same image used 3 times!',
            bounds: { x: 0, y: 150, width: 400, height: 50 },
          },
        ],
      },
      {
        id: 'slide-2',
        title: 'Slide 2',
        elements: [
          {
            id: 'slide-2-image-1',
            type: 'image',
            src: sharedImage, // Used 4th time (same image)
            bounds: { x: 0, y: 0, width: 100, height: 100 },
          },
        ],
      },
    ],
    settings: {
      branding: {
        logo: {
          src: sharedImage, // Used 5th time (same image)
          alt: 'Logo',
        },
      },
    },
  };
}

/**
 * Create a complex DeckDefinition with various element types
 */
export function createComplexDeck(): DeckDefinition {
  return {
    meta: {
      id: 'test-complex-deck',
      title: 'Complex Test Deck',
      description: 'A deck with all element types',
      tags: ['test', 'complex', 'integration'],
      coverImage: generateTestImage('red'),
      authors: [
        { name: 'Test Author', email: 'test@example.com', role: 'Creator' },
      ],
    },
    slides: [
      // Slide 1: Text elements
      {
        id: 'slide-1',
        title: 'Text Slide',
        elements: [
          {
            id: 'title-1',
            type: 'text',
            content: 'Welcome to the Test Deck',
            bounds: { x: 100, y: 100, width: 800, height: 100 },
          },
          {
            id: 'richtext-1',
            type: 'richtext',
            content: '<h1>Rich Text</h1><p>With <strong>formatting</strong></p>',
            format: 'html',
            bounds: { x: 100, y: 250, width: 800, height: 200 },
          },
        ],
      },
      // Slide 2: Image elements
      {
        id: 'slide-2',
        title: 'Image Slide',
        background: {
          type: 'image',
          value: generateTestImage('blue'),
          opacity: 0.5,
        },
        elements: [
          {
            id: 'image-1',
            type: 'image',
            src: generateTestImage('green'),
            alt: 'Test Image',
            bounds: { x: 200, y: 200, width: 600, height: 400 },
          },
        ],
      },
      // Slide 3: Code block
      {
        id: 'slide-3',
        title: 'Code Slide',
        elements: [
          {
            id: 'code-1',
            type: 'codeblock',
            code: 'function hello() {\n  console.log("Hello, world!");\n}',
            language: 'javascript',
            theme: 'dark',
            showLineNumbers: true,
            bounds: { x: 100, y: 100, width: 800, height: 400 },
          },
        ],
      },
      // Slide 4: Chart
      {
        id: 'slide-4',
        title: 'Chart Slide',
        elements: [
          {
            id: 'chart-1',
            type: 'chart',
            chartType: 'bar',
            data: [
              { name: 'A', value: 100 },
              { name: 'B', value: 200 },
              { name: 'C', value: 150 },
            ],
            dataKeys: { x: 'name', y: 'value' },
            bounds: { x: 150, y: 150, width: 700, height: 400 },
          },
        ],
      },
      // Slide 5: Group
      {
        id: 'slide-5',
        title: 'Group Slide',
        elements: [
          {
            id: 'group-1',
            type: 'group',
            children: [
              {
                id: 'grouped-text-1',
                type: 'text',
                content: 'Grouped Text',
                bounds: { x: 0, y: 0, width: 300, height: 50 },
              },
              {
                id: 'grouped-image-1',
                type: 'image',
                src: generateTestImage('red'),
                bounds: { x: 0, y: 60, width: 300, height: 200 },
              },
            ],
            bounds: { x: 200, y: 200, width: 300, height: 260 },
          },
        ],
      },
      // Slide 6: Table
      {
        id: 'slide-6',
        title: 'Table Slide',
        elements: [
          {
            id: 'table-1',
            type: 'table',
            headers: ['Name', 'Age', 'City'],
            rows: [
              ['Alice', 30, 'New York'],
              ['Bob', 25, 'San Francisco'],
              ['Carol', 35, 'Seattle'],
            ],
            showBorders: true,
            zebraStripe: true,
            bounds: { x: 150, y: 150, width: 700, height: 300 },
          },
        ],
      },
    ],
    settings: {
      slideSize: {
        width: 1920,
        height: 1080,
        preset: 'standard',
      },
      defaultBackground: {
        type: 'color',
        value: '#ffffff',
      },
      branding: {
        logo: {
          src: generateTestImage('green'),
          alt: 'Test Logo',
          position: 'top-right',
        },
      },
      presentation: {
        loop: false,
        autoAdvance: false,
        skipHiddenSlides: true,
        showSlideNumbers: true,
        showPresenterNotes: false,
      },
    },
  };
}
