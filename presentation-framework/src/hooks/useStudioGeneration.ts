/**
 * Hook for generating presentations using Lume Studio
 * Handles API communication, progress tracking, and error handling
 */

import { useState, useCallback, useRef } from "react";
import type { StudioInputs } from "../ai/studio/payloadBuilders";
import type { StudioProgress, StudioResult } from "../ai/studio/StudioOrchestrator";

export interface UseStudioGenerationOptions {
  onProgress?: (progress: StudioProgress) => void;
  onComplete?: (result: StudioResult) => void;
  onError?: (error: Error) => void;
}

export interface UseStudioGenerationResult {
  generate: (inputs: StudioInputs & {
    maxRefinementCycles?: number;
    targetQualityScore?: number;
    skipCritique?: boolean;
    model?: string;
    enableVisualCritique?: boolean;
  }) => Promise<StudioResult | null>;
  cancel: () => void;
  runVisualCritique: (deckId: string, context: {
    deck: any;
    theme?: string;
    audience?: string;
    designLanguage?: string;
  }) => Promise<any[]>;
  isGenerating: boolean;
  progress: StudioProgress | null;
  result: StudioResult | null;
  error: Error | null;
  visualCritiques: any[] | null;
}

export function useStudioGeneration(
  options: UseStudioGenerationOptions = {}
): UseStudioGenerationResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<StudioProgress | null>(null);
  const [result, setResult] = useState<StudioResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [visualCritiques, setVisualCritiques] = useState<any[] | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (inputs: Parameters<UseStudioGenerationResult["generate"]>[0]) => {
      setIsGenerating(true);
      setProgress(null);
      setResult(null);
      setError(null);

      // Create abort controller for cancellation
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch("/api/ai/studio/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(inputs),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error("Response body is null");
        }

        // Parse SSE stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete messages
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;

            const data = line.substring(6); // Remove "data: " prefix

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === "progress") {
                const progressData = parsed.data as StudioProgress;
                setProgress(progressData);
                options.onProgress?.(progressData);
              } else if (parsed.type === "complete") {
                const resultData = parsed.data as StudioResult;
                setResult(resultData);

                // Store whether visual critique was requested for later use
                (resultData as any).visualCritiqueRequested = inputs.enableVisualCritique;
                (resultData as any).visualCritiqueContext = {
                  theme: inputs.topic,
                  audience: inputs.audience,
                  designLanguage: inputs.design_language,
                };

                setIsGenerating(false);
                options.onComplete?.(resultData);
                return resultData;
              } else if (parsed.type === "error") {
                const errorData = new Error(parsed.data.message || "Generation failed");
                setError(errorData);
                setIsGenerating(false);
                options.onError?.(errorData);
                return null;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE message:", data);
            }
          }
        }

        return null;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          // Generation was cancelled
          console.log("Generation cancelled");
          return null;
        }

        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsGenerating(false);
        options.onError?.(errorObj);
        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [options]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      setProgress(null);
    }
  }, []);

  const runVisualCritique = useCallback(async (deckId: string, context: {
    deck: any;
    theme?: string;
    audience?: string;
    designLanguage?: string;
  }) => {
    try {
      const { triggerVisualCritiqueAPI } = await import("../ai/studio/critique/clientCritique");

      const critiques = await triggerVisualCritiqueAPI(deckId, context);
      setVisualCritiques(critiques);
      return critiques;
    } catch (error) {
      console.error("Visual critique failed:", error);
      throw error;
    }
  }, []);

  return {
    generate,
    cancel,
    runVisualCritique,
    isGenerating,
    progress,
    result,
    error,
    visualCritiques,
  };
}
