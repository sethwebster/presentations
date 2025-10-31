"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface PresentationCardData {
  id: string;
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
  actionButtons?: (presentation: PresentationCardData) => React.ReactNode;
}

function PresentationCard({
  presentation,
  onCardClick,
  showActions = true,
  actionButtons,
}: {
  presentation: PresentationCardData;
  onCardClick?: (presentation: PresentationCardData) => void;
  showActions?: boolean;
  actionButtons?: (presentation: PresentationCardData) => React.ReactNode;
}) {
  const handleClick = () => {
    if (onCardClick) {
      onCardClick(presentation);
    } else {
      window.open(`/present/${presentation.id}?viewer=true`, '_blank');
    }
  };

  return (
    <Card
      className="group cursor-pointer overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white/[0.04] border border-white/10 hover:border-[var(--lume-primary)]/50"
      onClick={handleClick}
    >
      <CardContent className="p-0">
        {/* Thumbnail */}
        <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-br from-[rgba(22,194,199,0.1)] to-[rgba(200,75,210,0.1)] relative overflow-hidden">
          {presentation.coverImage ? (
            <img
              src={presentation.coverImage}
              alt={presentation.title}
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="text-5xl text-white opacity-20">
              {presentation.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 transition-colors bg-black/20 group-hover:bg-black/10" />
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
        />
      ))}
    </div>
  );
}

