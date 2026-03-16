import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface VideoSegment {
  narration: string;
  visual: string;
  onScreenText: string;
  durationSeconds: number;
}

export interface YouTubeShortsScript {
  hook: string;
  scriptSegments: VideoSegment[];
  cta: string;
  totalDurationSeconds: number;
  title: string;
  description: string;
  tags: string[];
}

export async function generateYouTubeShortsScript(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<YouTubeShortsScript>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.youtube_shorts;

  const prompt = `Transform the following content into a YouTube Shorts script (30-60 seconds).

RULES:
- Total duration: 30-60 seconds when spoken naturally
- HOOK (first 3 seconds): Must immediately grab attention — question, shocking fact, or bold statement
- Each segment should include:
  - Narration (what the speaker says)
  - Visual direction (what's shown on screen / B-roll)
  - On-screen text overlay
  - Approximate duration in seconds
- Use conversational, energetic tone — like talking to a friend
- Build tension/curiosity throughout
- End with a clear CTA (subscribe, like, comment) OR a cliffhanger
- Pacing should be fast — no filler words
- Include title, description, and tags for the Short
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "hook": "the opening 3-second hook",
  "scriptSegments": [
    {
      "narration": "what the speaker says",
      "visual": "camera/B-roll direction",
      "onScreenText": "text overlay on screen",
      "durationSeconds": 5
    }
  ],
  "cta": "closing call-to-action",
  "totalDurationSeconds": 45,
  "title": "YouTube Shorts title (under 100 chars)",
  "description": "short description",
  "tags": ["tag1", "tag2"]
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<YouTubeShortsScript>(prompt, {
    maxTokens: 2048,
    temperature: 0.7,
  });

  // Calculate actual total duration
  data.totalDurationSeconds = data.scriptSegments.reduce(
    (sum, seg) => sum + seg.durationSeconds,
    0
  );

  // Build readable script format
  const scriptLines = [
    `TITLE: ${data.title}`,
    `TOTAL DURATION: ${data.totalDurationSeconds}s`,
    "",
    `[HOOK - 3s]`,
    data.hook,
    "",
    ...data.scriptSegments.map(
      (seg, i) =>
        `[SEGMENT ${i + 1} - ${seg.durationSeconds}s]\n` +
        `🎙️ ${seg.narration}\n` +
        `📹 ${seg.visual}\n` +
        `📝 ${seg.onScreenText}`
    ),
    "",
    `[CTA]`,
    data.cta,
  ];

  return {
    platform: "youtube_shorts",
    outputType: "script",
    content: scriptLines.join("\n"),
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateMultipleShortsIdeas(
  input: RepurposeInput,
  count: number = 5
): Promise<RepurposeResult<{
  ideas: Array<{
    title: string;
    hook: string;
    angle: string;
    estimatedViralScore: number;
  }>;
}>> {
  const prompt = `From this content, generate ${count} YouTube Shorts ideas. Each should have a different angle.

RULES:
- Each idea needs a unique hook/angle from the same source material
- Rate each idea's viral potential from 1-10
- Focus on curiosity gaps, surprising facts, contrarian takes, and emotional triggers

SOURCE CONTENT:
---
${input.content}
---

Respond with JSON:
{
  "ideas": [
    {
      "title": "short catchy title",
      "hook": "the opening line",
      "angle": "brief description of the angle",
      "estimatedViralScore": 8
    }
  ]
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    ideas: Array<{
      title: string;
      hook: string;
      angle: string;
      estimatedViralScore: number;
    }>;
  }>(prompt, { maxTokens: 2048 });

  return {
    platform: "youtube_shorts",
    outputType: "ideas",
    content: data.ideas
      .map((i) => `[${i.estimatedViralScore}/10] ${i.title}\nHook: ${i.hook}\nAngle: ${i.angle}`)
      .join("\n\n"),
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
