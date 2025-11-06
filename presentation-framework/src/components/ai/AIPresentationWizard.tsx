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
  const [showPreview, setShowPreview] = React.useState(false);
  const [generatedSlides, setGeneratedSlides] = React.useState<any[]>([]);
  const [stylisticNotes, setStylisticNotes] = React.useState<string>('');
  const [currentSlideIndex, setCurrentSlideIndex] = React.useState<number | null>(null);
  const [totalSlides, setTotalSlides] = React.useState<number | null>(null);
  const [slideProgress, setSlideProgress] = React.useState<Record<number, { status: 'generating' | 'content' | 'image' | 'complete'; title?: string }>>({});

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

  const handleOutlineStreaming = React.useCallback((partialSections: any[]) => {
    // Handle partial outline updates as they stream in
    const nodes: OutlineNode[] = partialSections.map((section, sectionIdx) => {
      const sectionNode: OutlineNode = {
        id: `section-${sectionIdx}`,
        type: 'section',
        title: section.title || 'Loading...',
        order: sectionIdx,
        children: section.slides ? section.slides.map((slide: any, slideIdx: number) => ({
          id: `slide-${sectionIdx}-${slideIdx}`,
          type: 'slide',
          title: slide.title || 'Loading...',
          description: slide.description,
          order: slideIdx,
        })) : [],
      };
      return sectionNode;
    });

    setOutline(nodes);
  }, []);

  const handleStartGeneration = async () => {
    if (outline.length === 0) return;
    
    setPhase('generation');
    setGenerationPhase('outline');
    setCurrentSlideIndex(null);
    setTotalSlides(null);
    setSlideProgress({});

    try {
      // Let the API generate a proper title from the outline
      // We'll pass a placeholder that signals the API should generate one
      const presentationTitle = outline[0]?.title || outline[0]?.children?.[0]?.title || undefined;

      setGenerationPhase('content');

      // Call generation API with SSE
      const response = await fetch('/api/ai/generate-deck', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outline,
          title: presentationTitle,
          stylisticNotes: stylisticNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to generate presentation' }));
        throw new Error(error.error || 'Failed to generate presentation');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent: string | null = null;
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
            continue;
          }

          if (line.startsWith('data: ')) {
            const data = line.substring(6).trim();
            try {
              const parsed = JSON.parse(data);
              
              // Handle different event types
              if (parsed.slideIndex !== undefined) {
                // Slide progress events (slide_start, slide_content, slide_image_start, etc.)
                setCurrentSlideIndex(parsed.slideIndex);
                if (parsed.totalSlides) {
                  setTotalSlides(parsed.totalSlides);
                }

                // Update slide progress based on event type
                if (currentEvent === 'slide_start') {
                  setSlideProgress(prev => {
                    const updated = { ...prev };
                    if (!updated[parsed.slideIndex]) {
                      updated[parsed.slideIndex] = { status: 'generating', title: parsed.slideTitle };
                    }
                    return updated;
                  });
                } else if (currentEvent === 'slide_content') {
                  setSlideProgress(prev => ({
                    ...prev,
                    [parsed.slideIndex]: { ...prev[parsed.slideIndex], status: 'content', title: parsed.slideTitle },
                  }));
                } else if (currentEvent === 'slide_image_start') {
                  setSlideProgress(prev => ({
                    ...prev,
                    [parsed.slideIndex]: { ...prev[parsed.slideIndex], status: 'image' },
                  }));
                  setGenerationPhase('images');
                } else if (currentEvent === 'slide_complete') {
                  setSlideProgress(prev => ({
                    ...prev,
                    [parsed.slideIndex]: { ...prev[parsed.slideIndex], status: 'complete' },
                  }));
                }
              } else if (parsed.phase) {
                // phase event
                setGenerationPhase(parsed.phase as GenerationPhase);
              } else if (parsed.deckId && parsed.slideCount) {
                // complete event
                const finalDeckId = parsed.deckId;
                setGenerationPhase('complete');
                setCurrentSlideIndex(null);
                
                // Load the generated deck to show in preview
                const deckResponse = await fetch(`/api/editor/${finalDeckId}`);
                if (deckResponse.ok) {
                  const deck = await deckResponse.json();
                  setGeneratedSlides(deck.slides || []);
                }

                // Navigate to editor after a brief delay
                setTimeout(() => {
                  router.push(`/editor/${finalDeckId}`);
                  onComplete?.(finalDeckId);
                }, 1500);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      alert(`Failed to generate presentation: ${error.message}`);
      setPhase('conversation');
    }
  };

  if (phase === 'generation') {
    return (
      <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-8 overflow-hidden" style={{ background: 'rgba(0, 0, 0, 0.95)' }}>
        <div className="max-w-7xl w-full grid grid-cols-12 gap-6 h-[90vh]">
          {/* Progress Panel */}
          <div className="col-span-12 lg:col-span-4">
            <GenerationProgress
              phase={generationPhase}
              currentSlide={currentSlideIndex !== null ? currentSlideIndex + 1 : undefined}
              totalSlides={totalSlides || undefined}
              message={
                currentSlideIndex !== null && totalSlides
                  ? `Generating slide ${currentSlideIndex + 1} of ${totalSlides}...`
                  : "Creating your presentation..."
              }
            />

            {/* Slide-by-slide progress */}
            {totalSlides && totalSlides > 0 && (
              <div className="mt-6 space-y-2 max-h-[300px] overflow-y-auto">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--lume-mist)' }}>Slide Progress</h3>
                {Array.from({ length: totalSlides }, (_, i) => {
                  const progress = slideProgress[i];
                  const isActive = currentSlideIndex === i;
                  const isComplete = progress?.status === 'complete' || (currentSlideIndex !== null && i < currentSlideIndex);

                  return (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border transition-all ${
                        isActive
                          ? 'border-primary bg-primary/10'
                          : isComplete
                          ? 'border-green-500/50 bg-green-500/10'
                          : 'border-white/20 bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{
                          color: isActive ? 'var(--lume-mist)' : isComplete ? '#4ade80' : 'var(--lume-mist)',
                          opacity: isActive ? 1 : isComplete ? 1 : 0.7,
                          fontWeight: isActive ? 500 : 400
                        }}>
                          Slide {i + 1}: {progress?.title || 'Loading...'}
                        </span>
                        {isComplete && <span className="text-green-400 text-xs">✓</span>}
                        {isActive && progress?.status === 'image' && (
                          <span className="text-xs animate-pulse" style={{ color: 'var(--lume-primary)' }}>Generating image...</span>
                        )}
                        {isActive && progress?.status === 'content' && (
                          <span className="text-xs animate-pulse" style={{ color: 'var(--lume-primary)' }}>Adding content...</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="mt-4 w-full px-4 py-2 rounded-lg border hover:bg-white/10 transition-colors"
              style={{ borderColor: 'rgba(236, 236, 236, 0.2)', color: 'var(--lume-mist)' }}
            >
              {showPreview ? '← Hide Preview' : 'Show Preview →'}
            </button>
          </div>

          {/* Live Preview */}
          {showPreview && (
            <div className="col-span-12 lg:col-span-8">
              <div className="rounded-xl shadow-2xl overflow-hidden h-full flex flex-col" style={{ background: 'var(--lume-midnight)' }}>
                <div className="p-4 border-b" style={{ borderColor: 'rgba(236, 236, 236, 0.1)' }}>
                  <h3 className="text-lg font-semibold" style={{ color: 'var(--lume-mist)' }}>Live Preview</h3>
                  <p className="text-sm" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>{generatedSlides.length} slides generated</p>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {generatedSlides.length === 0 ? (
                    <div className="text-center py-20" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>
                      <div className="text-4xl mb-4 opacity-40">✨</div>
                      <p>Generating slides...</p>
                    </div>
                  ) : (
                    generatedSlides.map((slide, idx) => (
                      <div key={slide.id} className="border rounded-lg overflow-hidden" style={{ borderColor: 'rgba(236, 236, 236, 0.2)', background: 'rgba(255, 255, 255, 0.03)' }}>
                        <div className="p-3 border-b" style={{ background: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(236, 236, 236, 0.1)' }}>
                          <span className="text-xs" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>Slide {idx + 1}: {slide.title || 'Untitled'}</span>
                        </div>
                        <div className="p-4 aspect-video flex items-center justify-center relative bg-gradient-to-br from-primary/10 to-secondary/10">
                          {slide.elements && slide.elements.length > 0 ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold mb-2" style={{ color: 'var(--lume-mist)' }}>
                                {slide.elements.find((e: any) => e.type === 'text' && e.id?.includes('title'))?.content || slide.title}
                              </div>
                            </div>
                          ) : (
                            <div style={{ color: 'var(--lume-mist)', opacity: 0.5 }}>
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
    return <></>;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden" style={{ background: 'var(--lume-midnight)' }}>
      {/* Header */}
      <div className="h-16 border-b backdrop-blur-sm flex items-center justify-between px-6 shrink-0" style={{ borderColor: 'rgba(236, 236, 236, 0.1)', background: 'rgba(0, 0, 0, 0.5)' }}>
        <h1 className="text-xl font-semibold" style={{ color: 'var(--lume-mist)' }}>Create with AI</h1>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: 'var(--lume-mist)' }}
        >
          Cancel
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 grid grid-cols-2 gap-6 p-6 overflow-hidden">
        {/* Left: Conversation */}
        <div className="flex flex-col h-full overflow-hidden">
          <ConversationPanel
            currentOutline={outline}
            onFunctionStreaming={(name, partialArgs) => {
              try {
                const partial = JSON.parse(partialArgs);
                if (name === 'generate_outline' && partial.sections) {
                  handleOutlineStreaming(partial.sections);
                } else if (name === 'refine_outline' && partial.updatedSections) {
                  handleOutlineStreaming(partial.updatedSections);
                }
              } catch {
                // Partial JSON not ready yet, ignore
              }
            }}
            onFunctionCall={(name, args) => {
              if (name === 'generate_outline' && (args as any).sections) {
                handleOutlineGenerated((args as any).sections);
              } else if (name === 'refine_outline' && (args as any).updatedSections) {
                handleOutlineGenerated((args as any).updatedSections);
              }
            }}
          />
        </div>

        {/* Right: Outline Preview */}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Stylistic Instructions - Always visible */}
          <div className="mb-4 shrink-0">
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--lume-mist)' }}>
              Stylistic Instructions (Optional)
            </label>
            <textarea
              value={stylisticNotes}
              onChange={(e) => setStylisticNotes(e.target.value)}
              placeholder="Add any design preferences, color schemes, visual style notes, or other stylistic guidance..."
              className="w-full min-h-[80px] px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              style={{
                borderColor: 'rgba(236, 236, 236, 0.2)',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--lume-mist)',
              }}
            />
            <p className="mt-1 text-xs" style={{ color: 'var(--lume-mist)', opacity: 0.6 }}>
              These notes will guide the visual design and styling of your presentation
            </p>
          </div>

          {/* Outline Editor */}
          <div className="flex-1 min-h-0">
            <OutlineEditor outline={outline} editable={false} />
          </div>

          {/* Generate button */}
          {outline.length > 0 && (
            <div className="mt-4 flex gap-4 shrink-0">
              <button
                onClick={() => {
                  setOutline([]);
                  setStylisticNotes('');
                }}
                className="flex-1 px-6 py-3 rounded-lg border hover:bg-white/10 transition-colors"
                style={{ borderColor: 'rgba(236, 236, 236, 0.2)', color: 'var(--lume-mist)' }}
              >
                Start Over
              </button>
              <button
                onClick={handleStartGeneration}
                className="flex-1 px-6 py-3 rounded-lg transition-colors font-medium"
                style={{ background: 'var(--lume-primary)', color: 'var(--lume-midnight)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
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

