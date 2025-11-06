'use client';

import * as React from 'react';
import type { GenerationPhase } from '@/ai/types';

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
      <h2 className="text-xl font-semibold mb-4 text-center" style={{ color: 'var(--lume-mist)' }}>
        {phaseLabels[phase]}
      </h2>

      {/* Progress bar */}
      <div className="w-full h-3 bg-white/30 dark:bg-white/10 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-700 ease-out"
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
                className={`relative w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${
                  isActive
                    ? 'bg-primary ring-4 ring-primary/20 scale-110'
                    : isComplete
                    ? 'bg-green-500 scale-100'
                    : 'bg-white/30 dark:bg-white/10 scale-100'
                }`}
              >
                {isActive && (
                  <svg className="absolute inset-0 w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="text-white/30"
                    />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeDasharray={`${2 * Math.PI * 20}`}
                      strokeDashoffset={`${2 * Math.PI * 20 * 0.75}`}
                      className="text-white transition-all duration-1000 ease-linear"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
                {isComplete ? (
                  <span className="text-white text-lg animate-in fade-in duration-500">✓</span>
                ) : isActive ? (
                  <span className="text-white text-xs font-semibold relative z-10 animate-pulse">
                    {idx + 1}
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: 'var(--lume-mist)', opacity: 0.5 }}>
                    {idx + 1}
                  </span>
                )}
              </div>
              <span
                className="text-xs text-center max-w-[80px] transition-all duration-300"
                style={{
                  color: 'var(--lume-mist)',
                  opacity: isActive ? 1 : 0.6,
                  fontWeight: isActive ? 500 : 400
                }}
              >
                {phaseLabels[step]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status message */}
      {message && (
        <p className="text-sm text-center mb-4" style={{ color: 'var(--lume-mist)', opacity: 0.8 }}>{message}</p>
      )}

      {/* Slide progress */}
      {currentSlide !== undefined && totalSlides && (
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--lume-mist)', opacity: 0.7 }}>
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

