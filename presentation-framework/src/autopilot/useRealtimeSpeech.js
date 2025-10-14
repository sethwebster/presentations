import { useRef, useState, useCallback } from 'react';

/**
 * Hook for OpenAI Realtime API speech recognition
 * Manages WebRTC connection, mic stream, and transcript events
 */
export function useRealtimeSpeech() {
  const [connected, setConnected] = useState(false);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [error, setError] = useState(null);
  const [aiProgress, setAiProgress] = useState(0); // AI's assessment of progress

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const functionCallArgsRef = useRef({}); // Track accumulating function arguments

  const connect = async () => {
    if (pcRef.current) {
      console.log('Already connected');
      return;
    }

    try {
      setError(null);
      console.log('Fetching ephemeral token...');

      // Get ephemeral session token
      const sessionResponse = await fetch('/api/rt/ephemeral');
      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || `HTTP ${sessionResponse.status}`;
        throw new Error(`Token fetch failed: ${errorMsg}`);
      }

      const session = await sessionResponse.json();
      console.log('Session response:', { ...session, client_secret: session.client_secret ? '***' : undefined });

      const token = session.client_secret?.value || session.client_secret || session.id;

      if (!token) {
        throw new Error('No token received from ephemeral endpoint. Check server logs.');
      }

      console.log('Token received, creating peer connection...');

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Create data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onopen = () => {
        console.log('Data channel opened');
      };

      dc.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          // Log all function-related events
          if (message.type?.includes('function')) {
            console.log('🔧 Function event:', message.type, message);
          } else {
            console.log('Received message:', message.type);
          }

          // Handle different event types
          if (message.type === 'response.function_call_arguments.delta') {
            // Accumulate function arguments
            const itemId = message.item_id;
            if (!functionCallArgsRef.current[itemId]) {
              functionCallArgsRef.current[itemId] = {
                name: message.name,
                arguments: '',
              };
            }
            functionCallArgsRef.current[itemId].arguments += message.delta || '';
          } else if (message.type === 'response.audio_transcript.delta') {
            // Partial transcript update
            setPartialTranscript(prev => prev + (message.delta || ''));
          } else if (message.type === 'response.audio_transcript.done') {
            // Final transcript
            const text = message.transcript || '';
            console.log('Final transcript:', text);
            setFinalTranscript(prev => (prev ? prev + ' ' : '') + text);
            setPartialTranscript('');
          } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
            // Alternative transcript event
            const text = message.transcript || '';
            console.log('Input transcription:', text);
            setFinalTranscript(prev => (prev ? prev + ' ' : '') + text);
          } else if (message.type === 'response.function_call_arguments.done') {
            // Function call complete - get accumulated arguments
            const itemId = message.item_id;
            const callId = message.call_id;
            const accumulated = functionCallArgsRef.current[itemId];

            if (!accumulated) {
              console.warn('No accumulated arguments for item:', itemId);
              return;
            }

            const functionName = accumulated.name;

            // Parse the accumulated JSON arguments
            let args = {};
            try {
              args = JSON.parse(accumulated.arguments);
            } catch (e) {
              console.error('Failed to parse function arguments:', accumulated.arguments, e);
              return;
            }

            console.log('🤖 AI called function:', functionName, args);

            // Clean up
            delete functionCallArgsRef.current[itemId];

            if (functionName === 'update_progress') {
              const progress = args.progress_percent || 0;
              const points = args.covered_points || '';
              console.log('📊 Progress update:', progress + '%', '-', points);
              setAiProgress(progress);

              // Send function response back to model
              if (callId && dcRef.current?.readyState === 'open') {
                dcRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({ status: 'acknowledged' }),
                  },
                }));
              }
            } else if (functionName === 'advance_slide') {
              const reason = args.reason || 'AI decision';
              console.log('🤖 AI Model called advance_slide:', reason);

              // Send function response back to model
              if (callId && dcRef.current?.readyState === 'open') {
                dcRef.current.send(JSON.stringify({
                  type: 'conversation.item.create',
                  item: {
                    type: 'function_call_output',
                    call_id: callId,
                    output: JSON.stringify({ status: 'advancing' }),
                  },
                }));
              }

              window.dispatchEvent(new CustomEvent('lume-autopilot-advance', {
                detail: { source: 'model', reason }
              }));
            }
          }
        } catch (err) {
          console.error('Failed to parse data channel message:', err);
        }
      };

      dc.onerror = (err) => {
        console.error('Data channel error:', err);
      };

      // Get microphone access
      console.log('Requesting microphone access...');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micError) {
        if (micError.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access in your browser settings and try again.');
        } else if (micError.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw new Error(`Microphone error: ${micError.message}`);
        }
      }

      console.log('Microphone access granted, adding tracks...');
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create and send offer
      console.log('Creating offer...');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log('Sending offer to OpenAI...');
      const answerResponse = await fetch(
        `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        }
      );

      if (!answerResponse.ok) {
        throw new Error(`OpenAI connection failed: ${answerResponse.status}`);
      }

      const answerSdp = await answerResponse.text();
      console.log('Received answer, setting remote description...');

      await pc.setRemoteDescription({
        type: 'answer',
        sdp: answerSdp,
      });

      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('Connection state:', pc.connectionState);
        setConnected(pc.connectionState === 'connected');

        if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
          cleanup();
        }
      };

      console.log('WebRTC setup complete');
    } catch (err) {
      console.error('Connection error:', err);
      setError(err.message);
      cleanup();
    }
  };

  const sendSlideContext = useCallback((slideIndex, notes) => {
    if (dcRef.current && dcRef.current.readyState === 'open') {
      try {
        // Update session instructions with current slide's expected content
        dcRef.current.send(JSON.stringify({
          type: 'session.update',
          session: {
            instructions: `You are assisting a live presentation. Provide accurate live transcripts of the speaker's words.

CURRENT SLIDE ${slideIndex}:
The speaker should say: "${notes}"

Listen carefully. When the speaker has clearly finished discussing these talking points, send ONLY {"type":"advance"} over the data channel.

Be conservative - only advance when confident the slide is complete. Look for natural conclusions and transitions.`,
          },
        }));
        console.log('📄 Updated session for slide', slideIndex);
        console.log('   Expecting:', notes.substring(0, 120) + '...');
      } catch (err) {
        console.error('Failed to send slide context:', err);
      }
    } else {
      console.warn('Cannot send slide context - data channel not ready');
    }
  }, []);

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnected(false);
  }, []);

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    cleanup();
  }, [cleanup]);

  const resetTranscript = useCallback(() => {
    console.log('🔄 Resetting transcript for new slide');
    setFinalTranscript('');
    setPartialTranscript('');
    setAiProgress(0);
  }, []);

  return {
    connected,
    finalTranscript,
    partialTranscript,
    aiProgress,
    error,
    connect,
    disconnect,
    sendSlideContext,
    resetTranscript,
  };
}
