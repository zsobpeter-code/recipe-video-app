import { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet,
  Platform,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration?: string;
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<RecipeStep[]>([]);

  // Parse recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        const rawSteps = data.steps ? (typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps) : [];
        const parsedSteps: RecipeStep[] = rawSteps.map(
          (step: string | { stepNumber?: number; instruction: string; duration?: number }, index: number) => {
            // Handle both string steps and object steps
            if (typeof step === 'string') {
              return {
                number: index + 1,
                instruction: step,
                duration: `${Math.floor(Math.random() * 3) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
              };
            }
            return {
              number: step.stepNumber || index + 1,
              instruction: step.instruction,
              duration: step.duration ? `${Math.floor(step.duration / 60)}:${String(step.duration % 60).padStart(2, "0")}` : `${Math.floor(Math.random() * 3) + 1}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
            };
          }
        );
        if (parsedSteps.length > 0) {
          setSteps(parsedSteps);
        } else {
          throw new Error("No steps found");
        }
      } catch (error) {
        // Fallback mock steps
        setSteps([
          { number: 1, instruction: "Gather all ingredients and prep your workspace", duration: "0:30" },
          { number: 2, instruction: "Heat the pan over medium heat with oil", duration: "1:00" },
          { number: 3, instruction: "Add the main ingredients and cook until golden", duration: "3:00" },
          { number: 4, instruction: "Season with salt, pepper, and herbs", duration: "0:45" },
          { number: 5, instruction: "Plate and garnish before serving", duration: "1:15" },
        ]);
      }
    } else {
      // Mock steps if no data
      setSteps([
        { number: 1, instruction: "Gather all ingredients and prep your workspace", duration: "0:30" },
        { number: 2, instruction: "Heat the pan over medium heat with oil", duration: "1:00" },
        { number: 3, instruction: "Add the main ingredients and cook until golden", duration: "3:00" },
        { number: 4, instruction: "Season with salt, pepper, and herbs", duration: "0:45" },
        { number: 5, instruction: "Plate and garnish before serving", duration: "1:15" },
      ]);
    }
  }, [params.recipeData]);

  const currentStep = steps[currentStepIndex];

  const handlePlayPause = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setIsPlaying(!isPlaying);
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

  const handleStepPress = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentStepIndex(index);
  };

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleShare = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    // Share functionality would go here
  };

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
          {params.dishName || "Cooking Tutorial"}
        </Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <IconSymbol name="paperplane.fill" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Video Preview Area */}
      <View style={styles.videoContainer}>
        {params.imageUri ? (
          <Image
            source={{ uri: params.imageUri }}
            style={styles.videoPreview}
            contentFit="cover"
          />
        ) : (
          <View style={styles.videoPlaceholder}>
            <IconSymbol name="video.fill" size={48} color="#555555" />
          </View>
        )}
        
        {/* Video Overlay */}
        <View style={styles.videoOverlay}>
          {/* Step indicator */}
          <View style={styles.stepBadge}>
            <Text style={[styles.stepBadgeText, { fontFamily: "Inter-Medium" }]}>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </View>

          {/* Duration */}
          {currentStep?.duration && (
            <View style={styles.durationBadge}>
              <IconSymbol name="clock.fill" size={14} color="#FFFFFF" />
              <Text style={[styles.durationText, { fontFamily: "Inter" }]}>
                {currentStep.duration}
              </Text>
            </View>
          )}
        </View>

        {/* Play button overlay */}
        <TouchableOpacity 
          style={styles.playButtonOverlay}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <View style={styles.playButton}>
            <IconSymbol 
              name={isPlaying ? "pause.fill" : "play.fill"} 
              size={32} 
              color="#1A1A1A" 
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Current Step Display */}
      <View style={styles.currentStepContainer}>
        <Text style={[styles.currentStepLabel, { fontFamily: "Inter-Medium" }]}>
          CURRENT STEP
        </Text>
        <Text style={[styles.currentStepText, { fontFamily: "PlayfairDisplay-Bold" }]}>
          {currentStep?.instruction || "Loading..."}
        </Text>
      </View>

      {/* Navigation Controls */}
      <View style={styles.navigationControls}>
        <TouchableOpacity
          style={[
            styles.navButton,
            currentStepIndex === 0 && styles.navButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentStepIndex === 0}
          activeOpacity={0.7}
        >
          <IconSymbol name="backward.fill" size={24} color={currentStepIndex === 0 ? "#555555" : "#FFFFFF"} />
          <Text style={[
            styles.navButtonText, 
            { fontFamily: "Inter" },
            currentStepIndex === 0 && styles.navButtonTextDisabled,
          ]}>
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <IconSymbol 
            name={isPlaying ? "pause.fill" : "play.fill"} 
            size={28} 
            color="#1A1A1A" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            currentStepIndex === steps.length - 1 && styles.navButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={currentStepIndex === steps.length - 1}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.navButtonText, 
            { fontFamily: "Inter" },
            currentStepIndex === steps.length - 1 && styles.navButtonTextDisabled,
          ]}>
            Next
          </Text>
          <IconSymbol name="forward.fill" size={24} color={currentStepIndex === steps.length - 1 ? "#555555" : "#FFFFFF"} />
        </TouchableOpacity>
      </View>

      {/* Steps List */}
      <View style={styles.stepsListContainer}>
        <Text style={[styles.stepsListTitle, { fontFamily: "Inter-Medium" }]}>
          ALL STEPS
        </Text>
        <ScrollView 
          style={styles.stepsList}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {steps.map((step, index) => (
            <TouchableOpacity
              key={step.number}
              style={[
                styles.stepItem,
                index === currentStepIndex && styles.stepItemActive,
              ]}
              onPress={() => handleStepPress(index)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.stepNumber,
                index === currentStepIndex && styles.stepNumberActive,
                index < currentStepIndex && styles.stepNumberComplete,
              ]}>
                {index < currentStepIndex ? (
                  <IconSymbol name="checkmark" size={14} color="#1A1A1A" />
                ) : (
                  <Text style={[
                    styles.stepNumberText, 
                    { fontFamily: "Inter-Medium" },
                    index === currentStepIndex && styles.stepNumberTextActive,
                  ]}>
                    {step.number}
                  </Text>
                )}
              </View>
              <View style={styles.stepContent}>
                <Text 
                  style={[
                    styles.stepInstruction, 
                    { fontFamily: "Inter" },
                    index === currentStepIndex && styles.stepInstructionActive,
                  ]}
                  numberOfLines={2}
                >
                  {step.instruction}
                </Text>
                {step.duration && (
                  <Text style={[styles.stepDuration, { fontFamily: "Inter" }]}>
                    {step.duration}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
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
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 8,
  },
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.6,
    backgroundColor: "#1A1A1A",
    position: "relative",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
  },
  videoOverlay: {
    position: "absolute",
    top: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stepBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  durationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  durationText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(201, 169, 98, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  currentStepContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  currentStepLabel: {
    fontSize: 11,
    color: "#C9A962",
    letterSpacing: 1,
    marginBottom: 8,
  },
  currentStepText: {
    fontSize: 18,
    color: "#FFFFFF",
    lineHeight: 26,
  },
  navigationControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
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
  playPauseButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#C9A962",
    justifyContent: "center",
    alignItems: "center",
  },
  stepsListContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepsListTitle: {
    fontSize: 11,
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepsList: {
    flex: 1,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  stepItemActive: {
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberActive: {
    backgroundColor: "#C9A962",
  },
  stepNumberComplete: {
    backgroundColor: "#C9A962",
  },
  stepNumberText: {
    fontSize: 13,
    color: "#888888",
  },
  stepNumberTextActive: {
    color: "#1A1A1A",
  },
  stepContent: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 14,
    color: "#AAAAAA",
    lineHeight: 20,
  },
  stepInstructionActive: {
    color: "#FFFFFF",
  },
  stepDuration: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
  },
});
