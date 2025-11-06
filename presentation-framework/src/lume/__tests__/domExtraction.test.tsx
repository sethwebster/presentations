import React from 'react';
import { describe, it, expect } from 'vitest';
import { extractElementsFromSlideContent } from '../domExtraction';

describe('extractElementsFromSlideContent', () => {
  it('returns text element for simple string content', () => {
    const { elements, builds } = extractElementsFromSlideContent(<h1>Hello Lume</h1>);
    expect(elements).toHaveLength(1);
    expect(builds).toHaveLength(0);
    expect(elements[0].type).toBe('text');
    expect(elements[0].content).toContain('Hello Lume');
  });

  it('preserves line breaks and nested spans', () => {
    const { elements } = extractElementsFromSlideContent(
      <h1>
        How We Build
        <br />
        <span>Why We Build</span>
      </h1>,
    );
    expect(elements).toHaveLength(1);
    expect(elements[0].content).toBe('How We Build Why We Build');
  });

  it('handles null or empty content safely', () => {
    expect(extractElementsFromSlideContent(null)).toEqual({ elements: [], builds: [] });
    expect(extractElementsFromSlideContent(undefined)).toEqual({ elements: [], builds: [] });
  });
});
