import RunwayML from "@runwayml/sdk";

// Initialize Runway client
const client = new RunwayML({
  apiKey: process.env.RUNWAY_API_KEY,
});

// Video generation configuration
const VIDEO_CONFIG = {
  model: "gen3a_turbo" as const,
  duration: 5 as const, // 5 seconds per step
  ratio: "768:1280" as const, // Vertical portrait mode
};

export interface VideoGenerationResult {
  taskId: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  videoUrl?: string;
  error?: string;
}

export interface VideoTaskStatus {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  progress?: number;
  output?: string[];
  failure?: string;
  failureCode?: string;
}

/**
 * Generate a video from an image using Runway Gen-3 API
 * @param imageUrl - URL of the source image
 * @param prompt - Text prompt describing the desired motion/action
 * @param duration - Video duration in seconds (5 or 10)
 * @returns Task ID for tracking the generation
 */
export async function generateVideoFromImage(
  imageUrl: string,
  prompt: string,
  duration: 5 | 10 = VIDEO_CONFIG.duration
): Promise<VideoGenerationResult> {
  try {
    console.log("[Runway] Starting video generation:", { imageUrl: imageUrl.substring(0, 50) + "...", prompt: prompt.substring(0, 100) + "..." });
    
    const task = await client.imageToVideo.create({
      model: VIDEO_CONFIG.model,
      promptImage: imageUrl,
      promptText: prompt,
      duration: duration,
      ratio: VIDEO_CONFIG.ratio,
    }) as any;

    console.log("[Runway] Task created:", task.id);

    return {
      taskId: task.id,
      status: (task.status || "PENDING") as VideoGenerationResult["status"],
    };
  } catch (error: any) {
    console.error("[Runway] Error starting video generation:", error);
    return {
      taskId: "",
      status: "FAILED",
      error: error?.message || "Failed to start video generation",
    };
  }
}

/**
 * Check the status of a video generation task
 * @param taskId - The task ID returned from generateVideoFromImage
 * @returns Current status and video URL if complete
 */
export async function checkVideoStatus(taskId: string): Promise<VideoTaskStatus> {
  try {
    const task = await client.tasks.retrieve(taskId) as any;
    
    return {
      id: task.id,
      status: task.status as VideoTaskStatus["status"],
      progress: task.progress ?? undefined,
      output: task.output ?? undefined,
      failure: task.failure ?? undefined,
      failureCode: task.failureCode ?? undefined,
    };
  } catch (error: any) {
    console.error("[Runway] Error checking task status:", error);
    return {
      id: taskId,
      status: "FAILED",
      failure: error?.message || "Failed to check task status",
    };
  }
}

/**
 * Wait for a video generation task to complete
 * @param taskId - The task ID to wait for
 * @param maxWaitMs - Maximum time to wait in milliseconds (default: 5 minutes)
 * @param pollIntervalMs - Interval between status checks (default: 5 seconds)
 * @returns Final task status with video URL if successful
 */
export async function waitForVideo(
  taskId: string,
  maxWaitMs: number = 5 * 60 * 1000,
  pollIntervalMs: number = 5000
): Promise<VideoGenerationResult> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await checkVideoStatus(taskId);
    
    console.log(`[Runway] Task ${taskId} status: ${status.status}, progress: ${status.progress ?? "N/A"}`);
    
    if (status.status === "SUCCEEDED") {
      const videoUrl = status.output?.[0];
      if (videoUrl) {
        console.log("[Runway] Video generation complete:", videoUrl);
        return {
          taskId,
          status: "SUCCEEDED",
          videoUrl,
        };
      }
      return {
        taskId,
        status: "FAILED",
        error: "Video generation succeeded but no output URL found",
      };
    }
    
    if (status.status === "FAILED" || status.status === "CANCELLED") {
      return {
        taskId,
        status: status.status,
        error: status.failure || "Video generation failed",
      };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return {
    taskId,
    status: "FAILED",
    error: `Video generation timed out after ${maxWaitMs / 1000} seconds`,
  };
}

/**
 * Generate a video and wait for completion
 * Convenience function that combines generateVideoFromImage and waitForVideo
 */
export async function generateAndWaitForVideo(
  imageUrl: string,
  prompt: string,
  duration: 5 | 10 = 5
): Promise<VideoGenerationResult> {
  const startResult = await generateVideoFromImage(imageUrl, prompt, duration);
  
  if (startResult.status === "FAILED" || !startResult.taskId) {
    return startResult;
  }
  
  return waitForVideo(startResult.taskId);
}

/**
 * Generate cooking step video prompt from step instruction
 * Creates a cinematic prompt optimized for food/cooking videos
 */
export function createCookingVideoPrompt(
  stepInstruction: string,
  dishName: string,
  stepNumber: number
): string {
  // Extract key action from instruction
  const instruction = stepInstruction.toLowerCase();
  
  // Determine the type of cooking action
  let actionDescription = "";
  
  if (instruction.includes("chop") || instruction.includes("cut") || instruction.includes("slice") || instruction.includes("dice")) {
    actionDescription = "Smooth knife cutting motion, ingredients falling into place";
  } else if (instruction.includes("stir") || instruction.includes("mix")) {
    actionDescription = "Gentle circular stirring motion, ingredients blending together";
  } else if (instruction.includes("pour")) {
    actionDescription = "Liquid pouring smoothly, creating ripples";
  } else if (instruction.includes("heat") || instruction.includes("cook") || instruction.includes("fry") || instruction.includes("sauté")) {
    actionDescription = "Steam rising, gentle sizzling, food cooking in pan";
  } else if (instruction.includes("boil") || instruction.includes("simmer")) {
    actionDescription = "Bubbles rising, steam swirling, liquid gently moving";
  } else if (instruction.includes("bake") || instruction.includes("oven")) {
    actionDescription = "Food rising and browning, golden color developing";
  } else if (instruction.includes("serve") || instruction.includes("plate") || instruction.includes("garnish")) {
    actionDescription = "Elegant plating motion, garnish being placed delicately";
  } else if (instruction.includes("season") || instruction.includes("sprinkle") || instruction.includes("add")) {
    actionDescription = "Ingredients being added gracefully, falling into dish";
  } else {
    actionDescription = "Smooth cooking motion, professional kitchen ambiance";
  }
  
  return `Cinematic cooking video, ${actionDescription}. Professional kitchen lighting, shallow depth of field. Making ${dishName}, step ${stepNumber}. Smooth camera movement, appetizing food photography style. 4K quality, warm color grading.`;
}
