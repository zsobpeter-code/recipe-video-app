/**
 * Recipe Database Service
 * 
 * Handles all recipe CRUD operations using Supabase PostgreSQL database.
 * Replaces the in-memory Map storage for production persistence.
 */

import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client with service role key for admin operations
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Create admin client for server-side operations (bypasses RLS)
// Use a placeholder for test environment to avoid initialization errors
const isTestEnv = process.env.NODE_ENV === "test" || process.env.VITEST;
const supabaseAdmin = isTestEnv && !supabaseServiceKey
  ? null as any // Will be null in test env without keys
  : createClient(supabaseUrl, supabaseServiceKey || "test-key-placeholder", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

// Recipe interface matching database schema
export interface DbRecipe {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  user_note: string | null;
  original_image_url: string | null;
  input_type: string | null;
  ai_image_url: string | null;
  video_url: string | null;
  video_status: string;
  ingredients: any; // JSONB
  steps: any; // JSONB
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: string | null;
  cuisine: string | null;
  category: string | null;
  tags: string[] | null;
  folder: string | null;
  is_favorite: boolean;
  step_images: any; // JSONB
  step_videos: any; // JSONB
  final_video_url: string | null;
  generated_image_url: string | null;
  primary_image_url: string | null;
  created_at: string;
  updated_at: string;
}

// Input type for creating/updating recipes
export interface RecipeInput {
  userId?: string;
  dishName: string;
  description: string;
  cuisine?: string | null;
  category?: string;
  difficulty: string;
  prepTime: number;
  cookTime: number;
  servings: number;
  ingredients: string; // JSON string
  steps: string; // JSON string
  tags?: string | null; // JSON string
  imageUrl?: string | null;
  originalImageUrl?: string | null;
  stepImages?: string | null; // JSON string
  stepVideos?: string | null; // JSON string
}

// SavedRecipe interface for API responses (matches existing tRPC interface)
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
  ingredients: string;
  steps: string;
  tags: string | null;
  imageUrl: string | null;
  originalImageUrl: string | null;
  generatedImageUrl: string | null;
  primaryImageUrl: string | null;
  stepImages: string | null;
  stepVideos: string | null;
  finalVideoUrl: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

// Convert database row to SavedRecipe format
function dbToSavedRecipe(row: DbRecipe): SavedRecipe {
  return {
    id: row.id,
    userId: row.user_id || "anonymous",
    dishName: row.title,
    description: row.description || "",
    cuisine: row.cuisine,
    category: row.category || "Main",
    difficulty: row.difficulty || "medium",
    prepTime: row.prep_time_minutes || 0,
    cookTime: row.cook_time_minutes || 0,
    servings: row.servings || 4,
    ingredients: typeof row.ingredients === "string" ? row.ingredients : JSON.stringify(row.ingredients || []),
    steps: typeof row.steps === "string" ? row.steps : JSON.stringify(row.steps || []),
    tags: row.tags ? JSON.stringify(row.tags) : null,
    imageUrl: row.ai_image_url,
    originalImageUrl: row.original_image_url,
    generatedImageUrl: row.generated_image_url,
    primaryImageUrl: row.primary_image_url,
    stepImages: typeof row.step_images === "string" ? row.step_images : JSON.stringify(row.step_images || []),
    stepVideos: typeof row.step_videos === "string" ? row.step_videos : JSON.stringify(row.step_videos || []),
    finalVideoUrl: row.final_video_url,
    isFavorite: row.is_favorite || false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Create a new recipe in the database
 */
export async function createRecipe(input: RecipeInput): Promise<{ success: boolean; recipe?: SavedRecipe; error?: string }> {
  try {
    // Parse JSON strings to objects for JSONB columns
    let ingredientsJson: any = [];
    let stepsJson: any = [];
    let tagsArray: string[] | null = null;

    try {
      ingredientsJson = JSON.parse(input.ingredients);
    } catch {
      console.warn("[RecipeDB] Failed to parse ingredients JSON");
    }

    try {
      stepsJson = JSON.parse(input.steps);
      // Enforce max 15 steps
      if (Array.isArray(stepsJson) && stepsJson.length > 15) {
        console.log(`[RecipeDB] Truncating steps from ${stepsJson.length} to 15`);
        stepsJson = stepsJson.slice(0, 15);
      }
    } catch {
      console.warn("[RecipeDB] Failed to parse steps JSON");
    }

    if (input.tags) {
      try {
        tagsArray = JSON.parse(input.tags);
      } catch {
        console.warn("[RecipeDB] Failed to parse tags JSON");
      }
    }

    const { data, error } = await supabaseAdmin
      .from("recipes")
      .insert({
        user_id: input.userId || null,
        title: input.dishName,
        description: input.description,
        cuisine: input.cuisine || null,
        category: input.category || "Main",
        difficulty: input.difficulty,
        prep_time_minutes: input.prepTime,
        cook_time_minutes: input.cookTime,
        servings: input.servings,
        ingredients: ingredientsJson,
        steps: stepsJson,
        tags: tagsArray,
        ai_image_url: input.imageUrl || null,
        original_image_url: input.originalImageUrl || null,
        step_images: input.stepImages ? JSON.parse(input.stepImages) : [],
        step_videos: input.stepVideos ? JSON.parse(input.stepVideos) : [],
        video_status: "none",
        is_favorite: false,
      })
      .select()
      .single();

    if (error) {
      console.error("[RecipeDB] Insert error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Created recipe: ${data.id}`);
    return { success: true, recipe: dbToSavedRecipe(data) };
  } catch (error: any) {
    console.error("[RecipeDB] Create error:", error);
    return { success: false, error: error?.message || "Failed to create recipe" };
  }
}

/**
 * Get a single recipe by ID
 */
export async function getRecipe(id: string): Promise<{ success: boolean; recipe?: SavedRecipe; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[RecipeDB] Get error:", error);
      return { success: false, error: "Recipe not found" };
    }

    return { success: true, recipe: dbToSavedRecipe(data) };
  } catch (error: any) {
    console.error("[RecipeDB] Get error:", error);
    return { success: false, error: error?.message || "Failed to get recipe" };
  }
}

/**
 * List recipes with optional filtering
 */
export async function listRecipes(options?: {
  userId?: string;
  category?: string;
  search?: string;
  favoritesOnly?: boolean;
}): Promise<{ success: boolean; recipes: SavedRecipe[]; error?: string }> {
  try {
    let query = supabaseAdmin.from("recipes").select("*");

    // Filter by user if provided
    if (options?.userId) {
      query = query.eq("user_id", options.userId);
    }

    // Filter by category
    if (options?.category && options.category !== "All") {
      if (options.category === "Favorites") {
        query = query.eq("is_favorite", true);
      } else {
        query = query.eq("category", options.category);
      }
    }

    // Filter favorites only
    if (options?.favoritesOnly) {
      query = query.eq("is_favorite", true);
    }

    // Search by title or description
    if (options?.search) {
      query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
    }

    // Order by creation date (newest first)
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("[RecipeDB] List error:", error);
      return { success: false, recipes: [], error: error.message };
    }

    const recipes = (data || []).map(dbToSavedRecipe);
    return { success: true, recipes };
  } catch (error: any) {
    console.error("[RecipeDB] List error:", error);
    return { success: false, recipes: [], error: error?.message || "Failed to list recipes" };
  }
}

/**
 * Delete a recipe by ID
 */
export async function deleteRecipe(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("recipes")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[RecipeDB] Delete error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Deleted recipe: ${id}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Delete error:", error);
    return { success: false, error: error?.message || "Failed to delete recipe" };
  }
}

/**
 * Toggle favorite status for a recipe
 */
export async function toggleFavorite(id: string): Promise<{ success: boolean; isFavorite?: boolean; error?: string }> {
  try {
    // First get current state
    const { data: current, error: getError } = await supabaseAdmin
      .from("recipes")
      .select("is_favorite")
      .eq("id", id)
      .single();

    if (getError) {
      return { success: false, error: "Recipe not found" };
    }

    const newFavorite = !current.is_favorite;

    // Update the favorite status
    const { error: updateError } = await supabaseAdmin
      .from("recipes")
      .update({ is_favorite: newFavorite, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateError) {
      console.error("[RecipeDB] Toggle favorite error:", updateError);
      return { success: false, error: updateError.message };
    }

    console.log(`[RecipeDB] Toggled favorite for ${id}: ${newFavorite}`);
    return { success: true, isFavorite: newFavorite };
  } catch (error: any) {
    console.error("[RecipeDB] Toggle favorite error:", error);
    return { success: false, error: error?.message || "Failed to toggle favorite" };
  }
}

/**
 * Update step images for a recipe
 */
export async function updateStepImages(recipeId: string, stepImages: string): Promise<{ success: boolean; error?: string }> {
  try {
    let stepImagesJson: any = [];
    try {
      stepImagesJson = JSON.parse(stepImages);
    } catch {
      console.warn("[RecipeDB] Failed to parse stepImages JSON");
    }

    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ step_images: stepImagesJson, updated_at: new Date().toISOString() })
      .eq("id", recipeId);

    if (error) {
      console.error("[RecipeDB] Update step images error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Updated step images for ${recipeId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Update step images error:", error);
    return { success: false, error: error?.message || "Failed to update step images" };
  }
}

/**
 * Update step videos for a recipe
 */
export async function updateStepVideos(recipeId: string, stepVideos: string): Promise<{ success: boolean; error?: string }> {
  try {
    let stepVideosJson: any = [];
    try {
      stepVideosJson = JSON.parse(stepVideos);
    } catch {
      console.warn("[RecipeDB] Failed to parse stepVideos JSON");
    }

    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ 
        step_videos: stepVideosJson, 
        video_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString() 
      })
      .eq("id", recipeId);

    if (error) {
      console.error("[RecipeDB] Update step videos error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Updated step videos for ${recipeId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Update step videos error:", error);
    return { success: false, error: error?.message || "Failed to update step videos" };
  }
}

