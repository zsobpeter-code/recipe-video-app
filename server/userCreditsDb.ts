/**
 * User Credits Database Service
 * 
 * Handles credit tracking for bundle purchases and fair use limits.
 * - Photo credits: For photo bundle purchases
 * - Video credits: For video bundle purchases
 * - Videos generated this month: For 50/month fair use cap on unlimited subscriptions
 */

import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client
const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface UserCredits {
  id: string;
  user_id: string;
  photo_credits: number;
  video_credits: number;
  videos_generated_this_month: number;
  month_reset_at: string;
  created_at: string;
  updated_at: string;
}

// Fair use limit for unlimited subscription
const MONTHLY_VIDEO_LIMIT = 50;

/**
 * Get or create user credits record
 */
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  try {
    // First try to get existing record
    const { data, error } = await supabaseAdmin
      .from("user_credits")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("[UserCredits] Get error:", error);
      return null;
    }

    if (data) {
      // Check if we need to reset monthly counter
      const monthReset = new Date(data.month_reset_at);
      const now = new Date();
      
      // Reset if we're in a new month
      if (monthReset.getMonth() !== now.getMonth() || monthReset.getFullYear() !== now.getFullYear()) {
        console.log(`[UserCredits] Resetting monthly counter for user ${userId}`);
        const { data: updated, error: updateError } = await supabaseAdmin
          .from("user_credits")
          .update({
            videos_generated_this_month: 0,
            month_reset_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("user_id", userId)
          .select()
          .single();

        if (updateError) {
          console.error("[UserCredits] Reset error:", updateError);
          return data;
        }
        return updated;
      }

      return data;
    }

    // Create new record if doesn't exist
    const { data: newRecord, error: insertError } = await supabaseAdmin
      .from("user_credits")
      .insert({
        user_id: userId,
        photo_credits: 0,
        video_credits: 0,
        videos_generated_this_month: 0,
        month_reset_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("[UserCredits] Insert error:", insertError);
      return null;
    }

    console.log(`[UserCredits] Created new credits record for user ${userId}`);
    return newRecord;
  } catch (error) {
    console.error("[UserCredits] Error:", error);
    return null;
  }
}

/**
 * Check if user can generate video (fair use limit)
 * Returns true if under limit, false if limit reached
 */
export async function canGenerateVideo(userId: string, isUnlimitedSubscription: boolean): Promise<{ allowed: boolean; remaining: number; message?: string }> {
  try {
    const credits = await getUserCredits(userId);
    
    if (!credits) {
      return { allowed: false, remaining: 0, message: "Could not verify credits" };
    }

    // For unlimited subscription, check fair use cap
    if (isUnlimitedSubscription) {
      const remaining = MONTHLY_VIDEO_LIMIT - credits.videos_generated_this_month;
      
      if (credits.videos_generated_this_month >= MONTHLY_VIDEO_LIMIT) {
        return {
          allowed: false,
          remaining: 0,
          message: `You've reached your monthly limit of ${MONTHLY_VIDEO_LIMIT} videos. Your limit resets on the 1st of next month.`,
        };
      }
      
      return { allowed: true, remaining };
    }

    // For bundle purchases, check video credits
    if (credits.video_credits <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: "You don't have any video credits. Purchase a video bundle to continue.",
      };
    }

    return { allowed: true, remaining: credits.video_credits };
  } catch (error) {
    console.error("[UserCredits] Check error:", error);
    return { allowed: false, remaining: 0, message: "Error checking credits" };
  }
}

/**
 * Check if user can generate step photos
 */
export async function canGeneratePhotos(userId: string, isUnlimitedSubscription: boolean): Promise<{ allowed: boolean; remaining: number; message?: string }> {
  try {
    // Unlimited photo subscription = always allowed
    if (isUnlimitedSubscription) {
      return { allowed: true, remaining: 999 };
    }

    const credits = await getUserCredits(userId);
    
    if (!credits) {
      return { allowed: false, remaining: 0, message: "Could not verify credits" };
    }

    if (credits.photo_credits <= 0) {
      return {
        allowed: false,
        remaining: 0,
        message: "You don't have any photo credits. Purchase a photo bundle to continue.",
      };
    }

    return { allowed: true, remaining: credits.photo_credits };
  } catch (error) {
    console.error("[UserCredits] Check error:", error);
    return { allowed: false, remaining: 0, message: "Error checking credits" };
  }
}

/**
 * Decrement video credits after successful generation
 * Only call this AFTER video generation succeeds
 */
export async function decrementVideoCredits(userId: string, isUnlimitedSubscription: boolean): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return false;

    if (isUnlimitedSubscription) {
      // Increment monthly counter for unlimited subscription
      const { error } = await supabaseAdmin
        .from("user_credits")
        .update({
          videos_generated_this_month: credits.videos_generated_this_month + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        console.error("[UserCredits] Decrement error:", error);
        return false;
      }

      console.log(`[UserCredits] Incremented monthly video count for ${userId}: ${credits.videos_generated_this_month + 1}/${MONTHLY_VIDEO_LIMIT}`);
      return true;
    }

    // Decrement video credits for bundle purchase
    const { error } = await supabaseAdmin
      .from("user_credits")
      .update({
        video_credits: Math.max(0, credits.video_credits - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[UserCredits] Decrement error:", error);
      return false;
    }

    console.log(`[UserCredits] Decremented video credits for ${userId}: ${credits.video_credits - 1} remaining`);
    return true;
  } catch (error) {
    console.error("[UserCredits] Decrement error:", error);
    return false;
  }
}

/**
 * Decrement photo credits after successful generation
 * Only call this AFTER photo generation succeeds
 */
export async function decrementPhotoCredits(userId: string): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return false;

    const { error } = await supabaseAdmin
      .from("user_credits")
      .update({
        photo_credits: Math.max(0, credits.photo_credits - 1),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[UserCredits] Decrement error:", error);
      return false;
    }

    console.log(`[UserCredits] Decremented photo credits for ${userId}: ${credits.photo_credits - 1} remaining`);
    return true;
  } catch (error) {
    console.error("[UserCredits] Decrement error:", error);
    return false;
  }
}

/**
 * Add credits to user account (after purchase)
 */
export async function addCredits(userId: string, photoCredits: number, videoCredits: number): Promise<boolean> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) return false;

    const { error } = await supabaseAdmin
      .from("user_credits")
      .update({
        photo_credits: credits.photo_credits + photoCredits,
        video_credits: credits.video_credits + videoCredits,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("[UserCredits] Add credits error:", error);
      return false;
    }

    console.log(`[UserCredits] Added credits for ${userId}: +${photoCredits} photos, +${videoCredits} videos`);
    return true;
  } catch (error) {
    console.error("[UserCredits] Add credits error:", error);
    return false;
  }
}

/**
 * Get remaining credits for display
 */
export async function getRemainingCredits(userId: string): Promise<{ photoCredits: number; videoCredits: number; videosThisMonth: number; monthlyLimit: number }> {
  try {
    const credits = await getUserCredits(userId);
    if (!credits) {
      return { photoCredits: 0, videoCredits: 0, videosThisMonth: 0, monthlyLimit: MONTHLY_VIDEO_LIMIT };
    }

    return {
      photoCredits: credits.photo_credits,
      videoCredits: credits.video_credits,
      videosThisMonth: credits.videos_generated_this_month,
      monthlyLimit: MONTHLY_VIDEO_LIMIT,
    };
  } catch (error) {
    return { photoCredits: 0, videoCredits: 0, videosThisMonth: 0, monthlyLimit: MONTHLY_VIDEO_LIMIT };
  }
}
