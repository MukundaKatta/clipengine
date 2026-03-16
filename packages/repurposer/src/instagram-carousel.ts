import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface CarouselSlide {
  slideNumber: number;
  headline: string;
  body: string;
  designNotes: string;
}

export interface InstagramCarousel {
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
  altText: string;
}

export async function generateInstagramCarousel(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<InstagramCarousel>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.instagram;

  const prompt = `Transform the following content into an Instagram carousel post.

RULES:
- Slide 1: Eye-catching title/hook that makes people swipe. Keep it to 5-8 words max.
- Slides 2-8: One key point per slide. Headline + 1-2 supporting sentences.
- Final slide: Summary or key takeaway + clear CTA ("Save this post", "Follow for more", "Share with someone who needs this")
- Total: 7-10 slides
- Keep text MINIMAL on each slide — it needs to be readable on a phone
- Headlines: 3-6 words
- Body text: Max 2 short sentences
- Include design direction for each slide (colors, imagery, layout)
- Write a full Instagram caption (with line breaks, emojis tastefully used, and hashtags)
- Alt text for accessibility
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "slides": [
    {
      "slideNumber": 1,
      "headline": "...",
      "body": "...",
      "designNotes": "suggested colors, imagery, layout"
    }
  ],
  "caption": "full instagram caption with \\n line breaks",
  "hashtags": ["hashtag1", "hashtag2"],
  "altText": "accessible description of the carousel"
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<InstagramCarousel>(prompt, {
    maxTokens: 3072,
    temperature: 0.7,
  });

  // Build readable content from slides
  const slidesText = data.slides
    .map((s) => `[Slide ${s.slideNumber}]\n${s.headline}\n${s.body}`)
    .join("\n\n");

  return {
    platform: "instagram",
    outputType: "carousel",
    content: `${slidesText}\n\n---\nCaption:\n${data.caption}\n\nHashtags: ${data.hashtags.map((h) => `#${h}`).join(" ")}`,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateInstagramCaption(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<{
  caption: string;
  hashtags: string[];
  hookLine: string;
}>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";

  const prompt = `Create an Instagram caption from this content.

RULES:
- Start with a hook line that grabs attention
- Use short paragraphs with line breaks
- Include a CTA
- 150-2200 characters (sweet spot: 500-1000)
- 20-30 relevant hashtags (mix of broad and niche)
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

Respond with JSON:
{
  "caption": "the full caption",
  "hashtags": ["hashtag1", ...],
  "hookLine": "the opening hook"
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    caption: string;
    hashtags: string[];
    hookLine: string;
  }>(prompt, { maxTokens: 1024 });

  return {
    platform: "instagram",
    outputType: "caption",
    content: data.caption,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
