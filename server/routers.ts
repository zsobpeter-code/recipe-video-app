import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { generateImage } from "./_core/imageGeneration";
import { enrichRecipeForVideo, type EnrichedStep } from "./videoPromptEnricher";
import { generateSingleStepPhoto } from "./stepPhotoService";
import * as recipeDb from "./recipeDb";

// Recipe analysis response schema
const recipeSchema = z.object({
  dishName: z.string(),
  description: z.string(),
  cuisine: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prepTime: z.number(),
  cookTime: z.number(),
  servings: z.number(),
  ingredients: z.array(z.object({
    name: z.string(),
    amount: z.string(),
    unit: z.string().optional(),
    notes: z.string().optional(),
  })),
  steps: z.array(z.object({
    stepNumber: z.number(),
    instruction: z.string(),
    duration: z.number().optional(),
    tips: z.string().optional(),
  })),
  nutritionEstimate: z.object({
    calories: z.number().optional(),
    protein: z.string().optional(),
    carbs: z.string().optional(),
    fat: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
  confidence: z.number().optional(),
  alternatives: z.array(z.string()).optional(),
});

export type RecipeData = z.infer<typeof recipeSchema>;

// Re-export SavedRecipe type from recipeDb
export type { SavedRecipe } from "./recipeDb";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Recipe operations - NOW USING SUPABASE DATABASE
  recipe: router({
    // Analyze image with Claude Vision
    analyze: publicProcedure
      .input(z.object({
        imageBase64: z.string().describe("Base64 encoded image data"),
        dishName: z.string().optional().describe("User-provided dish name hint"),
        userNotes: z.string().optional().describe("User-provided notes or context"),
      }))
      .mutation(async ({ input }) => {
        const { imageBase64, dishName, userNotes } = input;

        const systemPrompt = `You are an expert culinary AI assistant that analyzes food images and extracts detailed recipe information. 
You have extensive knowledge of cuisines from around the world, cooking techniques, and ingredient identification.

When analyzing an image:
1. Identify the dish and its cuisine origin
2. Estimate the ingredients visible or commonly used
3. Provide step-by-step cooking instructions
4. Estimate prep time, cook time, and servings
5. Suggest difficulty level based on technique complexity

IMPORTANT RULES:
- The dishName field MUST be the actual name of the dish (e.g., "Spaghetti Carbonara", "Chicken Tikka Masala", "Beef Tacos"). NEVER use generic names like "Untitled Dish", "Unknown Dish", or "Food Item".
- Maximum 15 steps allowed. If the recipe needs more, combine related steps.
- If you cannot identify the dish, make your best educated guess based on the visible ingredients and cooking style.

Always return your response as valid JSON matching this exact structure:
{
  "dishName": "Actual Name of the Dish (e.g., Pad Thai, Beef Bourguignon)",
  "description": "Brief appetizing description",
  "cuisine": "Cuisine type (e.g., Italian, Japanese, Mexican)",
  "difficulty": "easy" | "medium" | "hard",
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "servings": number,
  "ingredients": [
    { "name": "ingredient name", "amount": "quantity", "unit": "unit", "notes": "optional notes" }
  ],
  "steps": [
    { "stepNumber": 1, "instruction": "step description", "duration": number (optional, minutes), "tips": "optional tips" }
  ],
  "nutritionEstimate": {
    "calories": number,
    "protein": "Xg",
    "carbs": "Xg", 
    "fat": "Xg"
  },
  "tags": ["tag1", "tag2"],
  "confidence": number (0.0 to 1.0, your confidence in the dish identification),
  "alternatives": ["Alternative dish name 1", "Alternative dish name 2", "Alternative dish name 3"] (other possible dishes this could be)
}`;

        let userContent = "Please analyze this food image and provide a complete recipe.";
        if (dishName) {
          userContent = `IMPORTANT: The user has explicitly specified that this dish is called "${dishName}". 

You MUST:
1. Research and provide the AUTHENTIC recipe for "${dishName}" - this is likely an international dish name (could be Hungarian, Polish, Japanese, Indian, etc.)
2. Do NOT guess based on the image - the user knows what dish this is
3. The dish name in your response MUST be "${dishName}" exactly as provided
4. Provide traditional, authentic ingredients and cooking methods for this specific dish
5. If "${dishName}" is a well-known dish from any cuisine, provide its authentic recipe
6. Keep steps to maximum 15 - combine related steps if needed

Generate the complete, authentic recipe for "${dishName}".`;
        }
        if (userNotes) {
          userContent += `\n\nAdditional context from the user: "${userNotes}"`;
        }

        try {
          const response = await invokeLLM({
            messages: [
              { role: "system", content: systemPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: userContent },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`,
                      detail: "high",
                    },
                  },
                ],
              },
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

          const recipeData = JSON.parse(content);
          
          // Enforce max 15 steps
          if (recipeData.steps && recipeData.steps.length > 15) {
            console.log(`[Recipe] Truncating steps from ${recipeData.steps.length} to 15`);
            recipeData.steps = recipeData.steps.slice(0, 15);
          }
          
          const validatedRecipe = recipeSchema.parse(recipeData);

          return {
            success: true,
            recipe: validatedRecipe,
          };
        } catch (error) {
          console.error("Recipe analysis error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to analyze image",
            recipe: null,
          };
        }
      }),

    // Upload image to storage
    uploadImage: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        fileName: z.string(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { imageBase64, fileName } = input;
          const buffer = Buffer.from(imageBase64, "base64");
          const timestamp = Date.now();
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const key = `recipes/${timestamp}-${randomSuffix}-${fileName}`;
          
          const { url } = await storagePut(key, buffer, "image/jpeg");
          
          return { success: true, url };
        } catch (error) {
          console.error("Image upload error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to upload image",
            url: null,
          };
        }
      }),

    // Save recipe to collection - NOW USES SUPABASE DATABASE
    save: publicProcedure
      .input(z.object({
        dishName: z.string(),
        description: z.string(),
        cuisine: z.string().optional(),
        category: z.string().default("Main"),
        difficulty: z.string(),
        prepTime: z.number(),
        cookTime: z.number(),
        servings: z.number(),
        ingredients: z.string(), // JSON string
        steps: z.string(), // JSON string
        tags: z.string().optional(), // JSON string
        imageUrl: z.string().optional(), // AI-generated or main display image
        originalImageUrl: z.string().optional(), // Original captured image (e.g., handwritten recipe)
        stepImages: z.string().optional(), // JSON string of step images with HTTPS URLs
        stepVideos: z.string().optional(), // JSON string of step videos with HTTPS URLs
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Saving recipe to database: ${input.dishName}`);
        const result = await recipeDb.createRecipe(input);
        return result;
      }),

    // List all recipes - NOW USES SUPABASE DATABASE
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        favoritesOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        console.log(`[Recipe] Listing recipes from database`);
        const result = await recipeDb.listRecipes({
          category: input?.category,
          search: input?.search,
          favoritesOnly: input?.favoritesOnly,
        });
        return result;
      }),

    // Get single recipe by ID - NOW USES SUPABASE DATABASE
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        console.log(`[Recipe] Getting recipe from database: ${input.id}`);
        const result = await recipeDb.getRecipe(input.id);
        return result;
      }),

    // Toggle favorite status - NOW USES SUPABASE DATABASE
    toggleFavorite: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Toggling favorite in database: ${input.id}`);
        const result = await recipeDb.toggleFavorite(input.id);
        return result;
      }),

    // Delete recipe - NOW USES SUPABASE DATABASE
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Deleting recipe from database: ${input.id}`);
        const result = await recipeDb.deleteRecipe(input.id);
        return result;
      }),

    // Update step images for a recipe - NOW USES SUPABASE DATABASE
    updateStepImages: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID to update"),
        stepImages: z.string().describe("JSON string of step images with HTTPS URLs"),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Updating step images in database: ${input.recipeId}`);
        const result = await recipeDb.updateStepImages(input.recipeId, input.stepImages);
        return result;
      }),

    // Update step videos for a recipe - NOW USES SUPABASE DATABASE
    updateStepVideos: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID to update"),
        stepVideos: z.string().describe("JSON string of step videos with HTTPS URLs"),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Updating step videos in database: ${input.recipeId}`);
        const result = await recipeDb.updateStepVideos(input.recipeId, input.stepVideos);
        return result;
      }),

    // Update final video URL for a recipe - NOW USES SUPABASE DATABASE
    updateFinalVideoUrl: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID to update"),
        finalVideoUrl: z.string().describe("URL of the concatenated final video"),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Updating final video URL in database: ${input.recipeId}`);
        const result = await recipeDb.updateFinalVideoUrl(input.recipeId, input.finalVideoUrl);
        return result;
      }),

    // Update primary image selection for a recipe - NOW USES SUPABASE DATABASE
    updatePrimaryImage: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID to update"),
        primaryImageUrl: z.string().describe("URL of the selected primary image"),
        imageType: z.enum(["original", "generated"]).describe("Type of image selected"),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Updating primary image in database: ${input.recipeId}`);
        const result = await recipeDb.updatePrimaryImage(input.recipeId, input.primaryImageUrl);
        return result;
      }),

    // Update generated image URL for a recipe - NOW USES SUPABASE DATABASE
    updateGeneratedImage: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID to update"),
        generatedImageUrl: z.string().describe("URL of the AI-generated image"),
      }))
      .mutation(async ({ input }) => {
        console.log(`[Recipe] Updating generated image in database: ${input.recipeId}`);
        const result = await recipeDb.updateGeneratedImage(input.recipeId, input.generatedImageUrl);
        return result;
      }),

    // Check if step images are cached for a recipe
    hasStepImages: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const hasCached = await recipeDb.hasStepImages(input.recipeId);
        return { hasCached };
      }),

    // Check if step videos are cached for a recipe
    hasStepVideos: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const hasCached = await recipeDb.hasStepVideos(input.recipeId);
        return { hasCached };
      }),

    // Check if final video is cached for a recipe
    hasFinalVideo: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const hasCached = await recipeDb.hasFinalVideo(input.recipeId);
        return { hasCached };
      }),

    // Get cached step images for a recipe
    getCachedStepImages: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const cached = await recipeDb.getCachedStepImages(input.recipeId);
        return { cached };
      }),

    // Get cached step videos for a recipe
    getCachedStepVideos: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const cached = await recipeDb.getCachedStepVideos(input.recipeId);
        return { cached };
      }),

    // Get cached final video URL for a recipe
    getCachedFinalVideoUrl: publicProcedure
      .input(z.object({ recipeId: z.string() }))
      .query(async ({ input }) => {
        const cached = await recipeDb.getCachedFinalVideoUrl(input.recipeId);
        return { cached };
      }),

    // Generate AI food image for a dish
    generateImage: publicProcedure
      .input(z.object({
        dishName: z.string().describe("Name of the dish to generate image for"),
        description: z.string().optional().describe("Description of the dish"),
        cuisine: z.string().optional().describe("Cuisine type"),
      }))
      .mutation(async ({ input }) => {
        const { dishName, description, cuisine } = input;

        try {
          // Build a detailed prompt for food image generation
          let prompt = `A professional food photography shot of ${dishName}`;
          if (cuisine) {
            prompt += `, ${cuisine} cuisine`;
          }
          if (description) {
            prompt += `. ${description}`;
          }
          prompt += ". Beautifully plated, appetizing, high-end restaurant presentation, soft natural lighting, shallow depth of field, on a rustic wooden table with elegant garnishes. Professional food magazine quality.";

          const result = await generateImage({
            prompt,
          });

          return {
            success: true,
            imageUrl: result.url,
          };
        } catch (error) {
          console.error("Image generation error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate image",
            imageUrl: null,
          };
        }
      }),

    // Generate AI photo for a single cooking step
    generateStepPhotos: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID"),
        dishName: z.string().describe("Name of the dish"),
        stepIndex: z.number().describe("Step index (0-based)"),
        stepInstruction: z.string().describe("Step instruction text"),
        totalSteps: z.number().describe("Total number of steps"),
      }))
      .mutation(async ({ input }) => {
        try {
          const result = await generateSingleStepPhoto(
            input.recipeId,
            input.dishName,
            input.stepInstruction,
            input.stepIndex,
            input.totalSteps
          );

          if (result) {
            return {
              success: true,
              imageUrl: result.imageUrl,
            };
          } else {
            return {
              success: false,
              error: "Failed to generate step photo",
              imageUrl: null,
            };
          }
        } catch (error) {
          console.error("Step photo generation error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate step photo",
            imageUrl: null,
          };
        }
      }),

    // Enrich recipe steps with visual prompts for video generation
    enrichForVideo: publicProcedure
      .input(z.object({
        title: z.string().describe("Recipe title/dish name"),
        steps: z.array(z.object({
          stepNumber: z.number(),
          instruction: z.string(),
          duration: z.number().optional(),
        })).describe("Recipe steps to enrich"),
      }))
      .mutation(async ({ input }) => {
        try {
          // Enforce max 15 steps
          let steps = input.steps;
          if (steps.length > 15) {
            console.log(`[Recipe] Truncating steps from ${steps.length} to 15 for video enrichment`);
            steps = steps.slice(0, 15);
          }

          const enrichedSteps = await enrichRecipeForVideo({
            title: input.title,
            steps,
          });

          return {
            success: true,
            enrichedSteps,
          };
        } catch (error) {
          console.error("Video enrichment error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to enrich video prompts",
            enrichedSteps: null,
          };
        }
      }),

    // Generate AI video for a single cooking step using Runway API
    generateStepVideo: publicProcedure
      .input(z.object({
        userId: z.string().describe("User ID for storage path"),
        recipeId: z.string().describe("Recipe ID for storage path"),
        dishName: z.string().describe("Name of the dish"),
        imageUrl: z.string().describe("Source image URL for video generation"),
        stepInstruction: z.string().describe("Step instruction text"),
        stepNumber: z.number().describe("Step number (1-based)"),
      }))
      .mutation(async ({ input }) => {
        try {
          const { generateSingleStepVideo } = await import("./videoStorageService");
          
          const result = await generateSingleStepVideo(
            input.userId,
            input.recipeId,
            input.dishName,
            input.imageUrl,
            input.stepInstruction,
            input.stepNumber
          );

          if (result.status === "completed" && result.videoUrl) {
            return {
              success: true,
              videoUrl: result.videoUrl,
            };
          } else {
            return {
              success: false,
              error: result.error || "Video generation failed",
              videoUrl: null,
            };
          }
        } catch (error) {
          console.error("Step video generation error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate step video",
            videoUrl: null,
          };
        }
      }),

    // V2: Generate TikTok cooking video from hero image + recipe data
    generateTikTokVideo: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID for storage and DB update"),
        heroImageUrl: z.string().describe("HTTPS URL of the hero image"),
        title: z.string().describe("Recipe title"),
        ingredients: z.array(z.object({
          name: z.string(),
          amount: z.string().optional(),
          unit: z.string().optional(),
        })),
        steps: z.array(z.object({
          instruction: z.string(),
          stepNumber: z.number().optional(),
        })),
        cuisineStyle: z.string().optional(),
        heroMoment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { generateTikTokVideo } = await import("./tikTokVideoService");
          const { updateTikTokVideo } = await import("./recipeDb");

          const result = await generateTikTokVideo(
            input.recipeId,
            input.heroImageUrl,
            {
              title: input.title,
              ingredients: input.ingredients,
              steps: input.steps,
              cuisineStyle: input.cuisineStyle,
              heroMoment: input.heroMoment,
            }
          );

          if (result.success && result.videoUrl) {
            // Store video URL in database
            await updateTikTokVideo(input.recipeId, result.videoUrl);

            return {
              success: true,
              videoUrl: result.videoUrl,
              generationTimeMs: result.generationTimeMs,
            };
          } else {
            return {
              success: false,
              error: result.error || "Video generation failed",
              videoUrl: null,
              generationTimeMs: result.generationTimeMs,
            };
          }
        } catch (error) {
          console.error("TikTok video generation error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to generate TikTok video",
            videoUrl: null,
          };
        }
      }),

    // V2: Regenerate TikTok video (free regen, different prompt/seed)
    regenerateTikTokVideo: publicProcedure
      .input(z.object({
        recipeId: z.string().describe("Recipe ID"),
        heroImageUrl: z.string().describe("HTTPS URL of the hero image"),
        title: z.string(),
        ingredients: z.array(z.object({
          name: z.string(),
          amount: z.string().optional(),
          unit: z.string().optional(),
        })),
        steps: z.array(z.object({
          instruction: z.string(),
          stepNumber: z.number().optional(),
        })),
        cuisineStyle: z.string().optional(),
        heroMoment: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        try {
          const { regenerateTikTokVideo } = await import("./tikTokVideoService");
          const { updateTikTokVideo, markVideoRegenUsed } = await import("./recipeDb");

          const result = await regenerateTikTokVideo(
            input.recipeId,
            input.heroImageUrl,
            {
              title: input.title,
              ingredients: input.ingredients,
              steps: input.steps,
              cuisineStyle: input.cuisineStyle,
              heroMoment: input.heroMoment,
            }
          );

          if (result.success && result.videoUrl) {
            // Update video URL and mark regen as used
            await updateTikTokVideo(input.recipeId, result.videoUrl);
            await markVideoRegenUsed(input.recipeId);

            return {
              success: true,
              videoUrl: result.videoUrl,
              generationTimeMs: result.generationTimeMs,
            };
          } else {
            return {
              success: false,
              error: result.error || "Regeneration failed",
              videoUrl: null,
              generationTimeMs: result.generationTimeMs,
            };
          }
        } catch (error) {
          console.error("TikTok video regeneration error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to regenerate TikTok video",
            videoUrl: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
