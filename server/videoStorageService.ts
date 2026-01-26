/**
 * Video Storage Service
 * 
 * This service handles video generation and storage for recipe step videos.
 * Uses Runway Gen-3 API for AI video generation.
 * Stores videos permanently in Supabase Storage (recipe-videos bucket).
 */

import { 
  generateVideoFromImage, 
  waitForVideo, 
  createCookingVideoPrompt,
  validateImageUrl,
  type VideoGenerationResult 
} from "./runwayService";
import { storagePut } from "./storage";

export interface StepVideo {
  stepIndex: number;
  videoUrl: string;
  status: "pending" | "generating" | "saving" | "completed" | "failed";
  error?: string;
}

export interface VideoGenerationProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  currentStatus: "generating" | "saving" | "completed" | "failed";
  stepVideos: StepVideo[];
  status: "idle" | "generating" | "completed" | "failed";
  error?: string;
}

// In-memory storage for video generation progress
const generationProgress = new Map<string, VideoGenerationProgress>();

/**
 * Download video from URL and return as Buffer
 */
async function downloadVideoToBuffer(videoUrl: string): Promise<Buffer> {
  console.log(`[VideoStorage] Downloading video from: ${videoUrl}`);
  
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
  }
  
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Store video permanently in Supabase Storage
 * 
 * @param tempVideoUrl - Temporary URL from Runway (expires)
 * @param userId - User ID for storage path
 * @param recipeId - Recipe ID for storage path
 * @param stepIndex - Step index for filename
 * @returns Permanent public URL
 */
export async function storeVideoToSupabase(
  tempVideoUrl: string,
  userId: string,
  recipeId: string,
  stepIndex: number
): Promise<string> {
  try {
    console.log(`[VideoStorage] Storing video for step ${stepIndex + 1} to Supabase...`);
    
    // 1. Download video from Runway temp URL
    const videoBuffer = await downloadVideoToBuffer(tempVideoUrl);
    console.log(`[VideoStorage] Downloaded ${videoBuffer.length} bytes`);
    
    // 2. Upload to storage with path: recipe-videos/{userId}/{recipeId}/step_{stepIndex}.mp4
    const storagePath = `recipe-videos/${userId}/${recipeId}/step_${stepIndex + 1}.mp4`;
    
    const { url: permanentUrl } = await storagePut(
      storagePath,
      videoBuffer,
      "video/mp4"
    );
    
    console.log(`[VideoStorage] Video stored permanently at: ${permanentUrl}`);
    return permanentUrl;
    
  } catch (error: any) {
    console.error(`[VideoStorage] Error storing video:`, error);
    throw new Error(`Failed to store video: ${error?.message || "Unknown error"}`);
  }
}

/**
 * Generate videos for all recipe steps using Runway API
 * and store them permanently in Supabase Storage
 * 
 * @param recipeId - Unique identifier for the recipe
 * @param userId - User ID for storage path
 * @param dishName - Name of the dish being cooked
 * @param imageUrl - Base image URL for video generation
 * @param steps - Array of recipe steps
 * @param onProgress - Callback for progress updates
 */
