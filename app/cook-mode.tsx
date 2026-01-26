import { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Share,
  Alert,
  ActivityIndicator,
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
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration: string;
  durationSeconds: number;
  imageUrl?: string;
}

interface StepImage {
  stepIndex: number;
  imageUrl: string;
}

export default function CookModeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
    recipeId?: string;
    stepImages?: string;
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<StepImage[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPhotos, setIsGeneratingPhotos] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [currentGeneratingStep, setCurrentGeneratingStep] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ken Burns animation
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);

  // tRPC mutations
  const saveMutation = trpc.recipe.save.useMutation();

  // Parse recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        if (data.steps) {
          let parsedSteps: RecipeStep[];
          if (typeof data.steps === "string") {
            parsedSteps = JSON.parse(data.steps);
          } else {
            parsedSteps = data.steps;
          }
          
          // Normalize steps
          const normalizedSteps = parsedSteps.map((step: any, index: number) => ({
            number: step.number || step.stepNumber || index + 1,
            instruction: step.instruction || step.text || String(step),
            duration: step.duration || step.time || "2 min",
            durationSeconds: step.durationSeconds || step.seconds || 120,
            imageUrl: step.imageUrl,
          }));
          
          setSteps(normalizedSteps);
        }
      } catch (e) {
        console.error("Failed to parse recipe data:", e);
      }
    }

    // Parse step images if available
    if (params.stepImages) {
      try {
        const images = JSON.parse(params.stepImages);
        setStepImages(images);
      } catch (e) {
        console.error("Failed to parse step images:", e);
      }
    }
  }, [params.recipeData, params.stepImages]);

  // Start Ken Burns animation
  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    translateX.value = withRepeat(
      withSequence(
        withTiming(10, { duration: 8000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-10, { duration: 8000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  // Timer logic
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Reset timer when step changes
  useEffect(() => {
    setElapsedTime(0);
    setIsTimerRunning(false);
  }, [currentStepIndex]);

  const kenBurnsStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
    ],
  }));

  const currentStep = steps[currentStepIndex];
  
  // Get image for current step
  const getCurrentStepImage = () => {
    // Check if this step has a generated image
    const stepImage = stepImages.find(img => img.stepIndex === currentStepIndex);
    if (stepImage?.imageUrl) {
      return stepImage.imageUrl;
    }
    // Check if step has its own image
    if (currentStep?.imageUrl) {
      return currentStep.imageUrl;
    }
    // Fall back to recipe main image
    return params.imageUri;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await Share.share({
        message: `Check out this recipe: ${params.dishName || "Delicious Dish"}\n\nStep ${currentStepIndex + 1}: ${currentStep?.instruction || ""}`,
        title: params.dishName || "Recipe",
      });
    } catch (error) {
      console.error("Share error:", error);
    }
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handleSave = async () => {
    if (isSaved || isSaving) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsSaving(true);
    try {
      const recipeData = params.recipeData ? JSON.parse(params.recipeData) : {};
      await saveMutation.mutateAsync({
        dishName: params.dishName || "Untitled Recipe",
        description: recipeData.description || "",
        difficulty: recipeData.difficulty || "medium",
        prepTime: typeof recipeData.prepTime === "number" ? recipeData.prepTime : 10,
        cookTime: typeof recipeData.cookTime === "number" ? recipeData.cookTime : 20,
        servings: recipeData.servings || 4,
        ingredients: typeof recipeData.ingredients === "string" 
          ? recipeData.ingredients 
          : JSON.stringify(recipeData.ingredients || []),
        steps: typeof recipeData.steps === "string"
          ? recipeData.steps
          : JSON.stringify(recipeData.steps || []),
        imageUrl: params.imageUri || "",
      });
      setIsSaved(true);
      Alert.alert("Saved!", "Recipe added to your collection.");
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePhotos = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate to paywall for step photos
    router.push({
      pathname: "/paywall" as any,
      params: {
        productType: "step_photos",
        dishName: params.dishName,
        recipeData: params.recipeData,
        imageUri: params.imageUri,
        recipeId: params.recipeId,
      },
    });
  };

  const handleGenerateVideo = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate to paywall for video
    router.push({
      pathname: "/paywall" as any,
      params: {
        productType: "video",
        dishName: params.dishName,
        recipeData: params.recipeData,
        imageUri: params.imageUri,
      },
    });
  };

  const handleTimerToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsTimerRunning(!isTimerRunning);
  };

  const stepImage = getCurrentStepImage();

  return (
    <ScreenContainer 
      edges={["top", "left", "right"]} 
      containerClassName="bg-background"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleClose}
          activeOpacity={0.7}
        >
          <IconSymbol name="xmark" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text 
          style={[styles.headerTitle, { fontFamily: "Inter-Medium" }]}
          numberOfLines={1}
        >
          Cook Mode
        </Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <IconSymbol name="paperplane.fill" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Step Image */}
      <View style={styles.imageContainer}>
        {stepImage ? (
          <Animated.View style={[styles.imageWrapper, kenBurnsStyle]}>
            <Image
              source={{ uri: stepImage }}
              style={styles.stepImage}
              contentFit="cover"
            />
          </Animated.View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <IconSymbol name="photo.fill" size={48} color="#555555" />
          </View>
        )}
        
        {/* Step Badge */}
        <View style={styles.stepBadge}>
          <Text style={[styles.stepBadgeText, { fontFamily: "Inter-Medium" }]}>
            Step {currentStepIndex + 1} of {steps.length}
          </Text>
        </View>
        
        {/* Timer Badge */}
        <TouchableOpacity 
          style={[styles.timerBadge, isTimerRunning && styles.timerBadgeActive]}
          onPress={handleTimerToggle}
          activeOpacity={0.8}
        >
          <IconSymbol name="clock.fill" size={14} color={isTimerRunning ? "#1A1A1A" : "#FFFFFF"} />
          <Text style={[
            styles.timerBadgeText, 
            { fontFamily: "Inter-Medium" },
            isTimerRunning && styles.timerBadgeTextActive
          ]}>
            {formatTime(elapsedTime)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Recipe Title */}
      <Text 
        style={[styles.recipeTitle, { fontFamily: "PlayfairDisplay-Bold" }]}
        numberOfLines={2}
      >
        {params.dishName || "Recipe"}
      </Text>

      {/* Step Indicator */}
      <Text style={[styles.stepIndicator, { fontFamily: "Inter-Medium" }]}>
        STEP {currentStepIndex + 1} OF {steps.length}
      </Text>

      {/* Step Instructions */}
      <ScrollView 
        style={styles.instructionContainer}
        contentContainerStyle={styles.instructionContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.instructionText, { fontFamily: "Inter" }]}>
          {currentStep?.instruction || "Loading..."}
        </Text>
        
        {/* Step Duration */}
        {currentStep?.duration && (
          <View style={styles.durationRow}>
            <IconSymbol name="clock.fill" size={14} color="#888888" />
            <Text style={[styles.durationText, { fontFamily: "Inter" }]}>
              {currentStep.duration}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Navigation Controls */}
      <View style={styles.navControls}>
        <TouchableOpacity
          style={[styles.navButton, currentStepIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentStepIndex === 0}
          activeOpacity={0.7}
        >
          <IconSymbol 
            name="backward.fill" 
            size={20} 
            color={currentStepIndex === 0 ? "#555555" : "#FFFFFF"} 
          />
          <Text style={[
            styles.navButtonText, 
            { fontFamily: "Inter" },
            currentStepIndex === 0 && styles.navButtonTextDisabled
          ]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentStepIndex === steps.length - 1 && styles.navButtonDisabled]}
          onPress={handleNext}
          disabled={currentStepIndex === steps.length - 1}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.navButtonText, 
            { fontFamily: "Inter" },
            currentStepIndex === steps.length - 1 && styles.navButtonTextDisabled
          ]}>
            Next
          </Text>
          <IconSymbol 
            name="forward.fill" 
            size={20} 
            color={currentStepIndex === steps.length - 1 ? "#555555" : "#FFFFFF"} 
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <SecondaryButton
          title={isSaved ? "Saved" : "Save"}
          onPress={handleSave}
          icon={isSaving ? (
            <ActivityIndicator size="small" color="#C9A962" />
          ) : (
            <IconSymbol name="bookmark.fill" size={16} color="#C9A962" />
          )}
          style={{ flex: 1, opacity: isSaving ? 0.7 : 1 }}
          disabled={isSaving || isSaved}
        />
        <PrimaryButton
          title="Photos"
          subtitle="$1.99"
          onPress={handleGeneratePhotos}
          icon={<IconSymbol name="photo.fill" size={16} color="#1A1A1A" />}
          style={{ flex: 1 }}
        />
        <SecondaryButton
          title="Video"
          subtitle="$4.99"
          onPress={handleGenerateVideo}
          icon={<IconSymbol name="video.fill" size={16} color="#C9A962" />}
          style={{ flex: 1 }}
        />
      </View>

      {/* Photo Generation Loading Overlay */}
      {isGeneratingPhotos && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#C9A962" />
            <Text style={[styles.loadingTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
              Generating Step Photos
            </Text>
            <Text style={[styles.loadingText, { fontFamily: "Inter" }]}>
              Step {currentGeneratingStep} of {steps.length}
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${generationProgress}%` }]} />
            </View>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.65,
    overflow: "hidden",
    position: "relative",
  },
  imageWrapper: {
    width: "100%",
    height: "100%",
  },
  stepImage: {
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
  stepBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  timerBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerBadgeActive: {
    backgroundColor: "#C9A962",
  },
  timerBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  timerBadgeTextActive: {
    color: "#1A1A1A",
  },
  recipeTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  stepIndicator: {
    fontSize: 11,
    color: "#C9A962",
    letterSpacing: 1,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  instructionContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  instructionContent: {
    paddingBottom: 20,
  },
  instructionText: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 28,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
  },
  durationText: {
    fontSize: 14,
    color: "#888888",
  },
  navControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  navButtonTextDisabled: {
    color: "#555555",
  },
  bottomBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: SCREEN_WIDTH - 64,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  loadingTitle: {
    fontSize: 20,
    color: "#FFFFFF",
    marginTop: 20,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 20,
  },
  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#C9A962",
    borderRadius: 3,
  },
});
