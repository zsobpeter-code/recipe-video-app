/**
 * RevenueCat Integration for Dishcraft
 * 
 * Handles subscription management and in-app purchases.
 * 
 * PRODUCTS (3 total):
 * - dishcraft.photo_single: $1.99 (Consumable) - AI step photos for one recipe
 * - dishcraft.video_single: $6.99 (Consumable) - AI tutorial video for one recipe
 * - dishcraft.studio_monthly: $49.99/mo (Subscription) - Unlimited photos + 10 videos/month
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
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
  STUDIO_ACCESS: "studio_access",    // For Studio subscription
} as const;

// Package identifiers (matching RevenueCat dashboard)
export const PACKAGES = {
  // One-time purchases (consumables)
  PHOTO_SINGLE: "photo_single",           // $1.99 - AI step photos for one recipe
  VIDEO_SINGLE: "video_single",           // $6.99 - AI tutorial video for one recipe
  // Subscription
  STUDIO_MONTHLY: "studio_monthly",       // $49.99/month - Unlimited photos + 10 videos/month
} as const;

// Product IDs for App Store Connect
export const PRODUCT_IDS = {
  PHOTO_SINGLE: "dishcraft.photo_single",
  VIDEO_SINGLE: "dishcraft.video_single",
  STUDIO_MONTHLY: "dishcraft.studio_monthly",
} as const;

// Fair use limits for Studio subscription
export const STUDIO_LIMITS = {
  PHOTOS_PER_MONTH: -1,  // Unlimited
  VIDEOS_PER_MONTH: 10,  // 10 videos per month
} as const;

// Pricing display
export const PRICING = {
  PHOTO_SINGLE: "$1.99",
  VIDEO_SINGLE: "$6.99",
  STUDIO_MONTHLY: "$49.99/mo",
} as const;

interface RevenueCatContextType {
  isInitialized: boolean;
  hasStudioSubscription: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  checkStudioAccess: () => boolean;
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

  // Check if user has Studio subscription
  const checkStudioAccess = useCallback((): boolean => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[ENTITLEMENTS.STUDIO_ACCESS] !== undefined;
  }, [customerInfo]);

  const hasStudioSubscription = checkStudioAccess();

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
    hasStudioSubscription,
    customerInfo,
    offerings,
    purchasePackage,
    restorePurchases,
    checkStudioAccess,
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
  const { hasStudioSubscription } = useRevenueCat();

  // Studio subscribers have access to both photos and videos
  if (hasStudioSubscription) {
    return { canAccess: true, requiresUpgrade: false };
  }

  // Note: One-time purchases (consumables) are tracked via credits in our database,
  // not via RevenueCat entitlements. The app should check userCreditsDb for remaining credits.

  return {
    canAccess: false,
    reason: feature === "photos" 
      ? "Purchase Photo Single ($1.99) or subscribe to Dishcraft Studio ($49.99/mo)."
      : "Purchase Video Single ($6.99) or subscribe to Dishcraft Studio ($49.99/mo).",
    requiresUpgrade: true,
  };
}
