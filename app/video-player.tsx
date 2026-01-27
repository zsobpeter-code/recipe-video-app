import { useState, useEffect, useRef, useCallback } from "react";
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
import { useVideoPlayer, VideoView } from "expo-video";
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
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as MediaLibrary from "expo-media-library";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface RecipeStep {
  number: number;
  instruction: string;
  duration: string;
  durationSeconds: number;
  videoUrl?: string;
}

interface StepVideo {
  stepIndex: number;
  videoUrl: string;
  status: string;
}

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
    enrichedSteps?: string;
    stepVideos?: string; // JSON string of step videos from Runway
    mode?: string;
    finalVideoPath?: string; // Local path to concatenated final video
    finalVideoUrl?: string; // HTTPS URL to final video in storage
  }>();

  const isCookMode = params.mode === "cook";

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [steps, setSteps] = useState<RecipeStep[]>([]);
  const [stepVideos, setStepVideos] = useState<StepVideo[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [enrichedSteps, setEnrichedSteps] = useState<EnrichedStep[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [showFinalVideo, setShowFinalVideo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsScrollRef = useRef<ScrollView>(null);

  // Get current step video URL
  const currentStepVideo = stepVideos.find(v => v.stepIndex === currentStepIndex);
  const hasRealVideo = currentStepVideo?.videoUrl && currentStepVideo.status === "completed";

  // Get the final video URL (prefer local path, fallback to HTTPS URL)
  const finalVideoSource = params.finalVideoPath || params.finalVideoUrl;

  // Create video player for current step
  const player = useVideoPlayer(hasRealVideo ? currentStepVideo.videoUrl : null, (player) => {
    player.loop = false;
    player.muted = false;
  });

  // Ken Burns animation values (fallback when no real video)
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  // Parse recipe data
  useEffect(() => {
    if (params.recipeData) {
      try {
        const data = JSON.parse(params.recipeData);
        console.log("[VideoPlayer] Parsed recipe data:", {
          hasSteps: !!data.steps,
          stepsType: typeof data.steps,
          stepsIsArray: Array.isArray(data.steps),
        });
        
        // Parse steps - handle multiple formats
        let stepsArray: any[] = [];
        
        if (data.steps) {
          if (Array.isArray(data.steps)) {
            stepsArray = data.steps;
          } else if (typeof data.steps === "string") {
            // Steps might be a JSON string
            try {
              const parsed = JSON.parse(data.steps);
              if (Array.isArray(parsed)) {
                stepsArray = parsed;
              }
            } catch {
              console.error("[VideoPlayer] Steps is a string but not valid JSON");
            }
          }
        }
        
        if (stepsArray.length > 0) {
          const parsedSteps = stepsArray.map((step: any, index: number) => {
            const instruction = typeof step === "string" ? step : step.instruction;
            const duration = typeof step === "object" ? step.duration : 2;
            return {
              number: index + 1,
              instruction: instruction || `Step ${index + 1}`,
              duration: duration ? `${duration} min` : "2 min",
              durationSeconds: (duration || 2) * 60,
            };
          });
          console.log("[VideoPlayer] Parsed steps:", parsedSteps.length);
          setSteps(parsedSteps);
        } else {
          console.error("[VideoPlayer] No valid steps found in recipe data");
        }
      } catch (e) {
        console.error("[VideoPlayer] Failed to parse recipe data:", e);
      }
    }
    
    // Parse enriched steps
    if (params.enrichedSteps) {
      try {
        const enriched = JSON.parse(params.enrichedSteps);
        if (Array.isArray(enriched)) {
          setEnrichedSteps(enriched);
        }
      } catch (e) {
        console.error("Failed to parse enriched steps:", e);
      }
    }
    
    // Parse step videos
    if (params.stepVideos) {
      try {
        const videos = JSON.parse(params.stepVideos);
        if (Array.isArray(videos)) {
          setStepVideos(videos);
        }
      } catch (e) {
        console.error("Failed to parse step videos:", e);
      }
    }
  }, [params.recipeData, params.enrichedSteps, params.stepVideos]);

  // Handle video player events
  useEffect(() => {
    if (!player) return;

    const subscription = player.addListener("playingChange", (event) => {
      if (event.isPlaying !== isPlaying) {
        setIsPlaying(event.isPlaying);
      }
    });

    const statusSubscription = player.addListener("statusChange", (event) => {
      if (event.status === "loading") {
        setIsVideoLoading(true);
      } else {
        setIsVideoLoading(false);
      }
      
      // Auto-advance when video ends
      if (event.status === "idle" && isPlaying) {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex(prev => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }
    });

    return () => {
      subscription.remove();
      statusSubscription.remove();
    };
  }, [player, isPlaying, currentStepIndex, steps.length]);

  // Ken Burns animation (fallback for steps without video)
  useEffect(() => {
    if (hasRealVideo) {
      // Reset animations when using real video
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      scale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      return;
    }

    if (isPlaying) {
      const duration = 8000;
      const stepVisualIndex = currentStepIndex % 5;
      const visual = [
        { scale: [1, 1.15], translateX: [0, 15], translateY: [0, 10] },
        { scale: [1.05, 1.2], translateX: [-10, 10], translateY: [5, -5] },
        { scale: [1, 1.1], translateX: [10, -10], translateY: [-5, 5] },
        { scale: [1.08, 1.18], translateX: [5, -15], translateY: [10, 0] },
        { scale: [1.02, 1.12], translateX: [-5, 5], translateY: [0, 8] },
      ][stepVisualIndex];

      scale.value = withRepeat(
        withSequence(
          withTiming(visual.scale[1], { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.scale[0], { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      translateX.value = withRepeat(
        withSequence(
          withTiming(visual.translateX[1], { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.translateX[0], { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      translateY.value = withRepeat(
        withSequence(
          withTiming(visual.translateY[1], { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(visual.translateY[0], { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      scale.value = withTiming(1, { duration: 300 });
      translateX.value = withTiming(0, { duration: 300 });
      translateY.value = withTiming(0, { duration: 300 });
    }
  }, [isPlaying, currentStepIndex, hasRealVideo]);

  // Timer effect (for steps without video)
  useEffect(() => {
    if (!hasRealVideo && isPlaying && steps.length > 0) {
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          const currentStep = steps[currentStepIndex];
          if (prev >= currentStep.durationSeconds) {
            if (currentStepIndex < steps.length - 1) {
              setCurrentStepIndex(idx => idx + 1);
              return 0;
            } else {
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
  }, [isPlaying, currentStepIndex, steps, hasRealVideo]);

  // Reset timer when step changes
  useEffect(() => {
    setElapsedTime(0);
    
    // Play video for new step if available
    if (hasRealVideo && player) {
      player.play();
      setIsPlaying(true);
    }
  }, [currentStepIndex]);

  const kenBurnsStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const currentStep = steps[currentStepIndex];
  const currentEnriched = enrichedSteps.find(e => e.stepNumber === currentStepIndex + 1);

  const handlePlayPause = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (hasRealVideo && player) {
      if (isPlaying) {
        player.pause();
      } else {
        player.play();
      }
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

  // Swipe gesture for navigating between steps
  const swipeGesture = Gesture.Pan()
    .runOnJS(true)
    .onEnd((event) => {
      const { translationX, velocityX } = event;
      const threshold = 50;
      const velocityThreshold = 500;
      
      if (translationX > threshold || velocityX > velocityThreshold) {
        // Swipe right - go to previous step
        handlePrevious();
      } else if (translationX < -threshold || velocityX < -velocityThreshold) {
        // Swipe left - go to next step
        handleNext();
      }
    });

  const handleClose = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  // Download video to Camera Roll
  const handleDownload = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (!finalVideoSource) {
      Alert.alert("No Video", "Please wait for video generation to complete.");
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Please allow access to save videos to your Camera Roll.");
        setIsSaving(false);
        return;
      }
      
      let localPath = finalVideoSource;
      
      // If it's a remote URL, download it first
      if (finalVideoSource.startsWith("http")) {
        const downloadPath = `${FileSystem.cacheDirectory}download_video_${Date.now()}.mp4`;
        const downloadResult = await FileSystem.downloadAsync(finalVideoSource, downloadPath);
        localPath = downloadResult.uri;
      }
      
      // Save to Camera Roll
      await MediaLibrary.saveToLibraryAsync(localPath);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      Alert.alert("Saved!", "Video saved to your Camera Roll.");
      
      // Clean up temp file if we downloaded it
      if (finalVideoSource.startsWith("http")) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to save video. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Share actual video file
  const handleShare = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (!finalVideoSource) {
      Alert.alert("No Video", "Video is not ready yet.");
      return;
    }
    
    setIsSharing(true);
    
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert("Sharing Unavailable", "Sharing is not available on this device.");
        setIsSharing(false);
        return;
      }
      
      let localPath = finalVideoSource;
      
      // If it's a remote URL, download it first
      if (finalVideoSource.startsWith("http")) {
        const downloadPath = `${FileSystem.cacheDirectory}share_video_${Date.now()}.mp4`;
        const downloadResult = await FileSystem.downloadAsync(finalVideoSource, downloadPath);
        localPath = downloadResult.uri;
      }
      
      // Share the video file
      await Sharing.shareAsync(localPath, {
        mimeType: "video/mp4",
        dialogTitle: `Share ${params.dishName || "Recipe"} Video`,
        UTI: "public.mpeg-4",
      });
      
      // Clean up temp file if we downloaded it
      if (finalVideoSource.startsWith("http")) {
        await FileSystem.deleteAsync(localPath, { idempotent: true });
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share video. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleStepPress = (index: number) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentStepIndex(index);
  };

  return (
    <ScreenContainer edges={["top", "left", "right"]} containerClassName="bg-[#1A1A1A]">
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
          {isCookMode ? "Cook Mode" : "Video Tutorial"}
        </Text>
        <View style={styles.headerRight}>
          {/* Download button */}
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={handleDownload}
            activeOpacity={0.7}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="#C9A962" />
            ) : (
              <IconSymbol name="arrow.down.circle" size={22} color="#C9A962" />
            )}
          </TouchableOpacity>
          {/* Share button */}
          <TouchableOpacity 
            style={styles.headerIconButton}
            onPress={handleShare}
            activeOpacity={0.7}
            disabled={isSharing}
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#C9A962" />
            ) : (
              <IconSymbol name="square.and.arrow.up" size={20} color="#C9A962" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Video/Image Container - Swipeable */}
      <GestureDetector gesture={swipeGesture}>
      <View style={styles.videoContainer}>
        {hasRealVideo ? (
          // Real video playback
          <View style={styles.videoWrapper}>
            <VideoView
              player={player}
              style={styles.video}
              contentFit="cover"
              nativeControls={false}
            />
            {isVideoLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#C9A962" />
              </View>
            )}
          </View>
        ) : (
          // Fallback: Ken Burns image animation
          <Animated.View style={[styles.imageWrapper, kenBurnsStyle]}>
            {params.imageUri ? (
              <Image
                source={{ uri: params.imageUri }}
                style={styles.stepImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <IconSymbol name="photo" size={48} color="#555555" />
              </View>
            )}
          </Animated.View>
        )}
        
        {/* Gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(26, 26, 26, 0.8)", "#1A1A1A"]}
          style={styles.gradient}
        />
        
        {/* Step badge */}
        <View style={styles.stepBadge}>
          <Text style={[styles.stepBadgeText, { fontFamily: "Inter-Medium" }]}>
            {hasRealVideo ? "AI VIDEO" : "STEP"} {currentStepIndex + 1}/{steps.length}
          </Text>
        </View>
        
        {/* Play button overlay */}
        {!isPlaying && (
          <TouchableOpacity 
            style={styles.playOverlay}
            onPress={handlePlayPause}
            activeOpacity={0.8}
          >
            <View style={styles.playIconContainer}>
              <IconSymbol name="play.fill" size={40} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        )}
      </View>
      </GestureDetector>

      {/* Current Step Info */}
      <View style={styles.currentStepContainer}>
        {isCookMode && (
          <Text style={[styles.dishNameSubtitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
            {params.dishName || "Recipe"}
          </Text>
        )}
        <Text style={[styles.currentStepText, { fontFamily: "Inter" }]}>
          {currentStep?.instruction || "Loading..."}
        </Text>
      </View>

      {/* Navigation hint */}
      <View style={styles.swipeHint}>
        <Text style={[styles.swipeHintText, { fontFamily: "Inter" }]}>
          Swipe left/right or tap a step below
        </Text>
      </View>


      {/* All Steps List */}
      <View style={styles.stepsSection}>
        <Text style={[styles.stepsSectionTitle, { fontFamily: "Inter-Medium" }]}>
          ALL STEPS
        </Text>
        <ScrollView 
          ref={stepsScrollRef}
          style={styles.stepsScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          nestedScrollEnabled={true}
        >
          {steps.map((step, index) => {
            const hasVideo = stepVideos.find(v => v.stepIndex === index && v.status === "completed");
            return (
              <TouchableOpacity
                key={index}
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
                ]}>
                  {hasVideo ? (
                    <IconSymbol name="play.fill" size={12} color={index === currentStepIndex ? "#1A1A1A" : "#C9A962"} />
                  ) : (
                    <Text style={[
                      styles.stepNumberText,
                      { fontFamily: "Inter-Medium" },
                      index === currentStepIndex && styles.stepNumberTextActive,
                    ]}>
                      {index + 1}
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
                </View>
              </TouchableOpacity>
            );
          })}
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
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
  videoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH * 0.65,
    overflow: "hidden",
    position: "relative",
  },
  videoWrapper: {
    width: "100%",
    height: "100%",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageWrapper: {
    width: "120%",
    height: "120%",
    marginLeft: "-10%",
    marginTop: "-10%",
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
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  stepBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "rgba(201, 169, 98, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  stepBadgeText: {
    fontSize: 11,
    color: "#1A1A1A",
    letterSpacing: 1,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  playIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentStepContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  dishNameSubtitle: {
    fontSize: 20,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  currentStepText: {
    fontSize: 16,
    color: "#FFFFFF",
    lineHeight: 24,
  },
  swipeHint: {
    alignItems: "center",
    paddingVertical: 12,
  },
  swipeHintText: {
    fontSize: 12,
    color: "#666666",
    fontStyle: "italic",
  },
  stepsSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepsSectionTitle: {
    fontSize: 11,
    color: "#888888",
    letterSpacing: 1,
    marginBottom: 12,
  },
  stepsScroll: {
    flex: 1,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  stepItemActive: {
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderBottomWidth: 0,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  stepNumberActive: {
    backgroundColor: "#C9A962",
  },
  stepNumberText: {
    fontSize: 12,
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
    color: "#CCCCCC",
    lineHeight: 20,
    marginBottom: 4,
  },
  stepInstructionActive: {
    color: "#FFFFFF",
  },
});
