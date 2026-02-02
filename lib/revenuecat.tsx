/**
 * RevenueCat Integration for Dishcraft
 * 
 * Handles subscription management and in-app purchases.
 * 
 * Products:
 * - Pro Monthly: $9.99/month - Unlimited photos + 50 videos/month
 * - Pro Annual: $79.99/year - Same as monthly, 33% savings
 * - Photo Bundle: $2.99 - 10 photo credits
 * - Video Bundle Small: $4.99 - 3 video credits
 * - Video Bundle Large: $12.99 - 10 video credits
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
  PRO_UNLIMITED: "pro_unlimited",
  PHOTO_BUNDLE: "photo_bundle",
  VIDEO_BUNDLE: "video_bundle",
} as const;

// Package identifiers
export const PACKAGES = {
  MONTHLY: "$rc_monthly",
  ANNUAL: "$rc_annual",
  PHOTO_BUNDLE: "$rc_custom_photo_bundle",
  VIDEO_BUNDLE_SMALL: "$rc_custom_video_bundle_small",
  VIDEO_BUNDLE_LARGE: "$rc_custom_video_bundle_large",
} as const;

interface RevenueCatContextType {
  isInitialized: boolean;
  isProUser: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOffering | null;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  restorePurchases: () => Promise<{ success: boolean; error?: string; customerInfo?: CustomerInfo }>;
  checkProStatus: () => boolean;
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

    // Listen for customer info updates
    // Note: On web, Purchases is not available, so we skip this
    // The listener API varies by version, so we handle cleanup carefully

    return () => {
      // Cleanup handled by RevenueCat SDK internally
    };
  }, []);

  // Check if user has pro subscription
  const checkProStatus = useCallback((): boolean => {
    if (!customerInfo) return false;
    return customerInfo.entitlements.active[ENTITLEMENTS.PRO_UNLIMITED] !== undefined;
  }, [customerInfo]);

  const isProUser = checkProStatus();

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
    isProUser,
    customerInfo,
    offerings,
    purchasePackage,
    restorePurchases,
    checkProStatus,
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
  const { isProUser, customerInfo } = useRevenueCat();

  // Pro users can access everything
  if (isProUser) {
    return { canAccess: true, requiresUpgrade: false };
  }

  // Check for bundle entitlements
  if (customerInfo) {
    if (feature === "photos" && customerInfo.entitlements.active[ENTITLEMENTS.PHOTO_BUNDLE]) {
      return { canAccess: true, requiresUpgrade: false };
    }
    if (feature === "videos" && customerInfo.entitlements.active[ENTITLEMENTS.VIDEO_BUNDLE]) {
      return { canAccess: true, requiresUpgrade: false };
    }
  }

  return {
    canAccess: false,
    reason: `Upgrade to Pro or purchase a ${feature} bundle to access this feature.`,
    requiresUpgrade: true,
  };
}
