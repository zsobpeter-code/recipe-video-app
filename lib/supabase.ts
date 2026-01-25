import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Get Supabase credentials from environment variables
// These are set via EXPO_PUBLIC_ prefix for client-side access
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// Custom storage adapter that uses SecureStore on native and AsyncStorage on web
const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    if (Platform.OS === "web") {
      return AsyncStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      return AsyncStorage.setItem(key, value);
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      return AsyncStorage.removeItem(key);
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database types
export interface User {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  subscription_tier: string;
  video_credits: number;
  created_at: string;
  updated_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  user_note: string | null;
  original_image_url: string | null;
  input_type: string | null;
  ai_image_url: string | null;
  video_url: string | null;
  video_status: string;
  ingredients: { name: string; amount: string; unit: string }[] | null;
  steps: { step_number: number; instruction: string; duration_minutes?: number }[] | null;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  servings: number | null;
  difficulty: string | null;
  category: string | null;
  tags: string[] | null;
  folder: string | null;
  is_favorite: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecipePhoto {
  id: string;
  recipe_id: string;
  user_id: string;
  image_url: string;
  note: string | null;
  created_at: string;
}

export interface Generation {
  id: string;
  user_id: string;
  recipe_id: string;
  type: string;
  status: string;
  cost_usd: number | null;
  video_duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount_usd: number | null;
  currency: string;
  status: string | null;
  provider: string | null;
  provider_transaction_id: string | null;
  created_at: string;
}
