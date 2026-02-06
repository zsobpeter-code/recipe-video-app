/**
 * TikTok Video Generation Screen (V2)
 * 
 * Animated waiting UX while Runway Gen-4.5 generates the video.
 * Shows:
 * - Hero image with subtle animation
 * - Progress stages (building prompt → generating → storing → done)
 * - Storyboard preview of recipe steps
 * - "Did you know?" cooking tips
 * 
 * On completion: navigates to video player with regen option.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeInDown,
  FadeOut,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Cooking tips shown during generation
const COOKING_TIPS = [
  "Salt your pasta water until it tastes like the sea.",
  "Let meat rest after cooking for juicier results.",
  "Toast your spices in a dry pan to unlock deeper flavors.",
  "A sharp knife is safer than a dull one.",
  "Mise en place: prep everything before you start cooking.",
  "Deglaze your pan with wine for an instant sauce.",
  "Room temperature eggs whip up fluffier.",
  "Acid (lemon, vinegar) brightens any dish.",
  "Don't crowd the pan — food steams instead of searing.",
  "Finish pasta in the sauce, not on the plate.",
];

type GenerationStage = "building_prompt" | "generating_video" | "storing" | "completed" | "failed" | "idle";

const STAGE_LABELS: Record<GenerationStage, string> = {
  idle: "Preparing...",
  building_prompt: "Crafting your video prompt...",
  generating_video: "Generating cinematic video...",
  storing: "Saving your masterpiece...",
  completed: "Your video is ready!",
  failed: "Generation failed",
};

const STAGE_PROGRESS: Record<GenerationStage, number> = {
  idle: 0,
  building_prompt: 0.1,
  generating_video: 0.5,
  storing: 0.85,
  completed: 1,
  failed: 0,
};

interface Step {
  stepNumber?: number;
  instruction: string;
}

export default function TikTokGenerationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    recipeId: string;
    heroImageUrl: string;
    dishName: string;
    description: string;
    cuisine: string;
    ingredients: string;
    steps: string;
    userId: string;
  }>();

  const [stage, setStage] = useState<GenerationStage>("idle");
  const [currentTip, setCurrentTip] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startTimeRef = useRef(Date.now());

  // Parse data
  const ingredients = params.ingredients ? JSON.parse(params.ingredients) : [];
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

  // Animations
  const pulseScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const shimmerX = useSharedValue(-SCREEN_WIDTH);

  // Pulse animation for hero image
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Shimmer animation
  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(SCREEN_WIDTH, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Progress bar animation
  useEffect(() => {
    const target = STAGE_PROGRESS[stage];
    progressWidth.value = withTiming(target, { duration: 600, easing: Easing.out(Easing.ease) });
  }, [stage]);

  // Cycle cooking tips
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % COOKING_TIPS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Elapsed time counter
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // tRPC mutation
  const generateMutation = trpc.recipe.generateTikTokVideo.useMutation({
    onSuccess: (data) => {
      if (data.success && data.videoUrl) {
        setStage("completed");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Navigate to video player after brief delay
        setTimeout(() => {
          router.replace({
            pathname: "/video-player" as any,
            params: {
              dishName: params.dishName,
              finalVideoUrl: data.videoUrl,
              recipeId: params.recipeId,
              canRegen: "true",
            },
          });
        }, 1500);
      } else {
        setStage("failed");
        setError(data.error || "Video generation failed");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      }
    },
    onError: (err) => {
      setStage("failed");
      setError(err.message || "Network error");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
  });

  // Start generation on mount
  useEffect(() => {
    setStage("building_prompt");

    // Small delay for UX
    const timer = setTimeout(() => {
      setStage("generating_video");
      generateMutation.mutate({
        recipeId: params.recipeId,
        heroImageUrl: params.heroImageUrl,
        title: params.dishName,
        ingredients: ingredients.map((i: any) => ({
          name: typeof i === "string" ? i : i.name || "",
          amount: i.amount,
          unit: i.unit,
        })),
        steps: steps.map(s => ({
          instruction: s.instruction,
          stepNumber: s.stepNumber,
        })),
        cuisineStyle: params.cuisine,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Animated styles
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value * 100}%` as any,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shimmerX.value }],
  }));

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <View style={styles.container}>
      {/* Animated Hero Image Background */}
      <Animated.View style={[styles.heroContainer, heroAnimatedStyle]}>
        <Image
          source={{ uri: params.heroImageUrl }}
          style={styles.heroImage}
          contentFit="cover"
        />
        <LinearGradient
          colors={["rgba(26,26,26,0.3)", "rgba(26,26,26,0.7)", "#1A1A1A"]}
          locations={[0, 0.5, 0.85]}
          style={styles.heroGradient}
        />
      </Animated.View>

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 20 }]}>
        {/* Dish name */}
        <Animated.View entering={FadeInDown.delay(200).duration(400)} style={styles.titleContainer}>
          <Text style={styles.generatingLabel}>
            {stage === "completed" ? "✓ Complete" : "Creating your video"}
          </Text>
          <Text style={styles.dishName} numberOfLines={2}>
            {params.dishName}
          </Text>
        </Animated.View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Storyboard Preview (show first 4 steps) */}
        <Animated.View entering={FadeIn.delay(400).duration(400)} style={styles.storyboardContainer}>
          <Text style={styles.storyboardTitle}>Recipe Storyboard</Text>
          <View style={styles.storyboardRow}>
            {steps.slice(0, 4).map((step, index) => (
              <View key={index} style={styles.storyboardItem}>
                <View style={[
                  styles.storyboardDot,
                  stage === "generating_video" && { backgroundColor: "#C9A962" },
                  stage === "completed" && { backgroundColor: "#4A7C59" },
                ]} />
                <Text style={styles.storyboardText} numberOfLines={2}>
                  {step.instruction.substring(0, 40)}
                  {step.instruction.length > 40 ? "..." : ""}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Progress Section */}
        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={styles.progressSection}>
          {/* Stage label */}
          <View style={styles.stageRow}>
            <Text style={styles.stageLabel}>{STAGE_LABELS[stage]}</Text>
            <Text style={styles.timeLabel}>{formatTime(elapsedTime)}</Text>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBarBg}>
            <Animated.View style={[styles.progressBarFill, progressAnimatedStyle]}>
              {/* Shimmer effect */}
              <Animated.View style={[styles.shimmer, shimmerStyle]} />
            </Animated.View>
          </View>

          {/* Cooking tip */}
          <Animated.View
            key={currentTip}
            entering={FadeIn.duration(400)}
            exiting={FadeOut.duration(200)}
            style={styles.tipContainer}
          >
            <Text style={styles.tipLabel}>Did you know?</Text>
            <Text style={styles.tipText}>{COOKING_TIPS[currentTip]}</Text>
          </Animated.View>
        </Animated.View>

        {/* Error state */}
        {stage === "failed" && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error || "Something went wrong"}</Text>
            <View style={styles.errorActions}>
              <Text
                style={styles.retryButton}
                onPress={() => {
                  setStage("generating_video");
                  setError(null);
                  startTimeRef.current = Date.now();
                  generateMutation.mutate({
                    recipeId: params.recipeId,
                    heroImageUrl: params.heroImageUrl,
                    title: params.dishName,
                    ingredients: ingredients.map((i: any) => ({
                      name: typeof i === "string" ? i : i.name || "",
                      amount: i.amount,
                      unit: i.unit,
                    })),
                    steps: steps.map(s => ({
                      instruction: s.instruction,
                      stepNumber: s.stepNumber,
                    })),
                    cuisineStyle: params.cuisine,
                  });
                }}
              >
                Retry
              </Text>
              <Text
                style={styles.backButton}
                onPress={() => router.back()}
              >
                Go Back
              </Text>
            </View>
          </Animated.View>
        )}
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
    top: -20,
    left: -20,
    right: -20,
    height: SCREEN_HEIGHT * 0.55,
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
    height: "100%",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleContainer: {
    alignItems: "center",
  },
  generatingLabel: {
    fontSize: 13,
    color: "#C9A962",
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dishName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  storyboardContainer: {
    marginBottom: 28,
  },
  storyboardTitle: {
    fontSize: 12,
    color: "#808080",
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  storyboardRow: {
    flexDirection: "row",
    gap: 8,
  },
  storyboardItem: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  storyboardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3D3D3D",
    marginBottom: 6,
  },
  storyboardText: {
    fontSize: 10,
    color: "#B3B3B3",
    lineHeight: 14,
  },
  progressSection: {
    marginBottom: 8,
  },
  stageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  stageLabel: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  timeLabel: {
    fontSize: 13,
    color: "#808080",
    fontWeight: "500",
  },
  progressBarBg: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#C9A962",
    borderRadius: 2,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 60,
    height: "100%",
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  tipContainer: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  tipLabel: {
    fontSize: 10,
    color: "#C9A962",
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  tipText: {
    fontSize: 13,
    color: "#B3B3B3",
    lineHeight: 18,
  },
  errorContainer: {
    backgroundColor: "rgba(139,64,73,0.15)",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(139,64,73,0.3)",
  },
  errorText: {
    fontSize: 13,
    color: "#F87171",
    lineHeight: 18,
    marginBottom: 12,
  },
  errorActions: {
    flexDirection: "row",
    gap: 16,
  },
  retryButton: {
    fontSize: 14,
    color: "#C9A962",
    fontWeight: "700",
  },
  backButton: {
    fontSize: 14,
    color: "#808080",
    fontWeight: "600",
  },
});
