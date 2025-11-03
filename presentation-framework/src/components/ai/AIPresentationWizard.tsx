'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ConversationPanel } from './ConversationPanel';
import { OutlineEditor } from './OutlineEditor';
import { GenerationProgress } from './GenerationProgress';
import type { OutlineNode, GenerationPhase } from '@/ai/types';

type WizardPhase = 'conversation' | 'generation' | 'complete';

interface AIPresentationWizardProps {
  onComplete?: (deckId: string) => void;
  onCancel?: () => void;
}

export function AIPresentationWizard({
  onComplete,
  onCancel,
}: AIPresentationWizardProps): React.ReactElement {
  const router = useRouter();
  const [phase, setPhase] = React.useState<WizardPhase>('conversation');
  const [outline, setOutline] = React.useState<OutlineNode[]>([]);
  const [generationPhase, setGenerationPhase] = React.useState<GenerationPhase>('outline');
  const [deckId, setDeckId] = React.useState<string | null>(null);
  const [showPreview, setShowPreview] = React.useState(false);
  const [generatedSlides, setGeneratedSlides] = React.useState<any[]>([]);

  const handleOutlineGenerated = React.useCallback((sections: any[]) => {
    // Convert sections to outline structure
    const nodes: OutlineNode[] = sections.map((section, sectionIdx) => {
      const sectionNode: OutlineNode = {
        id: `section-${sectionIdx}`,
        type: 'section',
        title: section.title,
        order: sectionIdx,
        children: section.slides.map((slide: any, slideIdx: number) => ({
          id: `slide-${sectionIdx}-${slideIdx}`,
          type: 'slide',
          title: slide.title,
          description: slide.description,
          order: slideIdx,
        })),
      };
      return sectionNode;
    });

    setOutline(nodes);
  }, []);

  const handleStartGeneration = async () => {
    if (outline.length === 0) return;
    
    setPhase('generation');
    setGenerationPhase('outline');

    // TODO: Implement actual generation phases
    // For now, just simulate progress
    setTimeout(() => {
      setGenerationPhase('content');
      setTimeout(() => {
        setGenerationPhase('design');
        setTimeout(() => {
          setGenerationPhase('images');
          setTimeout(() => {
            setGenerationPhase('animations');
            setTimeout(() => {
              setGenerationPhase('complete');
              setTimeout(() => {
                // Navigate to editor
                if (deckId) {
                  router.push(`/editor/${deckId}`);
                }
                onComplete?.(deckId || '');
              }, 1000);
            }, 1500);
          }, 1000);
        }, 1500);
      }, 2000);
    }, 2000);
  };

  if (phase === 'generation') {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
        <div className="max-w-7xl w-full grid grid-cols-12 gap-6 h-[90vh]">
          {/* Progress Panel */}
          <div className="col-span-12 lg:col-span-4">
            <GenerationProgress
              phase={generationPhase}
              message="Creating your presentation..."
            />
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="mt-4 w-full px-4 py-2 rounded-lg border border-white/40 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
            >
              {showPreview ? '← Hide Preview' : 'Show Preview →'}
            </button>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="col-span-12 lg:col-span-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden h-full flex flex-col">
                <div className="p-4 border-b border-white/40 dark:border-white/10">
                  <h3 className="text-lg font-semibold text-ink">Live Preview</h3>
                  <p className="text-sm text-ink-subtle">{generatedSlides.length} slides generated</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {generatedSlides.length === 0 ? (
                    <div className="text-center text-ink-subtle py-20">
                      <div className="text-4xl mb-4 opacity-40">✨</div>
                      <p>Generating slides...</p>
                    </div>
                  ) : (
                    generatedSlides.map((slide, idx) => (
                      <div key={slide.id} className="border border-white/40 dark:border-white/10 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
                        <div className="p-3 bg-white/50 dark:bg-white/5 border-b border-white/40 dark:border-white/10">
                          <span className="text-xs text-ink-mute">Slide {idx + 1}: {slide.title || 'Untitled'}</span>
                        </div>
                        <div className="p-4 aspect-video flex items-center justify-center relative bg-gradient-to-br from-primary/10 to-secondary/10">
                          {slide.elements && slide.elements.length > 0 ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-ink mb-2">
                                {slide.elements.find((e: any) => e.type === 'text' && e.id?.includes('title'))?.content || slide.title}
                              </div>
                            </div>
                          ) : (
                            <div className="text-ink-subtle opacity-50">
                              Content loading...
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'complete') {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-canvas z-50 flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-white/40 dark:border-white/10 bg-white/60 dark:bg-white/8 backdrop-blur-sm flex items-center justify-between px-6">
        <h1 className="text-xl font-semibold text-ink">Create with AI</h1>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          Cancel
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left: Conversation */}
        <div className="flex flex-col h-full">
          <div className="h-full">
            <ConversationPanel
              onFunctionCall={(name, args) => {
                if (name === 'generate_outline' && (args as any).sections) {
                  handleOutlineGenerated((args as any).sections);
                }
              }}
            />
          </div>
        </div>

        {/* Right: Outline Preview */}
        <div className="flex flex-col h-full">
          <OutlineEditor outline={outline} editable={false} />
          
          {/* Generate button */}
          {outline.length > 0 && (
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => setOutline([])}
                className="flex-1 px-6 py-3 rounded-lg border border-white/40 dark:border-white/10 hover:bg-white/30 dark:hover:bg-white/10 transition-colors"
              >
                Start Over
              </button>
              <button
                onClick={handleStartGeneration}
                className="flex-1 px-6 py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                Generate Presentation →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

