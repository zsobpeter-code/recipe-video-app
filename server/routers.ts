import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { generateImage } from "./_core/imageGeneration";
import { enrichRecipeForVideo, type EnrichedStep } from "./videoPromptEnricher";

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

// Saved recipe type (from database)
export interface SavedRecipe {
  id: string;
  userId: string;
  dishName: string;
  description: string;
  cuisine: string | null;
  category: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: string; // JSON string
  steps: string; // JSON string
  tags: string | null; // JSON string
  imageUrl: string | null; // AI-generated or main display image
  originalImageUrl: string | null; // Original captured/uploaded image (e.g., handwritten recipe)
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// In-memory storage for recipes (since we're using Supabase directly from client)
// This is a simplified approach - in production, you'd use proper database queries
const recipes: Map<string, SavedRecipe> = new Map();

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

  // Recipe operations
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

Always return your response as valid JSON matching this exact structure:
{
  "dishName": "Name of the dish",
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
          // When user provides a dish name, they are CORRECTING the AI's detection
          // Generate a recipe specifically for that dish, not what's in the image
          userContent = `The user has specified that this is "${dishName}". Please generate a complete, authentic recipe for ${dishName}. Use the image as visual reference for presentation, but create the recipe based on the dish name provided. The dish name in your response MUST be "${dishName}" or a close variant.`;
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

    // Save recipe to collection
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
      }))
      .mutation(async ({ input }) => {
        try {
          const id = `recipe-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          const now = new Date().toISOString();
          
          const recipe: SavedRecipe = {
            id,
            userId: "anonymous", // For now, we're not requiring auth
            dishName: input.dishName,
            description: input.description,
            cuisine: input.cuisine || null,
            category: input.category,
            difficulty: input.difficulty,
            prepTime: input.prepTime,
            cookTime: input.cookTime,
            servings: input.servings,
            ingredients: input.ingredients,
            steps: input.steps,
            tags: input.tags || null,
            imageUrl: input.imageUrl || null,
            originalImageUrl: input.originalImageUrl || null,
            isFavorite: false,
            createdAt: now,
            updatedAt: now,
          };
          
          recipes.set(id, recipe);
          
          return { success: true, recipe };
        } catch (error) {
          console.error("Save recipe error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to save recipe",
            recipe: null,
          };
        }
      }),

    // List all recipes
    list: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        favoritesOnly: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        try {
          let recipeList = Array.from(recipes.values());
          
          // Filter by category
          if (input?.category && input.category !== "All") {
            if (input.category === "Favorites") {
              recipeList = recipeList.filter(r => r.isFavorite);
            } else {
              recipeList = recipeList.filter(r => r.category === input.category);
            }
          }
          
          // Filter by favorites
          if (input?.favoritesOnly) {
            recipeList = recipeList.filter(r => r.isFavorite);
          }
          
          // Search by name
          if (input?.search) {
            const searchLower = input.search.toLowerCase();
            recipeList = recipeList.filter(r => 
              r.dishName.toLowerCase().includes(searchLower) ||
              r.description.toLowerCase().includes(searchLower)
            );
          }
          
          // Sort by creation date (newest first)
          recipeList.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          return { success: true, recipes: recipeList };
        } catch (error) {
          console.error("List recipes error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to list recipes",
            recipes: [],
          };
        }
      }),

    // Get single recipe by ID
    get: publicProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        try {
          const recipe = recipes.get(input.id);
          if (!recipe) {
            return { success: false, error: "Recipe not found", recipe: null };
          }
          return { success: true, recipe };
        } catch (error) {
          console.error("Get recipe error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to get recipe",
            recipe: null,
          };
        }
      }),

    // Toggle favorite status
    toggleFavorite: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const recipe = recipes.get(input.id);
          if (!recipe) {
            return { success: false, error: "Recipe not found" };
          }
          
          recipe.isFavorite = !recipe.isFavorite;
          recipe.updatedAt = new Date().toISOString();
          recipes.set(input.id, recipe);
          
          return { success: true, isFavorite: recipe.isFavorite };
        } catch (error) {
          console.error("Toggle favorite error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to toggle favorite",
          };
        }
      }),

    // Delete recipe
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        try {
          const recipe = recipes.get(input.id);
          if (!recipe) {
            return { success: false, error: "Recipe not found" };
          }
          
          recipes.delete(input.id);
          
          return { success: true };
        } catch (error) {
          console.error("Delete recipe error:", error);
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to delete recipe",
          };
        }
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
          const enrichedSteps = await enrichRecipeForVideo({
            title: input.title,
            steps: input.steps,
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
  }),
});

export type AppRouter = typeof appRouter;
