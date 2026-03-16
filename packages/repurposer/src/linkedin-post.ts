import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface LinkedInPost {
  hook: string;
  body: string;
  cta: string;
  hashtags: string[];
  fullPost: string;
}

export async function generateLinkedInPost(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<LinkedInPost>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.linkedin;

  const prompt = `Transform the following content into a high-performing LinkedIn post.

RULES:
- First line MUST be a bold, attention-grabbing hook (this shows in preview before "see more")
- Use short paragraphs (1-2 sentences max)
- Add blank lines between paragraphs for mobile readability
- Include a personal insight, opinion, or storytelling angle — don't just summarize
- Use "→" or "•" for bullet points when listing items
- End with a question or CTA to drive comments and engagement
- Keep total length between 1200-3000 characters (sweet spot for LinkedIn algorithm)
- Add 3-5 relevant hashtags at the very end
- DO NOT start with "I" — start with the insight
- Include a pattern interrupt midway through (bold statement, statistic, or question)
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "hook": "the opening line/hook",
  "body": "the main body with proper line breaks (use \\n for line breaks)",
  "cta": "the closing call-to-action line",
  "hashtags": ["hashtag1", "hashtag2"],
  "fullPost": "the complete post as it should appear, with all formatting"
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<LinkedInPost>(prompt, {
    maxTokens: 2048,
    temperature: 0.7,
  });

  // Validate length
  if (data.fullPost.length > 3000) {
    data.fullPost = data.fullPost.slice(0, 2997) + "...";
  }

  return {
    platform: "linkedin",
    outputType: "post",
    content: data.fullPost,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateLinkedInArticle(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<{
  title: string;
  subtitle: string;
  body: string;
  keyTakeaways: string[];
}>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";

  const prompt = `Transform this content into a LinkedIn article (long-form).

RULES:
- Compelling title (under 100 chars)
- Subtitle that expands on the title
- Professional but conversational tone
- Use H2 headers (## in markdown) to structure sections
- 800-1500 words
- Include real examples and actionable insights
- End with 3-5 key takeaways
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

Respond with JSON:
{
  "title": "...",
  "subtitle": "...",
  "body": "full article body in markdown",
  "keyTakeaways": ["takeaway1", "takeaway2"]
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    title: string;
    subtitle: string;
    body: string;
    keyTakeaways: string[];
  }>(prompt, { maxTokens: 4096, temperature: 0.6 });

  return {
    platform: "linkedin",
    outputType: "article",
    content: `# ${data.title}\n\n*${data.subtitle}*\n\n${data.body}`,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
