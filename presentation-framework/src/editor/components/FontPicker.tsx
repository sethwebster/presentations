"use client";

import { useState, useMemo } from 'react';
import { FONT_REGISTRY, type FontMetadata } from '@/lib/fonts';

interface FontPickerProps {
  value?: string; // Font ID
  onChange: (fontId: string) => void;
  category?: 'sans-serif' | 'serif' | 'monospace' | 'display' | 'all';
  className?: string;
}

export function FontPicker({ value, onChange, category = 'all', className = '' }: FontPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const fonts = useMemo(() => {
    let filtered = FONT_REGISTRY;

    // Filter by category
    if (category !== 'all') {
      filtered = filtered.filter((f: FontMetadata) => f.category === category);
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((f: FontMetadata) =>
        f.name.toLowerCase().includes(searchLower) ||
        f.description?.toLowerCase().includes(searchLower) ||
        f.popularUse?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [category, search]);

  const selectedFont = useMemo(() => {
    return FONT_REGISTRY.find(f => f.id === value);
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      {/* Selected font display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left border border-[var(--editor-border)] rounded-lg bg-[var(--editor-surface-muted)] hover:border-[var(--editor-accent)] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            {selectedFont ? (
              <div>
                <div className="text-sm font-medium" style={{ fontFamily: `var(${selectedFont.variable})` }}>
                  {selectedFont.name}
                </div>
                <div className="text-xs text-[var(--editor-text-muted)] mt-0.5">
                  {selectedFont.category} • {selectedFont.description}
                </div>
              </div>
            ) : (
              <div className="text-sm text-[var(--editor-text-muted)]">
                Select a font...
              </div>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-[var(--editor-text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown panel */}
          <div className="absolute z-50 w-full mt-2 bg-[var(--editor-surface)] border border-[var(--editor-border-strong)] rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
            {/* Search */}
            <div className="p-2 border-b border-[var(--editor-border)]">
              <input
                type="text"
                placeholder="Search fonts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-[var(--editor-border)] rounded bg-[var(--editor-surface-muted)] focus:outline-none focus:border-[var(--editor-accent)]"
                autoFocus
              />
            </div>

            {/* Font list */}
            <div className="overflow-y-auto flex-1">
              {fonts.length === 0 ? (
                <div className="p-4 text-center text-sm text-[var(--editor-text-muted)]">
                  No fonts found
                </div>
              ) : (
                <div className="p-1">
                  {fonts.map((font: FontMetadata) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => {
                        onChange(font.id);
                        setIsOpen(false);
                        setSearch('');
                      }}
                      className={`w-full px-3 py-2.5 text-left rounded-md hover:bg-[var(--editor-surface-muted)] transition-colors ${
                        font.id === value ? 'bg-[var(--editor-button-hover)]' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div
                            className="text-sm font-medium mb-0.5"
                            style={{ fontFamily: `var(${font.variable})` }}
                          >
                            {font.name}
                          </div>
                          <div className="text-xs text-[var(--editor-text-muted)] flex items-center gap-2">
                            <span className="capitalize">{font.category}</span>
                            {font.description && (
                              <>
                                <span>•</span>
                                <span>{font.description}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {font.id === value && (
                          <svg className="w-4 h-4 text-[var(--editor-accent)] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category filter tabs (if showing all) */}
            {category === 'all' && (
              <div className="p-2 border-t border-[var(--editor-border)] flex gap-1 text-xs">
                <div className="px-2 py-1 rounded bg-[var(--editor-surface-muted)] text-[var(--editor-text-muted)]">
                  {fonts.length} font{fonts.length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Compact font picker for toolbar/inline use
 */
export function FontPickerCompact({ value, onChange, className = '' }: Omit<FontPickerProps, 'category'>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedFont = useMemo(() => {
    return FONT_REGISTRY.find(f => f.id === value);
  }, [value]);

  // Group fonts by category
  const fontsByCategory = useMemo(() => {
    const groups: Record<string, FontMetadata[]> = {
      'sans-serif': [],
      'serif': [],
      'monospace': [],
      'display': [],
    };

    FONT_REGISTRY.forEach((font: FontMetadata) => {
      groups[font.category].push(font);
    });

    return groups;
  }, []);

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs border border-[var(--editor-border)] rounded bg-[var(--editor-surface-muted)] hover:border-[var(--editor-accent)] transition-colors flex items-center gap-1.5"
        title={selectedFont?.name || 'Select font'}
      >
        <span style={{ fontFamily: selectedFont ? `var(${selectedFont.variable})` : 'inherit' }}>
          {selectedFont?.name || 'Font'}
        </span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          <div className="absolute z-50 left-0 mt-1 w-64 bg-[var(--editor-surface)] border border-[var(--editor-border-strong)] rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {Object.entries(fontsByCategory).map(([cat, fonts]) => (
              <div key={cat} className="p-1">
                <div className="px-2 py-1 text-xs font-semibold text-[var(--editor-text-muted)] uppercase tracking-wide">
                  {cat}
                </div>
                {fonts.map(font => (
                  <button
                    key={(font as FontMetadata).id}
                    type="button"
                    onClick={() => {
                      onChange((font as FontMetadata).id);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 text-left text-sm rounded hover:bg-[var(--editor-surface-muted)] ${
                      (font as FontMetadata).id === value ? 'bg-[var(--editor-button-hover)]' : ''
                    }`}
                    style={{ fontFamily: `var(${(font as FontMetadata).variable})` }}
                  >
                    {(font as FontMetadata).name}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
