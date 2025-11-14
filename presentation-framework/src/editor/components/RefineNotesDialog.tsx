"use client";

import { AIChatDialog } from '@/components/ai/AIChatDialog';
import ReactMarkdown from 'react-markdown';

interface RefineNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentNotes: string;
  slideTitle?: string;
  slideContent?: string;
  onApplyNotes: (refinedNotes: string) => void;
}

/**
 * Refine Notes Dialog
 * Specialized wrapper around AIChatDialog for speaker notes refinement
 */
export function RefineNotesDialog({
  open,
  onOpenChange,
  currentNotes,
  slideTitle,
  slideContent,
  onApplyNotes,
}: RefineNotesDialogProps) {
  return (
    <AIChatDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Refine Speaker Notes"
      description="Have a conversation with AI to improve your presenter notes. Ask for specific changes, additions, or improvements."
      apiEndpoint="/api/ai/refine-notes"
      context={{
        currentNotes,
        slideTitle,
        slideContent,
      }}
      initialPlaceholder="Describe how you'd like to improve the notes..."
      suggestionPrompts={[
        "Add more delivery cues",
        "Make it more concise",
        "Include timing for each section",
        "Add audience engagement tips",
      ]}
      extractResult={(data) => data.refinedNotes}
      onApplyResult={onApplyNotes}
      renderPreview={(refinedNotes) => (
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown>{refinedNotes}</ReactMarkdown>
        </div>
      )}
    />
  );
}
