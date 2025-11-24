import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ConnectionState, TranscriptMessage } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../utils/audioUtils";

const API_KEY = process.env.API_KEY || '';

// System instruction for Priya
const SYSTEM_INSTRUCTION = `
You are Priya, a friendly, intelligent, and highly knowledgeable AI assistant.
Your personality is warm, encouraging, and enthusiastic.
You can help with any topic the user asks about—whether it's coding, general knowledge, science, creative writing, or daily advice.
You explain concepts clearly and concisely.
You are currently talking to the user via a real-time voice interface.
Keep your responses conversational and suitable for speech (avoid extremely long lists or complex formatting unless asked).
If the user asks for code or technical details, explain the logic verbally and clearly.
`;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private outputNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private audioSources: Set<AudioBufferSourceNode> = new Set();
  
  // Callbacks
  public onConnectionStateChange?: (state: ConnectionState) => void;
  public onTranscriptUpdate?: (message: TranscriptMessage) => void;
  public onAudioLevel?: (level: number) => void;

  private session: any = null;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async connect() {
    if (!API_KEY) {
      console.error("API Key is missing");
      this.onConnectionStateChange?.(ConnectionState.ERROR);
      return;
    }

    this.onConnectionStateChange?.(ConnectionState.CONNECTING);

    try {
      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // Get Microphone Access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Start Session
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      };

      const sessionPromise = this.ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            this.handleOpen(sessionPromise);
          },
          onmessage: this.handleMessage.bind(this),
          onclose: this.handleClose.bind(this),
          onerror: this.handleError.bind(this),
        }
      });
      
      this.session = await sessionPromise;

    } catch (error) {
      console.error("Failed to connect:", error);
      this.onConnectionStateChange?.(ConnectionState.ERROR);
      this.disconnect();
    }
  }

  private handleOpen(sessionPromise: Promise<any>) {
    this.onConnectionStateChange?.(ConnectionState.CONNECTED);
    this.startAudioStreaming(sessionPromise);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext && this.outputNode) {
        this.playAudioChunk(base64Audio);
    }

    // Handle Interruption
    if (message.serverContent?.interrupted) {
      this.stopAllAudio();
    }

    // Handle Transcriptions
    // Note: Removed configuration for transcription to ensure connection stability,
    // so these fields might not be populated by the model currently.
    const outputTrans = message.serverContent?.outputTranscription;
    if (outputTrans?.text) {
        this.onTranscriptUpdate?.({
            id: Date.now().toString() + '-model',
            role: 'model',
            text: outputTrans.text,
            timestamp: new Date(),
            isPartial: !message.serverContent?.turnComplete
        });
    }

    const inputTrans = message.serverContent?.inputTranscription;
    if (inputTrans?.text) {
        this.onTranscriptUpdate?.({
            id: Date.now().toString() + '-user',
            role: 'user',
            text: inputTrans.text,
            timestamp: new Date(),
            isPartial: true 
        });
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext || !this.outputNode) return;

    try {
      this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
      const audioBuffer = await decodeAudioData(
        base64ToUint8Array(base64Audio),
        this.outputAudioContext,
        24000
      );

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      
      source.addEventListener('ended', () => {
        this.audioSources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.audioSources.add(source);
      
      // Calculate simple audio level for visualizer from the buffer data
      const data = audioBuffer.getChannelData(0);
      let sum = 0;
      // Sample a few points
      for(let i=0; i<data.length; i+=100) {
          sum += Math.abs(data[i]);
      }
      const avg = sum / (data.length / 100);
      this.onAudioLevel?.(avg * 5); // Scale up for visualizer

    } catch (e) {
      console.error("Error decoding audio", e);
    }
  }

  private stopAllAudio() {
    this.audioSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.audioSources.clear();
    this.nextStartTime = 0;
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime;
    }
  }

  private handleClose() {
    this.onConnectionStateChange?.(ConnectionState.DISCONNECTED);
  }

  private handleError(e: any) {
    console.error("Session error:", e);
    this.onConnectionStateChange?.(ConnectionState.ERROR);
  }

  private startAudioStreaming(sessionPromise: Promise<any>) {
    if (!this.inputAudioContext || !this.mediaStream) return;

    this.source = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate level for visualizer
      let sum = 0;
      for(let i=0; i<inputData.length; i+=50) {
          sum += Math.abs(inputData[i]);
      }
      const avg = sum / (inputData.length / 50);
      this.onAudioLevel?.(avg * 5);

      const pcmBlob = createPcmBlob(inputData);
      
      sessionPromise.then((session: any) => {
        if(session) {
             session.sendRealtimeInput({ media: pcmBlob });
        }
      });
    };

    this.source.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  disconnect() {
    if (this.session) {
        try {
            this.session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        this.session = null;
    }
    
    this.stopAllAudio();

    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }

    this.onConnectionStateChange?.(ConnectionState.DISCONNECTED);
  }
}