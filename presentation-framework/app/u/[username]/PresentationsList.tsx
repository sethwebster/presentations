import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { PresentationsGrid, type PresentationCardData } from '@/components/PresentationsGrid';
import type { PublicPresentation } from './types';

interface PresentationsListProps {
  presentations: PublicPresentation[];
  emptyMessage?: string;
}

function PresentationsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="bg-white/[0.04] border border-white/10 overflow-hidden">
          <CardContent className="p-0">
            <div className="w-full aspect-video bg-white/5 animate-pulse" />
            <div className="p-6">
              <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse mb-2" />
              <div className="h-4 w-1/2 bg-white/5 rounded animate-pulse mb-4" />
              <div className="h-9 w-full bg-white/5 rounded animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function PresentationsList({ presentations, emptyMessage }: PresentationsListProps) {
  // Convert PublicPresentation to PresentationCardData format
  const cardData: PresentationCardData[] = presentations.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    slideCount: p.slideCount,
    coverImage: p.coverImage,
  }));

  return (
    <Suspense fallback={<PresentationsGridSkeleton />}>
      <PresentationsGrid
        presentations={cardData}
        emptyMessage={emptyMessage || "This user hasn't made any presentations public yet."}
      />
    </Suspense>
  );
}