/**
 * Update final video URL for a recipe
 */
export async function updateFinalVideoUrl(recipeId: string, finalVideoUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ 
        final_video_url: finalVideoUrl, 
        video_status: "completed",
        updated_at: new Date().toISOString() 
      })
      .eq("id", recipeId);

    if (error) {
      console.error("[RecipeDB] Update final video URL error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Updated final video URL for ${recipeId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Update final video URL error:", error);
    return { success: false, error: error?.message || "Failed to update final video URL" };
  }
}

/**
 * Update generated image URL for a recipe
 */
export async function updateGeneratedImage(recipeId: string, generatedImageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ 
        generated_image_url: generatedImageUrl,
        updated_at: new Date().toISOString() 
      })
      .eq("id", recipeId);

    if (error) {
      console.error("[RecipeDB] Update generated image error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Updated generated image for ${recipeId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Update generated image error:", error);
    return { success: false, error: error?.message || "Failed to update generated image" };
  }
}

/**
 * Update primary image selection for a recipe
 */
export async function updatePrimaryImage(recipeId: string, primaryImageUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("recipes")
      .update({ 
        primary_image_url: primaryImageUrl,
        updated_at: new Date().toISOString() 
      })
      .eq("id", recipeId);

    if (error) {
      console.error("[RecipeDB] Update primary image error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[RecipeDB] Updated primary image for ${recipeId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[RecipeDB] Update primary image error:", error);
    return { success: false, error: error?.message || "Failed to update primary image" };
  }
}

