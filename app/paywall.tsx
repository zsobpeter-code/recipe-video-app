import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useRevenueCat, PACKAGES, PRICING } from "@/lib/revenuecat";
import type { PurchasesPackage } from "react-native-purchases";

interface PricingOption {
  id: string;
  packageId: string; // RevenueCat package identifier
  title: string;
  subtitle: string;
  price: string;
  priceDetail?: string;
  isBestValue?: boolean;
  isSubscription?: boolean;
  forPhotos?: boolean;
  forVideos?: boolean;
}

// All pricing options - 3 products only
const ALL_PRICING_OPTIONS: PricingOption[] = [
  {
    id: "photo_single",
    packageId: PACKAGES.PHOTO_SINGLE,
    title: "Photo Single",
    subtitle: "AI step photos for 1 recipe",
    price: PRICING.PHOTO_SINGLE,
    forPhotos: true,
    forVideos: false,
  },
  {
    id: "video_single",
    packageId: PACKAGES.VIDEO_SINGLE,
    title: "Video Single",
    subtitle: "AI tutorial video for 1 recipe",
    price: PRICING.VIDEO_SINGLE,
    forPhotos: false,
    forVideos: true,
  },
  {
    id: "studio_monthly",
    packageId: PACKAGES.STUDIO_MONTHLY,
    title: "Dishcraft Studio",
    subtitle: "Unlimited photos + 10 videos/month",
    price: PRICING.STUDIO_MONTHLY,
    isBestValue: true,
    isSubscription: true,
    forPhotos: true,
    forVideos: true,
  },
];

const STUDIO_FEATURES = [
  { icon: "photo.fill", text: "Unlimited AI step photos" },
  { icon: "video.fill", text: "10 AI tutorial videos per month" },
  { icon: "wand.and.stars", text: "Flux AI + Runway Gen-3 technology" },
  { icon: "square.and.arrow.up", text: "Share to TikTok & Instagram" },
  { icon: "arrow.down.circle", text: "Save to camera roll" },
];

const PHOTO_FEATURES = [
  { icon: "photo.fill", text: "AI-generated photos for each step" },
  { icon: "wand.and.stars", text: "Flux AI image technology" },
  { icon: "eye", text: "See what each step should look like" },
  { icon: "bookmark.fill", text: "Photos saved with your recipe" },
];

