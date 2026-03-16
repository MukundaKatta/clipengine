import type { Platform, BrandProfile, PlatformGuideline } from "@clipengine/supabase";

export interface RepurposeInput {
  content: string;
  sourceType: "transcript" | "article" | "text";
  title?: string;
  additionalContext?: string;
  targetLength?: "short" | "medium" | "long";
}

export interface RepurposeResult<T = unknown> {
  platform: Platform;
  outputType: string;
  content: string;
  structuredContent: T;
  tokenUsage: number;
  model: string;
  imageUrls?: string[];
}

export interface BrandVoiceContext {
  voiceDescription: string;
  toneAttributes: string[];
  vocabularyPreferences: {
    preferredWords: string[];
    avoidedWords: string[];
    formalityLevel: string;
  };
  platformGuidelines?: Partial<Record<Platform, PlatformGuideline>>;
}

export interface RepurposeAllOptions {
  platforms: Platform[];
  brandVoice?: BrandVoiceContext;
  additionalContext?: string;
  onProgress?: (platform: Platform, status: "started" | "completed" | "failed", error?: string) => void;
}

export interface RepurposeAllResult {
  results: Map<Platform, RepurposeResult>;
  failures: Map<Platform, Error>;
  totalTokenUsage: number;
}
