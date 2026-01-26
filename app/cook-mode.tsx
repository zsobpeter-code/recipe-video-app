import { useState, useEffect, useRef, useMemo } from "react";
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
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton } from "@/components/ui/primary-button";
import { SecondaryButton } from "@/components/ui/secondary-button";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration: string;
  durationSeconds: number;
  imageUrl?: string;
}

interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
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
    stepVideos?: string; // JSON string of cached step videos
    userId?: string;
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepImages, setStepImages] = useState<StepImage[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showIngredientsModal, setShowIngredientsModal] = useState(false);
  
  // Check if videos are already cached
  const hasVideos = useMemo(() => {
    if (!params.stepVideos) return false;
    try {
      const videos = JSON.parse(params.stepVideos);
      return Array.isArray(videos) && videos.length > 0 && videos.every((v: any) => v.videoUrl && v.status === "completed");
    } catch {
      return false;
    }
  }, [params.stepVideos]);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper: Extract ingredients mentioned in a step
  const extractIngredientsForStep = (stepText: string): Ingredient[] => {
    if (!stepText || ingredients.length === 0) return [];
    const stepLower = stepText.toLowerCase();
    return ingredients.filter(ing => 
      stepLower.includes(ing.name.toLowerCase())
    );
  };

  // tRPC mutations
  const saveMutation = trpc.recipe.save.useMutation();

  // Parse recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        
        // Parse steps
        if (data.steps && Array.isArray(data.steps)) {
          const parsedSteps = data.steps.map((step: any, index: number) => ({
            number: step.stepNumber || index + 1,
            instruction: step.instruction || step,
            duration: step.duration ? `${step.duration} min` : "",
            durationSeconds: (step.duration || 0) * 60,
          }));
          setSteps(parsedSteps);
        }
        
        // Parse ingredients
        if (data.ingredients && Array.isArray(data.ingredients)) {
          const parsedIngredients = data.ingredients.map((ing: any) => ({
            name: ing.name || ing,
            amount: ing.amount || "",
            unit: ing.unit || "",
          }));
          setIngredients(parsedIngredients);
        }
      } catch (e) {
        console.error("Failed to parse recipe data:", e);
      }
    }
    
    // Parse step images
    if (params.stepImages) {
      try {
        const images = JSON.parse(params.stepImages);
        if (Array.isArray(images)) {
          setStepImages(images);
        }
      } catch (e) {
        console.error("Failed to parse step images:", e);
      }
    }
  }, [params.recipeData, params.stepImages]);

  // Timer effect
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentStep = steps[currentStepIndex];

  // Get current step image
  const getCurrentStepImage = (): string | undefined => {
    const stepImg = stepImages.find(img => img.stepIndex === currentStepIndex);
    if (stepImg) return stepImg.imageUrl;
    return params.imageUri;
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCurrentStepIndex(currentStepIndex - 1);
      setElapsedTime(0);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setCurrentStepIndex(currentStepIndex + 1);
      setElapsedTime(0);
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
      
      // Ensure ingredients and steps are properly formatted
      let ingredientsStr = "[]";
      let stepsStr = "[]";
      
      if (recipeData.ingredients) {
        ingredientsStr = typeof recipeData.ingredients === "string" 
          ? recipeData.ingredients 
          : JSON.stringify(recipeData.ingredients);
      }
      
      if (recipeData.steps) {
        stepsStr = typeof recipeData.steps === "string" 
          ? recipeData.steps 
          : JSON.stringify(recipeData.steps);
      }
      
      // Build the save payload with proper types
      const savePayload = {
        dishName: params.dishName || "Recipe",
        description: recipeData.description || "",
        difficulty: recipeData.difficulty || "medium",
        prepTime: typeof recipeData.prepTime === "number" ? recipeData.prepTime : 10,
        cookTime: typeof recipeData.cookTime === "number" ? recipeData.cookTime : 30,
        servings: typeof recipeData.servings === "number" ? recipeData.servings : 4,
        ingredients: ingredientsStr,
        steps: stepsStr,
        imageUrl: params.imageUri || "",
        cuisine: recipeData.cuisine || undefined,
        tags: recipeData.tags ? (typeof recipeData.tags === "string" ? recipeData.tags : JSON.stringify(recipeData.tags)) : undefined,
        category: "main",
      };
      
      console.log("Saving recipe with payload:", JSON.stringify(savePayload, null, 2));
      
      const result = await saveMutation.mutateAsync(savePayload);
      console.log("Save result:", result);
      
      setIsSaved(true);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert("Saved!", "Recipe added to your collection.");
    } catch (error: any) {
      console.error("Save error details:", {
        message: error?.message,
        code: error?.code,
        data: error?.data,
        shape: error?.shape,
      });
      const errorMessage = error?.message || "Failed to save recipe";
      Alert.alert("Save Error", errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotos = () => {
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
    
    // If videos are already cached, go directly to video player
    if (hasVideos) {
      router.push({
        pathname: "/video-generation" as any,
        params: {
          dishName: params.dishName,
          recipeData: params.recipeData,
          imageUri: params.imageUri,
          cachedStepVideos: params.stepVideos,
          userId: params.userId,
          recipeId: params.recipeId,
        },
      });
      return;
    }
    
    // Navigate to paywall for video
    router.push({
      pathname: "/paywall" as any,
      params: {
        productType: "video",
        dishName: params.dishName,
        recipeData: params.recipeData,
        imageUri: params.imageUri,
        userId: params.userId,
        recipeId: params.recipeId,
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
    <View style={styles.container}>
      {/* Background Image - Blurred and Subtle */}
      {stepImage && (
        <Image
          source={{ uri: stepImage }}
          style={styles.backgroundImage}
          contentFit="cover"
          blurRadius={15}
        />
      )}
      
      {/* Dark Overlay for Readability */}
      <View style={styles.overlay} />
      
      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top }]}>
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
            onPress={() => setShowIngredientsModal(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="list.bullet" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Recipe Title */}
        <Text 
          style={[styles.recipeTitle, { fontFamily: "PlayfairDisplay-Bold" }]}
          numberOfLines={2}
        >
          {params.dishName || "Recipe"}
        </Text>

        {/* Step Counter */}
        <Text style={[styles.stepCounter, { fontFamily: "Inter-Medium" }]}>
          STEP {currentStepIndex + 1} OF {steps.length}
        </Text>

        {/* Timer - Tappable */}
        <TouchableOpacity 
          style={[styles.timerContainer, isTimerRunning && styles.timerContainerActive]}
          onPress={handleTimerToggle}
          activeOpacity={0.8}
        >
          <IconSymbol name="clock.fill" size={16} color={isTimerRunning ? "#1A1A1A" : "#C9A962"} />
          <Text style={[
            styles.timerText, 
            { fontFamily: "Inter-Medium" },
            isTimerRunning && styles.timerTextActive
          ]}>
            {formatTime(elapsedTime)}
          </Text>
          <Text style={[
            styles.timerHint, 
            { fontFamily: "Inter" },
            isTimerRunning && styles.timerHintActive
          ]}>
            {isTimerRunning ? "Tap to pause" : "Tap to start"}
          </Text>
        </TouchableOpacity>

        {/* Main Instruction - Large and Readable */}
        <ScrollView 
          style={styles.instructionScroll}
          contentContainerStyle={styles.instructionContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.instruction, { fontFamily: "PlayfairDisplay-Regular" }]}>
            {currentStep?.instruction || "Loading..."}
          </Text>
          
          {/* Step-specific Ingredients */}
          {currentStep && extractIngredientsForStep(currentStep.instruction).length > 0 && (
            <View style={styles.stepIngredients}>
              {extractIngredientsForStep(currentStep.instruction).map((ing, index) => (
                <Text key={index} style={[styles.ingredient, { fontFamily: "Inter" }]}>
                  • {ing.amount}{ing.unit ? ` ${ing.unit}` : ""} {ing.name}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Navigation Controls */}
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentStepIndex === 0 && styles.navButtonDisabled]}
            onPress={handlePrevious}
            disabled={currentStepIndex === 0}
            activeOpacity={0.7}
          >
            <IconSymbol 
              name="backward.fill" 
              size={18} 
              color={currentStepIndex === 0 ? "#555555" : "#FFFFFF"} 
            />
            <Text style={[
              styles.navButtonText, 
              { fontFamily: "Inter-Medium" },
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
              { fontFamily: "Inter-Medium" },
              currentStepIndex === steps.length - 1 && styles.navButtonTextDisabled
            ]}>
              Next
            </Text>
            <IconSymbol 
              name="forward.fill" 
              size={18} 
              color={currentStepIndex === steps.length - 1 ? "#555555" : "#FFFFFF"} 
            />
          </TouchableOpacity>
        </View>

        {/* Bottom Bar */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <SecondaryButton
            title={isSaved ? "Saved" : "Save"}
            onPress={handleSave}
            disabled={isSaved || isSaving}
            style={{ flex: 1 }}
          />
          <SecondaryButton
            title="Photos"
            subtitle="$1.99"
            onPress={handlePhotos}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            title={hasVideos ? "Watch Video" : "Video"}
            subtitle={hasVideos ? undefined : "$4.99"}
            onPress={handleGenerateVideo}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Ingredients Modal */}
      <Modal
        visible={showIngredientsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowIngredientsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { paddingTop: insets.top + 20 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
                Ingredients
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowIngredientsModal(false)}
                activeOpacity={0.7}
              >
                <IconSymbol name="xmark" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <ScrollView 
              style={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              {ingredients.length > 0 ? (
                ingredients.map((ing, index) => (
                  <View key={index} style={styles.ingredientItem}>
                    <Text style={[styles.ingredientAmount, { fontFamily: "Inter-Medium" }]}>
                      {ing.amount}{ing.unit ? ` ${ing.unit}` : ""}
                    </Text>
                    <Text style={[styles.ingredientName, { fontFamily: "Inter" }]}>
                      {ing.name}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.noIngredientsText, { fontFamily: "Inter" }]}>
                  No ingredients available
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  backgroundImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  content: {
    flex: 1,
  },
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
  recipeTitle: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 24,
    marginTop: 20,
  },
  stepCounter: {
    fontSize: 14,
    color: "#C9A962",
    textAlign: "center",
    marginTop: 8,
    letterSpacing: 2,
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  timerContainerActive: {
    backgroundColor: "#C9A962",
    borderColor: "#C9A962",
  },
  timerText: {
    fontSize: 18,
    color: "#C9A962",
  },
  timerTextActive: {
    color: "#1A1A1A",
  },
  timerHint: {
    fontSize: 12,
    color: "#888888",
    marginLeft: 4,
  },
  timerHintActive: {
    color: "rgba(0, 0, 0, 0.6)",
  },
  instructionScroll: {
    flex: 1,
    marginTop: 24,
    paddingHorizontal: 24,
  },
  instructionContent: {
    paddingBottom: 20,
  },
  instruction: {
    fontSize: 22,
    color: "#FFFFFF",
    lineHeight: 34,
  },
  stepIngredients: {
    marginTop: 20,
    padding: 16,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  ingredient: {
    fontSize: 16,
    color: "#C9A962",
    marginVertical: 4,
    lineHeight: 24,
  },
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
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
    fontSize: 15,
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  modalTitle: {
    fontSize: 24,
    color: "#FFFFFF",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  ingredientAmount: {
    fontSize: 16,
    color: "#C9A962",
    minWidth: 100,
  },
  ingredientName: {
    fontSize: 16,
    color: "#FFFFFF",
    flex: 1,
  },
  noIngredientsText: {
    fontSize: 16,
    color: "#888888",
    textAlign: "center",
    marginTop: 40,
  },
});
