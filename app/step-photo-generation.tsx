import { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet,
  Platform,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RecipeStep {
  stepNumber: number;
  instruction: string;
}

interface StepImage {
  stepIndex: number;
  imageUrl: string;
}

export default function StepPhotoGenerationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
    recipeId?: string;
  }>();

  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [generatedImages, setGeneratedImages] = useState<StepImage[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Animation values
  const progress = useSharedValue(0);
  const pulse = useSharedValue(1);

  // tRPC mutations
  const generatePhotosMutation = trpc.recipe.generateStepPhotos.useMutation();
  const updateStepImagesMutation = trpc.recipe.updateStepImages.useMutation();

  // Parse steps from recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        let parsedSteps: RecipeStep[] = [];
        
        if (typeof data.steps === "string") {
          parsedSteps = JSON.parse(data.steps);
        } else if (Array.isArray(data.steps)) {
          parsedSteps = data.steps;
        }
        
        // Normalize steps
        const normalizedSteps = parsedSteps.map((step: any, index: number) => ({
          stepNumber: step.stepNumber || step.number || index + 1,
          instruction: step.instruction || step.text || String(step),
        }));
        
        setSteps(normalizedSteps);
      } catch (e) {
        console.error("Failed to parse recipe data:", e);
        setError("Failed to parse recipe data");
      }
    }
  }, [params.recipeData]);

  // Start generation when steps are ready
  useEffect(() => {
    if (steps.length > 0 && isGenerating) {
      generateStepPhotos();
    }
  }, [steps]);

  // Pulse animation
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const generateStepPhotos = async () => {
    // Collect all generated images in a local array (not relying on state)
    const allGeneratedImages: StepImage[] = [];
    
    try {
      // Generate photos for all steps
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i + 1);
        progress.value = withTiming((i + 1) / steps.length, { duration: 300 });

        // Call the API to generate a single step photo
        const result = await generatePhotosMutation.mutateAsync({
          recipeId: params.recipeId || `temp-${Date.now()}`,
          dishName: params.dishName || "Recipe",
          stepIndex: i,
          stepInstruction: steps[i].instruction,
          totalSteps: steps.length,
        });

        if (result.success && result.imageUrl) {
          const newImage = {
            stepIndex: i,
            imageUrl: result.imageUrl!,
          };
          allGeneratedImages.push(newImage);
          setGeneratedImages(prev => [...prev, newImage]);
          
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }
      }

      // All done!
      setIsGenerating(false);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Save step images to database if we have a recipe ID
      if (params.recipeId && allGeneratedImages.length > 0) {
        try {
          await updateStepImagesMutation.mutateAsync({
            recipeId: params.recipeId,
            stepImages: JSON.stringify(allGeneratedImages),
          });
          console.log("[StepPhotoGeneration] Saved", allGeneratedImages.length, "step images to database");
        } catch (saveError) {
          console.error("[StepPhotoGeneration] Failed to save step images:", saveError);
          // Don't fail the whole flow if save fails
        }
      }

      // Don't auto-navigate - let user choose to view or save
    } catch (err) {
      console.error("Step photo generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate photos");
      setIsGenerating(false);
    }
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const progressPercent = steps.length > 0 ? Math.round((currentStep / steps.length) * 100) : 0;

  const handleCancel = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <ScreenContainer 
      edges={["top", "left", "right", "bottom"]} 
      containerClassName="bg-background"
    >
      {/* Header with Cancel Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <Text style={[styles.cancelText, { fontFamily: "Inter-Medium" }]}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {/* Preview Image */}
        <Animated.View style={[styles.imageContainer, pulseStyle]}>
          {params.imageUri ? (
            <Image
              source={{ uri: params.imageUri }}
              style={styles.previewImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={[styles.placeholderText, { fontFamily: "Inter" }]}>
                {params.dishName || "Recipe"}
              </Text>
            </View>
          )}
          <View style={styles.imageOverlay} />
        </Animated.View>

        {/* Generation Status */}
        <View style={styles.statusContainer}>
          <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
            {isGenerating ? "Generating Step Photos" : error ? "Generation Failed" : "Photos Ready!"}
          </Text>
          
          <Text style={[styles.dishName, { fontFamily: "Inter-Medium" }]}>
            {params.dishName || "Your Recipe"}
          </Text>

          {isGenerating && (
            <>
              <Text style={[styles.stepProgress, { fontFamily: "Inter" }]}>
                Step {currentStep} of {steps.length}
              </Text>
              
              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View style={[styles.progressFill, progressStyle]} />
                </View>
                <Text style={[styles.progressText, { fontFamily: "Inter-Medium" }]}>
                  {progressPercent}%
                </Text>
              </View>

              {/* Current Step */}
              <View style={styles.currentStepContainer}>
                <ActivityIndicator size="small" color="#C9A962" />
                <Text 
                  style={[styles.currentStepText, { fontFamily: "Inter" }]}
                  numberOfLines={2}
                >
                  {steps[currentStep - 1]?.instruction || "Preparing..."}
                </Text>
              </View>
            </>
          )}

          {error && (
            <Text style={[styles.errorText, { fontFamily: "Inter" }]}>
              {error}
            </Text>
          )}

          {!isGenerating && !error && (
            <View style={styles.successContainer}>
              <Text style={[styles.successText, { fontFamily: "Inter" }]}>
                Generated {generatedImages.length} step photos
              </Text>
              
              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => {
                    router.replace({
                      pathname: "/cook-mode" as any,
                      params: {
                        dishName: params.dishName,
                        recipeData: params.recipeData,
                        imageUri: params.imageUri,
                        recipeId: params.recipeId,
                        stepImages: JSON.stringify(generatedImages),
                      },
                    });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.viewButtonText, { fontFamily: "Inter-Medium" }]}>
                    View Recipe with Photos
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Generated Images Preview */}
        {generatedImages.length > 0 && (
          <View style={styles.thumbnailContainer}>
            {generatedImages.slice(-3).map((img, index) => (
              <View key={img.stepIndex} style={styles.thumbnail}>
                <Image
                  source={{ uri: img.imageUrl }}
                  style={styles.thumbnailImage}
                  contentFit="cover"
                />
                <View style={styles.thumbnailBadge}>
                  <Text style={[styles.thumbnailBadgeText, { fontFamily: "Inter-Medium" }]}>
                    {img.stepIndex + 1}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  cancelText: {
    fontSize: 14,
    color: "#888888",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  imageContainer: {
    width: SCREEN_WIDTH * 0.5,
    height: SCREEN_WIDTH * 0.5,
    borderRadius: SCREEN_WIDTH * 0.25,
    overflow: "hidden",
    marginBottom: 32,
    borderWidth: 3,
    borderColor: "#C9A962",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    padding: 16,
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
  },
  statusContainer: {
    alignItems: "center",
    width: "100%",
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 8,
  },
  dishName: {
    fontSize: 16,
    color: "#C9A962",
    textAlign: "center",
    marginBottom: 24,
  },
  stepProgress: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 16,
  },
  progressContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  progressTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9A962",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#C9A962",
    minWidth: 40,
    textAlign: "right",
  },
  currentStepContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    padding: 16,
    borderRadius: 12,
    width: "100%",
  },
  currentStepText: {
    flex: 1,
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#F87171",
    textAlign: "center",
  },
  successContainer: {
    alignItems: "center",
    gap: 8,
  },
  successText: {
    fontSize: 16,
    color: "#4ADE80",
  },
  redirectText: {
    fontSize: 14,
    color: "#888888",
  },
  thumbnailContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 32,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#C9A962",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  thumbnailBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "#C9A962",
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnailBadgeText: {
    fontSize: 10,
    color: "#1A1A1A",
  },
  actionButtons: {
    marginTop: 24,
    width: "100%",
    gap: 12,
  },
  viewButton: {
    backgroundColor: "#C9A962",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  viewButtonText: {
    fontSize: 16,
    color: "#1A1A1A",
  },
});
