/**
 * SpeechService - Manages WebRTC connection to OpenAI Realtime API
 * Handles speech recognition, transcription, and AI function calls
 */

import type {
  SpeechStatus,
  TranscriptEvent,
  SpeechEvent,
  ConnectResult,
} from '../types/services';

// Callback type definitions
type StatusCallback = (status: SpeechStatus) => void;
type TranscriptCallback = (event: TranscriptEvent) => void;
type ProgressCallback = (progress: number) => void;
type EventCallback = (event: SpeechEvent) => void;

// Internal function call tracking
interface FunctionCallAccumulator {
  name: string;
  arguments: string;
}

class SpeechService {
  private pc: RTCPeerConnection | null = null;
  private dc: RTCDataChannel | null = null;
  private audioStream: MediaStream | null = null;
  private functionCallArgs: Record<string, FunctionCallAccumulator> = {};
  private lastProgress: number = 0;

  // Listeners
  private statusListeners: Set<StatusCallback> = new Set();
  private transcriptListeners: Set<TranscriptCallback> = new Set();
  private progressListeners: Set<ProgressCallback> = new Set();
  private eventListeners: Set<EventCallback> = new Set();

  /**
   * Connect to OpenAI Realtime API
   */
  async connect(thresholdPercent: number = 50): Promise<ConnectResult> {
    if (this.pc) {
      console.log('Already connected');
      return { success: true };
    }

    try {
      this.emitStatus('connecting');

      // Get ephemeral token
      console.log('Fetching ephemeral token with threshold:', thresholdPercent + '%');
      const sessionResponse = await fetch(`/api/rt/ephemeral?threshold=${thresholdPercent}`);

      if (!sessionResponse.ok) {
        const errorData = await sessionResponse.json().catch(() => ({}));
        const errorMsg = errorData.details || errorData.error || `HTTP ${sessionResponse.status}`;
        throw new Error(`Token fetch failed: ${errorMsg}`);
      }

      const session = await sessionResponse.json();
      const token = session.client_secret?.value || session.client_secret || session.id;

      if (!token) {
        throw new Error('No token received from ephemeral endpoint');
      }

      // Create peer connection
      this.pc = new RTCPeerConnection();

      // Create data channel
      this.dc = this.pc.createDataChannel('oai-events');
      this.setupDataChannelHandlers();

      // Get microphone
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      } catch (micError: any) {
        if (micError.name === 'NotAllowedError') {
          throw new Error('Microphone access denied');
        } else if (micError.name === 'NotFoundError') {
          throw new Error('No microphone found');
        } else {
          throw new Error(`Microphone error: ${micError.message}`);
        }
      }

      this.audioStream.getTracks().forEach(track => this.pc!.addTrack(track, this.audioStream!));

      // Create and send offer
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);

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
      await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

      // Monitor connection state
      this.pc.onconnectionstatechange = () => {
        console.log('Connection state:', this.pc!.connectionState);
        const isConnected = this.pc!.connectionState === 'connected';
        this.emitStatus(isConnected ? 'connected' : this.pc!.connectionState as any);

        if (['disconnected', 'failed', 'closed'].includes(this.pc!.connectionState)) {
          this.cleanup();
        }
      };

