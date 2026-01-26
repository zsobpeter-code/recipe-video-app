/**
 * Video Storage Service
 * 
 * This service handles video generation and storage for recipe step videos.
 * Uses Runway Gen-3 API for AI video generation.
 */

import { 
  generateVideoFromImage, 
  waitForVideo, 
  createCookingVideoPrompt,
  type VideoGenerationResult 
} from "./runwayService";

export interface StepVideo {
  stepIndex: number;
  videoUrl: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

export interface VideoGenerationProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: number;
  stepVideos: StepVideo[];
  status: "idle" | "generating" | "completed" | "failed";
  error?: string;
}

// In-memory storage for video generation progress
const generationProgress = new Map<string, VideoGenerationProgress>();

/**
 * Generate videos for all recipe steps using Runway API
 * 
 * @param recipeId - Unique identifier for the recipe
 * @param dishName - Name of the dish being cooked
 * @param imageUrl - Base image URL for video generation
 * @param steps - Array of recipe steps
 * @param onProgress - Callback for progress updates
 */
export async function generateStepVideos(
  recipeId: string,
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
  
  // Generate video for each step sequentially
  // (Runway has rate limits, so we process one at a time)
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    progress.currentStep = i;
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
      const startResult = await generateVideoFromImage(imageUrl, prompt, 5);
      
      if (startResult.status === "FAILED" || !startResult.taskId) {
        throw new Error(startResult.error || "Failed to start video generation");
      }
      
      // Wait for video to complete
      const result = await waitForVideo(startResult.taskId);
      
      if (result.status === "SUCCEEDED" && result.videoUrl) {
        progress.stepVideos[i] = {
          stepIndex: i,
          videoUrl: result.videoUrl,
          status: "completed",
        };
        progress.completedSteps++;
        
        stepVideos.push({
          stepIndex: i,
          videoUrl: result.videoUrl,
          status: "completed",
        });
        
        console.log(`[VideoStorage] Step ${i + 1} video completed: ${result.videoUrl}`);
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
  generationProgress.set(recipeId, progress);
  onProgress?.(progress);
  
  return stepVideos;
}

/**
 * Generate a single step video
 */
export async function generateSingleStepVideo(
  dishName: string,
  imageUrl: string,
  stepInstruction: string,
  stepNumber: number
): Promise<VideoGenerationResult> {
  const prompt = createCookingVideoPrompt(stepInstruction, dishName, stepNumber);
  
  console.log(`[VideoStorage] Generating single video for step ${stepNumber}`);
  
  const startResult = await generateVideoFromImage(imageUrl, prompt, 5);
  
  if (startResult.status === "FAILED" || !startResult.taskId) {
    return startResult;
  }
  
  return waitForVideo(startResult.taskId);
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

/**
 * Store step videos in recipe record
 * This is a placeholder - in production, videos would be stored in Supabase Storage
 */
export async function storeStepVideosToRecipe(
  recipeId: string,
  stepVideos: StepVideo[]
): Promise<void> {
  // In production with Supabase:
  // await supabase
  //   .from('recipes')
  //   .update({ step_videos: JSON.stringify(stepVideos) })
  //   .eq('id', recipeId);
  
  console.log(`[VideoStorage] Stored ${stepVideos.length} step videos for recipe ${recipeId}`);
}
