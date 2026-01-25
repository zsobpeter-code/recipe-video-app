import { useState, useEffect, useRef } from "react";
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
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration: string;
  durationSeconds: number;
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
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Ken Burns animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Parse recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        const rawSteps = data.steps ? (typeof data.steps === 'string' ? JSON.parse(data.steps) : data.steps) : [];
        const parsedSteps: RecipeStep[] = rawSteps.map(
          (step: string | { stepNumber?: number; instruction: string; duration?: number }, index: number) => {
            // Handle both string steps and object steps
            const durationSecs = typeof step === 'object' && step.duration 
              ? step.duration 
              : Math.floor(Math.random() * 120) + 30; // 30-150 seconds
            
            const mins = Math.floor(durationSecs / 60);
            const secs = durationSecs % 60;
            
            if (typeof step === 'string') {
              return {
                number: index + 1,
                instruction: step,
                duration: `${mins}:${String(secs).padStart(2, "0")}`,
                durationSeconds: durationSecs,
              };
            }
            return {
              number: step.stepNumber || index + 1,
              instruction: step.instruction,
              duration: `${mins}:${String(secs).padStart(2, "0")}`,
              durationSeconds: durationSecs,
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
          { number: 1, instruction: "Gather all ingredients and prep your workspace", duration: "0:30", durationSeconds: 30 },
          { number: 2, instruction: "Heat the pan over medium heat with oil", duration: "1:00", durationSeconds: 60 },
          { number: 3, instruction: "Add the main ingredients and cook until golden", duration: "3:00", durationSeconds: 180 },
          { number: 4, instruction: "Season with salt, pepper, and herbs", duration: "0:45", durationSeconds: 45 },
          { number: 5, instruction: "Plate and garnish before serving", duration: "1:15", durationSeconds: 75 },
        ]);
      }
    } else {
      // Mock steps if no data
      setSteps([
        { number: 1, instruction: "Gather all ingredients and prep your workspace", duration: "0:30", durationSeconds: 30 },
        { number: 2, instruction: "Heat the pan over medium heat with oil", duration: "1:00", durationSeconds: 60 },
        { number: 3, instruction: "Add the main ingredients and cook until golden", duration: "3:00", durationSeconds: 180 },
        { number: 4, instruction: "Season with salt, pepper, and herbs", duration: "0:45", durationSeconds: 45 },
        { number: 5, instruction: "Plate and garnish before serving", duration: "1:15", durationSeconds: 75 },
      ]);
    }
  }, [params.recipeData]);

  // Ken Burns effect - slow zoom and pan animation
  useEffect(() => {
    if (isPlaying) {
      // Start Ken Burns animation
      const duration = 8000; // 8 seconds per cycle
      
      // Zoom in slowly while panning
      scale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Pan horizontally
      translateX.value = withRepeat(
        withSequence(
          withTiming(15, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-15, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Pan vertically
      translateY.value = withRepeat(
        withSequence(
          withTiming(10, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(-10, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Reset to initial state when paused
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying]);

  // Timer effect
  useEffect(() => {
    if (isPlaying && steps.length > 0) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const currentStep = steps[currentStepIndex];
          if (prev >= currentStep.durationSeconds) {
            // Auto-advance to next step
            if (currentStepIndex < steps.length - 1) {
              setCurrentStepIndex(idx => idx + 1);
              return 0;
            } else {
              // End of all steps
              setIsPlaying(false);
              return prev;
            }
          }
          return prev + 1;
        });
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
  }, [isPlaying, currentStepIndex, steps]);

  // Reset timer when step changes
  useEffect(() => {
    setElapsedTime(0);
  }, [currentStepIndex]);

  const kenBurnsStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const currentStep = steps[currentStepIndex];
  
  // Format elapsed time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercent = currentStep 
    ? Math.min((elapsedTime / currentStep.durationSeconds) * 100, 100) 
    : 0;

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
    setIsPlaying(false);
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

      {/* Video Preview Area with Ken Burns Effect */}
      <View style={styles.videoContainer}>
        <View style={styles.videoWrapper}>
          {params.imageUri ? (
            <Animated.View style={[styles.kenBurnsContainer, kenBurnsStyle]}>
              <Image
                source={{ uri: params.imageUri }}
                style={styles.videoPreview}
                contentFit="cover"
              />
            </Animated.View>
          ) : (
            <View style={styles.videoPlaceholder}>
              <IconSymbol name="video.fill" size={48} color="#555555" />
              <Text style={[styles.placeholderText, { fontFamily: "Inter" }]}>
                Video Preview
              </Text>
            </View>
          )}
        </View>
        
        {/* Video Overlay */}
        <View style={styles.videoOverlay}>
          {/* Step indicator */}
          <View style={styles.stepBadge}>
            <Text style={[styles.stepBadgeText, { fontFamily: "Inter-Medium" }]}>
              Step {currentStepIndex + 1} of {steps.length}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerBadge}>
            <IconSymbol name="clock.fill" size={14} color="#FFFFFF" />
            <Text style={[styles.timerText, { fontFamily: "Inter-Medium" }]}>
              {formatTime(elapsedTime)} / {currentStep?.duration || "0:00"}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
        </View>

        {/* Play button overlay */}
        <TouchableOpacity 
          style={styles.playButtonOverlay}
          onPress={handlePlayPause}
          activeOpacity={0.8}
        >
          <View style={[styles.playButton, isPlaying && styles.playButtonPlaying]}>
            <IconSymbol 
              name={isPlaying ? "pause.fill" : "play.fill"} 
              size={32} 
              color="#1A1A1A" 
            />
          </View>
        </TouchableOpacity>

        {/* Playing indicator */}
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <View style={styles.playingDot} />
            <Text style={[styles.playingText, { fontFamily: "Inter-Medium" }]}>
              PLAYING
            </Text>
          </View>
        )}
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
          style={[styles.playPauseButton, isPlaying && styles.playPauseButtonActive]}
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
                index < currentStepIndex && styles.stepItemCompleted,
              ]}
              onPress={() => handleStepPress(index)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.stepNumber,
                index === currentStepIndex && styles.stepNumberActive,
                index < currentStepIndex && styles.stepNumberCompleted,
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
              <View style={styles.stepInfo}>
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
                <Text style={[styles.stepDuration, { fontFamily: "Inter" }]}>
                  {step.duration}
                </Text>
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
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    color: "#FFFFFF",
    textAlign: "center",
    marginHorizontal: 12,
  },
  videoContainer: {
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#2A2A2A",
    aspectRatio: 16 / 9,
  },
  videoWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  kenBurnsContainer: {
    width: "100%",
    height: "100%",
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeholderText: {
    fontSize: 14,
    color: "#666666",
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
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 12,
    color: "#FFFFFF",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#C9A962",
  },
  playButtonOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  playButtonPlaying: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  playingIndicator: {
    position: "absolute",
    bottom: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  playingText: {
    fontSize: 10,
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  currentStepContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  currentStepLabel: {
    fontSize: 11,
    color: "#C9A962",
    letterSpacing: 1,
  },
  currentStepText: {
    fontSize: 20,
    color: "#FFFFFF",
    lineHeight: 28,
  },
  navigationControls: {
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
    paddingVertical: 8,
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
    alignItems: "center",
    justifyContent: "center",
  },
  playPauseButtonActive: {
    backgroundColor: "#FFFFFF",
  },
  stepsListContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  stepItemActive: {
    backgroundColor: "rgba(201,169,98,0.15)",
    borderWidth: 1,
    borderColor: "rgba(201,169,98,0.3)",
  },
  stepItemCompleted: {
    opacity: 0.6,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberActive: {
    backgroundColor: "#C9A962",
  },
  stepNumberCompleted: {
    backgroundColor: "#4ADE80",
  },
  stepNumberText: {
    fontSize: 12,
    color: "#888888",
  },
  stepNumberTextActive: {
    color: "#1A1A1A",
  },
  stepInfo: {
    flex: 1,
    gap: 4,
  },
  stepInstruction: {
    fontSize: 14,
    color: "#CCCCCC",
    lineHeight: 20,
  },
  stepInstructionActive: {
    color: "#FFFFFF",
  },
  stepDuration: {
    fontSize: 12,
    color: "#888888",
  },
});
