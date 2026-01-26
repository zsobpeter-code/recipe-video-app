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
import { concatenateStepVideos, isFFmpegAvailable, type ConcatProgress } from "@/lib/videoConcatService";

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
    cachedStepVideos?: string; // JSON string of existing step videos
    stepImages?: string; // JSON string of step images with HTTPS URLs
  }>();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);
  const [stepVideos, setStepVideos] = useState<StepVideo[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Preparing video generation...");
  const [isConcatenating, setIsConcatenating] = useState(false);
  const [finalVideoPath, setFinalVideoPath] = useState<string | null>(null);
  const [enrichedSteps, setEnrichedSteps] = useState<Array<{
    stepNumber: number;
    originalText: string;
    visualPrompt: string;
    duration: number;
  }> | null>(null);

  // tRPC mutations
  const enrichForVideoMutation = trpc.recipe.enrichForVideo.useMutation();
  const generateStepVideoMutation = trpc.recipe.generateStepVideo.useMutation();
  const updateStepVideosMutation = trpc.recipe.updateStepVideos.useMutation();

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
        console.log("[VideoGeneration] Parsed recipe data:", {
          hasSteps: !!recipeData.steps,
          stepsType: typeof recipeData.steps,
          stepsIsArray: Array.isArray(recipeData.steps),
        });
        
        // Parse steps - handle multiple formats
        let steps: any[] = [];
        
        if (recipeData.steps) {
          if (Array.isArray(recipeData.steps)) {
            steps = recipeData.steps;
          } else if (typeof recipeData.steps === "string") {
            // Steps might be a JSON string
            try {
              const parsed = JSON.parse(recipeData.steps);
              if (Array.isArray(parsed)) {
                steps = parsed;
              }
            } catch {
              console.error("[VideoGeneration] Steps is a string but not valid JSON");
            }
          }
        }
        
        console.log("[VideoGeneration] Parsed steps count:", steps.length);
        
        if (!Array.isArray(steps) || steps.length === 0) {
          setStatusMessage("No steps found in recipe");
          console.error("[VideoGeneration] No valid steps found");
          return;
        }

        setTotalSteps(steps.length);
        
        // Check if videos are already cached
        if (params.cachedStepVideos) {
          try {
            const cachedVideos = JSON.parse(params.cachedStepVideos) as StepVideo[];
            if (cachedVideos.length > 0 && cachedVideos.every(v => v.videoUrl && v.status === "completed")) {
              console.log("[VideoGeneration] Using cached videos:", cachedVideos.length);
              setStepVideos(cachedVideos);
              setCurrentStepIndex(steps.length - 1);
              setStatusMessage("Videos ready!");
              
              // Update progress to 100%
              Animated.timing(progressValue, {
                toValue: 100,
                duration: 500,
                useNativeDriver: false,
              }).start();
              
              // Mark as complete and navigate
              setIsComplete(true);
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              
              setTimeout(() => {
                router.replace({
                  pathname: "/video-player" as any,
                  params: {
                    dishName: params.dishName,
                    recipeData: params.recipeData,
                    imageUri: params.imageUri,
                    stepVideos: params.cachedStepVideos,
                  },
                });
              }, 1000);
              return;
            }
          } catch (cacheError) {
            console.error("[VideoGeneration] Failed to parse cached videos:", cacheError);
          }
        }
        
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
            // Get image URL for this step
            // Priority: step-specific image > main recipe image (must be HTTPS)
            let stepImageUrl = params.imageUri || "";
            
            // Try to get step-specific image from stepImages
            if (params.stepImages) {
              try {
                const stepImagesArray = JSON.parse(params.stepImages);
                const stepImage = stepImagesArray.find((img: any) => img.stepIndex === i);
                if (stepImage?.imageUrl && stepImage.imageUrl.startsWith("https://")) {
                  stepImageUrl = stepImage.imageUrl;
                  console.log(`[VideoGeneration] Using step ${i + 1} image:`, stepImageUrl.substring(0, 80));
                }
              } catch (e) {
                console.error("[VideoGeneration] Failed to parse stepImages:", e);
              }
            }
            
            // Validate that we have an HTTPS URL
            if (!stepImageUrl.startsWith("https://")) {
              console.warn(`[VideoGeneration] Step ${i + 1} image is not HTTPS:`, stepImageUrl.substring(0, 50));
              
              // Try to use any HTTPS URL from stepImages as fallback
              if (params.stepImages) {
                try {
                  const stepImagesArray = JSON.parse(params.stepImages);
                  const anyHttpsImage = stepImagesArray.find((img: any) => img.imageUrl?.startsWith("https://"));
                  if (anyHttpsImage) {
                    stepImageUrl = anyHttpsImage.imageUrl;
                    console.log(`[VideoGeneration] Using fallback HTTPS image from stepImages:`, stepImageUrl.substring(0, 80));
                  }
                } catch (e) {
                  // Ignore
                }
              }
              
              // If still not HTTPS, skip this step with error
              if (!stepImageUrl.startsWith("https://")) {
                console.error(`[VideoGeneration] No HTTPS image available for step ${i + 1}. Video generation requires an AI-generated image or uploaded image.`);
                generatedVideos[i] = {
                  stepIndex: i,
                  videoUrl: "",
                  status: "failed",
                  error: "No HTTPS image available. Please generate an AI photo first.",
                };
                setStepVideos([...generatedVideos]);
                continue; // Skip to next step
              }
            }
            
            // Call Runway API to generate video and store in Supabase
            const result = await generateStepVideoMutation.mutateAsync({
              userId: params.userId || "anonymous",
              recipeId: params.recipeId || `temp_${Date.now()}`,
              dishName: params.dishName || "Recipe",
              imageUrl: stepImageUrl,
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

        // Save step videos to database if we have a recipe ID
        const completedVideos = generatedVideos.filter(v => v.status === "completed" && v.videoUrl);
        if (params.recipeId && completedVideos.length > 0) {
          try {
            await updateStepVideosMutation.mutateAsync({
              recipeId: params.recipeId,
              stepVideos: JSON.stringify(completedVideos),
            });
            console.log("[VideoGeneration] Saved", completedVideos.length, "step videos to database");
          } catch (saveError) {
            console.error("[VideoGeneration] Failed to save step videos:", saveError);
            // Don't fail the whole flow if save fails
          }
        }

        // Step 3: Concatenate videos into single file (native only)
        let concatenatedVideoPath: string | null = null;
        
        if (completedVideos.length > 0 && isFFmpegAvailable()) {
          setIsConcatenating(true);
          setStatusMessage("Merging videos...");
          
          try {
            // Get URLs in order
            const videoUrls = completedVideos
              .sort((a, b) => a.stepIndex - b.stepIndex)
              .map(v => v.videoUrl);
            
            const concatResult = await concatenateStepVideos(
              videoUrls,
              params.recipeId || `temp_${Date.now()}`,
              (progress: ConcatProgress) => {
                setStatusMessage(progress.message);
                if (progress.progress !== undefined) {
                  Animated.timing(progressValue, {
                    toValue: progress.progress,
                    duration: 300,
                    useNativeDriver: false,
                  }).start();
                }
              }
            );
            
            if (concatResult.success && concatResult.localPath) {
              concatenatedVideoPath = concatResult.localPath;
              setFinalVideoPath(concatResult.localPath);
              console.log("[VideoGeneration] Concatenated video:", concatResult.localPath);
            } else {
              console.warn("[VideoGeneration] Concatenation failed:", concatResult.error);
            }
          } catch (concatError) {
            console.error("[VideoGeneration] Concatenation error:", concatError);
            // Continue without concatenated video
          }
          
          setIsConcatenating(false);
        }

        // Complete
        setIsComplete(true);
        setStatusMessage(concatenatedVideoPath ? "Video ready to share!" : "Video generation complete!");
        
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
              finalVideoPath: concatenatedVideoPath || undefined,
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
