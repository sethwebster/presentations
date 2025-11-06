"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { DeckDefinition } from '@/rsc/types';
import { SlideThumbnail } from '@/editor/components/SlideThumbnail';

export interface PresentationCardData {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
  coverImage?: string;
}

interface PresentationsGridProps {
  presentations: PresentationCardData[];
  emptyMessage?: string;
  onCardClick?: (presentation: PresentationCardData) => void;
  showActions?: boolean;
  actionButtons?: (presentation: PresentationCardData) => React.ReactElement;
  onDelete?: (presentation: PresentationCardData) => void;
}

function PresentationCard({
  presentation,
  onCardClick,
  showActions = true,
  actionButtons,
  onDelete,
}: {
  presentation: PresentationCardData;
  onCardClick?: (presentation: PresentationCardData) => void;
  showActions?: boolean;
  actionButtons?: (presentation: PresentationCardData) => React.ReactNode;
  onDelete?: (presentation: PresentationCardData) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [deckDefinition, setDeckDefinition] = useState<DeckDefinition | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    if (onCardClick) {
      onCardClick(presentation);
    } else {
      // Templates use /watch/demo/[slug], editor decks use /watch/[username]/[slug]
      // Since we don't have username/session context here, we can't distinguish
      // The onCardClick or actionButtons should be used instead for editor decks
      window.open(`/watch/demo/${presentation.id}`, '_blank');
    }
  };

  // Pre-load deck data immediately on mount
  useEffect(() => {
    if (!deckDefinition && !isLoading) {
      setIsLoading(true);
      fetch(`/api/editor/${presentation.id}`)
        .then(res => res.ok ? res.json() : null)
        .then((data: DeckDefinition | null) => {
          if (data?.slides && data.slides.length > 0) {
            setDeckDefinition(data);
          }
        })
        .catch(err => console.error('[PresentationsGrid] Failed to load deck:', err))
        .finally(() => setIsLoading(false));
    }
  }, [presentation.id, deckDefinition, isLoading]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const slides = deckDefinition?.slides || [];
    if (!isHovered || slides.length <= 1) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const index = Math.floor(percentage * slides.length);
    const clampedIndex = Math.max(0, Math.min(slides.length - 1, index));

    setCurrentIndex(clampedIndex);
  };

  const slides = deckDefinition?.slides || [];
  const currentSlide = slides[currentIndex];
  const progress = slides.length > 0 ? ((currentIndex + 1) / slides.length) * 100 : 0;

  // Attach onClick handler if onCardClick is provided (even with actionButtons)
  const shouldHandleClick = onCardClick || (!actionButtons && !showActions);

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white/[0.04] border border-white/10 hover:border-[var(--lume-primary)]/50"
      onClick={shouldHandleClick ? handleClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setCurrentIndex(0);
      }}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div
          className={`w-full aspect-video relative overflow-hidden ${!currentSlide ? 'flex items-center justify-center bg-gradient-to-br from-[rgba(22,194,199,0.1)] to-[rgba(200,75,210,0.1)]' : ''}`}
          onMouseMove={handleMouseMove}
          style={{ background: currentSlide ? 'var(--lume-midnight)' : undefined }}
        >
          {presentation.coverImage ? (
            <img
              src={presentation.coverImage}
              alt={presentation.title}
              className="object-cover w-full h-full"
            />
          ) : currentSlide ? (
            <>
              {/* Progress bar */}
              {isHovered && slides.length > 1 && (
                <div className="absolute top-0 left-0 right-0 h-1 z-10" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                  <div
                    className="h-full transition-all duration-100"
                    style={{
                      width: `${progress}%`,
                      background: 'linear-gradient(90deg, var(--lume-primary), var(--lume-accent))'
                    }}
                  />
                </div>
              )}

              {/* Render the slide using SlideThumbnail */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  zIndex: 1,
                  pointerEvents: 'none',
                }}
              >
                <SlideThumbnail slide={currentSlide} deck={deckDefinition ?? undefined} />
              </div>

              {/* Slide indicator */}
              {slides.length > 1 && (
                <div className="absolute bottom-2 right-2 text-xs font-medium px-2 py-1 rounded z-10"
                     style={{ background: 'rgba(0, 0, 0, 0.7)', color: 'var(--lume-mist)' }}>
                  {currentIndex + 1}/{slides.length}
                </div>
              )}
            </>
          ) : (
            <div className="text-5xl text-white opacity-20">
              {presentation.title.charAt(0).toUpperCase()}
            </div>
          )}
          {/* Only show overlay when NOT showing slides */}
          {!currentSlide && (
            <div className="absolute inset-0 transition-colors bg-black/20 group-hover:bg-black/10 pointer-events-none" style={{ zIndex: 2 }} />
          )}

          {/* Three-dot menu button */}
          {onDelete && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: 20 }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 bg-[var(--lume-midnight)]/80 hover:bg-[var(--lume-midnight)] text-white border border-white/20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(presentation);
                    }}
                  >
                    Delete Presentation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Card footer */}
        <div className="p-6">
          <div className="mb-4">
            <h3 className="mb-1 text-lg font-medium text-white line-clamp-2">
              {presentation.title}
            </h3>
            {presentation.description && (
              <p className="text-sm text-[var(--lume-mist)]/60 line-clamp-2 mb-2">
                {presentation.description}
              </p>
            )}
            <p className="text-sm text-[var(--lume-mist)]/60">
              {presentation.slideCount} {presentation.slideCount === 1 ? 'slide' : 'slides'}
            </p>
            <p className="text-xs text-[var(--lume-mist)]/40 mt-1">
              Updated {new Date(presentation.updatedAt).toLocaleDateString()}
            </p>
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              {actionButtons ? (
                actionButtons(presentation)
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClick();
                  }}
                  className="w-full border-[var(--lume-primary)]/50 text-[var(--lume-primary)] hover:bg-[var(--lume-primary)]/10"
                >
                  View Presentation
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PresentationsGrid({
  presentations,
  emptyMessage = "No presentations found",
  onCardClick,
  showActions = true,
  actionButtons,
  onDelete,
}: PresentationsGridProps) {
  if (presentations.length === 0) {
    return (
      <Card className="bg-white/[0.04] border border-white/10">
        <CardContent className="p-12 text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-[var(--lume-mist)]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-light text-white">No presentations</h3>
          <p className="text-[var(--lume-mist)]/70">
            {emptyMessage}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {presentations.map((presentation) => (
        <PresentationCard
          key={presentation.id}
          presentation={presentation}
          onCardClick={onCardClick}
          showActions={showActions}
          actionButtons={actionButtons}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

