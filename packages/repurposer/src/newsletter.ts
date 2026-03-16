import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface NewsletterTakeaway {
  title: string;
  explanation: string;
}

export interface NewsletterSegment {
  subjectLine: string;
  previewText: string;
  tldr: string;
  intro: string;
  takeaways: NewsletterTakeaway[];
  closing: string;
  fullHtml: string;
  wordCount: number;
}

export async function generateNewsletterSegment(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<NewsletterSegment>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.newsletter;

  const prompt = `Transform the following content into a newsletter segment.

RULES:
- Compelling subject line (under 50 chars, creates curiosity/urgency)
- Preview text (under 100 chars, complements the subject line)
- TLDR at the top (2-3 sentences summarizing the key value)
- Opening that connects to reader pain points or aspirations
- 3-5 key takeaways with brief, actionable explanations
- Each takeaway should be something they can implement TODAY
- Conversational but professional tone — like an email from a smart friend
- Closing with a personal note or forward-looking statement
- 400-600 words total
- Include basic HTML formatting for the full email body
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "subjectLine": "...",
  "previewText": "...",
  "tldr": "...",
  "intro": "...",
  "takeaways": [
    { "title": "...", "explanation": "..." }
  ],
  "closing": "...",
  "fullHtml": "formatted HTML of the complete newsletter segment",
  "wordCount": 500
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<NewsletterSegment>(prompt, {
    maxTokens: 3072,
    temperature: 0.6,
  });

  // Build plain text version
  const plainText = [
    `Subject: ${data.subjectLine}`,
    "",
    `TLDR: ${data.tldr}`,
    "",
    data.intro,
    "",
    ...data.takeaways.map((t) => `**${t.title}**\n${t.explanation}`),
    "",
    data.closing,
  ].join("\n\n");

  return {
    platform: "newsletter",
    outputType: "segment",
    content: plainText,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateNewsletterSubjectLines(
  input: RepurposeInput,
  count: number = 10
): Promise<RepurposeResult<{
  subjectLines: Array<{
    text: string;
    strategy: string;
    estimatedOpenRate: string;
  }>;
}>> {
  const prompt = `Generate ${count} email subject lines for a newsletter featuring this content.

RULES:
- Under 50 characters each
- Mix of strategies: curiosity gap, numbers/lists, urgency, personal, question
- Label the strategy used for each
- Estimate relative open rate (low/medium/high)
- Avoid spam trigger words (free, urgent, act now)

SOURCE CONTENT:
---
${input.content.slice(0, 2000)}
---

Respond with JSON:
{
  "subjectLines": [
    { "text": "...", "strategy": "curiosity gap", "estimatedOpenRate": "high" }
  ]
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    subjectLines: Array<{
      text: string;
      strategy: string;
      estimatedOpenRate: string;
    }>;
  }>(prompt, { maxTokens: 1024 });

  return {
    platform: "newsletter",
    outputType: "subject_lines",
    content: data.subjectLines
      .map((s) => `[${s.estimatedOpenRate}] ${s.text} (${s.strategy})`)
      .join("\n"),
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
