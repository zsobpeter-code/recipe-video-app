import { useState } from "react";
import { 
  View, 
  Text, 
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface PricingOption {
  id: string;
  title: string;
  subtitle: string;
  price: string;
  pricePerVideo?: string;
  isBestValue?: boolean;
  credits?: number;
}

const VIDEO_PRICING_OPTIONS: PricingOption[] = [
  {
    id: "single",
    title: "Single Video",
    subtitle: "Pay as you go",
    price: "$4.99",
    credits: 1,
  },
  {
    id: "pack5",
    title: "5 Video Pack",
    subtitle: "Save 30%",
    price: "$17.49",
    pricePerVideo: "$3.50/video",
    credits: 5,
  },
  {
    id: "unlimited",
    title: "Unlimited",
    subtitle: "Best Value",
    price: "$29.99/mo",
    isBestValue: true,
    credits: -1, // unlimited
  },
];

const STEP_PHOTOS_PRICING_OPTIONS: PricingOption[] = [
  {
    id: "single",
    title: "This Recipe",
    subtitle: "One-time purchase",
    price: "$1.99",
    credits: 1,
  },
  {
    id: "pack5",
    title: "5 Recipe Pack",
    subtitle: "Save 25%",
    price: "$7.49",
    pricePerVideo: "$1.50/recipe",
    credits: 5,
  },
  {
    id: "unlimited",
    title: "Unlimited Photos",
    subtitle: "Best Value",
    price: "$9.99/mo",
    isBestValue: true,
    credits: -1, // unlimited
  },
];

const FEATURES = [
  { icon: "video.fill", text: "Generate cooking tutorial videos" },
  { icon: "photo.fill", text: "AI-enhanced food photography" },
  { icon: "bookmark.fill", text: "Unlimited recipe storage" },
  { icon: "arrow.clockwise", text: "Cloud sync across devices" },
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
  }>();

  const isStepPhotos = params.productType === "step_photos";
  
  const [selectedOption, setSelectedOption] = useState<string>("pack5");
  const [isProcessing, setIsProcessing] = useState(false);

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

    setIsProcessing(true);

    // Simulate purchase processing
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setIsProcessing(false);

    // Mock successful purchase
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
      // Navigate to video generation
      router.replace({
        pathname: "/video-generation" as any,
        params: {
          dishName: params.dishName,
          recipeData: params.recipeData,
          imageUri: params.imageUri,
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

  const handleRestorePurchases = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    Alert.alert(
      "Restore Purchases",
      "No previous purchases found.",
      [{ text: "OK" }]
    );
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
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
          {FEATURES.map((feature, index) => (
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
          {(isStepPhotos ? STEP_PHOTOS_PRICING_OPTIONS : VIDEO_PRICING_OPTIONS).map((option) => (
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
                  <View>
                    <Text style={[styles.pricingTitle, { fontFamily: "Inter-Medium" }]}>
                      {option.title}
                    </Text>
                    <Text style={[styles.pricingSubtitle, { fontFamily: "Inter" }]}>
                      {option.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={styles.pricingRight}>
                  <Text style={[styles.pricingPrice, { fontFamily: "PlayfairDisplay-Bold" }]}>
                    {option.price}
                  </Text>
                  {option.pricePerVideo && (
                    <Text style={[styles.pricingPerVideo, { fontFamily: "Inter" }]}>
                      {option.pricePerVideo}
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
          activeOpacity={0.8}
          disabled={isProcessing}
        >
          <Text style={[styles.continueButtonText, { fontFamily: "Inter-Medium" }]}>
            {isProcessing ? "Processing..." : "Continue"}
          </Text>
        </TouchableOpacity>

        {/* Restore Purchases */}
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          activeOpacity={0.7}
        >
          <Text style={[styles.restoreButtonText, { fontFamily: "Inter" }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text style={[styles.legalText, { fontFamily: "Inter" }]}>
          Payment will be charged to your Apple ID account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  closeButton: {
    alignSelf: "flex-end",
    padding: 8,
    marginTop: 8,
  },
  iconContainer: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  premiumIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  iconGlow: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    zIndex: -1,
  },
  title: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresContainer: {
    marginBottom: 32,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  featureIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    fontSize: 15,
    color: "#FFFFFF",
    flex: 1,
  },
  pricingContainer: {
    gap: 12,
    marginBottom: 24,
  },
  pricingOption: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.1)",
    padding: 16,
    position: "relative",
    overflow: "hidden",
  },
  pricingOptionSelected: {
    borderColor: "#C9A962",
    backgroundColor: "rgba(201, 169, 98, 0.08)",
  },
  pricingOptionBestValue: {
    paddingTop: 32,
  },
  bestValueBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#C9A962",
    paddingVertical: 4,
    alignItems: "center",
  },
  bestValueText: {
    fontSize: 11,
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  pricingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pricingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#555555",
    justifyContent: "center",
    alignItems: "center",
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
  pricingTitle: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  pricingSubtitle: {
    fontSize: 13,
    color: "#888888",
    marginTop: 2,
  },
  pricingRight: {
    alignItems: "flex-end",
  },
  pricingPrice: {
    fontSize: 20,
    color: "#C9A962",
  },
  pricingPerVideo: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: "#C9A962",
    borderRadius: 28,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 16,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 18,
    color: "#1A1A1A",
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 24,
  },
  restoreButtonText: {
    fontSize: 14,
    color: "#888888",
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    color: "#555555",
    textAlign: "center",
    lineHeight: 16,
  },
});
