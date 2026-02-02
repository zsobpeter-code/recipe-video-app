/**
 * RevenueCat Integration for Dishcraft
 * 
 * Handles subscription management and in-app purchases.
 * 
 * SUBSCRIPTIONS:
 * - unlimited_photos: $9.99/month (unlimited step photos, fair use 200/month)
 * - unlimited_videos: $29.99/month (unlimited videos, fair use 50/month)
 * 
 * ONE-TIME PURCHASES (consumable):
 * - step_photos_single: $1.99 (step photos for 1 recipe)
 * - video_single: $4.99 (video for 1 recipe)
 * - photo_pack_5: $7.49 (step photos for 5 recipes, save 25%)
 * - video_pack_5: $17.49 (videos for 5 recipes, save 30%)
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform, Alert } from "react-native";
import Purchases, {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
  LOG_LEVEL,
} from "react-native-purchases";

// RevenueCat API Key (from MCP setup)
const REVENUECAT_API_KEY = "appl_LoboVIxXHxHWrhkLQaTqgaRBlDe";

// Entitlement identifiers
export const ENTITLEMENTS = {
  PHOTOS_ACCESS: "photos_access",    // For photo subscription
  VIDEOS_ACCESS: "videos_access",    // For video subscription
} as const;

// Package identifiers (matching RevenueCat dashboard)
export const PACKAGES = {
  // Subscriptions
  UNLIMITED_PHOTOS: "$rc_monthly",                    // $9.99/month
  UNLIMITED_VIDEOS: "$rc_custom_unlimited_videos",    // $29.99/month
  // One-time purchases
  STEP_PHOTOS_SINGLE: "$rc_custom_step_photos_single", // $1.99
  VIDEO_SINGLE: "$rc_custom_video_single",             // $4.99
  PHOTO_PACK_5: "$rc_custom_photo_pack_5",             // $7.49
  VIDEO_PACK_5: "$rc_custom_video_pack_5",             // $17.49
} as const;

// Fair use limits
export const FAIR_USE_LIMITS = {
  PHOTOS_PER_MONTH: 200,
  VIDEOS_PER_MONTH: 50,
} as const;

interface RevenueCatContextType {
  isInitialized: boolean;
  hasPhotosSubscription: boolean;
  hasVideosSubscription: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  checkPhotosAccess: () => boolean;
  checkVideosAccess: () => boolean;
  getPackageByIdentifier: (identifier: string) => PurchasesPackage | undefined;
  refreshCustomerInfo: () => Promise<void>;
}

const RevenueCatContext = createContext<RevenueCatContextType | null>(null);

export function useRevenueCat() {
  const context = useContext(RevenueCatContext);
  if (!context) {
    throw new Error("useRevenueCat must be used within RevenueCatProvider");
  }
  return context;
}

interface RevenueCatProviderProps {
  children: React.ReactNode;
}

export function RevenueCatProvider({ children }: RevenueCatProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

  // Initialize RevenueCat on mount
  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        // Skip initialization on web
        if (Platform.OS === "web") {
          console.log("[RevenueCat] Skipping initialization on web");
          setIsInitialized(true);
          return;
        }

        // Configure RevenueCat
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        
        await Purchases.configure({
          apiKey: REVENUECAT_API_KEY,
        });

        console.log("[RevenueCat] Configured successfully");

        // Get customer info
        const info = await Purchases.getCustomerInfo();
        setCustomerInfo(info);
        console.log("[RevenueCat] Customer info loaded:", {
          entitlements: Object.keys(info.entitlements.active),
        });

        // Get offerings
        const offeringsResult = await Purchases.getOfferings();
        if (offeringsResult.current) {
          setOfferings(offeringsResult.current);
          console.log("[RevenueCat] Offerings loaded:", {
            identifier: offeringsResult.current.identifier,
            packages: offeringsResult.current.availablePackages.map(p => p.identifier),
          });
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("[RevenueCat] Initialization error:", error);
        // Still mark as initialized so app can function (with mock mode)
        setIsInitialized(true);
      }
    };

    initRevenueCat();

    return () => {
      // Cleanup handled by RevenueCat SDK internally
    };
  }, []);

  // Check if user has photos subscription
  const checkPhotosAccess = useCallback((): boolean => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[ENTITLEMENTS.PHOTOS_ACCESS] !== undefined;
  }, [customerInfo]);

  // Check if user has videos subscription
  const checkVideosAccess = useCallback((): boolean => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[ENTITLEMENTS.VIDEOS_ACCESS] !== undefined;
  }, [customerInfo]);

  const hasPhotosSubscription = checkPhotosAccess();
  const hasVideosSubscription = checkVideosAccess();

  // Purchase a package
  const purchasePackage = useCallback(async (pkg: PurchasesPackage): Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }> => {
    try {
      // Web fallback - mock purchase
      if (Platform.OS === "web") {
        console.log("[RevenueCat] Mock purchase on web:", pkg.identifier);
        return { success: true };
      }

      console.log("[RevenueCat] Purchasing package:", pkg.identifier);
      const { customerInfo: newInfo } = await Purchases.purchasePackage(pkg);
      setCustomerInfo(newInfo);
      
      console.log("[RevenueCat] Purchase successful:", {
        entitlements: Object.keys(newInfo.entitlements.active),
      });

      return { success: true, customerInfo: newInfo };
    } catch (error: any) {
      // Handle user cancellation
      if (error.userCancelled) {
        console.log("[RevenueCat] Purchase cancelled by user");
        return { success: false, error: "Purchase cancelled" };
      }

      console.error("[RevenueCat] Purchase error:", error);
      return { 
        success: false, 
        error: error.message || "Purchase failed. Please try again." 
      };
    }
  }, []);

  // Restore purchases
  const restorePurchases = useCallback(async (): Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }> => {
    try {
      // Web fallback
      if (Platform.OS === "web") {
        console.log("[RevenueCat] Mock restore on web");
        return { success: true };
      }

      console.log("[RevenueCat] Restoring purchases...");
      const info = await Purchases.restorePurchases();
      setCustomerInfo(info);

      const hasActiveEntitlements = Object.keys(info.entitlements.active).length > 0;
      
      console.log("[RevenueCat] Restore complete:", {
        hasActiveEntitlements,
        entitlements: Object.keys(info.entitlements.active),
      });

      if (!hasActiveEntitlements) {
        return { 
          success: false, 
          error: "No previous purchases found to restore.",
          customerInfo: info 
        };
      }

      return { success: true, customerInfo: info };
    } catch (error: any) {
      console.error("[RevenueCat] Restore error:", error);
      return { 
        success: false, 
        error: error.message || "Failed to restore purchases. Please try again." 
      };
    }
  }, []);

  // Get package by identifier
  const getPackageByIdentifier = useCallback((identifier: string): PurchasesPackage | undefined => {
    if (!offerings) return undefined;
    return offerings.availablePackages.find(p => p.identifier === identifier);
  }, [offerings]);

  // Refresh customer info
  const refreshCustomerInfo = useCallback(async () => {
    try {
      if (Platform.OS === "web") return;
      
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (error) {
      console.error("[RevenueCat] Refresh error:", error);
    }
  }, []);

  const value: RevenueCatContextType = {
    isInitialized,
    hasPhotosSubscription,
    hasVideosSubscription,
    customerInfo,
    offerings,
    purchasePackage,
    restorePurchases,
    checkPhotosAccess,
    checkVideosAccess,
    getPackageByIdentifier,
    refreshCustomerInfo,
  };

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

/**
 * Hook to check if user can access a feature
 */
export function useCanAccessFeature(feature: "photos" | "videos"): {
  canAccess: boolean;
  reason?: string;
  requiresUpgrade: boolean;
} {
  const { hasPhotosSubscription, hasVideosSubscription, customerInfo } = useRevenueCat();

  // Check subscription access
  if (feature === "photos" && hasPhotosSubscription) {
    return { canAccess: true, requiresUpgrade: false };
  }
  if (feature === "videos" && hasVideosSubscription) {
    return { canAccess: true, requiresUpgrade: false };
  }

  // Note: One-time purchases (consumables) are tracked via credits in our database,
  // not via RevenueCat entitlements. The app should check userCreditsDb for remaining credits.

  return {
    canAccess: false,
    reason: feature === "photos" 
      ? "Subscribe to Unlimited Photos ($9.99/mo) or purchase a photo pack."
      : "Subscribe to Unlimited Videos ($29.99/mo) or purchase a video pack.",
    requiresUpgrade: true,
  };
}