/**
 * Check if step images already exist for a recipe (for caching)
 */
export async function hasStepImages(recipeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("step_images")
      .eq("id", recipeId)
      .single();

    if (error || !data) return false;

    const stepImages = data.step_images;
    return Array.isArray(stepImages) && stepImages.length > 0 && stepImages.some((img: any) => img?.imageUrl);
  } catch {
    return false;
  }
}

/**
 * Check if step videos already exist for a recipe (for caching)
 */
export async function hasStepVideos(recipeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("step_videos")
      .eq("id", recipeId)
      .single();

    if (error || !data) return false;

    const stepVideos = data.step_videos;
    return Array.isArray(stepVideos) && stepVideos.length > 0 && stepVideos.some((vid: any) => vid?.videoUrl);
  } catch {
    return false;
  }
}

/**
 * Check if final video already exists for a recipe (for caching)
 */
export async function hasFinalVideo(recipeId: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("final_video_url")
      .eq("id", recipeId)
      .single();

    if (error || !data) return false;

    return !!data.final_video_url;
  } catch {
    return false;
  }
}

/**
 * Get cached step images for a recipe
 */
export async function getCachedStepImages(recipeId: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("step_images")
      .eq("id", recipeId)
      .single();

    if (error || !data) return null;

    const stepImages = data.step_images;
    if (Array.isArray(stepImages) && stepImages.length > 0) {
      return stepImages;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get cached step videos for a recipe
 */
export async function getCachedStepVideos(recipeId: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("step_videos")
      .eq("id", recipeId)
      .single();

    if (error || !data) return null;

    const stepVideos = data.step_videos;
    if (Array.isArray(stepVideos) && stepVideos.length > 0) {
      return stepVideos;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Get cached final video URL for a recipe
 */
export async function getCachedFinalVideoUrl(recipeId: string): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("recipes")
      .select("final_video_url")
      .eq("id", recipeId)
      .single();

    if (error || !data) return null;

    return data.final_video_url || null;
  } catch {
    return null;
  }
}
