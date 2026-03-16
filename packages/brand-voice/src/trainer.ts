import Anthropic from "@anthropic-ai/sdk";
import type { BrandProfile, VocabularyPreferences, Platform, PlatformGuideline } from "@clipengine/supabase";

export interface TrainingInput {
  sampleContent: string[];
  brandDescription?: string;
  targetPlatforms?: Platform[];
  existingProfile?: Partial<BrandProfile>;
}

export interface VoiceAnalysis {
  voiceDescription: string;
  toneAttributes: string[];
  vocabularyPreferences: VocabularyPreferences;
  writingPatterns: WritingPatterns;
  platformGuidelines: Partial<Record<Platform, PlatformGuideline>>;
  confidence: number;
}

export interface WritingPatterns {
  averageSentenceLength: number;
  paragraphStyle: string;
  punctuationHabits: string[];
  rhetoricalDevices: string[];
  openingPatterns: string[];
  closingPatterns: string[];
  transitionPhrases: string[];
}

export interface VoiceComparisonResult {
  similarityScore: number;
  matchingAttributes: string[];
  divergingAttributes: string[];
  suggestions: string[];
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

/**
 * Analyze sample content to learn a brand's voice characteristics.
 * This is the core training function that produces a voice profile.
 */
export async function trainBrandVoice(
  input: TrainingInput
): Promise<VoiceAnalysis> {
  const anthropic = getClient();

  if (input.sampleContent.length < 1) {
    throw new Error("At least 1 content sample is required for voice training");
  }

  const samplesText = input.sampleContent
    .map((s, i) => `--- SAMPLE ${i + 1} ---\n${s}`)
    .join("\n\n");

  const prompt = `You are a brand voice analyst. Analyze the following content samples to extract a comprehensive brand voice profile.

${input.brandDescription ? `Brand context: ${input.brandDescription}\n` : ""}

CONTENT SAMPLES:
${samplesText}

Analyze these samples deeply and provide:

1. **Voice Description**: A 2-3 sentence description of how this brand/person writes. What makes their voice distinctive?

2. **Tone Attributes**: 5-8 adjective pairs or single adjectives that describe the tone (e.g., "confident but approachable", "witty", "authoritative")

3. **Vocabulary Preferences**:
   - Words/phrases they frequently use (preferred_words)
   - Words/phrases they seem to avoid (avoided_words)
   - Industry-specific jargon they use (industry_jargon)
   - Formality level: casual, conversational, professional, or formal

4. **Writing Patterns**:
   - Average sentence length (short/medium/long)
   - Paragraph style (brief punchy paragraphs, detailed long-form, mixed)
   - Punctuation habits (em dashes, ellipses, exclamation marks, etc.)
   - Rhetorical devices used (questions, analogies, lists, stories, etc.)
   - Common opening patterns (how they start pieces)
   - Common closing patterns (how they end pieces)
   - Transition phrases they use

5. **Platform Guidelines**: For each of these platforms [${(input.targetPlatforms || ["twitter", "linkedin", "instagram"]).join(", ")}], suggest:
   - max_length (characters)
   - hashtag_strategy
   - emoji_usage (none/minimal/moderate/heavy)
   - cta_style (what kind of calls-to-action fit this voice)
   - additional_notes

6. **Confidence Score**: 0-1 indicating how confident you are in this analysis (more samples = higher confidence)

Respond with ONLY valid JSON (no code fences):
{
  "voiceDescription": "...",
  "toneAttributes": ["..."],
  "vocabularyPreferences": {
    "preferred_words": ["..."],
    "avoided_words": ["..."],
    "industry_jargon": ["..."],
    "formality_level": "conversational"
  },
  "writingPatterns": {
    "averageSentenceLength": 15,
    "paragraphStyle": "...",
    "punctuationHabits": ["..."],
    "rhetoricalDevices": ["..."],
    "openingPatterns": ["..."],
    "closingPatterns": ["..."],
    "transitionPhrases": ["..."]
  },
  "platformGuidelines": {
    "twitter": {
      "max_length": 280,
      "hashtag_strategy": "...",
      "emoji_usage": "minimal",
      "cta_style": "...",
      "additional_notes": "..."
    }
  },
  "confidence": 0.85
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent) throw new Error("No text response from Claude");

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    return JSON.parse(jsonStr) as VoiceAnalysis;
  } catch (e) {
    throw new Error(`Failed to parse voice analysis: ${(e as Error).message}`);
  }
}

/**
 * Refine an existing brand voice profile with new samples.
 * Merges new analysis with existing profile data.
 */
export async function refineBrandVoice(
  existingAnalysis: VoiceAnalysis,
  newSamples: string[]
): Promise<VoiceAnalysis> {
  const anthropic = getClient();

  const samplesText = newSamples
    .map((s, i) => `--- NEW SAMPLE ${i + 1} ---\n${s}`)
    .join("\n\n");

  const prompt = `You previously analyzed a brand's voice and produced this profile:

${JSON.stringify(existingAnalysis, null, 2)}

Now analyze these additional content samples and REFINE the voice profile. Update, expand, or correct any attributes based on the new evidence.

NEW SAMPLES:
${samplesText}

Return the complete updated voice profile in the same JSON format. Increase confidence if the new samples confirm existing patterns, decrease if they contradict.

Respond with ONLY valid JSON (no code fences).`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    temperature: 0.4,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent) throw new Error("No text response from Claude");

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr) as VoiceAnalysis;
}

/**
 * Compare generated content against the brand voice profile
 * to score voice consistency.
 */
export async function compareVoiceConsistency(
  generatedContent: string,
  voiceProfile: VoiceAnalysis
): Promise<VoiceComparisonResult> {
  const anthropic = getClient();

  const prompt = `Compare this generated content against the brand voice profile and score its consistency.

BRAND VOICE PROFILE:
${JSON.stringify(voiceProfile, null, 2)}

GENERATED CONTENT:
---
${generatedContent}
---

Score the voice consistency and provide actionable feedback.

Respond with ONLY valid JSON:
{
  "similarityScore": 0.85,
  "matchingAttributes": ["attribute that matches the voice profile"],
  "divergingAttributes": ["attribute that doesn't match"],
  "suggestions": ["specific suggestion to improve voice consistency"]
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    temperature: 0.3,
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent) throw new Error("No text response from Claude");

  let jsonStr = textContent.text.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonStr) as VoiceComparisonResult;
}

/**
 * Convert a VoiceAnalysis to the BrandVoiceContext expected by the repurposer.
 */
export function analysisToVoiceContext(
  analysis: VoiceAnalysis
): {
  voiceDescription: string;
  toneAttributes: string[];
  vocabularyPreferences: {
    preferredWords: string[];
    avoidedWords: string[];
    formalityLevel: string;
  };
  platformGuidelines?: Partial<Record<Platform, PlatformGuideline>>;
} {
  return {
    voiceDescription: analysis.voiceDescription,
    toneAttributes: analysis.toneAttributes,
    vocabularyPreferences: {
      preferredWords: analysis.vocabularyPreferences.preferred_words,
      avoidedWords: analysis.vocabularyPreferences.avoided_words,
      formalityLevel: analysis.vocabularyPreferences.formality_level,
    },
    platformGuidelines: analysis.platformGuidelines,
  };
}
