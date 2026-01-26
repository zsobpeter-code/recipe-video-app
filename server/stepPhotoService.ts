import { generateImage } from "./_core/imageGeneration";

export interface StepPhoto {
  stepIndex: number;
  imageUrl: string;
}

export interface GenerateStepPhotosInput {
  recipeId: string;
  dishName: string;
  steps: Array<{
    stepNumber: number;
    instruction: string;
  }>;
  userId?: string;
}

/**
 * Generate AI images for each cooking step
 */
export async function generateStepPhotos(
  input: GenerateStepPhotosInput
): Promise<StepPhoto[]> {
  const { recipeId, dishName, steps, userId = "anonymous" } = input;
  const stepPhotos: StepPhoto[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    
    // Create visual prompt for this step
    const prompt = createStepImagePrompt(dishName, step.instruction, i + 1, steps.length);
    
    try {
      // Generate image via AI (already saves to storage and returns URL)
      const result = await generateImage({
        prompt,
      });

      if (result.url) {
        stepPhotos.push({
          stepIndex: i,
          imageUrl: result.url,
        });
      } else {
        console.error(`Failed to generate image for step ${i + 1}: No URL returned`);
        // Continue with other steps even if one fails
      }
    } catch (error) {
      console.error(`Error generating step ${i + 1} photo:`, error);
      // Continue with other steps
    }
  }

  return stepPhotos;
}

/**
 * Create an appetizing food photography prompt for a cooking step
 */
function createStepImagePrompt(
  dishName: string,
  stepInstruction: string,
  stepNumber: number,
  totalSteps: number
): string {
  // Determine the cooking phase based on step position
  let phase = "preparation";
  if (stepNumber <= Math.ceil(totalSteps * 0.3)) {
    phase = "ingredient preparation";
  } else if (stepNumber <= Math.ceil(totalSteps * 0.7)) {
    phase = "cooking in progress";
  } else {
    phase = "final touches and plating";
  }

  return `Professional food photography of ${dishName} - ${phase} (step ${stepNumber} of ${totalSteps}): ${stepInstruction}

Style: Overhead shot, soft natural lighting from window, clean modern kitchen background with marble countertop, shallow depth of field, appetizing and delicious looking, steam rising if applicable, no hands visible, focus on ingredients and cooking action, warm color temperature, editorial quality, high resolution.

The image should show the actual cooking action described in the step, with visible ingredients and cooking equipment. Make it look like a frame from a professional cooking show.`;
}

/**
 * Generate a single step photo (for progress updates)
 */
export async function generateSingleStepPhoto(
  recipeId: string,
  dishName: string,
  stepInstruction: string,
  stepIndex: number,
  totalSteps: number,
  userId?: string
): Promise<StepPhoto | null> {
  const prompt = createStepImagePrompt(dishName, stepInstruction, stepIndex + 1, totalSteps);
  
  try {
    // Generate image via AI (already saves to storage and returns URL)
    const result = await generateImage({
      prompt,
    });

    if (result.url) {
      return {
        stepIndex,
        imageUrl: result.url,
      };
    }
  } catch (error) {
    console.error(`Error generating step ${stepIndex + 1} photo:`, error);
  }
  
  return null;
}
