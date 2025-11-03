'use client';

import * as React from 'react';

export type GenerationPhase = 'outline' | 'content' | 'design' | 'images' | 'animations' | 'complete';

interface GenerationProgressProps {
  phase: GenerationPhase;
  currentSlide?: number;
  totalSlides?: number;
  message?: string;
}

const phaseLabels: Record<GenerationPhase, string> = {
  outline: 'Creating Outline',
  content: 'Generating Content',
  design: 'Applying Design',
  images: 'Generating Images',
  animations: 'Adding Animations',
  complete: 'Complete!',
};

const phaseSteps: GenerationPhase[] = ['outline', 'content', 'design', 'images', 'animations'];

export function GenerationProgress({
  phase,
  currentSlide,
  totalSlides,
  message,
}: GenerationProgressProps): React.ReactElement {
  const currentPhaseIndex = phaseSteps.indexOf(phase);
  const progress = ((currentPhaseIndex + 1) / phaseSteps.length) * 100;

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-panel/60 backdrop-blur-sm border border-white/40 dark:border-white/10 rounded-xl">
      <h2 className="text-xl font-semibold text-ink mb-4 text-center">
        {phaseLabels[phase]}
      </h2>

      {/* Progress bar */}
      <div className="w-full h-3 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Phase steps */}
      <div className="flex justify-between mb-6">
        {phaseSteps.map((step, idx) => {
          const isActive = idx === currentPhaseIndex;
          const isComplete = idx < currentPhaseIndex;
          
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-all ${
                  isActive
                    ? 'bg-primary ring-4 ring-primary/20'
                    : isComplete
                    ? 'bg-success'
                    : 'bg-white/30 dark:bg-white/10'
                }`}
              >
                {isComplete ? (
                  <span className="text-white text-sm">✓</span>
                ) : (
                  <span
                    className={`text-xs ${
                      isActive ? 'text-white font-semibold' : 'text-ink-subtle'
                    }`}
                  >
                    {idx + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-xs text-center max-w-[80px] ${
                  isActive ? 'text-ink font-medium' : 'text-ink-subtle'
                }`}
              >
                {phaseLabels[step]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {message && (
        <p className="text-sm text-ink-mute text-center mb-4">{message}</p>
      )}

      {/* Slide progress */}
      {currentSlide !== undefined && totalSlides && (
        <div className="text-center">
          <p className="text-sm text-ink-subtle">
            Slide {currentSlide} of {totalSlides}
          </p>
        </div>
      )}

      {/* Aurora animation effect */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-primary via-secondary to-primary animate-pulse blur-3xl" />
      </div>
    </div>
  );
}

