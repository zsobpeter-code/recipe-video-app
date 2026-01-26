import { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  StyleSheet,
  Platform,
  Animated,
  Easing,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

const GENERATION_STEPS = [
  { id: 1, label: "Analyzing recipe structure", duration: 2000 },
  { id: 2, label: "Generating scene compositions", duration: 3000 },
  { id: 3, label: "Creating cooking animations", duration: 4000 },
  { id: 4, label: "Adding step-by-step narration", duration: 2500 },
  { id: 5, label: "Finalizing video output", duration: 2000 },
];

export default function VideoGenerationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
  }>();

  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [enrichedSteps, setEnrichedSteps] = useState<Array<{
    stepNumber: number;
    originalText: string;
    visualPrompt: string;
    duration: number;
  }> | null>(null);

  // tRPC mutation for video enrichment
  const enrichForVideoMutation = trpc.recipe.enrichForVideo.useMutation();

  // Animations
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const progressValue = useRef(new Animated.Value(0)).current;

  // Spin animation
  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [spinValue]);

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseValue]);

  // Call enrichForVideo API on mount
  useEffect(() => {
    const enrichVideo = async () => {
      if (!params.recipeData) return;
      
      try {
        const recipeData = JSON.parse(params.recipeData);
        const steps = recipeData.steps || [];
        
        // Parse steps - handle both string array and Step object array
        const parsedSteps = steps.map((step: unknown, index: number) => {
          if (typeof step === "string") {
            return { stepNumber: index + 1, instruction: step };
          }
          const stepObj = step as Record<string, unknown>;
          return {
            stepNumber: typeof stepObj.stepNumber === "number" ? stepObj.stepNumber : index + 1,
            instruction: typeof stepObj.instruction === "string" ? stepObj.instruction : String(stepObj.instruction || `Step ${index + 1}`),
            duration: typeof stepObj.duration === "number" ? stepObj.duration : undefined,
          };
        });
        
        const result = await enrichForVideoMutation.mutateAsync({
          title: params.dishName || "Recipe",
          steps: parsedSteps,
        });
        
        if (result.success && result.enrichedSteps) {
          setEnrichedSteps(result.enrichedSteps);
          console.log("Video prompts enriched:", result.enrichedSteps);
        }
      } catch (error) {
        console.error("Failed to enrich video prompts:", error);
        // Continue without enriched prompts - fallback will be used
      }
    };
    
    enrichVideo();
  }, [params.recipeData, params.dishName]);

  // Progress through steps
  useEffect(() => {
    let stepIndex = 0;
    let totalProgress = 0;
    const totalDuration = GENERATION_STEPS.reduce((sum, step) => sum + step.duration, 0);

    const processStep = () => {
      if (stepIndex >= GENERATION_STEPS.length) {
        setIsComplete(true);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Navigate to video player after short delay
        setTimeout(() => {
          router.replace({
            pathname: "/video-player" as any,
            params: {
              dishName: params.dishName,
              recipeData: params.recipeData,
              imageUri: params.imageUri,
              enrichedSteps: enrichedSteps ? JSON.stringify(enrichedSteps) : undefined,
            },
          });
        }, 1000);
        return;
      }

      const step = GENERATION_STEPS[stepIndex];
      setCurrentStep(stepIndex);

      // Animate progress
      const stepProgress = (step.duration / totalDuration) * 100;
      totalProgress += stepProgress;

      Animated.timing(progressValue, {
        toValue: totalProgress,
        duration: step.duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();

      // Update progress state for display
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          const target = totalProgress;
          if (prev >= target - 1) {
            clearInterval(progressInterval);
            return target;
          }
          return prev + 1;
        });
      }, step.duration / stepProgress);

      setTimeout(() => {
        stepIndex++;
        processStep();
      }, step.duration);
    };

    processStep();
  }, [params.dishName, params.recipeData, params.imageUri, progressValue, router, enrichedSteps]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <ScreenContainer 
      edges={["top", "left", "right", "bottom"]} 
      containerClassName="bg-background"
    >
      <View style={styles.container}>
        {/* Animated Icon */}
        <View style={styles.iconContainer}>
          <Animated.View 
            style={[
              styles.spinRing,
              { transform: [{ rotate: spin }] }
            ]}
          >
            <View style={styles.ringSegment} />
            <View style={[styles.ringSegment, styles.ringSegment2]} />
            <View style={[styles.ringSegment, styles.ringSegment3]} />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.centerIcon,
              { transform: [{ scale: pulseValue }] }
            ]}
          >
            <IconSymbol 
              name={isComplete ? "checkmark.circle.fill" : "video.fill"} 
              size={40} 
              color="#C9A962" 
            />
          </Animated.View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
          {isComplete ? "Video Ready!" : "Generating Video"}
        </Text>

        {/* Dish Name */}
        {params.dishName && (
          <Text style={[styles.dishName, { fontFamily: "Caveat" }]}>
            {params.dishName}
          </Text>
        )}

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View 
              style={[
                styles.progressFill,
                { width: progressWidth }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { fontFamily: "Inter-Medium" }]}>
            {Math.round(progress)}%
          </Text>
        </View>

        {/* Current Step */}
        <View style={styles.stepsContainer}>
          {GENERATION_STEPS.map((step, index) => (
            <View 
              key={step.id} 
              style={[
                styles.stepRow,
                index === currentStep && styles.stepRowActive,
                index < currentStep && styles.stepRowComplete,
              ]}
            >
              <View style={[
                styles.stepIndicator,
                index === currentStep && styles.stepIndicatorActive,
                index < currentStep && styles.stepIndicatorComplete,
              ]}>
                {index < currentStep ? (
                  <IconSymbol name="checkmark" size={12} color="#1A1A1A" />
                ) : index === currentStep ? (
                  <View style={styles.stepDot} />
                ) : null}
              </View>
              <Text style={[
                styles.stepLabel,
                { fontFamily: "Inter" },
                index === currentStep && styles.stepLabelActive,
                index < currentStep && styles.stepLabelComplete,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Tip */}
        <View style={styles.tipContainer}>
          <Text style={[styles.tipText, { fontFamily: "Inter" }]}>
            This usually takes about 30 seconds. Your video will include step-by-step cooking instructions.
          </Text>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  spinRing: {
    position: "absolute",
    width: 140,
    height: 140,
  },
  ringSegment: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
    borderColor: "transparent",
    borderTopColor: "#C9A962",
  },
  ringSegment2: {
    transform: [{ rotate: "120deg" }],
    borderTopColor: "rgba(201, 169, 98, 0.5)",
  },
  ringSegment3: {
    transform: [{ rotate: "240deg" }],
    borderTopColor: "rgba(201, 169, 98, 0.25)",
  },
  centerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  dishName: {
    fontSize: 22,
    color: "#C9A962",
    marginBottom: 32,
  },
  progressContainer: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  progressBar: {
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
    width: 45,
    textAlign: "right",
  },
  stepsContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 32,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    opacity: 0.4,
  },
  stepRowActive: {
    opacity: 1,
  },
  stepRowComplete: {
    opacity: 0.7,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepIndicatorActive: {
    backgroundColor: "rgba(201, 169, 98, 0.3)",
    borderWidth: 2,
    borderColor: "#C9A962",
  },
  stepIndicatorComplete: {
    backgroundColor: "#C9A962",
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9A962",
  },
  stepLabel: {
    fontSize: 14,
    color: "#888888",
  },
  stepLabelActive: {
    color: "#FFFFFF",
  },
  stepLabelComplete: {
    color: "#AAAAAA",
  },
  tipContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tipText: {
    fontSize: 13,
    color: "#888888",
    textAlign: "center",
    lineHeight: 20,
  },
});