      return { success: true };
    } catch (err: any) {
      console.error('Connection error:', err);
      this.emitStatus('error', err.message);
      this.cleanup();
      return { success: false, error: err.message };
    }
  }

  /**
   * Setup data channel event handlers
   */
  private setupDataChannelHandlers(): void {
    if (!this.dc) return;

    this.dc.onopen = () => {
      console.log('Data channel opened');
    };

    this.dc.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleDataChannelMessage(message);
      } catch (err) {
        console.error('Failed to parse data channel message:', err);
      }
    };

    this.dc.onerror = (err) => {
      console.error('Data channel error:', err);
    };
  }

  /**
   * Handle incoming data channel messages
   */
  private handleDataChannelMessage(message: any): void {
    if (message.type?.includes('function')) {
      console.log('🔧 Function event:', message.type, message);
    }

    // Function call start
    if (message.type === 'response.output_item.added') {
      const itemId = message.item?.id;
      const functionName = message.item?.name;
      if (itemId && functionName) {
        this.functionCallArgs[itemId] = { name: functionName, arguments: '' };
        console.log('✅ Function call started:', functionName);
      }
    }
    // Function arguments accumulating
    else if (message.type === 'response.function_call_arguments.delta') {
      const itemId = message.item_id;
      if (!this.functionCallArgs[itemId]) {
        this.functionCallArgs[itemId] = { name: message.name || 'unknown', arguments: '' };
      }
      this.functionCallArgs[itemId].arguments += message.delta || '';
    }
    // Transcript updates
    else if (message.type === 'response.audio_transcript.delta') {
      this.emitTranscript('partial', message.delta || '');
    }
    else if (message.type === 'response.audio_transcript.done') {
      this.emitTranscript('final', message.transcript || '');
    }
    else if (message.type === 'conversation.item.input_audio_transcription.completed') {
      this.emitTranscript('final', message.transcript || '');
    }
    // Function call complete
    else if (message.type === 'response.function_call_arguments.done') {
      this.handleFunctionCallComplete(message);
    }
  }

  /**
   * Handle completed function call
   */
  private handleFunctionCallComplete(message: any): void {
    const itemId = message.item_id;
    const callId = message.call_id;
    const accumulated = this.functionCallArgs[itemId];

    if (!accumulated) return;

    const functionName = accumulated.name;

    // Parse arguments
    let args: any = {};
    try {
      args = JSON.parse(accumulated.arguments);
    } catch (e) {
      console.error('Failed to parse function arguments:', e);
      return;
    }

    console.log('🤖 AI called function:', functionName, args);
    delete this.functionCallArgs[itemId];

    // Handle different function types
    if (functionName === 'update_progress') {
      const progress = args.progress_percent || 0;
      const monotonicProgress = Math.max(this.lastProgress, progress);
      this.lastProgress = monotonicProgress;

      console.log('📊 Progress update:', monotonicProgress + '%');
      this.emitProgress(monotonicProgress);

      // Send acknowledgment
      this.sendFunctionResponse(callId, { status: 'acknowledged' });
    } else if (functionName === 'advance_slide') {
      const reason = args.reason || 'AI decision';
      console.log('🤖 AI requested slide advance:', reason);

      this.sendFunctionResponse(callId, { status: 'advancing' });
      this.emitEvent('advance', { reason, progress: this.lastProgress });
    }
  }

  /**
   * Send function call response back to AI
   */
  private sendFunctionResponse(callId: string, output: any): void {
    if (callId && this.dc?.readyState === 'open') {
      this.dc.send(JSON.stringify({
        type: 'conversation.item.create',
        item: {
          type: 'function_call_output',
          call_id: callId,
          output: JSON.stringify(output),
        },
      }));
    }
  }

  /**
   * Send slide context to AI
   */
  sendSlideContext(slideIndex: number, notes: string, targetWPM: number = 145): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Cannot send slide context - data channel not ready');
      return;
    }

    const notesWordCount = notes.trim().split(/\s+/).length;

    this.dc.send(JSON.stringify({
      type: 'conversation.item.create',
      item: {
        type: 'function_call',
        name: 'set_context',
        call_id: `set_context_${slideIndex}_${Date.now()}`,
        arguments: JSON.stringify({
          slide_index: slideIndex,
          notes_text: notes,
          notes_word_count: notesWordCount,
          target_wpm: targetWPM,
        }),
      },
    }));

    console.log('📄 Sent slide context:', slideIndex, 'Words:', notesWordCount);
  }

  /**
   * Update session instructions
   */
  updateSessionInstructions(instructions: string): void {
    if (!this.dc || this.dc.readyState !== 'open') {
      console.warn('Cannot update session - data channel not ready');
      return;
    }

    this.dc.send(JSON.stringify({
      type: 'session.update',
      session: { instructions },
    }));

    console.log('🔄 Updated session instructions');
  }

  /**
   * Reset transcript for new slide
   */
  resetTranscript(): void {
    console.log('🔄 Resetting transcript');
    this.lastProgress = 0;
    this.emitTranscript('reset', '');
    this.emitProgress(0);
  }

  /**
   * Disconnect
   */
  disconnect(): void {
    console.log('Disconnecting speech service...');
    this.cleanup();
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => track.stop());
      this.audioStream = null;
    }
    if (this.dc) {
      this.dc.close();
      this.dc = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
    this.functionCallArgs = {};
    this.lastProgress = 0;
    this.emitStatus('disconnected');
  }

  // Event emitters
  private emitStatus(status: SpeechStatus['status'], error: string | null = null): void {
    this.statusListeners.forEach(listener => listener({ status, error }));
  }

  private emitTranscript(type: TranscriptEvent['type'], text: string): void {
    this.transcriptListeners.forEach(listener => listener({ type, text }));
  }

  private emitProgress(progress: number): void {
    this.progressListeners.forEach(listener => listener(progress));
  }

  private emitEvent(type: string, data: any): void {
    this.eventListeners.forEach(listener => listener({ type, data }));
  }

  // Subscription methods
  onStatus(callback: StatusCallback): () => void {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  onTranscript(callback: TranscriptCallback): () => void {
    this.transcriptListeners.add(callback);
    return () => this.transcriptListeners.delete(callback);
  }

  onProgress(callback: ProgressCallback): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  onEvent(callback: EventCallback): () => void {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }
}

// Singleton instance
export const speechService = new SpeechService();
