import { useState, useEffect } from 'react';
import { speechService } from '../services/SpeechService';
import type { UseSpeechReturn } from '../types/hooks';
import type { SpeechStatus, TranscriptEvent, SpeechEvent } from '../types/services';

/**
 * useSpeech - Hook for speech recognition via SpeechService
 * Thin wrapper that subscribes to service events
 */
export function useSpeech(): UseSpeechReturn {
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [finalTranscript, setFinalTranscript] = useState<string>('');
  const [partialTranscript, setPartialTranscript] = useState<string>('');
  const [aiProgress, setAiProgress] = useState<number>(0);

  useEffect(() => {
    // Subscribe to status changes
    const unsubStatus = speechService.onStatus(({ status, error }: SpeechStatus) => {
      setConnected(status === 'connected');
      setError(error ?? null);
    });

    // Subscribe to transcript updates
    const unsubTranscript = speechService.onTranscript(({ type, text }: TranscriptEvent) => {
      if (type === 'partial') {
        setPartialTranscript((prev: string) => prev + text);
      } else if (type === 'final') {
        setFinalTranscript((prev: string) => (prev ? prev + ' ' : '') + text);
        setPartialTranscript('');
      } else if (type === 'reset') {
        setFinalTranscript('');
        setPartialTranscript('');
      }
    });

    // Subscribe to progress updates
    const unsubProgress = speechService.onProgress((progress: number) => {
      setAiProgress(progress);
    });

    return () => {
      unsubStatus();
      unsubTranscript();
      unsubProgress();
    };
  }, []);

  return {
    connected,
    error,
    finalTranscript,
    partialTranscript,
    aiProgress,
    connect: (thresholdPercent: number) => speechService.connect(thresholdPercent),
    disconnect: () => speechService.disconnect(),
    sendSlideContext: (slideIndex: number, notes: string, targetWPM?: number) => speechService.sendSlideContext(slideIndex, notes, targetWPM),
    resetTranscript: () => speechService.resetTranscript(),
    updateSessionInstructions: (instructions: string) => speechService.updateSessionInstructions(instructions),
    onEvent: (callback: (event: SpeechEvent) => void) => speechService.onEvent(callback),
  };
}
