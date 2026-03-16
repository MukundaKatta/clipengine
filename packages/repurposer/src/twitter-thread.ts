import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface TwitterThread {
  tweets: string[];
  hashtags: string[];
  estimatedReach: string;
}

export async function generateTwitterThread(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<TwitterThread>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";
  const platformGuidelines = brandVoice?.platformGuidelines?.twitter;

  const prompt = `Transform the following content into an engaging Twitter/X thread.

RULES:
- First tweet MUST be a powerful hook that stops the scroll (question, bold claim, or surprising stat)
- Each tweet MUST be under 280 characters
- Use line breaks within tweets for readability
- Include a strong CTA in the final tweet (follow, retweet, save, link)
- Aim for 5-10 tweets total
- No hashtags inside tweet body, only suggest hashtags separately
- Use "→" bullets or numbered lists for structured points
- Each tweet should deliver standalone value while contributing to the thread narrative
- Use natural transitions between tweets (don't number them in the text)
${platformGuidelines ? `\nPlatform-specific notes: ${JSON.stringify(platformGuidelines)}` : ""}
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Additional context: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "tweets": ["tweet1 text", "tweet2 text", ...],
  "hashtags": ["hashtag1", "hashtag2", ...],
  "estimatedReach": "brief note on expected engagement"
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<TwitterThread>(prompt, {
    maxTokens: 2048,
    temperature: 0.7,
  });

  // Validate tweet lengths
  const validatedTweets = data.tweets.map((tweet) => {
    if (tweet.length > 280) {
      // Truncate at last sentence boundary within limit
      const truncated = tweet.slice(0, 277);
      const lastPeriod = truncated.lastIndexOf(".");
      const lastNewline = truncated.lastIndexOf("\n");
      const breakPoint = Math.max(lastPeriod, lastNewline);
      return breakPoint > 200 ? tweet.slice(0, breakPoint + 1) : truncated + "...";
    }
    return tweet;
  });

  return {
    platform: "twitter",
    outputType: "thread",
    content: validatedTweets.join("\n\n---\n\n"),
    structuredContent: { ...data, tweets: validatedTweets },
    tokenUsage: tokenUsage.total,
    model,
  };
}

export async function generateSingleTweet(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext
): Promise<RepurposeResult<{ tweet: string; hashtags: string[] }>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";

  const prompt = `Create a single high-impact tweet from this content.

RULES:
- Must be under 280 characters
- Start with a hook (question, bold statement, or contrarian take)
- Deliver one key insight
- End with engagement driver (question or CTA)
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

Respond with JSON: { "tweet": "...", "hashtags": ["..."] }`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<{
    tweet: string;
    hashtags: string[];
  }>(prompt, { maxTokens: 512 });

  return {
    platform: "twitter",
    outputType: "single_tweet",
    content: data.tweet,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}
