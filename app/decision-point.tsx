/**
 * Decision Point Screen (V2)
 * 
 * The conversion screen shown after recipe analysis.
 * Layout per V2 spec:
 * 1. Hero image (tappable)
 * 2. Recipe title + meta
 * 3. Collapsed ingredients (3-4 shown, "+ X more")
 * 4. Collapsed steps (2-3 shown, "+ X more steps")
 * 5. PRIMARY CTA: "Generate TikTok Video" $6.99
 * 6. SECONDARY CTA: "Also generate step images" $1.99
 * 7. Full Recipe / Cook Mode (tertiary)
 */

import { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 280;
const COLLAPSED_INGREDIENTS = 4;
const COLLAPSED_STEPS = 3;

interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
}

interface Step {
  stepNumber: number;
  instruction: string;
  duration?: number;
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

  const [showAllIngredients, setShowAllIngredients] = useState(false);
  const [showAllSteps, setShowAllSteps] = useState(false);

  // Parse data
  const ingredients: Ingredient[] = useMemo(() => {
    try {
      return params.ingredients ? JSON.parse(params.ingredients) : [];
    } catch { return []; }
  }, [params.ingredients]);

  const steps: Step[] = useMemo(() => {
    try {
      const rawSteps = params.steps ? JSON.parse(params.steps) : [];
      return rawSteps.map((step: unknown, index: number) => {
        if (typeof step === "string") {
          return { stepNumber: index + 1, instruction: step };
        }
        const s = step as Record<string, unknown>;
        return {
          stepNumber: (s.stepNumber as number) || index + 1,
          instruction: (s.instruction as string) || `Step ${index + 1}`,
          duration: s.duration as number | undefined,
        };
      });
    } catch { return []; }
  }, [params.steps]);

  // Hero image: accept ANY valid image (file://, https://, etc.)
  const heroImageUrl = params.heroImageUrl || params.imageUri;
  const hasValidImage = !!heroImageUrl && heroImageUrl.length > 0;
  const hasTikTokVideo = params.hasTikTokVideo === "true";
  const totalTime = parseInt(params.prepTime || "0") + parseInt(params.cookTime || "0");

  // Collapsed lists
  const visibleIngredients = showAllIngredients ? ingredients : ingredients.slice(0, COLLAPSED_INGREDIENTS);
  const hiddenIngredientsCount = Math.max(0, ingredients.length - COLLAPSED_INGREDIENTS);
  const visibleSteps = showAllSteps ? steps : steps.slice(0, COLLAPSED_STEPS);
  const hiddenStepsCount = Math.max(0, steps.length - COLLAPSED_STEPS);

