import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface BlogSection {
  heading: string;
  level: number;
  content: string;
}

export interface BlogPost {
  title: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
  intro: string;
  sections: BlogSection[];
  takeaways: string[];
  cta: string;
  estimatedReadTime: number;
  wordCount: number;
  fullMarkdown: string;
}

export async function generateBlogPost(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<BlogPost>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.blog;

  const prompt = `Transform the following content into a comprehensive, SEO-optimized blog post.

RULES:
- SEO-optimized title (under 60 characters, includes primary keyword)
- Meta description (under 160 characters, compelling, includes keyword)
- URL-friendly slug
- 5 target keywords (1 primary, 4 secondary)
- Introduction: hook + context + preview of what they'll learn (150-200 words)
- 4-6 sections with H2 headers, some with H3 sub-sections
- Each section should be 150-250 words
- Total: 1000-1800 words
- Use formatting: bold for key terms, bullet lists for scanability
- Include data points or examples where possible
- End with "Key Takeaways" section (3-5 bullet points)
- Final CTA paragraph
- Write in markdown format
- Estimated read time based on word count (avg 238 words/min)
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "title": "...",
  "metaDescription": "...",
  "keywords": ["primary keyword", "secondary1", ...],
  "slug": "url-friendly-slug",
  "intro": "introduction paragraph in markdown",
  "sections": [
    { "heading": "Section Title", "level": 2, "content": "markdown content" }
  ],
  "takeaways": ["takeaway 1", "takeaway 2"],
  "cta": "closing CTA paragraph",
  "estimatedReadTime": 7,
  "wordCount": 1500,
  "fullMarkdown": "the complete blog post in markdown"
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<BlogPost>(prompt, {
    maxTokens: 8192,
    temperature: 0.6,
  });

  // Calculate actual read time if not provided accurately
  const actualWordCount = data.fullMarkdown.split(/\s+/).filter(Boolean).length;
  data.wordCount = actualWordCount;
  data.estimatedReadTime = Math.ceil(actualWordCount / 238);

  return {
    platform: "blog",
    outputType: "post",
    content: data.fullMarkdown,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateBlogOutline(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<{
  title: string;
  targetKeyword: string;
  outline: Array<{
    heading: string;
    level: number;
    bulletPoints: string[];
    estimatedWords: number;
  }>;
  totalEstimatedWords: number;
}>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";

  const prompt = `Create a detailed blog post outline from this content.

RULES:
- SEO-focused title and target keyword
- 5-8 sections with H2/H3 structure
- 3-5 bullet points per section showing what to cover
- Estimated word count per section
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

Respond with JSON:
{
  "title": "...",
  "targetKeyword": "...",
  "outline": [
    { "heading": "...", "level": 2, "bulletPoints": ["..."], "estimatedWords": 200 }
  ],
  "totalEstimatedWords": 1500
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    title: string;
    targetKeyword: string;
    outline: Array<{
      heading: string;
      level: number;
      bulletPoints: string[];
      estimatedWords: number;
    }>;
    totalEstimatedWords: number;
  }>(prompt, { maxTokens: 2048 });

  const outlineText = data.outline
    .map(
      (s) =>
        `${"#".repeat(s.level)} ${s.heading} (~${s.estimatedWords} words)\n` +
        s.bulletPoints.map((b) => `  - ${b}`).join("\n")
    )
    .join("\n\n");

  return {
    platform: "blog",
    outputType: "outline",
    content: `# ${data.title}\nKeyword: ${data.targetKeyword}\n\n${outlineText}`,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
