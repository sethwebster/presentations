import { useState, useEffect } from 'react';
import { speechService } from '../services/SpeechService';

/**
 * useSpeech - Hook for speech recognition via SpeechService
 * Thin wrapper that subscribes to service events
 */
export function useSpeech() {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [aiProgress, setAiProgress] = useState(0);

  useEffect(() => {
    // Subscribe to status changes
    const unsubStatus = speechService.onStatus(({ status, error }) => {
      setConnected(status === 'connected');
      setError(error);
    });

    // Subscribe to transcript updates
    const unsubTranscript = speechService.onTranscript(({ type, text }) => {
      if (type === 'partial') {
        setPartialTranscript(prev => prev + text);
      } else if (type === 'final') {
        setFinalTranscript(prev => (prev ? prev + ' ' : '') + text);
        setPartialTranscript('');
      } else if (type === 'reset') {
        setFinalTranscript('');
        setPartialTranscript('');
      }
    });

    // Subscribe to progress updates
    const unsubProgress = speechService.onProgress((progress) => {
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
    connect: (thresholdPercent) => speechService.connect(thresholdPercent),
    disconnect: () => speechService.disconnect(),
    sendSlideContext: (slideIndex, notes, targetWPM) => speechService.sendSlideContext(slideIndex, notes, targetWPM),
    resetTranscript: () => speechService.resetTranscript(),
    updateSessionInstructions: (instructions) => speechService.updateSessionInstructions(instructions),
    onEvent: (callback) => speechService.onEvent(callback),
  };
}
