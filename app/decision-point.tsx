/**
 * Decision Point Screen (V2)
 * 
 * The conversion screen shown after recipe analysis.
 * Primary CTA: "Create TikTok Video" (paid, $4.99)
 * Secondary: "View Step Photos" (demoted)
 * 
 * Layout:
 * - Hero image (full-width, 60% screen height)
 * - Recipe title + metadata overlay
 * - Primary CTA button (gold, prominent)
 * - Secondary actions row
 */

import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.55;

interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
}

interface Step {
  stepNumber: number;
  instruction: string;
}

export default function DecisionPointScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri: string;
    dishName: string;
    description: string;
    cuisine: string;
    difficulty: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string;
    steps: string;
    tags: string;
    recipeId: string;
    userId: string;
    stepImages?: string;
    heroImageUrl?: string;
    hasTikTokVideo?: string;
    tikTokVideoUrl?: string;
  }>();

  const [isGenerating, setIsGenerating] = useState(false);

  // Parse data
  const ingredients: Ingredient[] = params.ingredients ? JSON.parse(params.ingredients) : [];
  const rawSteps = params.steps ? JSON.parse(params.steps) : [];
  const steps: Step[] = rawSteps.map((step: unknown, index: number) => {
    if (typeof step === "string") {
      return { stepNumber: index + 1, instruction: step };
    }
    const s = step as Record<string, unknown>;
    return {
      stepNumber: (s.stepNumber as number) || index + 1,
      instruction: (s.instruction as string) || `Step ${index + 1}`,
    };
  });

  const heroImageUrl = params.heroImageUrl || params.imageUri;
  const hasTikTokVideo = params.hasTikTokVideo === "true";
  const totalTime = parseInt(params.prepTime || "0") + parseInt(params.cookTime || "0");

  // Handle "Create TikTok Video" CTA
  const handleCreateTikTokVideo = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // If video already exists, go to player
    if (hasTikTokVideo && params.tikTokVideoUrl) {
      router.push({
        pathname: "/video-player" as any,
        params: {
          dishName: params.dishName,
          finalVideoUrl: params.tikTokVideoUrl,
          recipeId: params.recipeId,
        },
      });
      return;
    }

    // Check for HTTPS hero image
    if (!heroImageUrl?.startsWith("https://")) {
      Alert.alert(
        "Photo Required",
        "A high-quality photo is needed to generate your TikTok video. Please generate an AI photo first.",
        [{ text: "OK" }]
      );
      return;
    }

    // Navigate to TikTok video generation screen
    router.push({
      pathname: "/tiktok-generation" as any,
      params: {
        recipeId: params.recipeId,
        heroImageUrl: heroImageUrl,
        dishName: params.dishName,
        description: params.description,
        cuisine: params.cuisine,
        ingredients: params.ingredients,
        steps: params.steps,
        userId: params.userId,
      },
    });
  }, [hasTikTokVideo, heroImageUrl, params, router]);

  // Handle "View Recipe" (full recipe card)
  const handleViewRecipe = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/recipe-card" as any,
      params: {
        imageUri: params.imageUri,
        dishName: params.dishName,
        description: params.description,
        cuisine: params.cuisine,
        difficulty: params.difficulty,
        prepTime: params.prepTime,
        cookTime: params.cookTime,
        servings: params.servings,
        ingredients: params.ingredients,
        steps: params.steps,
        tags: params.tags,
        recipeId: params.recipeId,
        userId: params.userId,
        stepImages: params.stepImages,
      },
    });
  }, [params, router]);

  // Handle "Cook Mode"
  const handleCookMode = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/cook-mode" as any,
      params: {
        dishName: params.dishName,
        steps: params.steps,
        ingredients: params.ingredients,
        servings: params.servings,
      },
    });
  }, [params, router]);

  // Handle back
  const handleBack = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroContainer}>
        <Image
          source={{ uri: heroImageUrl }}
          style={styles.heroImage}
          contentFit="cover"
          transition={300}
        />
        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(26,26,26,0.4)", "rgba(26,26,26,0.95)", "#1A1A1A"]}
          locations={[0, 0.5, 0.75, 1]}
          style={styles.heroGradient}
        />
      </View>

      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        style={[styles.backButton, { top: insets.top + 8 }]}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonInner}>
          <IconSymbol name="chevron.left" size={18} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Content Overlay */}
      <View style={[styles.contentOverlay, { paddingBottom: insets.bottom + 16 }]}>
        {/* Recipe Info */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.recipeInfo}>
          {/* Cuisine badge */}
          {params.cuisine && (
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>{params.cuisine}</Text>
            </View>
          )}

          {/* Title */}
          <Text style={styles.title} numberOfLines={2}>
            {params.dishName}
          </Text>

          {/* Description */}
          {params.description && (
            <Text style={styles.description} numberOfLines={2}>
              {params.description}
            </Text>
          )}

          {/* Metadata row */}
          <View style={styles.metaRow}>
            {totalTime > 0 && (
              <View style={styles.metaItem}>
                <IconSymbol name="clock.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{totalTime} min</Text>
              </View>
            )}
            {params.difficulty && (
              <View style={styles.metaItem}>
                <IconSymbol name="chart.bar.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{params.difficulty}</Text>
              </View>
            )}
            {params.servings && (
              <View style={styles.metaItem}>
                <IconSymbol name="person.2.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{params.servings} servings</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* Primary CTA: Create TikTok Video */}
        <Animated.View entering={FadeInDown.delay(250).duration(400)}>
          <TouchableOpacity
            onPress={handleCreateTikTokVideo}
            activeOpacity={0.85}
            style={styles.primaryCTA}
          >
            <LinearGradient
              colors={["#C9A962", "#B8953F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryCTAGradient}
            >
              <View style={styles.primaryCTAContent}>
                <View style={styles.primaryCTALeft}>
                  <IconSymbol name="video.fill" size={20} color="#1A1A1A" />
                  <View style={styles.primaryCTATextContainer}>
                    <Text style={styles.primaryCTATitle}>
                      {hasTikTokVideo ? "Watch TikTok Video" : "Create TikTok Video"}
                    </Text>
                    <Text style={styles.primaryCTASubtitle}>
                      {hasTikTokVideo ? "View your generated video" : "10-second cinematic cooking video"}
                    </Text>
                  </View>
                </View>
                {!hasTikTokVideo && (
                  <View style={styles.priceBadge}>
                    <Text style={styles.priceText}>$4.99</Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Secondary Actions Row */}
        <Animated.View entering={FadeInDown.delay(350).duration(400)} style={styles.secondaryRow}>
          <TouchableOpacity
            onPress={handleViewRecipe}
            activeOpacity={0.7}
            style={styles.secondaryButton}
          >
            <IconSymbol name="doc.text.fill" size={18} color="#C9A962" />
            <Text style={styles.secondaryButtonText}>Full Recipe</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleCookMode}
            activeOpacity={0.7}
            style={styles.secondaryButton}
          >
            <IconSymbol name="frying.pan.fill" size={18} color="#C9A962" />
            <Text style={styles.secondaryButtonText}>Cook Mode</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Step count hint */}
        <Animated.View entering={FadeIn.delay(450).duration(300)}>
          <Text style={styles.stepHint}>
            {steps.length} steps · {ingredients.length} ingredients
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.7,
  },
  backButton: {
    position: "absolute",
    left: 16,
    zIndex: 10,
  },
  backButtonInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  contentOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 20,
  },
  recipeInfo: {
    marginBottom: 24,
  },
  cuisineBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,169,98,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  cuisineBadgeText: {
    color: "#C9A962",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 38,
    marginBottom: 6,
  },
  description: {
    fontSize: 15,
    color: "#B3B3B3",
    lineHeight: 21,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: "#B3B3B3",
    fontSize: 13,
    fontWeight: "500",
  },
  primaryCTA: {
    marginBottom: 14,
    borderRadius: 16,
    overflow: "hidden",
    // Subtle shadow for depth
    shadowColor: "#C9A962",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryCTAGradient: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 16,
  },
  primaryCTAContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  primaryCTALeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  primaryCTATextContainer: {
    flex: 1,
  },
  primaryCTATitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: -0.2,
  },
  primaryCTASubtitle: {
    fontSize: 12,
    color: "rgba(26,26,26,0.6)",
    marginTop: 2,
  },
  priceBadge: {
    backgroundColor: "rgba(26,26,26,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priceText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  secondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  stepHint: {
    textAlign: "center",
    color: "#808080",
    fontSize: 12,
    letterSpacing: 0.3,
  },
});
