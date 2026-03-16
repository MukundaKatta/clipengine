import Anthropic from "@anthropic-ai/sdk";

export interface ClaudeGenerationOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface ClaudeResponse {
  content: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  model: string;
}

const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const DEFAULT_MAX_TOKENS = 4096;

let clientInstance: Anthropic | null = null;

function getClient(apiKey?: string): Anthropic {
  if (!clientInstance) {
    clientInstance = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }
  return clientInstance;
}

export async function generateWithClaude(
  prompt: string,
  options: ClaudeGenerationOptions = {}
): Promise<ClaudeResponse> {
  const client = getClient();
  const model = options.model || DEFAULT_MODEL;

  const response = await client.messages.create({
    model,
    max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
    temperature: options.temperature ?? 0.7,
    system: options.systemPrompt || buildSystemPrompt(),
    messages: [{ role: "user", content: prompt }],
  });

  const textContent = response.content.find((c) => c.type === "text");
  const content = textContent?.text || "";

  return {
    content,
    tokenUsage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
      total: response.usage.input_tokens + response.usage.output_tokens,
    },
    model,
  };
}

export async function generateJsonWithClaude<T>(
  prompt: string,
  options: ClaudeGenerationOptions = {}
): Promise<{ data: T; tokenUsage: ClaudeResponse["tokenUsage"]; model: string }> {
  const systemPrompt =
    (options.systemPrompt || buildSystemPrompt()) +
    "\n\nYou MUST respond with valid JSON only. No markdown code fences, no extra text. Just the JSON object.";

  const response = await generateWithClaude(prompt, {
    ...options,
    systemPrompt,
    temperature: options.temperature ?? 0.5,
  });

  // Strip any markdown fences if Claude adds them
  let jsonStr = response.content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const data = JSON.parse(jsonStr) as T;
    return { data, tokenUsage: response.tokenUsage, model: response.model };
  } catch (e) {
    throw new Error(
      `Failed to parse Claude JSON response: ${(e as Error).message}\nRaw response: ${jsonStr.slice(0, 500)}`
    );
  }
}

function buildSystemPrompt(): string {
  return `You are ClipEngine, an expert content repurposing AI. Your job is to transform long-form content (podcast transcripts, videos, articles) into platform-specific derivative content.

Key principles:
- Preserve the original message and key insights
- Adapt tone, format, and length for each platform
- Create content that feels native to each platform, not just shortened versions
- Focus on hooks, value delivery, and clear CTAs
- Maintain the speaker's voice and perspective
- Optimize for engagement on each specific platform`;
}

export function buildBrandVoicePrompt(brandVoice: {
  voiceDescription: string;
  toneAttributes: string[];
  vocabularyPreferences: {
    preferredWords: string[];
    avoidedWords: string[];
    formalityLevel: string;
  };
}): string {
  const parts: string[] = [
    `\n\nBrand Voice Guidelines:`,
    `Voice: ${brandVoice.voiceDescription}`,
    `Tone: ${brandVoice.toneAttributes.join(", ")}`,
    `Formality: ${brandVoice.vocabularyPreferences.formalityLevel}`,
  ];

  if (brandVoice.vocabularyPreferences.preferredWords.length > 0) {
    parts.push(
      `Preferred vocabulary: ${brandVoice.vocabularyPreferences.preferredWords.join(", ")}`
    );
  }

  if (brandVoice.vocabularyPreferences.avoidedWords.length > 0) {
    parts.push(
      `Avoid these words/phrases: ${brandVoice.vocabularyPreferences.avoidedWords.join(", ")}`
    );
  }

  return parts.join("\n");
}
