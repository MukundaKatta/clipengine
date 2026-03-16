import { generateJsonWithClaude, buildBrandVoicePrompt } from "./claude-client";
import type { RepurposeInput, RepurposeResult, BrandVoiceContext } from "./types";

export interface QuoteGraphic {
  text: string;
  attribution: string;
  theme: string;
  backgroundColor: string;
  textColor: string;
  fontSize: "small" | "medium" | "large";
}

export interface QuoteGraphicsResult {
  quotes: QuoteGraphic[];
}

export async function extractQuoteGraphics(
  input: RepurposeInput,
  brandVoice?: BrandVoiceContext,
  count: number = 5
): Promise<RepurposeResult<QuoteGraphicsResult>> {
  const brandContext = brandVoice ? buildBrandVoicePrompt(brandVoice) : "";

  const prompt = `Extract the ${count} most impactful, shareable quotes from the following content for use as quote graphics.

RULES:
- Each quote must work as a standalone statement (no context needed)
- Under 150 characters per quote ideally (max 200)
- Quotes should be powerful, insightful, or provocative
- Include speaker/author attribution
- Suggest a visual theme/mood for each (e.g., "bold & minimal", "warm & inspiring")
- Suggest background color (hex) and text color (hex) that match the mood
- Determine font size based on quote length: short (<80 chars) = large, medium (80-120) = medium, long (>120) = small
- Pick diverse quotes — different angles/topics from the content
${brandContext}

SOURCE CONTENT:
---
${input.content}
---

${input.additionalContext ? `Speaker/Author: ${input.additionalContext}` : ""}

Respond with JSON:
{
  "quotes": [
    {
      "text": "The actual quote text",
      "attribution": "Speaker Name",
      "theme": "bold & minimal",
      "backgroundColor": "#1a1a2e",
      "textColor": "#ffffff",
      "fontSize": "large"
    }
  ]
}`;

  const { data, tokenUsage, model } = await generateJsonWithClaude<QuoteGraphicsResult>(prompt, {
    maxTokens: 2048,
    temperature: 0.6,
  });

  const quotesText = data.quotes
    .map(
      (q, i) =>
        `[Quote ${i + 1}]\n"${q.text}"\n— ${q.attribution}\nTheme: ${q.theme} | BG: ${q.backgroundColor} | Text: ${q.textColor}`
    )
    .join("\n\n");

  return {
    platform: "quote_graphic",
    outputType: "quotes",
    content: quotesText,
    structuredContent: data,
    tokenUsage: tokenUsage.total,
    model,
  };
}

/**
 * Generate a quote graphic image using Sharp.
 * Returns a PNG buffer suitable for uploading to Supabase Storage.
 */
export async function renderQuoteImage(
  quote: QuoteGraphic,
  options?: {
    width?: number;
    height?: number;
    fontFamily?: string;
    logoUrl?: string;
  }
): Promise<Buffer> {
  // Dynamic import to avoid requiring sharp at module load
  const sharp = (await import("sharp")).default;

  const width = options?.width || 1080;
  const height = options?.height || 1080;
  const fontFamily = options?.fontFamily || "Arial, Helvetica, sans-serif";

  const fontSizes = { small: 32, medium: 42, large: 56 };
  const fontSize = fontSizes[quote.fontSize];
  const lineHeight = fontSize * 1.4;

  // Word-wrap the quote text
  const words = quote.text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  const maxCharsPerLine = Math.floor((width - 160) / (fontSize * 0.55));

  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharsPerLine) {
      lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = (currentLine + " " + word).trim();
    }
  }
  if (currentLine) lines.push(currentLine.trim());

  const textBlockHeight = lines.length * lineHeight;
  const textStartY = (height - textBlockHeight - 60) / 2;

  // Escape XML special chars
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  const quoteLines = lines
    .map(
      (line, i) =>
        `<text x="${width / 2}" y="${textStartY + i * lineHeight}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="600" fill="${quote.textColor}" text-anchor="middle" dominant-baseline="middle">${esc(line)}</text>`
    )
    .join("\n    ");

  const attributionY = textStartY + textBlockHeight + 40;
  const attributionFontSize = Math.round(fontSize * 0.5);

  const svg = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="${quote.backgroundColor}"/>

  <!-- Decorative quote mark -->
  <text x="80" y="${textStartY - 30}" font-family="Georgia, serif" font-size="120" fill="${quote.textColor}" opacity="0.15">\u201C</text>

  <!-- Quote text -->
  ${quoteLines}

  <!-- Attribution -->
  <text x="${width / 2}" y="${attributionY}" font-family="${fontFamily}" font-size="${attributionFontSize}" fill="${quote.textColor}" text-anchor="middle" opacity="0.7">\u2014 ${esc(quote.attribution)}</text>

  <!-- Bottom accent line -->
  <rect x="${width / 2 - 40}" y="${height - 60}" width="80" height="3" fill="${quote.textColor}" opacity="0.3" rx="1.5"/>
</svg>`;

  const pngBuffer = await sharp(Buffer.from(svg))
    .png({ quality: 90 })
    .toBuffer();

  return pngBuffer;
}

/**
 * Batch render all quotes from an extraction result.
 */
export async function renderAllQuoteImages(
  result: QuoteGraphicsResult,
  options?: {
    width?: number;
    height?: number;
    fontFamily?: string;
  }
): Promise<Array<{ quote: QuoteGraphic; imageBuffer: Buffer }>> {
  const rendered = await Promise.all(
    result.quotes.map(async (quote) => ({
      quote,
      imageBuffer: await renderQuoteImage(quote, options),
    }))
  );

  return rendered;
}