export async function generateStepVideos(
  recipeId: string,
  userId: string,
  dishName: string,
  imageUrl: string,
  steps: Array<{ stepNumber: number; instruction: string; duration?: number }>,
  onProgress?: (progress: VideoGenerationProgress) => void
): Promise<StepVideo[]> {
  const totalSteps = steps.length;
  
  // Initialize progress tracking
  const progress: VideoGenerationProgress = {
    totalSteps,
    completedSteps: 0,
    currentStep: 0,
    currentStatus: "generating",
    stepVideos: steps.map((_, index) => ({
      stepIndex: index,
      videoUrl: "",
      status: "pending",
    })),
    status: "generating",
  };
  
  generationProgress.set(recipeId, progress);
  onProgress?.(progress);
  
  const stepVideos: StepVideo[] = [];
  
  // Validate the image URL before starting
  let validatedImageUrl: string;
  try {
    validatedImageUrl = validateImageUrl(imageUrl);
    console.log(`[VideoStorage] Validated imageUrl for batch:`, validatedImageUrl?.substring(0, 100));
  } catch (urlError: any) {
    console.error(`[VideoStorage] Invalid image URL for batch:`, urlError.message);
    progress.status = "failed";
    progress.error = urlError.message;
    onProgress?.(progress);
    return [];
  }
  
  // Generate video for each step sequentially
  // (Runway has rate limits, so we process one at a time)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    progress.currentStep = i;
    progress.currentStatus = "generating";
    progress.stepVideos[i].status = "generating";
    onProgress?.(progress);
    
    console.log(`[VideoStorage] Generating video for step ${i + 1}/${totalSteps}: ${step.instruction.substring(0, 50)}...`);
    
    try {
      // Create cinematic prompt for this cooking step
      const prompt = createCookingVideoPrompt(
        step.instruction,
        dishName,
        step.stepNumber
      );
      
      // Start video generation
      const startResult = await generateVideoFromImage(validatedImageUrl, prompt, 5);
      
      if (startResult.status === "FAILED" || !startResult.taskId) {
        throw new Error(startResult.error || "Failed to start video generation");
      }
      
      // Wait for video to complete
      const result = await waitForVideo(startResult.taskId);
      
      if (result.status === "SUCCEEDED" && result.videoUrl) {
        // Update status to "saving"
        progress.currentStatus = "saving";
        progress.stepVideos[i].status = "saving";
        onProgress?.(progress);
        
        // Store video permanently in Supabase
        const permanentUrl = await storeVideoToSupabase(
          result.videoUrl,
          userId,
          recipeId,
          i
        );
        
        progress.stepVideos[i] = {
          stepIndex: i,
          videoUrl: permanentUrl,
          status: "completed",
        };
        progress.completedSteps++;
        
        stepVideos.push({
          stepIndex: i,
          videoUrl: permanentUrl,
          status: "completed",
        });
        
        console.log(`[VideoStorage] Step ${i + 1} video completed and stored: ${permanentUrl}`);
      } else {
        throw new Error(result.error || "Video generation failed");
      }
    } catch (error: any) {
      console.error(`[VideoStorage] Error generating video for step ${i + 1}:`, error);
      
      progress.stepVideos[i] = {
        stepIndex: i,
        videoUrl: "",
        status: "failed",
        error: error?.message || "Unknown error",
      };
      
      stepVideos.push({
        stepIndex: i,
        videoUrl: "",
        status: "failed",
        error: error?.message || "Unknown error",
      });
    }
    
    onProgress?.(progress);
  }
  
  // Update final status
  const allCompleted = stepVideos.every(v => v.status === "completed");
  const anyFailed = stepVideos.some(v => v.status === "failed");
  
  progress.status = allCompleted ? "completed" : anyFailed ? "failed" : "completed";
  progress.currentStatus = "completed";
  generationProgress.set(recipeId, progress);
  onProgress?.(progress);
  
  return stepVideos;
}

/**
 * Generate a single step video and store it in Supabase
 */
export async function generateSingleStepVideo(
  userId: string,
  recipeId: string,
  dishName: string,
  imageUrl: string,
  stepInstruction: string,
  stepNumber: number
): Promise<{ videoUrl: string; status: string; error?: string }> {
  const prompt = createCookingVideoPrompt(stepInstruction, dishName, stepNumber);
  
  console.log(`[VideoStorage] Generating single video for step ${stepNumber}`);
  console.log(`[VideoStorage] Input imageUrl:`, imageUrl?.substring(0, 100));
  
  try {
    // Validate the image URL before sending to Runway
    let validatedUrl: string;
    try {
      validatedUrl = validateImageUrl(imageUrl);
    } catch (urlError: any) {
      console.error(`[VideoStorage] Invalid image URL:`, urlError.message);
      return {
        videoUrl: "",
        status: "failed",
        error: urlError.message || "Invalid image URL"
      };
    }
    
    console.log(`[VideoStorage] Validated imageUrl:`, validatedUrl?.substring(0, 100));
    
    const startResult = await generateVideoFromImage(validatedUrl, prompt, 5);
    
    if (startResult.status === "FAILED" || !startResult.taskId) {
      return {
        videoUrl: "",
        status: "failed",
        error: startResult.error || "Failed to start video generation"
      };
    }
    
    const result = await waitForVideo(startResult.taskId);
    
    if (result.status === "SUCCEEDED" && result.videoUrl) {
      // Store permanently in Supabase
      const permanentUrl = await storeVideoToSupabase(
        result.videoUrl,
        userId,
        recipeId,
        stepNumber - 1 // Convert to 0-indexed
      );
      
      return {
        videoUrl: permanentUrl,
        status: "completed"
      };
    }
    
    return {
      videoUrl: "",
      status: "failed",
      error: result.error || "Video generation failed"
    };
  } catch (error: any) {
    return {
      videoUrl: "",
      status: "failed",
      error: error?.message || "Unknown error"
    };
  }
}

/**
 * Get the current generation progress for a recipe
 */
export function getGenerationProgress(recipeId: string): VideoGenerationProgress | null {
  return generationProgress.get(recipeId) || null;
}

/**
 * Clear generation progress for a recipe
 */
export function clearGenerationProgress(recipeId: string): void {
  generationProgress.delete(recipeId);
}