const VIDEO_FEATURES = [
  { icon: "video.fill", text: "AI-generated cooking tutorial video" },
  { icon: "wand.and.stars", text: "Runway Gen-3 video technology" },
  { icon: "square.and.arrow.up", text: "Share directly to TikTok & Instagram" },
  { icon: "arrow.down.circle", text: "Save videos to camera roll" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ 
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
    productType?: string; // "video" or "step_photos"
    recipeId?: string;
    userId?: string;
    stepImages?: string; // JSON string of step images with HTTPS URLs
  }>();

  const { 
    isInitialized, 
    offerings, 
    purchasePackage, 
    restorePurchases,
    getPackageByIdentifier,
  } = useRevenueCat();

  const isStepPhotos = params.productType === "step_photos";
  
  // Filter options based on product type
  const pricingOptions = ALL_PRICING_OPTIONS.filter(o => {
    if (isStepPhotos) return o.forPhotos;
    return o.forVideos;
  });
  
  // Default to Studio (best value) option
  const defaultOption = pricingOptions.find(o => o.isBestValue)?.id || pricingOptions[0].id;
  const [selectedOption, setSelectedOption] = useState<string>(defaultOption);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayPrices, setDisplayPrices] = useState<Record<string, string>>({});

  // Get features based on selected option
  const getFeatures = () => {
    const selected = pricingOptions.find(o => o.id === selectedOption);
    if (selected?.id === "studio_monthly") return STUDIO_FEATURES;
    if (isStepPhotos) return PHOTO_FEATURES;
    return VIDEO_FEATURES;
  };

  // Update prices from RevenueCat offerings
  useEffect(() => {
    if (!offerings) return;

    const prices: Record<string, string> = {};
    pricingOptions.forEach(option => {
      const pkg = getPackageByIdentifier(option.packageId);
      if (pkg) {
        prices[option.id] = pkg.product.priceString;
      }
    });
    setDisplayPrices(prices);
  }, [offerings, isStepPhotos]);

  const handleSelectOption = (optionId: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedOption(optionId);
  };

  const handleContinue = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const selectedPricing = pricingOptions.find(o => o.id === selectedOption);
    if (!selectedPricing) return;

    setIsProcessing(true);

    try {
      // Get the RevenueCat package
      const pkg = getPackageByIdentifier(selectedPricing.packageId);
      
      if (!pkg) {
        // Fallback for web or if package not found - use mock purchase
        console.log("[Paywall] Package not found, using mock purchase");
        await new Promise((resolve) => setTimeout(resolve, 1500));
        handlePurchaseSuccess();
        return;
      }

      // Make the actual purchase
      const result = await purchasePackage(pkg);

      if (result.success) {
        handlePurchaseSuccess();
      } else if (result.error && result.error !== "Purchase cancelled") {
        Alert.alert("Purchase Failed", result.error);
      }
    } catch (error: any) {
      console.error("[Paywall] Purchase error:", error);
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePurchaseSuccess = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Navigate based on product type
    if (isStepPhotos) {
      // Navigate to step photo generation
      router.replace({
        pathname: "/step-photo-generation" as any,
        params: {
          dishName: params.dishName,
          recipeData: params.recipeData,
          imageUri: params.imageUri,
          recipeId: params.recipeId,
        },
      });
    } else if (params.recipeData) {
      // Navigate to video generation with userId and recipeId for storage
      router.replace({
        pathname: "/video-generation" as any,
        params: {
          dishName: params.dishName,
          recipeData: params.recipeData,
          imageUri: params.imageUri,
          userId: params.userId || "anonymous",
          recipeId: params.recipeId || `temp_${Date.now()}`,
          stepImages: params.stepImages, // Pass step images with HTTPS URLs
        },
      });
    } else {
      // Just close paywall if no recipe data
      Alert.alert(
        "Purchase Successful!",
        "You now have access to this feature.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    }
  };

  const handleRestorePurchases = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    setIsProcessing(true);

    try {
      const result = await restorePurchases();

      if (result.success) {
        Alert.alert(
          "Purchases Restored",
          "Your previous purchases have been restored.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        Alert.alert(
          "No Purchases Found",
          result.error || "No previous purchases found to restore.",
          [{ text: "OK" }]
        );
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to restore purchases.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Get display price for an option (from RevenueCat or fallback)
  const getDisplayPrice = (option: PricingOption): string => {
    return displayPrices[option.id] || option.price;
  };

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]} containerClassName="bg-background">
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Close button */}
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark" size={24} color="#888888" />
        </TouchableOpacity>

        {/* Premium Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.premiumIcon}>
            <IconSymbol name="crown.fill" size={48} color="#C9A962" />
          </View>
          <View style={styles.iconGlow} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
          {isStepPhotos ? "Unlock Step Photos" : "Unlock Video Generation"}
        </Text>
        <Text style={[styles.subtitle, { fontFamily: "Inter" }]}>
          {isStepPhotos 
            ? "Generate beautiful AI photos for each cooking step"
            : "Transform your recipes into beautiful step-by-step cooking tutorials"}
        </Text>

        {/* Features */}
        <View style={styles.featuresContainer}>
          {getFeatures().map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <View style={styles.featureIconContainer}>
                <IconSymbol name={feature.icon as any} size={18} color="#C9A962" />
              </View>
              <Text style={[styles.featureText, { fontFamily: "Inter" }]}>
                {feature.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Pricing Options */}
        <View style={styles.pricingContainer}>
          {pricingOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.pricingOption,
                selectedOption === option.id && styles.pricingOptionSelected,
                option.isBestValue && styles.pricingOptionBestValue,
              ]}
              onPress={() => handleSelectOption(option.id)}
              activeOpacity={0.8}
            >
              {option.isBestValue && (
                <View style={styles.bestValueBadge}>
                  <Text style={[styles.bestValueText, { fontFamily: "Inter-Medium" }]}>
                    BEST VALUE
                  </Text>
                </View>
              )}
              
              <View style={styles.pricingContent}>
                <View style={styles.pricingLeft}>
                  <View style={[
                    styles.radioOuter,
                    selectedOption === option.id && styles.radioOuterSelected,
                  ]}>
                    {selectedOption === option.id && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <View style={styles.pricingInfo}>
                    <Text style={[styles.pricingTitle, { fontFamily: "Inter-Medium" }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.pricingSubtitle, { fontFamily: "Inter" }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.pricingRight}>
                  <Text style={[styles.pricingPrice, { fontFamily: "Inter-Medium" }]}>
                    {getDisplayPrice(option)}
                  </Text>
                  {option.priceDetail && (
                    <Text style={[styles.pricingDetail, { fontFamily: "Inter" }]}>
                      {option.priceDetail}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, isProcessing && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color="#1A1A1A" />
          ) : (
            <Text style={[styles.continueButtonText, { fontFamily: "Inter-Medium" }]}>
              Continue
            </Text>
          )}
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={isProcessing}
          activeOpacity={0.7}
        >
          <Text style={[styles.restoreButtonText, { fontFamily: "Inter" }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={[styles.termsText, { fontFamily: "Inter" }]}>
          {pricingOptions.find(o => o.id === selectedOption)?.isSubscription
            ? "Subscription auto-renews monthly. Cancel anytime in Settings."
            : "One-time purchase. No subscription required."}
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
  },
  premiumIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  iconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
  },
  title: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 15,
    color: "#888888",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 22,
    marginBottom: 24,
  },
  featuresContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  featureIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    color: "#CCCCCC",
    flex: 1,
  },
  pricingContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
    gap: 12,
  },
  pricingOption: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    position: "relative",
  },
  pricingOptionSelected: {
    borderColor: "#C9A962",
    backgroundColor: "rgba(201, 169, 98, 0.1)",
  },
  pricingOptionBestValue: {
    borderColor: "#C9A962",
  },
  bestValueBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    backgroundColor: "#C9A962",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 10,
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
  pricingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pricingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#555555",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: "#C9A962",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#C9A962",
  },
  pricingInfo: {
    flex: 1,
  },
  pricingTitle: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  pricingSubtitle: {
    fontSize: 13,
    color: "#888888",
  },
  pricingRight: {
    alignItems: "flex-end",
  },
  pricingPrice: {
    fontSize: 18,
    color: "#C9A962",
  },
  pricingDetail: {
    fontSize: 11,
    color: "#22C55E",
    marginTop: 2,
  },
  continueButton: {
    marginHorizontal: 16,
    backgroundColor: "#C9A962",
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  continueButtonDisabled: {
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 17,
    color: "#1A1A1A",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 8,
  },
  restoreButtonText: {
    fontSize: 14,
    color: "#888888",
    textDecorationLine: "underline",
  },
  termsText: {
    fontSize: 11,
    color: "#555555",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 16,
  },
});
