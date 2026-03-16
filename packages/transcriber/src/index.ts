import { WhisperProvider } from "./whisper";
import { AssemblyAIProvider } from "./assemblyai";
import type {
  TranscriberProvider,
  TranscriptionInput,
  TranscriptionResult,
  TranscribeOptions,
} from "./types";

export * from "./types";
export { WhisperProvider } from "./whisper";
export { AssemblyAIProvider } from "./assemblyai";

/**
 * Main transcription service that delegates to the appropriate provider.
 *
 * Auto-selects provider based on:
 * - File size: Whisper has 25MB limit, AssemblyAI handles larger files
 * - Speaker diarization: AssemblyAI is preferred for multi-speaker content
 * - Explicit provider selection via options
 */
export class TranscriptionService {
  private whisper: WhisperProvider;
  private assemblyai: AssemblyAIProvider;

  constructor(config?: {
    openaiApiKey?: string;
    assemblyaiApiKey?: string;
  }) {
    this.whisper = new WhisperProvider(config?.openaiApiKey);
    this.assemblyai = new AssemblyAIProvider(config?.assemblyaiApiKey);
  }

  async transcribe(
    input: TranscriptionInput,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult & { provider: "whisper" | "assemblyai" }> {
    const provider = this.selectProvider(input, options);
    const providerInstance = this.getProvider(provider);
    const result = await providerInstance.transcribe(input, options);

    return { ...result, provider };
  }

  async transcribeFromUrl(
    url: string,
    options?: TranscribeOptions
  ): Promise<TranscriptionResult & { provider: "whisper" | "assemblyai" }> {
    // For URLs, prefer AssemblyAI as it handles them natively without download
    const provider = options?.provider || "assemblyai";
    const providerInstance = this.getProvider(provider);
    const result = await providerInstance.transcribeFromUrl(url, options);

    return { ...result, provider };
  }

  /**
   * Estimate the cost of transcription based on audio duration.
   */
  estimateCost(
    durationSeconds: number,
    provider: "whisper" | "assemblyai"
  ): { usd: number; credits: number } {
    const durationMinutes = Math.ceil(durationSeconds / 60);

    if (provider === "whisper") {
      // Whisper: $0.006 per minute
      return {
        usd: durationMinutes * 0.006,
        credits: Math.ceil(durationMinutes * 0.5),
      };
    }

    // AssemblyAI: ~$0.0042 per second (~$0.25/minute) for async
    return {
      usd: durationSeconds * 0.0042,
      credits: Math.ceil(durationMinutes * 2),
    };
  }

  private selectProvider(
    input: TranscriptionInput,
    options?: TranscribeOptions
  ): "whisper" | "assemblyai" {
    // Explicit provider selection
    if (options?.provider) return options.provider;

    // If speaker diarization is requested, use AssemblyAI
    if (options?.speakerDiarization) return "assemblyai";

    // If input is a file buffer, check size for Whisper limit
    if (input.type === "file" && input.data.length > 25 * 1024 * 1024) {
      return "assemblyai";
    }

    // If input is a URL, AssemblyAI handles it natively
    if (input.type === "url") return "assemblyai";

    // Default to Whisper for smaller files (faster, cheaper)
    return "whisper";
  }

  private getProvider(provider: "whisper" | "assemblyai"): TranscriberProvider {
    return provider === "whisper" ? this.whisper : this.assemblyai;
  }
}
