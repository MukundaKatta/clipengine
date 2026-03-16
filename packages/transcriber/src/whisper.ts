import OpenAI from "openai";
import { readFile } from "fs/promises";
import type {
  TranscriberProvider,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptionSegment,
  TranscribeOptions,
} from "./types";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB Whisper limit

export class WhisperProvider implements TranscriberProvider {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async transcribe(
    input: TranscriptionInput,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult> {
    const file = await this.resolveInput(input);

    const response = await this.client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      language: options?.language,
    });

    return this.parseResponse(response);
  }

  async transcribeFromUrl(
    url: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult> {
    // Whisper requires file upload, so fetch the URL content first
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio from URL: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > MAX_FILE_SIZE) {
      throw new Error(
        `File size ${(buffer.length / 1024 / 1024).toFixed(1)}MB exceeds Whisper limit of 25MB. ` +
        `Consider using AssemblyAI for larger files.`
      );
    }

    const fileName = new URL(url).pathname.split("/").pop() || "audio.mp3";
    const file = new File([buffer], fileName, {
      type: this.guessMimeType(fileName),
    });

    const transcription = await this.client.audio.transcriptions.create({
      model: "whisper-1",
      file,
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
      language: options?.language,
    });

    return this.parseResponse(transcription);
  }

  private async resolveInput(input: TranscriptionInput): Promise<File> {
    switch (input.type) {
      case "file": {
        return new File([input.data], input.fileName, {
          type: input.mimeType,
        });
      }
      case "path": {
        const data = await readFile(input.filePath);
        if (data.length > MAX_FILE_SIZE) {
          throw new Error(
            `File size exceeds Whisper limit of 25MB. Consider using AssemblyAI.`
          );
        }
        const fileName = input.filePath.split("/").pop() || "audio.mp3";
        return new File([data], fileName, {
          type: this.guessMimeType(fileName),
        });
      }
      case "url": {
        const response = await fetch(input.url);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const fileName = new URL(input.url).pathname.split("/").pop() || "audio.mp3";
        return new File([buffer], fileName, {
          type: this.guessMimeType(fileName),
        });
      }
    }
  }

  private parseResponse(response: OpenAI.Audio.Transcription & Record<string, unknown>): TranscriptionResult {
    const rawSegments = (response as unknown as { segments?: Array<{ start: number; end: number; text: string; avg_logprob?: number }> }).segments || [];

    const segments: TranscriptionSegment[] = rawSegments.map((seg) => ({
      start: seg.start,
      end: seg.end,
      text: seg.text.trim(),
      confidence: seg.avg_logprob ? Math.exp(seg.avg_logprob) : 0.9,
    }));

    const fullText = response.text || segments.map((s) => s.text).join(" ");
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;
    const durationSeconds =
      segments.length > 0 ? segments[segments.length - 1].end : 0;

    const avgConfidence =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length
        : 0.9;

    return {
      fullText,
      segments,
      speakers: [], // Whisper doesn't natively support speaker diarization
      language: (response as unknown as { language?: string }).language || "en",
      confidence: avgConfidence,
      wordCount,
      durationSeconds,
    };
  }

  private guessMimeType(fileName: string): string {
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      mp3: "audio/mpeg",
      mp4: "audio/mp4",
      wav: "audio/wav",
      m4a: "audio/mp4",
      ogg: "audio/ogg",
      webm: "audio/webm",
      flac: "audio/flac",
    };
    return mimeTypes[ext || ""] || "audio/mpeg";
  }
}