  // Build recipeData JSON for navigation (cook-mode expects this)
  const buildRecipeData = useCallback(() => {
    return JSON.stringify({
      dishName: params.dishName,
      description: params.description,
      cuisine: params.cuisine,
      difficulty: params.difficulty,
      prepTime: params.prepTime,
      cookTime: params.cookTime,
      servings: params.servings,
      ingredients: ingredients,
      steps: steps.map(s => ({
        stepNumber: s.stepNumber,
        instruction: s.instruction,
        duration: s.duration,
      })),
      tags: params.tags ? JSON.parse(params.tags) : [],
    });
  }, [params, ingredients, steps]);

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
          canRegen: "true",
        },
      });
      return;
    }

    // Accept ANY valid image — user's own photo, AI-generated, or uploaded
    if (!hasValidImage) {
      Alert.alert(
        "Photo Required",
        "Please take or upload a photo of your dish to generate a TikTok video.",
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
  }, [hasTikTokVideo, hasValidImage, heroImageUrl, params, router]);

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

  // Handle "Cook Mode" — pass recipeData JSON so cook-mode can parse steps
  const handleCookMode = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/cook-mode" as any,
      params: {
        dishName: params.dishName,
        recipeData: buildRecipeData(),
        imageUri: params.imageUri,
        servings: params.servings,
        recipeId: params.recipeId,
        userId: params.userId,
      },
    });
  }, [params, router, buildRecipeData]);

  // Handle "Step Photos" purchase
  const handleStepPhotos = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: "/paywall" as any,
      params: {
        productType: "step_photos",
        dishName: params.dishName,
        recipeData: buildRecipeData(),
        imageUri: params.imageUri,
        recipeId: params.recipeId,
      },
    });
  }, [params, router, buildRecipeData]);

  // Handle back
  const handleBack = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Image */}
        <Animated.View entering={FadeIn.duration(400)}>
          <View style={styles.heroContainer}>
            {hasValidImage ? (
              <Image
                source={{ uri: heroImageUrl }}
                style={styles.heroImage}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={[styles.heroImage, styles.heroPlaceholder]}>
                <IconSymbol name="photo.fill" size={48} color="#808080" />
                <Text style={styles.heroPlaceholderText}>No photo available</Text>
              </View>
            )}
            {/* Gradient overlay at bottom */}
            <LinearGradient
              colors={["transparent", "rgba(26,26,26,0.6)", "#1A1A1A"]}
              locations={[0.3, 0.7, 1]}
              style={styles.heroGradient}
            />
          </View>
        </Animated.View>

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

        {/* Recipe Title + Meta */}
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
          {params.cuisine ? (
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>{params.cuisine}</Text>
            </View>
          ) : null}

          <Text style={styles.title}>{params.dishName}</Text>

          {params.description ? (
            <Text style={styles.description}>{params.description}</Text>
          ) : null}

          <View style={styles.metaRow}>
            {totalTime > 0 && (
              <View style={styles.metaItem}>
                <IconSymbol name="clock.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{totalTime} min</Text>
              </View>
            )}
            {params.difficulty ? (
              <View style={styles.metaItem}>
                <IconSymbol name="chart.bar.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{params.difficulty}</Text>
              </View>
            ) : null}
            {params.servings ? (
              <View style={styles.metaItem}>
                <IconSymbol name="person.2.fill" size={14} color="#C9A962" />
                <Text style={styles.metaText}>{params.servings} servings</Text>
              </View>
            ) : null}
          </View>
        </Animated.View>

        {/* Ingredients (collapsed) */}
        {ingredients.length > 0 && (
          <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {visibleIngredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientText}>
                  {ing.amount}{ing.unit ? ` ${ing.unit}` : ""} {ing.name}
                </Text>
              </View>
            ))}
            {!showAllIngredients && hiddenIngredientsCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowAllIngredients(true)}
                activeOpacity={0.7}
                style={styles.showMoreButton}
              >
                <Text style={styles.showMoreText}>+ {hiddenIngredientsCount} more</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Steps (collapsed) */}
        {steps.length > 0 && (
          <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Steps</Text>
            {visibleSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={styles.stepNumberBadge}>
                  <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                </View>
                <Text style={styles.stepText} numberOfLines={2}>
                  {step.instruction}
                </Text>
              </View>
            ))}
            {!showAllSteps && hiddenStepsCount > 0 && (
              <TouchableOpacity
                onPress={() => setShowAllSteps(true)}
                activeOpacity={0.7}
                style={styles.showMoreButton}
              >
                <Text style={styles.showMoreText}>+ {hiddenStepsCount} more steps</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        )}

        {/* Spacer before CTAs */}
        <View style={{ height: 16 }} />
      </ScrollView>

      {/* Fixed Bottom CTA Area */}
      <View style={[styles.ctaContainer, { paddingBottom: insets.bottom + 12 }]}>
        {/* PRIMARY CTA: Generate TikTok Video */}
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
                <IconSymbol name="video.fill" size={22} color="#1A1A1A" />
                <View style={styles.primaryCTATextContainer}>
                  <Text style={styles.primaryCTATitle}>
                    {hasTikTokVideo ? "Watch TikTok Video" : "Generate TikTok Video"}
                  </Text>
                  <Text style={styles.primaryCTASubtitle}>
                    {hasTikTokVideo ? "View your generated video" : "10-second cinematic cooking video"}
                  </Text>
                </View>
              </View>
              {!hasTikTokVideo && (
                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>$6.99</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* SECONDARY CTA: Step Images */}
        <TouchableOpacity
          onPress={handleStepPhotos}
          activeOpacity={0.7}
          style={styles.secondaryCTA}
        >
          <IconSymbol name="photo.on.rectangle" size={16} color="#C9A962" />
          <Text style={styles.secondaryCTAText}>Also generate step images</Text>
          <View style={styles.secondaryPriceBadge}>
            <Text style={styles.secondaryPriceText}>$1.99</Text>
          </View>
        </TouchableOpacity>

        {/* Tertiary Row: Full Recipe / Cook Mode */}
        <View style={styles.tertiaryRow}>
          <TouchableOpacity
            onPress={handleViewRecipe}
            activeOpacity={0.7}
            style={styles.tertiaryButton}
          >
            <IconSymbol name="doc.text.fill" size={16} color="#808080" />
            <Text style={styles.tertiaryButtonText}>Full Recipe</Text>
          </TouchableOpacity>

          <View style={styles.tertiaryDivider} />

          <TouchableOpacity
            onPress={handleCookMode}
            activeOpacity={0.7}
            style={styles.tertiaryButton}
          >
            <IconSymbol name="frying.pan.fill" size={16} color="#808080" />
            <Text style={styles.tertiaryButtonText}>Cook Mode</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 220, // Space for fixed CTA area
  },
  heroContainer: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    backgroundColor: "#2D2D2D",
    alignItems: "center",
    justifyContent: "center",
  },
  heroPlaceholderText: {
    color: "#808080",
    fontSize: 14,
    marginTop: 8,
  },
  heroGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.5,
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
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#C9A962",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    marginBottom: 12,
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
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    lineHeight: 34,
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
    marginTop: 4,
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
  // Ingredients
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    gap: 10,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9A962",
  },
  ingredientText: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  // Steps
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 8,
    gap: 12,
  },
  stepNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(201,169,98,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumberText: {
    color: "#C9A962",
    fontSize: 13,
    fontWeight: "700",
  },
  stepText: {
    color: "#FFFFFF",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  // Show more
  showMoreButton: {
    paddingVertical: 8,
    paddingLeft: 16,
  },
  showMoreText: {
    color: "#C9A962",
    fontSize: 14,
    fontWeight: "600",
  },
  // Fixed CTA Container
  ctaContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  // Primary CTA
  primaryCTA: {
    marginBottom: 10,
    borderRadius: 16,
    overflow: "hidden",
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
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  // Secondary CTA
  secondaryCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,98,0.2)",
    marginBottom: 10,
  },
  secondaryCTAText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  secondaryPriceBadge: {
    backgroundColor: "rgba(201,169,98,0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  secondaryPriceText: {
    color: "#C9A962",
    fontSize: 12,
    fontWeight: "700",
  },
  // Tertiary Row
  tertiaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  tertiaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  tertiaryButtonText: {
    color: "#808080",
    fontSize: 13,
    fontWeight: "500",
  },
  tertiaryDivider: {
    width: 1,
    height: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
});
