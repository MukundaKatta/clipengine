export interface TranscriptionResult {
  fullText: string;
  segments: TranscriptionSegment[];
  speakers: SpeakerInfo[];
  language: string;
  confidence: number;
  wordCount: number;
  durationSeconds: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface SpeakerInfo {
  id: string;
  label: string;
  segmentsCount: number;
}

export interface TranscribeOptions {
  provider?: "whisper" | "assemblyai";
  language?: string;
  speakerDiarization?: boolean;
  maxSpeakers?: number;
  webhookUrl?: string;
}

export interface TranscriberProvider {
  transcribe(
    input: TranscriptionInput,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult>;

  transcribeFromUrl(
    url: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult>;
}

export type TranscriptionInput =
  | { type: "file"; data: Buffer; mimeType: string; fileName: string }
  | { type: "url"; url: string }
  | { type: "path"; filePath: string };
