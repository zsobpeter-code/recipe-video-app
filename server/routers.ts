import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";

// Recipe analysis response schema
const recipeSchema = z.object({
  dishName: z.string(),
  description: z.string(),
  cuisine: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  prepTime: z.number(), // in minutes
  cookTime: z.number(), // in minutes
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
    duration: z.number().optional(), // in minutes
    tips: z.string().optional(),
  })),
  nutritionEstimate: z.object({
    calories: z.number().optional(),
    protein: z.string().optional(),
    carbs: z.string().optional(),
    fat: z.string().optional(),
  }).optional(),
  tags: z.array(z.string()).optional(),
});

export type RecipeData = z.infer<typeof recipeSchema>;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Recipe analysis with Claude Vision
  recipe: router({
    analyze: publicProcedure
      .input(z.object({
        imageBase64: z.string().describe("Base64 encoded image data"),
        dishName: z.string().optional().describe("User-provided dish name hint"),
        userNotes: z.string().optional().describe("User-provided notes or context"),
      }))
      .mutation(async ({ input }) => {
        const { imageBase64, dishName, userNotes } = input;

        // Build the prompt
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
  "tags": ["tag1", "tag2"]
}`;

        let userContent = "Please analyze this food image and provide a complete recipe.";
        if (dishName) {
          userContent += `\n\nThe user believes this dish is: "${dishName}"`;
        }
        if (userNotes) {
          userContent += `\n\nAdditional notes from the user: "${userNotes}"`;
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

          // Ensure content is a string for JSON parsing
          const content = typeof rawContent === 'string' 
            ? rawContent 
            : JSON.stringify(rawContent);

          // Parse and validate the response
          const recipeData = JSON.parse(content);
          const validatedRecipe = recipeSchema.parse(recipeData);

          return {
            success: true,
            recipe: validatedRecipe,
          };
        } catch (error) {
          console.error("Recipe analysis error:", error);
          
          // Return a fallback recipe structure if AI fails
          return {
            success: false,
            error: error instanceof Error ? error.message : "Failed to analyze image",
            recipe: null,
          };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
