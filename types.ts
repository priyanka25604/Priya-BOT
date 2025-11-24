export interface AudioConfig {
  inputSampleRate: number;
  outputSampleRate: number;
}

export interface TranscriptMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isPartial?: boolean;
}

export interface Blob {
  data: string;
  mimeType: string;
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}
