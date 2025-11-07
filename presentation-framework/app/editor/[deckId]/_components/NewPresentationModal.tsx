"use client";

interface NewPresentationModalProps {
  onStartFromScratch: () => void;
  onBuildWithAI: () => void;
  onBuildWithStudio: () => void;
  onClose: () => void;
}

/**
 * Modal for choosing how to create a new presentation.
 * Shows options for starting from scratch or using AI generation.
 */
export function NewPresentationModal({
  onStartFromScratch,
  onBuildWithAI,
  onBuildWithStudio,
  onClose,
}: NewPresentationModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="p-8 rounded-2xl"
          style={{
            background: 'var(--lume-midnight)',
            border: '1px solid rgba(236, 236, 236, 0.1)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-[var(--lume-mist)] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2
            className="mb-2 text-3xl font-bold"
            style={{ color: 'var(--lume-mist)' }}
          >
            Create New Presentation
          </h2>
          <p
            className="mb-8"
            style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
          >
            Choose how you&apos;d like to get started
          </p>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Start from Scratch */}
            <button
              onClick={onStartFromScratch}
              className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(236, 236, 236, 0.1)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(236, 236, 236, 0.1)';
              }}
            >
              <div className="flex flex-col items-start">
                <div
                  className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg"
                  style={{ background: 'rgba(236, 236, 236, 0.1)' }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
                <h3
                  className="mb-2 text-xl font-semibold"
                  style={{ color: 'var(--lume-mist)' }}
                >
                  Start from Scratch
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
                >
                  Create a blank presentation and build it yourself with full creative control
                </p>
              </div>
            </button>

            {/* Build with AI (Conversational) */}
            <button
              onClick={onBuildWithAI}
              className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(22, 194, 199, 0.1)',
                border: '1px solid rgba(22, 194, 199, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(22, 194, 199, 0.15)';
                e.currentTarget.style.borderColor = 'var(--lume-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(22, 194, 199, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(22, 194, 199, 0.3)';
              }}
            >
              <div className="flex flex-col items-start">
                <div
                  className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg"
                  style={{ background: 'rgba(22, 194, 199, 0.2)' }}
                >
                  <svg className="w-6 h-6" style={{ color: 'var(--lume-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3
                  className="mb-2 text-xl font-semibold"
                  style={{ color: 'var(--lume-primary)' }}
                >
                  Build with AI
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
                >
                  Chat with AI to refine your ideas and generate slides
                </p>
              </div>
            </button>

            {/* Build with Studio (Award-Quality) */}
            <button
              onClick={onBuildWithStudio}
              className="group relative overflow-hidden rounded-xl p-6 text-left transition-all duration-300 hover:scale-[1.02]"
              style={{
                background: 'rgba(200, 75, 210, 0.1)',
                border: '1px solid rgba(200, 75, 210, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(200, 75, 210, 0.15)';
                e.currentTarget.style.borderColor = 'var(--lume-accent)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(200, 75, 210, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(200, 75, 210, 0.3)';
              }}
            >
              <div className="flex flex-col items-start">
                <div
                  className="flex items-center justify-center w-12 h-12 mb-4 rounded-lg"
                  style={{ background: 'rgba(200, 75, 210, 0.2)' }}
                >
                  <svg className="w-6 h-6" style={{ color: 'var(--lume-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3
                  className="mb-2 text-xl font-semibold"
                  style={{ color: 'var(--lume-accent)' }}
                >
                  Build with Studio
                </h3>
                <p
                  className="text-sm"
                  style={{ color: 'var(--lume-mist)', opacity: 0.7 }}
                >
                  Award-quality design with 5-stage AI pipeline and professional layouts
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
