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
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration: string;
  durationSeconds: number;
}

// Step-specific visual styles for variety
const STEP_VISUALS = [
  { scale: [1, 1.15], translateX: [0, 15], translateY: [0, 10], overlay: "rgba(201,169,98,0.1)" },
  { scale: [1.05, 1.2], translateX: [-10, 10], translateY: [5, -5], overlay: "rgba(139,90,43,0.15)" },
  { scale: [1, 1.1], translateX: [10, -10], translateY: [-5, 5], overlay: "rgba(201,169,98,0.08)" },
  { scale: [1.08, 1.18], translateX: [5, -15], translateY: [10, 0], overlay: "rgba(168,139,74,0.12)" },
  { scale: [1.02, 1.12], translateX: [-5, 5], translateY: [0, 8], overlay: "rgba(201,169,98,0.05)" },
];

interface EnrichedStep {
  stepNumber: number;
  originalText: string;
  visualPrompt: string;
  duration: number;
}

export default function VideoPlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
    enrichedSteps?: string; // JSON string of enriched visual prompts
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [enrichedSteps, setEnrichedSteps] = useState<EnrichedStep[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsScrollRef = useRef<ScrollView>(null);

  // Ken Burns animation values
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Parse enriched steps if available
  useEffect(() => {
    if (params.enrichedSteps) {
      try {
        const parsed = JSON.parse(params.enrichedSteps) as EnrichedStep[];
        setEnrichedSteps(parsed);
        console.log("Loaded enriched video prompts:", parsed.length, "steps");
      } catch (error) {
        console.error("Failed to parse enriched steps:", error);
      }
    }
  }, [params.enrichedSteps]);

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
              instruction: typeof step.instruction === 'string' ? step.instruction : String(step.instruction || ''),
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

  // Get visual style for current step (cycles through available styles)
  const currentVisual = STEP_VISUALS[currentStepIndex % STEP_VISUALS.length];

  // Ken Burns effect - different animation per step
  useEffect(() => {
    if (isPlaying) {
      const duration = 6000; // 6 seconds per cycle
      const visual = STEP_VISUALS[currentStepIndex % STEP_VISUALS.length];
      
      // Zoom animation specific to this step
      scale.value = withRepeat(
        withSequence(
          withTiming(visual.scale[1], { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.scale[0], { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Pan horizontally - different per step
      translateX.value = withRepeat(
        withSequence(
          withTiming(visual.translateX[1], { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.translateX[0], { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      // Pan vertically - different per step
      translateY.value = withRepeat(
        withSequence(
          withTiming(visual.translateY[1], { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.translateY[0], { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Pulse overlay opacity
      overlayOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Reset to initial state when paused
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(overlayOpacity);
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
      overlayOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying, currentStepIndex]);

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

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
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

  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const dishName = params.dishName || "Delicious Recipe";
      const totalSteps = steps.length;
      const totalTime = steps.reduce((acc, step) => acc + step.durationSeconds, 0);
      const totalMins = Math.floor(totalTime / 60);
      
      const message = `🍳 Check out this recipe for ${dishName}!\n\n` +
        `📝 ${totalSteps} easy steps\n` +
        `⏱️ Total time: ${totalMins} minutes\n\n` +
        `Made with Recipe Studio`;
      
      const result = await Share.share({
        message,
        title: `${dishName} Recipe`,
      });
      
      if (result.action === Share.sharedAction) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Share Failed", "Unable to share recipe. Please try again.");
    }
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

      {/* Video Preview Area with Ken Burns Effect - NO play button overlay */}
      <TouchableOpacity 
        style={styles.videoContainer}
        onPress={handlePlayPause}
        activeOpacity={1}
      >
        <View style={styles.videoWrapper}>
          {params.imageUri ? (
            <>
              <Animated.View style={[styles.kenBurnsContainer, kenBurnsStyle]}>
                <Image
                  source={{ uri: params.imageUri }}
                  style={styles.videoPreview}
                  contentFit="cover"
                />
              </Animated.View>
              {/* Step-specific color overlay for visual variety */}
              <Animated.View 
                style={[
                  styles.stepOverlay, 
                  overlayStyle,
                  { backgroundColor: currentVisual.overlay }
                ]} 
              />
            </>
          ) : (
            <View style={styles.videoPlaceholder}>
              <IconSymbol name="video.fill" size={48} color="#555555" />
              <Text style={[styles.placeholderText, { fontFamily: "Inter" }]}>
                Video Preview
              </Text>
            </View>
          )}
        </View>
        
        {/* Video Overlay - Step indicator and timer only */}
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

        {/* Playing indicator */}
        {isPlaying && (
          <View style={styles.playingIndicator}>
            <View style={styles.playingDot} />
            <Text style={[styles.playingText, { fontFamily: "Inter-Medium" }]}>
              PLAYING
            </Text>
          </View>
        )}

        {/* Paused indicator - subtle tap hint */}
        {!isPlaying && (
          <View style={styles.pausedIndicator}>
            <Text style={[styles.pausedText, { fontFamily: "Inter" }]}>
              Tap to play
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Current Step Display */}
      <View style={styles.currentStepContainer}>
        <Text style={[styles.currentStepLabel, { fontFamily: "Inter-Medium" }]}>
          CURRENT STEP
        </Text>
        <Text style={[styles.currentStepText, { fontFamily: "PlayfairDisplay-Bold" }]}>
          {currentStep?.instruction || "Loading..."}
        </Text>
        {/* Show enriched visual prompt if available */}
        {enrichedSteps[currentStepIndex]?.visualPrompt && (
          <View style={styles.visualPromptContainer}>
            <View style={styles.visualPromptHeader}>
              <IconSymbol name="video.fill" size={12} color="#C9A962" />
              <Text style={[styles.visualPromptLabel, { fontFamily: "Inter-Medium" }]}>
                Scene Description
              </Text>
            </View>
            <Text style={[styles.visualPromptText, { fontFamily: "Inter" }]}>
              {enrichedSteps[currentStepIndex].visualPrompt}
            </Text>
          </View>
        )}
      </View>

      {/* Navigation Controls - Single play/pause button here */}
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

      {/* Steps List - Now in a scrollable container */}
      <View style={styles.stepsListContainer}>
        <Text style={[styles.stepsListTitle, { fontFamily: "Inter-Medium" }]}>
          ALL STEPS
        </Text>
        <ScrollView 
          ref={stepsScrollRef}
          style={styles.stepsList}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
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
  stepOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  pausedIndicator: {
    position: "absolute",
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  pausedText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
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
  visualPromptContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "rgba(201,169,98,0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,98,0.2)",
  },
  visualPromptHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  visualPromptLabel: {
    fontSize: 10,
    color: "#C9A962",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  visualPromptText: {
    fontSize: 13,
    color: "#AAAAAA",
    lineHeight: 18,
    fontStyle: "italic",
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
    minHeight: 150,
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
