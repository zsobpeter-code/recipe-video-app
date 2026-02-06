/**
 * TikTok Video Generation Service
 * 
 * Generates a single 10-second TikTok cooking video from a hero image + recipe data.
 * Uses Runway Gen-4 Turbo (image-to-video) with the TikTok Prompt Builder.
 * Stores the final video in Supabase Storage.
 */

import RunwayML from "@runwayml/sdk";
import { buildTikTokVideoPrompt, buildAlternatePrompt, type TikTokPromptInput } from "./tikTokPromptBuilder";
import { storagePut } from "./storage";

// Initialize Runway client
const client = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY,
});

// V2 TikTok video configuration
const TIKTOK_VIDEO_CONFIG = {
  model: "gen4_turbo" as const,
  duration: 10 as const, // 10 seconds for TikTok
  ratio: "720:1280" as const, // 9:16 portrait
  maxWaitMs: 5 * 60 * 1000, // 5 minute timeout
  pollIntervalMs: 5000, // Poll every 5 seconds
};

export interface TikTokVideoResult {
  success: boolean;
  videoUrl?: string;
  prompt?: string;
  error?: string;
  generationTimeMs?: number;
}

/**
 * Download video from URL and return as Buffer
 */
async function downloadVideo(videoUrl: string): Promise<Buffer> {
  console.log(`[TikTok] Downloading video from: ${videoUrl.substring(0, 80)}...`);
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Submit a Runway image-to-video job and wait for completion
 */
async function submitAndWaitForVideo(
  imageUrl: string,
  prompt: string
): Promise<{ videoUrl: string } | null> {
  console.log(`[TikTok] Submitting Runway job...`);
  console.log(`[TikTok] Model: ${TIKTOK_VIDEO_CONFIG.model}`);
  console.log(`[TikTok] Prompt: ${prompt.substring(0, 120)}...`);

  try {
    const task = await client.imageToVideo.create({
      model: TIKTOK_VIDEO_CONFIG.model,
      promptImage: imageUrl,
      promptText: prompt,
      duration: TIKTOK_VIDEO_CONFIG.duration,
      ratio: TIKTOK_VIDEO_CONFIG.ratio,
    }) as any;

    console.log(`[TikTok] Task created: ${task.id}`);

    // Poll for completion
    const startTime = Date.now();
    while (Date.now() - startTime < TIKTOK_VIDEO_CONFIG.maxWaitMs) {
      const status = await client.tasks.retrieve(task.id) as any;
      console.log(`[TikTok] Task ${task.id}: ${status.status} (progress: ${status.progress ?? "N/A"})`);

      if (status.status === "SUCCEEDED") {
        const videoUrl = status.output?.[0];
        if (videoUrl) {
          return { videoUrl };
        }
        console.warn("[TikTok] Task succeeded but no output URL");
        return null;
      }

      if (status.status === "FAILED" || status.status === "CANCELLED") {
        console.error(`[TikTok] Task failed: ${status.failure || "Unknown"}`);
        return null;
      }

      await new Promise(r => setTimeout(r, TIKTOK_VIDEO_CONFIG.pollIntervalMs));
    }

    console.warn("[TikTok] Task timed out");
    return null;
  } catch (error: any) {
    console.error("[TikTok] Runway API error:", error?.message || error);
    return null;
  }
}

/**
 * Basic quality check on generated video
 * For now: just verify the video was generated and is downloadable
 * Future: check duration, black frames, etc.
 */
async function passesQualityCheck(videoUrl: string): Promise<boolean> {
  try {
    // Simple check: can we fetch the video and is it a reasonable size?
    const response = await fetch(videoUrl, { method: "HEAD" });
    if (!response.ok) return false;

    const contentLength = parseInt(response.headers.get("content-length") || "0");
    // A 10-second video should be at least 500KB
    if (contentLength < 500_000) {
      console.warn(`[TikTok] Video too small (${contentLength} bytes), may be corrupted`);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a TikTok cooking video from recipe data and hero image
 * 
 * Pipeline:
 * 1. Build optimized prompt from recipe data
 * 2. Submit to Runway Gen-4.5 (image-to-video, 10s, 9:16)
 * 3. Quality check (auto-regen if below threshold)
 * 4. Store in Supabase Storage
 * 5. Return permanent URL
 */
export async function generateTikTokVideo(
  recipeId: string,
  heroImageUrl: string,
  promptInput: TikTokPromptInput,
  onProgress?: (stage: string) => void
): Promise<TikTokVideoResult> {
  const startTime = Date.now();

  try {
    // Validate hero image URL
    if (!heroImageUrl?.startsWith("https://")) {
      return {
        success: false,
        error: "Hero image must be an HTTPS URL",
      };
    }

    // Stage 1: Build prompt
    onProgress?.("building_prompt");
    const prompt = buildTikTokVideoPrompt(promptInput);
    console.log(`[TikTok] Built prompt (${prompt.length} chars)`);

    // Stage 2: Generate video
    onProgress?.("generating_video");
    let result = await submitAndWaitForVideo(heroImageUrl, prompt);

    // Stage 3: Quality check + auto-regen
    if (result?.videoUrl) {
      const passes = await passesQualityCheck(result.videoUrl);
      if (!passes) {
        console.log("[TikTok] First generation failed quality check, regenerating with alternate prompt...");
        onProgress?.("regenerating");
        const altPrompt = buildAlternatePrompt(promptInput);
        result = await submitAndWaitForVideo(heroImageUrl, altPrompt);
      }
    }

    if (!result?.videoUrl) {
      return {
        success: false,
        error: "Video generation failed after all attempts",
        generationTimeMs: Date.now() - startTime,
      };
    }

    // Stage 4: Store in Supabase
    onProgress?.("storing");
    console.log("[TikTok] Downloading and storing video...");
    const videoBuffer = await downloadVideo(result.videoUrl);

    const storagePath = `tiktok-videos/${recipeId}/tiktok_${Date.now()}.mp4`;
    const { url: permanentUrl } = await storagePut(
      storagePath,
      videoBuffer,
      "video/mp4"
    );

    console.log(`[TikTok] Video stored: ${permanentUrl}`);

    // Stage 5: Done
    onProgress?.("completed");
    return {
      success: true,
      videoUrl: permanentUrl,
      prompt,
      generationTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("[TikTok] Error in generateTikTokVideo:", error);
    return {
      success: false,
      error: error?.message || "Unknown error during video generation",
      generationTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * Regenerate a TikTok video with a different prompt/seed
 * Used for the "free regeneration" feature
 */
export async function regenerateTikTokVideo(
  recipeId: string,
  heroImageUrl: string,
  promptInput: TikTokPromptInput,
  onProgress?: (stage: string) => void
): Promise<TikTokVideoResult> {
  const startTime = Date.now();

  try {
    if (!heroImageUrl?.startsWith("https://")) {
      return {
        success: false,
        error: "Hero image must be an HTTPS URL",
      };
    }

    // Use alternate prompt for regeneration (different angle/emphasis)
    onProgress?.("building_prompt");
    const prompt = buildAlternatePrompt(promptInput);
    console.log(`[TikTok] Regen prompt (${prompt.length} chars)`);

    // Generate video (no auto-regen for free regen — cost control)
    onProgress?.("generating_video");
    const result = await submitAndWaitForVideo(heroImageUrl, prompt);

    if (!result?.videoUrl) {
      return {
        success: false,
        error: "Regeneration failed",
        generationTimeMs: Date.now() - startTime,
      };
    }

    // Store in Supabase
    onProgress?.("storing");
    const videoBuffer = await downloadVideo(result.videoUrl);
    const storagePath = `tiktok-videos/${recipeId}/tiktok_regen_${Date.now()}.mp4`;
    const { url: permanentUrl } = await storagePut(
      storagePath,
      videoBuffer,
      "video/mp4"
    );

    onProgress?.("completed");
    return {
      success: true,
      videoUrl: permanentUrl,
      prompt,
      generationTimeMs: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("[TikTok] Error in regenerateTikTokVideo:", error);
    return {
      success: false,
      error: error?.message || "Unknown error during regeneration",
      generationTimeMs: Date.now() - startTime,
    };
  }
}
