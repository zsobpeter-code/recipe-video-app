import { invokeLLM } from "./_core/llm";

export interface EnrichedStep {
  stepNumber: number;
  originalText: string;
  visualPrompt: string;
  duration: number; // seconds
}

export interface RecipeForVideo {
  title: string;
  steps: { stepNumber: number; instruction: string; duration?: number }[];
}

/**
 * Transforms recipe steps into rich visual prompts for AI video generation.
 * Each step becomes a detailed scene description suitable for video generation.
 */
export async function enrichRecipeForVideo(recipe: RecipeForVideo): Promise<EnrichedStep[]> {
  const systemPrompt = `You are a professional food videographer. Transform cooking instructions into detailed visual descriptions for AI video generation.

For each step, describe:
- Camera angle (close-up, overhead, 45-degree, etc.)
- Main action visible (pouring, stirring, chopping, etc.)
- Key objects/ingredients visible
- Lighting mood (warm, bright, soft natural light)
- Any motion or movement to show
- Environment hints (wooden cutting board, marble counter, copper pot, etc.)

Style: TikTok/YouTube Shorts cooking videos - vertical format, appetizing, no hands visible, focus on food and utensils.

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, just the raw JSON.

Output format - a JSON array with objects containing:
- stepNumber: number
- originalText: string (the original instruction)
- visualPrompt: string (detailed visual description for video generation)
- duration: number (5-10 seconds per step)

Example output:
[
  {
    "stepNumber": 1,
    "originalText": "Beat 8 egg whites until stiff peaks form",
    "visualPrompt": "Overhead shot of a copper mixing bowl, egg whites transforming from liquid to glossy white peaks as a whisk moves through them, soft warm kitchen lighting, gentle motion blur on the whisk",
    "duration": 8
  }
]`;

  const userContent = `Recipe: ${recipe.title}

Steps:
${recipe.steps.map((s, i) => `${i + 1}. ${s.instruction}`).join('\n')}

Transform these cooking steps into rich visual prompts for video generation. Return ONLY a JSON array.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content;
    if (!rawContent) {
      throw new Error("No response from AI");
    }

    const content = typeof rawContent === 'string' 
      ? rawContent 
      : JSON.stringify(rawContent);

    // Parse the response - it might be wrapped in an object or be a direct array
    let parsed = JSON.parse(content);
    
    // If the response is wrapped in an object (e.g., { "steps": [...] }), extract the array
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      // Find the first array property
      const arrayKey = Object.keys(parsed).find(key => Array.isArray(parsed[key]));
      if (arrayKey) {
        parsed = parsed[arrayKey];
      }
    }

    // Validate and ensure we have an array
    if (!Array.isArray(parsed)) {
      throw new Error("Response is not an array");
    }

    // Map and validate each step
    const enrichedSteps: EnrichedStep[] = parsed.map((step: unknown, index: number) => {
      const s = step as Record<string, unknown>;
      return {
        stepNumber: typeof s.stepNumber === 'number' ? s.stepNumber : index + 1,
        originalText: typeof s.originalText === 'string' ? s.originalText : recipe.steps[index]?.instruction || `Step ${index + 1}`,
        visualPrompt: typeof s.visualPrompt === 'string' ? s.visualPrompt : `Cooking step ${index + 1}: ${recipe.steps[index]?.instruction || 'preparing the dish'}`,
        duration: typeof s.duration === 'number' ? Math.min(Math.max(s.duration, 5), 15) : 8,
      };
    });

    return enrichedSteps;
  } catch (error) {
    console.error("Video prompt enrichment error:", error);
    
    // Return basic prompts as fallback
    return recipe.steps.map((step, index) => ({
      stepNumber: step.stepNumber || index + 1,
      originalText: step.instruction,
      visualPrompt: `Professional food video shot of: ${step.instruction}. Warm kitchen lighting, appetizing presentation, focus on the cooking action.`,
      duration: step.duration || 8,
    }));
  }
}
