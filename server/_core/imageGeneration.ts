/**
 * Image generation helper using OpenAI DALL-E 3
 * Includes retry logic for transient failures
 *
 * Example usage:
 *   const { url: imageUrl } = await generateImage({
 *     prompt: "A serene landscape with mountains"
 *   });
 */
import { storagePut } from "../storage";
import https from "https";

export type GenerateImageOptions = {
  prompt: string;
  originalImages?: Array<{
    url?: string;
    b64Json?: string;
    mimeType?: string;
  }>;
};

export type GenerateImageResponse = {
  url?: string;
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve(Buffer.concat(chunks)));
      response.on("error", reject);
    }).on("error", reject);
  });
}

async function callDallEWithRetry(
  apiKey: string,
  prompt: string,
  retryCount: number = 0,
): Promise<{ data: Array<{ url: string }> }> {
  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        style: "natural",
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      const statusCode = response.status;

      // Retry on 5xx errors (server errors) and 429 (rate limit)
      if ((statusCode >= 500 || statusCode === 429) && retryCount < MAX_RETRIES) {
        const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount); // Exponential backoff
        console.warn(
          `DALL-E API error (${statusCode}). Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
        );
        await sleep(delayMs);
        return callDallEWithRetry(apiKey, prompt, retryCount + 1);
      }

      throw new Error(
        `OpenAI image generation failed (${statusCode} ${response.statusText})${detail ? `: ${detail}` : ""}`,
      );
    }

    const result = (await response.json()) as {
      data: Array<{
        url: string;
      }>;
    };

    if (!result.data || result.data.length === 0) {
      throw new Error("OpenAI returned no images");
    }

    return result;
  } catch (error) {
    // Retry on network errors
    if (retryCount < MAX_RETRIES && error instanceof Error) {
      const delayMs = RETRY_DELAY_MS * Math.pow(2, retryCount);
      console.warn(
        `DALL-E API error: ${error.message}. Retrying in ${delayMs}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`,
      );
      await sleep(delayMs);
      return callDallEWithRetry(apiKey, prompt, retryCount + 1);
    }
    throw error;
  }
}

export async function generateImage(options: GenerateImageOptions): Promise<GenerateImageResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  try {
    // Call OpenAI DALL-E 3 API with retry logic
    const result = await callDallEWithRetry(apiKey, options.prompt);

    // Download the generated image
    const imageUrl = result.data[0].url;
    const imageBuffer = await downloadImage(imageUrl);

    // Save to Supabase Storage
    const { url } = await storagePut(`generated/${Date.now()}.png`, imageBuffer, "image/png");
    return {
      url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Image generation failed: ${errorMessage}`);
    throw error;
  }
}
