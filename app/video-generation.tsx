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

interface StepVideo {
  stepIndex: number;
  videoUrl: string;
  status: "pending" | "generating" | "completed" | "failed";
  error?: string;
}

export default function VideoGenerationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    dishName?: string;
    recipeData?: string;
    imageUri?: string;
    userId?: string;
    recipeId?: string;
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepVideos, setStepVideos] = useState<StepVideo[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing video generation...");
  const [enrichedSteps, setEnrichedSteps] = useState<Array<{
    stepNumber: number;
    originalText: string;
    visualPrompt: string;
    duration: number;
  }> | null>(null);

  // tRPC mutations
  const enrichForVideoMutation = trpc.recipe.enrichForVideo.useMutation();
  const generateStepVideoMutation = trpc.recipe.generateStepVideo.useMutation();

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

  // Main video generation flow
  useEffect(() => {
    const generateVideos = async () => {
      if (!params.recipeData || !params.imageUri) {
        setStatusMessage("Missing recipe data");
        return;
      }

      try {
        // Parse recipe data
        const recipeData = JSON.parse(params.recipeData);
        const steps = recipeData.steps || [];
        
        if (steps.length === 0) {
          setStatusMessage("No steps found in recipe");
          return;
        }

        setTotalSteps(steps.length);
        
        // Initialize step videos array
        const initialStepVideos: StepVideo[] = steps.map((_: any, index: number) => ({
          stepIndex: index,
          videoUrl: "",
          status: "pending" as const,
        }));
        setStepVideos(initialStepVideos);

        // Step 1: Enrich prompts
        setStatusMessage("Analyzing recipe for video generation...");
        
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

        try {
          const enrichResult = await enrichForVideoMutation.mutateAsync({
            title: params.dishName || "Recipe",
            steps: parsedSteps,
          });
          
          if (enrichResult.success && enrichResult.enrichedSteps) {
            setEnrichedSteps(enrichResult.enrichedSteps);
            console.log("Video prompts enriched:", enrichResult.enrichedSteps.length, "steps");
          }
        } catch (enrichError) {
          console.error("Failed to enrich prompts, continuing with basic prompts:", enrichError);
        }

        // Step 2: Generate videos for each step
        const generatedVideos: StepVideo[] = [...initialStepVideos];
        
        for (let i = 0; i < parsedSteps.length; i++) {
          const step = parsedSteps[i];
          setCurrentStepIndex(i);
          setStatusMessage(`Generating video for step ${i + 1} of ${parsedSteps.length}...`);
          
          // Update progress
          const progress = ((i + 0.5) / parsedSteps.length) * 100;
          Animated.timing(progressValue, {
            toValue: progress,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();

          // Mark step as generating
          generatedVideos[i] = { ...generatedVideos[i], status: "generating" };
          setStepVideos([...generatedVideos]);

          try {
            // Call Runway API to generate video and store in Supabase
            const result = await generateStepVideoMutation.mutateAsync({
              userId: params.userId || "anonymous",
              recipeId: params.recipeId || `temp_${Date.now()}`,
              dishName: params.dishName || "Recipe",
              imageUrl: params.imageUri || "",
              stepInstruction: step.instruction,
              stepNumber: step.stepNumber,
            });

            if (result.success && result.videoUrl) {
              generatedVideos[i] = {
                stepIndex: i,
                videoUrl: result.videoUrl,
                status: "completed",
              };
              console.log(`Step ${i + 1} video generated:`, result.videoUrl);
            } else {
              generatedVideos[i] = {
                stepIndex: i,
                videoUrl: "",
                status: "failed",
                error: result.error || "Unknown error",
              };
              console.error(`Step ${i + 1} video failed:`, result.error);
            }
          } catch (error: any) {
            console.error(`Error generating video for step ${i + 1}:`, error);
            generatedVideos[i] = {
              stepIndex: i,
              videoUrl: "",
              status: "failed",
              error: error?.message || "Generation failed",
            };
          }

          setStepVideos([...generatedVideos]);
          
          // Update progress
          const finalProgress = ((i + 1) / parsedSteps.length) * 100;
          Animated.timing(progressValue, {
            toValue: finalProgress,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: false,
          }).start();
        }

        // Complete
        setIsComplete(true);
        setStatusMessage("Video generation complete!");
        
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
              stepVideos: JSON.stringify(generatedVideos),
            },
          });
        }, 1500);

      } catch (error) {
        console.error("Video generation error:", error);
        setStatusMessage("Video generation failed. Please try again.");
      }
    };

    generateVideos();
  }, [params.recipeData, params.imageUri, params.dishName]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const progressWidth = progressValue.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const completedCount = stepVideos.filter(v => v.status === "completed").length;
  const failedCount = stepVideos.filter(v => v.status === "failed").length;

  return (
    <ScreenContainer className="bg-[#1A1A1A]">
      <View style={styles.container}>
        {/* Animated Icon */}
        <Animated.View 
          style={[
            styles.iconContainer,
            { transform: [{ rotate: spin }, { scale: pulseValue }] }
          ]}
        >
          <View style={styles.iconInner}>
            <IconSymbol 
              name={isComplete ? "checkmark" : "sparkles"} 
              size={48} 
              color="#C9A962" 
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
          {isComplete ? "Videos Ready!" : "Creating AI Videos"}
        </Text>

        {/* Dish Name */}
        <Text style={[styles.dishName, { fontFamily: "Inter" }]}>
          {params.dishName || "Recipe"}
        </Text>

        {/* Status Message */}
        <Text style={[styles.statusMessage, { fontFamily: "Inter" }]}>
          {statusMessage}
        </Text>

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
          
          {/* Step Counter */}
          {totalSteps > 0 && (
            <View style={styles.stepCounter}>
              <Text style={[styles.stepCounterText, { fontFamily: "Inter-Medium" }]}>
                {completedCount} of {totalSteps} steps
              </Text>
              {failedCount > 0 && (
                <Text style={[styles.failedText, { fontFamily: "Inter" }]}>
                  ({failedCount} failed)
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Step Status List */}
        {stepVideos.length > 0 && (
          <View style={styles.stepsList}>
            {stepVideos.slice(0, 5).map((video, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[
                  styles.stepDot,
                  video.status === "completed" && styles.stepDotCompleted,
                  video.status === "generating" && styles.stepDotGenerating,
                  video.status === "failed" && styles.stepDotFailed,
                ]} />
                <Text style={[styles.stepText, { fontFamily: "Inter" }]}>
                  Step {index + 1}
                  {video.status === "generating" && " - Generating..."}
                  {video.status === "completed" && " - Done"}
                  {video.status === "failed" && " - Failed"}
                </Text>
              </View>
            ))}
            {stepVideos.length > 5 && (
              <Text style={[styles.moreSteps, { fontFamily: "Inter" }]}>
                +{stepVideos.length - 5} more steps...
              </Text>
            )}
          </View>
        )}

        {/* Info Text */}
        <Text style={[styles.infoText, { fontFamily: "Inter" }]}>
          {isComplete 
            ? "Your cooking videos are ready to play!"
            : "AI is generating unique videos for each cooking step. This may take a few minutes..."}
        </Text>
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
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 32,
  },
  iconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(201, 169, 98, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
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
  statusMessage: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
    marginBottom: 24,
  },
  progressContainer: {
    width: "100%",
    marginBottom: 24,
  },
  progressBar: {
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
  stepCounter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  stepCounterText: {
    fontSize: 14,
    color: "#FFFFFF",
  },
  failedText: {
    fontSize: 12,
    color: "#EF4444",
  },
  stepsList: {
    width: "100%",
    marginBottom: 24,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#555555",
    marginRight: 12,
  },
  stepDotCompleted: {
    backgroundColor: "#22C55E",
  },
  stepDotGenerating: {
    backgroundColor: "#C9A962",
  },
  stepDotFailed: {
    backgroundColor: "#EF4444",
  },
  stepText: {
    fontSize: 13,
    color: "#888888",
  },
  moreSteps: {
    fontSize: 12,
    color: "#666666",
    marginTop: 4,
    marginLeft: 20,
  },
  infoText: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center",
    lineHeight: 20,
  },
});
