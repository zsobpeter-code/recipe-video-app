import { useEffect, useState, useRef } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const PROCESSING_STEPS = [
  { id: 1, text: "Analyzing image...", duration: 3000 },
  { id: 2, text: "Identifying ingredients...", duration: 4000 },
  { id: 3, text: "Extracting recipe steps...", duration: 4000 },
  { id: 4, text: "Generating cooking tips...", duration: 3000 },
];

export default function ProcessingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    imageUri: string;
    dishName: string;
    userNotes: string;
    source: string;
  }>();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStartedAnalysis = useRef(false);
  
  // Animation values
  const rotation = useSharedValue(0);
  const pulse = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const dot1Opacity = useSharedValue(0.3);
  const dot2Opacity = useSharedValue(0.3);
  const dot3Opacity = useSharedValue(0.3);

  // tRPC mutation for recipe analysis
  const analyzeRecipe = trpc.recipe.analyze.useMutation({
    onSuccess: (data) => {
      if (data.success && data.recipe) {
        // Navigate to recipe card with the AI results
        router.replace({
          pathname: "/recipe-card" as any,
          params: {
            imageUri: params.imageUri || "",
            dishName: data.recipe.dishName,
            description: data.recipe.description,
            cuisine: data.recipe.cuisine || "",
            difficulty: data.recipe.difficulty,
            prepTime: String(data.recipe.prepTime),
            cookTime: String(data.recipe.cookTime),
            servings: String(data.recipe.servings),
            ingredients: JSON.stringify(data.recipe.ingredients),
            steps: JSON.stringify(data.recipe.steps),
            tags: JSON.stringify(data.recipe.tags || []),
          },
        });
      } else {
        setError(data.error || "Failed to analyze recipe");
        // Navigate back after showing error
        setTimeout(() => {
          router.back();
        }, 3000);
      }
    },
    onError: (err) => {
      console.error("Recipe analysis error:", err);
      setError(err.message || "Failed to analyze recipe");
      // Navigate back after showing error
      setTimeout(() => {
        router.back();
      }, 3000);
    },
  });

  // Rotating animation
  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Pulse animation
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000 }),
        withTiming(1, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Dots animation
  useEffect(() => {
    const animateDots = () => {
      dot1Opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withDelay(800, withTiming(0.3, { duration: 400 }))
        ),
        -1,
        false
      );
      dot2Opacity.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withDelay(800, withTiming(0.3, { duration: 400 }))
          ),
          -1,
          false
        )
      );
      dot3Opacity.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withDelay(800, withTiming(0.3, { duration: 400 }))
          ),
          -1,
          false
        )
      );
    };
    animateDots();
  }, []);

  // Progress through steps animation
  useEffect(() => {
    const totalDuration = PROCESSING_STEPS.reduce((acc, step) => acc + step.duration, 0);
    
    // Animate progress bar
    progressWidth.value = withTiming(100, { duration: totalDuration });
    
    // Step through each processing step
    const stepTimers: ReturnType<typeof setTimeout>[] = [];
    let accumulatedTime = 0;
    
    PROCESSING_STEPS.forEach((step, index) => {
      const timer = setTimeout(() => {
        setCurrentStep(index);
      }, accumulatedTime);
      stepTimers.push(timer);
      accumulatedTime += step.duration;
    });

    return () => {
      stepTimers.forEach(clearTimeout);
    };
  }, []);

  // Start AI analysis
  useEffect(() => {
    if (hasStartedAnalysis.current) return;
    hasStartedAnalysis.current = true;

    const analyzeImage = async () => {
      try {
        let imageBase64 = "";
        
        if (params.imageUri) {
          if (Platform.OS === "web") {
            // On web, fetch the image and convert to base64
            const response = await fetch(params.imageUri);
            const blob = await response.blob();
            imageBase64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                const result = reader.result as string;
                // Remove the data URL prefix
                resolve(result.split(",")[1] || "");
              };
              reader.readAsDataURL(blob);
            });
          } else {
            // On native, use FileSystem
            imageBase64 = await FileSystem.readAsStringAsync(params.imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          }
        }

        // Call the AI analysis endpoint
        analyzeRecipe.mutate({
          imageBase64,
          dishName: params.dishName || undefined,
          userNotes: params.userNotes || undefined,
        });
      } catch (err) {
        console.error("Error preparing image:", err);
        setError("Failed to prepare image for analysis");
        setTimeout(() => {
          router.back();
        }, 3000);
      }
    };

    analyzeImage();
  }, [params.imageUri, params.dishName, params.userNotes]);

  const rotationStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1Opacity.value,
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2Opacity.value,
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3Opacity.value,
  }));

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <View style={styles.container}>
        {/* Image Preview with overlay */}
        <View style={styles.imageContainer}>
          {params.imageUri && (
            <Image
              source={{ uri: params.imageUri }}
              style={styles.image}
              contentFit="cover"
              transition={300}
            />
          )}
          <View style={styles.imageOverlay} />
          
          {/* Animated scanning ring */}
          <Animated.View style={[styles.scanRing, rotationStyle]}>
            <View style={styles.scanRingGradient} />
          </Animated.View>
          
          {/* Pulsing center icon */}
          <Animated.View style={[styles.centerIcon, pulseStyle]}>
            <Text style={styles.centerIconText}>{error ? "❌" : "🍳"}</Text>
          </Animated.View>
        </View>

        {/* Processing info */}
        <View style={styles.infoContainer}>
          <Text style={[styles.dishName, { fontFamily: "PlayfairDisplay-Bold" }]}>
            {params.dishName || "Analyzing Recipe"}
          </Text>
          
          {/* Error or current step */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { fontFamily: "Inter" }]}>
                {error}
              </Text>
              <Text style={[styles.errorSubtext, { fontFamily: "Inter" }]}>
                Returning to previous screen...
              </Text>
            </View>
          ) : (
            <>
              {/* Current step with animated dots */}
              <View style={styles.stepContainer}>
                <Text style={[styles.stepText, { fontFamily: "Inter" }]}>
                  {PROCESSING_STEPS[currentStep]?.text || "Processing..."}
                </Text>
                <View style={styles.dotsContainer}>
                  <Animated.View style={[styles.dot, dot1Style]} />
                  <Animated.View style={[styles.dot, dot2Style]} />
                  <Animated.View style={[styles.dot, dot3Style]} />
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
                <Text style={[styles.progressText, { fontFamily: "Inter" }]}>
                  Step {currentStep + 1} of {PROCESSING_STEPS.length}
                </Text>
              </View>

              {/* Fun tip */}
              <View style={styles.tipContainer}>
                <Text style={[styles.tipText, { fontFamily: "Caveat" }]}>
                  ✨ Our AI is working its magic to extract every delicious detail!
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  imageContainer: {
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  scanRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: "#C9A962",
    borderRightColor: "#C9A962",
    position: "absolute",
  },
  scanRingGradient: {
    flex: 1,
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201, 169, 98, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
  },
  centerIconText: {
    fontSize: 40,
  },
  infoContainer: {
    flex: 1,
    alignItems: "center",
    gap: 20,
  },
  dishName: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
  },
  stepContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepText: {
    fontSize: 16,
    color: "#C9A962",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9A962",
  },
  progressContainer: {
    width: "100%",
    gap: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(201, 169, 98, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9A962",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#888888",
    textAlign: "center",
  },
  tipContainer: {
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
    marginTop: "auto",
  },
  tipText: {
    fontSize: 18,
    color: "#C9A962",
    textAlign: "center",
    lineHeight: 24,
  },
  errorContainer: {
    alignItems: "center",
    gap: 8,
  },
  errorText: {
    fontSize: 16,
    color: "#EF4444",
    textAlign: "center",
  },
  errorSubtext: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
  },
});
