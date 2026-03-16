import type { Platform } from "@clipengine/supabase";
import type {
  RepurposeInput,
  RepurposeResult,
  RepurposeAllOptions,
  RepurposeAllResult,
  BrandVoiceContext,
} from "./types";

import { generateTwitterThread, generateSingleTweet } from "./twitter-thread";
import { generateLinkedInPost, generateLinkedInArticle } from "./linkedin-post";
import { generateInstagramCarousel, generateInstagramCaption } from "./instagram-carousel";
import { generateYouTubeShortsScript, generateMultipleShortsIdeas } from "./youtube-shorts";
import { generateNewsletterSegment, generateNewsletterSubjectLines } from "./newsletter";
import { generateBlogPost, generateBlogOutline } from "./blog-post";
import { extractQuoteGraphics, renderQuoteImage, renderAllQuoteImages } from "./quote-graphics";

export * from "./types";
export * from "./claude-client";
export * from "./twitter-thread";
export * from "./linkedin-post";
export * from "./instagram-carousel";
export * from "./youtube-shorts";
export * from "./newsletter";
export * from "./blog-post";
export * from "./quote-graphics";

// Platform-to-generator mapping for the primary output type per platform
const platformGenerators: Record<
  Platform,
  (input: RepurposeInput, brandVoice?: BrandVoiceContext) => Promise<RepurposeResult>
> = {
  twitter: generateTwitterThread,
  linkedin: generateLinkedInPost,
  instagram: generateInstagramCarousel,
  youtube_shorts: generateYouTubeShortsScript,
  newsletter: generateNewsletterSegment,
  blog: generateBlogPost,
  quote_graphic: extractQuoteGraphics,
};

/**
 * Generate content for a single platform.
 */
export async function repurposeForPlatform(
  platform: Platform,
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult> {
  const generator = platformGenerators[platform];
  if (!generator) {
    throw new Error(`No generator found for platform: ${platform}`);
  }
  return generator(input, brandVoice);
}

/**
 * Generate content for multiple platforms in parallel.
 * Uses Promise.allSettled to handle partial failures gracefully.
 */
export async function repurposeForAllPlatforms(
  input: RepurposeInput,
  options: RepurposeAllOptions
): Promise<RepurposeAllResult> {
  const { platforms, brandVoice, onProgress } = options;

  const results = new Map<Platform, RepurposeResult>();
  const failures = new Map<Platform, Error>();
  let totalTokenUsage = 0;

  const tasks = platforms.map(async (platform) => {
    onProgress?.(platform, "started");
    try {
      const result = await repurposeForPlatform(
        platform,
        { ...input, additionalContext: options.additionalContext },
        brandVoice
      );
      results.set(platform, result);
      totalTokenUsage += result.tokenUsage;
      onProgress?.(platform, "completed");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      failures.set(platform, err);
      onProgress?.(platform, "failed", err.message);
    }
  });

  await Promise.allSettled(tasks);

  return { results, failures, totalTokenUsage };
}

/**
 * Get all available output types for a platform.
 */
export function getAvailableOutputTypes(platform: Platform): string[] {
  const types: Record<Platform, string[]> = {
    twitter: ["thread", "single_tweet"],
    linkedin: ["post", "article"],
    instagram: ["carousel", "caption"],
    youtube_shorts: ["script", "ideas"],
    newsletter: ["segment", "subject_lines"],
    blog: ["post", "outline"],
    quote_graphic: ["quotes"],
  };
  return types[platform] || [];
}

/**
 * Generate a specific output type for a platform.
 */
export async function generateSpecificOutput(
  platform: Platform,
  outputType: string,
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult> {
  const generators: Record<string, Record<string, (input: RepurposeInput, brandVoice?: BrandVoiceContext) => Promise<RepurposeResult>>> = {
    twitter: { thread: generateTwitterThread, single_tweet: generateSingleTweet },
    linkedin: { post: generateLinkedInPost, article: generateLinkedInArticle },
    instagram: { carousel: generateInstagramCarousel, caption: generateInstagramCaption },
    youtube_shorts: {
      script: generateYouTubeShortsScript,
      ideas: (input: RepurposeInput) => generateMultipleShortsIdeas(input),
    },
    newsletter: {
      segment: generateNewsletterSegment,
      subject_lines: (input: RepurposeInput) => generateNewsletterSubjectLines(input),
    },
    blog: { post: generateBlogPost, outline: generateBlogOutline },
    quote_graphic: { quotes: extractQuoteGraphics },
  };

  const platformGens = generators[platform];
  if (!platformGens) throw new Error(`Unknown platform: ${platform}`);

  const generator = platformGens[outputType];
  if (!generator) throw new Error(`Unknown output type "${outputType}" for platform "${platform}"`);

  return generator(input, brandVoice);
}
