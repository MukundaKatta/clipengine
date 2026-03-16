import { AssemblyAI } from "assemblyai";
import { readFile } from "fs/promises";
import type {
  TranscriberProvider,
  TranscriptionInput,
  TranscriptionResult,
  TranscriptionSegment,
  SpeakerInfo,
  TranscribeOptions,
} from "./types";

export class AssemblyAIProvider implements TranscriberProvider {
  private client: AssemblyAI;

  constructor(apiKey?: string) {
    this.client = new AssemblyAI({
      apiKey: apiKey || process.env.ASSEMBLYAI_API_KEY || "",
    });
  }

  async transcribe(
    input: TranscriptionInput,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult> {
    let audioData: string | Buffer;

    switch (input.type) {
      case "file":
        audioData = input.data;
        break;
      case "path":
        audioData = await readFile(input.filePath);
        break;
      case "url":
        audioData = input.url;
        break;
    }

    const transcript = await this.client.transcripts.transcribe({
      audio: audioData as string,
      language_code: (options?.language as "en") || undefined,
      speaker_labels: options?.speakerDiarization ?? true,
      speakers_expected: options?.maxSpeakers,
      auto_highlights: true,
      sentiment_analysis: true,
      entity_detection: true,
      iab_categories: true,
    });

    if (transcript.status === "error") {
      throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    }

    return this.parseTranscript(transcript);
  }

  async transcribeFromUrl(
    url: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult> {
    return this.transcribe({ type: "url", url }, options);
  }

  private parseTranscript(transcript: {
    text?: string | null;
    utterances?: Array<{
      start: number;
      end: number;
      text: string;
      speaker: string;
      confidence: number;
    }> | null;
    words?: Array<{
      start: number;
      end: number;
      text: string;
      speaker?: string;
      confidence: number;
    }> | null;
    language_code?: string | null;
    confidence?: number | null;
    audio_duration?: number | null;
  }): TranscriptionResult {
    const fullText = transcript.text || "";
    const wordCount = fullText.split(/\s+/).filter(Boolean).length;

    // Build segments from utterances (speaker-labeled chunks)
    const segments: TranscriptionSegment[] = [];
    const speakerMap = new Map<string, number>();

    if (transcript.utterances) {
      for (const utterance of transcript.utterances) {
        segments.push({
          start: utterance.start / 1000, // Convert ms to seconds
          end: utterance.end / 1000,
          text: utterance.text,
          speaker: utterance.speaker,
          confidence: utterance.confidence,
        });

        const count = speakerMap.get(utterance.speaker) || 0;
        speakerMap.set(utterance.speaker, count + 1);
      }
    } else if (transcript.words) {
      // Fall back to word-level segments grouped by speaker
      let currentSegment: TranscriptionSegment | null = null;

      for (const word of transcript.words) {
        const speaker = word.speaker || "A";

        if (!currentSegment || currentSegment.speaker !== speaker) {
          if (currentSegment) segments.push(currentSegment);
          currentSegment = {
            start: word.start / 1000,
            end: word.end / 1000,
            text: word.text,
            speaker,
            confidence: word.confidence,
          };
        } else {
          currentSegment.end = word.end / 1000;
          currentSegment.text += " " + word.text;
          currentSegment.confidence =
            (currentSegment.confidence + word.confidence) / 2;
        }

        const count = speakerMap.get(speaker) || 0;
        speakerMap.set(speaker, count + 1);
      }

      if (currentSegment) segments.push(currentSegment);
    }

    const speakers: SpeakerInfo[] = Array.from(speakerMap.entries()).map(
      ([label, segmentsCount], index) => ({
        id: `speaker_${index}`,
        label: `Speaker ${label}`,
        segmentsCount,
      })
    );

    return {
      fullText,
      segments,
      speakers,
      language: transcript.language_code || "en",
      confidence: transcript.confidence || 0,
      wordCount,
      durationSeconds: transcript.audio_duration || 0,
    };
  }
}
