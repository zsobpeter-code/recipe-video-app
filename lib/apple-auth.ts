import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export interface AppleSignInResult {
  success: boolean;
  error?: string;
}

/**
 * Sign in with Apple using native authentication on iOS
 * Falls back to OAuth flow on other platforms
 */
export async function signInWithApple(): Promise<AppleSignInResult> {
  try {
    // Check if Apple Authentication is available (iOS only)
    if (Platform.OS === "ios") {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      
      if (isAvailable) {
        // Use native Apple Sign In on iOS
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        // Sign in with Supabase using the Apple ID token
        if (credential.identityToken) {
          const { error } = await supabase.auth.signInWithIdToken({
            provider: "apple",
            token: credential.identityToken,
          });

          if (error) {
            return { success: false, error: error.message };
          }

          return { success: true };
        } else {
          return { success: false, error: "No identity token received from Apple" };
        }
      }
    }

    // For web and Android, use OAuth flow
    // Note: This requires proper redirect URL configuration in Supabase
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: Platform.OS === "web" 
          ? window.location.origin + "/oauth/callback"
          : undefined,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      // Handle user cancellation
      if (error.message.includes("canceled") || error.message.includes("cancelled")) {
        return { success: false, error: "Sign in was cancelled" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "An unknown error occurred" };
  }
}

/**
 * Check if Apple Sign In is available on the current platform
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS === "ios") {
    return AppleAuthentication.isAvailableAsync();
  }
  // Apple Sign In via OAuth is available on all platforms
  return true;
}
