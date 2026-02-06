import { useState, useCallback, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShareMenu } from "@/components/share-menu";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
  notes?: string;
}

interface Step {
  stepNumber: number;
  instruction: string;
  duration?: number;
  tips?: string;
}

export default function RecipeCardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri: string;
    dishName: string;
    description: string;
    cuisine: string;
    difficulty: string;
    prepTime: string;
    cookTime: string;
    servings: string;
    ingredients: string;
    steps: string;
    tags: string;
    recipeId?: string;
    userId?: string;
    stepImages?: string;
    tikTokVideoUrl?: string;
    canRegen?: string;
  }>();

  // Parse JSON params
  const ingredients: Ingredient[] = params.ingredients ? JSON.parse(params.ingredients) : [];
  const tags: string[] = params.tags ? JSON.parse(params.tags) : [];
  
  // Parse steps - handle both string array (demo recipes) and Step object array (AI-generated)
  const rawSteps = params.steps ? JSON.parse(params.steps) : [];
  const steps: Step[] = rawSteps.map((step: unknown, index: number) => {
    if (typeof step === "string") {
      return { stepNumber: index + 1, instruction: step };
    }
    const stepObj = step as Record<string, unknown>;
    return {
      stepNumber: typeof stepObj.stepNumber === "number" ? stepObj.stepNumber : index + 1,
      instruction: typeof stepObj.instruction === "string" ? stepObj.instruction : String(stepObj.instruction || `Step ${index + 1}`),
      duration: typeof stepObj.duration === "number" ? stepObj.duration : undefined,
      tips: typeof stepObj.tips === "string" ? stepObj.tips : undefined,
    };
  });

  // Parse step images if available
  const stepImages: string[] = (() => {
    if (!params.stepImages) return [];
    try {
      const parsed = JSON.parse(params.stepImages);
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();

  // ── State ──
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!params.recipeId);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(params.recipeId || null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [heroImageUri, setHeroImageUri] = useState(params.imageUri || "");
  const [tikTokVideoUrl, setTikTokVideoUrl] = useState<string | null>(params.tikTokVideoUrl || null);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoGenerationStatus, setVideoGenerationStatus] = useState("");
  const [canRegen, setCanRegen] = useState(params.canRegen === "true");
  const [isGeneratingStepImages, setIsGeneratingStepImages] = useState(false);
  const [localStepImages, setLocalStepImages] = useState<string[]>(stepImages);
  
  // Animation values
  const ingredientsHeight = useSharedValue(0);
  const stepsHeight = useSharedValue(0);

  // Video player for inline playback
  const videoPlayer = useVideoPlayer(tikTokVideoUrl || "", (player) => {
    player.loop = true;
  });

  // tRPC mutations
  const uploadImage = trpc.recipe.uploadImage.useMutation();
  const saveRecipe = trpc.recipe.save.useMutation();
  const toggleFavoriteMutation = trpc.recipe.toggleFavorite.useMutation();
  const tikTokGenerate = trpc.recipe.generateTikTokVideo.useMutation();
  const tikTokRegenerate = trpc.recipe.regenerateTikTokVideo.useMutation();

  // ── Hero Image Tap → Change/Upload ──
  const handleChangeHeroImage = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [9, 16],
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets[0]) {
      setHeroImageUri(result.assets[0].uri);
    }
  };

  // ── Upload local image to Supabase ──
  const ensureHttpsImage = async (uri: string): Promise<string> => {
    if (uri.startsWith("https://")) return uri;
    
    let imageBase64 = "";
    if (Platform.OS === "web") {
      const response = await fetch(uri);
      const blob = await response.blob();
      imageBase64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1] || "");
        };
        reader.readAsDataURL(blob);
      });
    } else {
      imageBase64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    }
    
    const uploadResult = await uploadImage.mutateAsync({
      imageBase64,
      fileName: `${params.dishName?.replace(/\s+/g, "-") || "recipe"}-hero.jpg`,
    });
    
    if (uploadResult.success && uploadResult.url) {
      return uploadResult.url;
    }
    throw new Error("Failed to upload image");
  };

  // ── Generate TikTok Video (inline, no navigation) ──
  const handleGenerateTikTokVideo = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (!heroImageUri) {
      Alert.alert("Photo Required", "Please add a photo of your dish first.");
      return;
    }
    
    setIsGeneratingVideo(true);
    setVideoGenerationStatus("Uploading image...");
    
    try {
      // Step 1: Ensure hero image is an HTTPS URL
      const httpsImageUrl = await ensureHttpsImage(heroImageUri);
      
      setVideoGenerationStatus("Building video prompt...");
      
      // Step 2: Call TikTok generation endpoint
      const result = await tikTokGenerate.mutateAsync({
        recipeId: savedRecipeId || `temp_${Date.now()}`,
        heroImageUrl: httpsImageUrl,
        title: params.dishName || "Recipe",
        cuisineStyle: params.cuisine || undefined,
        steps: steps.map(s => ({ instruction: s.instruction, stepNumber: s.stepNumber })),
        ingredients: ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
      });
      
      if (result.success && result.videoUrl) {
        setTikTokVideoUrl(result.videoUrl);
        setCanRegen(true);
        setVideoGenerationStatus("");
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        throw new Error(result.error || "Video generation failed");
      }
    } catch (error) {
      console.error("TikTok video generation error:", error);
      setVideoGenerationStatus("");
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        "Video Generation Failed",
        error instanceof Error ? error.message : "Unable to generate video. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  // ── Regenerate Video ──
  const handleRegenerateVideo = async () => {
    if (!canRegen) return;
    
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    Alert.alert(
      "Regenerate Video",
      "You have 1 free regeneration. Use it now?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Regenerate", 
          onPress: async () => {
            setIsGeneratingVideo(true);
            setVideoGenerationStatus("Regenerating video...");
            setTikTokVideoUrl(null);
            
            try {
              const httpsImageUrl = await ensureHttpsImage(heroImageUri);
              
              const result = await tikTokRegenerate.mutateAsync({
                recipeId: savedRecipeId || `temp_${Date.now()}`,
                heroImageUrl: httpsImageUrl,
                title: params.dishName || "Recipe",
                cuisineStyle: params.cuisine || undefined,
                steps: steps.map(s => ({ instruction: s.instruction, stepNumber: s.stepNumber })),
                ingredients: ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
              });
              
              if (result.success && result.videoUrl) {
                setTikTokVideoUrl(result.videoUrl);
                setCanRegen(false);
                setVideoGenerationStatus("");
                
                if (Platform.OS !== "web") {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              } else {
                throw new Error(result.error || "Regeneration failed");
              }
            } catch (error) {
              console.error("Video regeneration error:", error);
              setVideoGenerationStatus("");
              Alert.alert("Regeneration Failed", "Unable to regenerate video.");
            } finally {
              setIsGeneratingVideo(false);
            }
          }
        },
      ]
    );
  };

  // ── Toggle Sections ──
  const toggleIngredients = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const next = !ingredientsExpanded;
    setIngredientsExpanded(next);
    ingredientsHeight.value = withTiming(next ? 1 : 0, { duration: 300 });
  };

  const toggleSteps = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const next = !stepsExpanded;
    setStepsExpanded(next);
    stepsHeight.value = withTiming(next ? 1 : 0, { duration: 300 });
  };

  const ingredientsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(ingredientsHeight.value, [0, 1], [0, 1000]),
    opacity: ingredientsHeight.value,
    overflow: "hidden" as const,
  }));

  const stepsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(stepsHeight.value, [0, 1], [0, 3000]),
    opacity: stepsHeight.value,
    overflow: "hidden" as const,
  }));

  // ── Favorite ──
  const handleToggleFavorite = async () => {
    const recipeIdToUse = savedRecipeId || params.recipeId;
    if (!recipeIdToUse) {
      Alert.alert("Save First", "Please save this recipe before adding to favorites.");
      return;
    }
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsTogglingFavorite(true);
    try {
      const result = await toggleFavoriteMutation.mutateAsync({ id: recipeIdToUse });
      if (result.success) {
        setIsFavorite(result.isFavorite ?? !isFavorite);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      Alert.alert("Error", "Unable to update favorite status.");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  // ── Save to Collection ──
  const handleSaveToCollection = async () => {
    if (isSaved || isSaving) {
      if (isSaved) router.replace("/(tabs)/collection");
      return;
    }
    setIsSaving(true);
    try {
      let originalImageUrl: string | undefined;
      let imageUrl: string | undefined;
      
      if (heroImageUri) {
        const httpsUrl = await ensureHttpsImage(heroImageUri);
        originalImageUrl = httpsUrl;
        imageUrl = httpsUrl;
      }
      
      let category = "Main";
      const lowerTags = tags.map(t => t.toLowerCase());
      if (lowerTags.includes("dessert") || lowerTags.includes("sweet")) category = "Dessert";
      else if (lowerTags.includes("soup")) category = "Soup";
      else if (lowerTags.includes("appetizer")) category = "Appetizer";
      
      const saveResult = await saveRecipe.mutateAsync({
        dishName: params.dishName || "Untitled Recipe",
        description: params.description || "",
        cuisine: params.cuisine || undefined,
        category,
        difficulty: params.difficulty || "medium",
        prepTime: parseInt(params.prepTime || "0"),
        cookTime: parseInt(params.cookTime || "0"),
        servings: parseInt(params.servings || "4"),
        ingredients: params.ingredients || "[]",
        steps: params.steps || "[]",
        tags: params.tags || undefined,
        imageUrl,
        originalImageUrl,
      });
      
      if (saveResult.success && saveResult.recipe) {
        setIsSaved(true);
        setSavedRecipeId(saveResult.recipe.id);
        setIsFavorite(saveResult.recipe.isFavorite || false);
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        Alert.alert(
          "Recipe Saved!",
          `"${params.dishName}" has been added to your collection.`,
          [
            { text: "View Collection", onPress: () => router.replace("/(tabs)/collection") },
            { text: "Stay Here", style: "cancel" },
          ]
        );
      } else {
        throw new Error(saveResult.error || "Failed to save recipe");
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Save Failed", error instanceof Error ? error.message : "Unable to save recipe.");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Generate Step Images ──
  const handleGenerateStepImages = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate to paywall for step images purchase, then generate
    router.push({
      pathname: "/paywall" as any,
      params: {
        dishName: params.dishName,
        recipeData: JSON.stringify({
          dishName: params.dishName,
          description: params.description,
          ingredients: params.ingredients,
          steps: params.steps,
          prepTime: params.prepTime,
          cookTime: params.cookTime,
        }),
        imageUri: heroImageUri,
        userId: params.userId || "anonymous",
        recipeId: savedRecipeId || params.recipeId || `temp_${Date.now()}`,
        purchaseType: "stepImages",
      },
    });
  };

  // ── Share Video ──
  const handleShareVideo = async () => {
    if (!tikTokVideoUrl) return;
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Navigate to video-player for full-screen share experience
    router.push({
      pathname: "/video-player" as any,
      params: {
        finalVideoUrl: tikTokVideoUrl,
        dishName: params.dishName,
        recipeId: savedRecipeId || undefined,
        canRegen: canRegen ? "true" : "false",
      },
    });
  };

  // ── Time formatting ──
  const prepTimeNum = parseInt(params.prepTime || "0") || 0;
  const cookTimeNum = parseInt(params.cookTime || "0") || 0;
  const totalTime = prepTimeNum + cookTimeNum;
  
  const formatTimeDisplay = (minutes: number): string => {
    if (minutes === 0) return "--";
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes} min`;
  };

  const hasStepImages = localStepImages.length > 0;

  // ════════════════════════════════════════════
  // ██  RENDER
  // ════════════════════════════════════════════
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO IMAGE ── */}
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={handleChangeHeroImage}
          style={styles.heroContainer}
        >
          {heroImageUri ? (
            <Image
              source={{ uri: heroImageUri }}
              style={styles.heroImage}
              contentFit="cover"
            />
          ) : (
            <View style={styles.heroPlaceholder}>
              <IconSymbol name="photo.fill" size={48} color="#555" />
              <Text style={styles.heroPlaceholderText}>Tap to add photo</Text>
            </View>
          )}
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.2)", "rgba(26,26,26,0.9)", "#1A1A1A"]}
            locations={[0, 0.4, 0.75, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Change photo hint */}
          <View style={styles.changePhotoHint}>
            <IconSymbol name="photo.fill" size={14} color="#FFF" />
            <Text style={styles.changePhotoText}>Tap to change</Text>
          </View>
        </TouchableOpacity>

        {/* ── HEADER (overlaid on hero) ── */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.headerButton}
            activeOpacity={0.7}
          >
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowShareMenu(true)}
              activeOpacity={0.7}
            >
              <IconSymbol name="square.and.arrow.up" size={22} color="#C9A962" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.headerButton, isTogglingFavorite && { opacity: 0.5 }]}
              onPress={handleToggleFavorite}
              disabled={isTogglingFavorite}
              activeOpacity={0.7}
            >
              <IconSymbol 
                name={isFavorite ? "heart.fill" : "heart"} 
                size={22} 
                color={isFavorite ? "#C9A962" : "#FFFFFF"} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── RECIPE INFO ── */}
        <View style={styles.infoSection}>
          {/* Cuisine badge */}
          {params.cuisine ? (
            <View style={styles.cuisineBadge}>
              <Text style={styles.cuisineBadgeText}>
                {params.cuisine.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {/* Title */}
          <Text style={styles.dishName}>
            {params.dishName || "Delicious Recipe"}
          </Text>

          {/* Description */}
          <Text style={styles.description}>
            {params.description || "A wonderful dish to enjoy"}
          </Text>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <IconSymbol name="clock.fill" size={16} color="#C9A962" />
              <Text style={styles.statValue}>{formatTimeDisplay(totalTime)}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.stat}>
              <IconSymbol name="bolt.fill" size={16} color="#C9A962" />
              <Text style={styles.statValue}>{params.difficulty || "Medium"}</Text>
            </View>
            <View style={styles.statDot} />
            <View style={styles.stat}>
              <IconSymbol name="person.2.fill" size={16} color="#C9A962" />
              <Text style={styles.statValue}>{params.servings || "4"} servings</Text>
            </View>
          </View>

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.slice(0, 4).map((tag, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── COLLAPSIBLE INGREDIENTS ── */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={toggleIngredients}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="list.bullet" size={18} color="#C9A962" />
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{ingredients.length}</Text>
              </View>
            </View>
            <IconSymbol 
              name={ingredientsExpanded ? "chevron.up" : "chevron.down"} 
              size={18} 
              color="#888" 
            />
          </TouchableOpacity>
          
          <Animated.View style={ingredientsStyle}>
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientAmount}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── COLLAPSIBLE STEPS ── */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={toggleSteps}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="list.number" size={18} color="#C9A962" />
              <Text style={styles.sectionTitle}>Steps</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{steps.length}</Text>
              </View>
            </View>
            <IconSymbol 
              name={stepsExpanded ? "chevron.up" : "chevron.down"} 
              size={18} 
              color="#888" 
            />
          </TouchableOpacity>
          
          <Animated.View style={stepsStyle}>
            <View style={styles.stepsList}>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={styles.stepInstruction}>{step.instruction}</Text>
                    {/* Show step image inline if purchased */}
                    {hasStepImages && localStepImages[index] && (
                      <Image
                        source={{ uri: localStepImages[index] }}
                        style={styles.stepImage}
                        contentFit="cover"
                      />
                    )}
                    {step.duration ? (
                      <View style={styles.stepMeta}>
                        <IconSymbol name="clock.fill" size={12} color="#888" />
                        <Text style={styles.stepMetaText}>{step.duration} min</Text>
                      </View>
                    ) : null}
                    {step.tips ? (
                      <View style={styles.stepTip}>
                        <Text style={styles.stepTipText}>💡 {step.tips}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ── VIDEO SECTION ── */}
        <View style={styles.videoSection}>
          {tikTokVideoUrl ? (
            /* ── Inline Video Player ── */
            <View style={styles.videoPlayerContainer}>
              <VideoView
                player={videoPlayer}
                style={styles.videoPlayer}
                contentFit="cover"
                nativeControls
              />
              {/* Video action buttons */}
              <View style={styles.videoActions}>
                <TouchableOpacity 
                  style={styles.videoActionButton}
                  onPress={handleShareVideo}
                  activeOpacity={0.7}
                >
                  <IconSymbol name="square.and.arrow.up" size={18} color="#C9A962" />
                  <Text style={styles.videoActionText}>Share Video</Text>
                </TouchableOpacity>
                {canRegen && (
                  <TouchableOpacity 
                    style={styles.videoActionButtonSecondary}
                    onPress={handleRegenerateVideo}
                    activeOpacity={0.7}
                  >
                    <IconSymbol name="arrow.clockwise" size={16} color="#888" />
                    <Text style={styles.videoActionTextSecondary}>Regenerate</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : isGeneratingVideo ? (
            /* ── Video Generation Progress ── */
            <View style={styles.videoGeneratingContainer}>
              <ActivityIndicator size="large" color="#C9A962" />
              <Text style={styles.videoGeneratingTitle}>Creating Your Video</Text>
              <Text style={styles.videoGeneratingStatus}>{videoGenerationStatus || "Processing..."}</Text>
              <Text style={styles.videoGeneratingHint}>This takes about 1-2 minutes</Text>
            </View>
          ) : (
            /* ── Generate TikTok Video CTA ── */
            <TouchableOpacity
              style={styles.videoCTA}
              onPress={handleGenerateTikTokVideo}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#C9A962", "#B8943F"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.videoCTAGradient}
              >
                <View style={styles.videoCTAContent}>
                  <IconSymbol name="video.fill" size={24} color="#1A1A1A" />
                  <View style={styles.videoCTATextContainer}>
                    <Text style={styles.videoCTATitle}>Generate TikTok Video</Text>
                    <Text style={styles.videoCTASubtitle}>$6.99 · Ready in ~1 min</Text>
                  </View>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#1A1A1A" />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Step Images CTA (secondary) ── */}
        {!hasStepImages && (
          <TouchableOpacity
            style={styles.stepImagesCTA}
            onPress={handleGenerateStepImages}
            activeOpacity={0.7}
          >
            <IconSymbol name="photo.fill" size={18} color="#C9A962" />
            <Text style={styles.stepImagesCTAText}>Generate Step Images</Text>
            <Text style={styles.stepImagesCTAPrice}>$1.99</Text>
          </TouchableOpacity>
        )}

        {/* ── Bottom Save/Share Bar ── */}
        <View style={styles.bottomBar}>
          {!isSaved && (
            <TouchableOpacity
              style={styles.bottomBarButton}
              onPress={handleSaveToCollection}
              disabled={isSaving}
              activeOpacity={0.7}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#C9A962" />
              ) : (
                <IconSymbol name="bookmark.fill" size={18} color="#C9A962" />
              )}
              <Text style={styles.bottomBarButtonText}>Save</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.bottomBarButton}
            onPress={() => setShowShareMenu(true)}
            activeOpacity={0.7}
          >
            <IconSymbol name="square.and.arrow.up" size={18} color="#C9A962" />
            <Text style={styles.bottomBarButtonText}>Share</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── STICKY VIDEO CTA (shown when scrolled past video section and no video yet) ── */}
      {!tikTokVideoUrl && !isGeneratingVideo && (
        <View style={[styles.stickyCTA, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={styles.stickyCTAButton}
            onPress={handleGenerateTikTokVideo}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#C9A962", "#B8943F"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.stickyCTAGradient}
            >
              <IconSymbol name="video.fill" size={20} color="#1A1A1A" />
              <Text style={styles.stickyCTAText}>Generate TikTok Video · $6.99</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Share Menu */}
      <ShareMenu
        visible={showShareMenu}
        onClose={() => setShowShareMenu(false)}
        recipe={{
          id: savedRecipeId || undefined,
          dishName: params.dishName || "Recipe",
          description: params.description,
          cuisine: params.cuisine,
          difficulty: params.difficulty,
          prepTime: parseInt(params.prepTime || "0"),
          cookTime: parseInt(params.cookTime || "0"),
          servings: parseInt(params.servings || "4"),
          ingredients: ingredients,
          steps: steps.map(s => s.instruction),
          imageUrl: heroImageUri,
          stepImages: hasStepImages ? localStepImages.map((url, i) => ({ stepIndex: i, imageUrl: url })) : undefined,
          finalVideoUrl: tikTokVideoUrl || undefined,
        }}
      />
    </View>
  );
}

// ════════════════════════════════════════════
// ██  STYLES
// ════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  scrollView: {
    flex: 1,
  },

  // ── Hero ──
  heroContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.45,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  heroPlaceholderText: {
    fontSize: 16,
    color: "#666",
    fontFamily: "Inter",
  },
  changePhotoHint: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  changePhotoText: {
    fontSize: 12,
    color: "#FFF",
    fontFamily: "Inter",
  },

  // ── Header ──
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "row",
    gap: 8,
  },

  // ── Info Section ──
  infoSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 10,
  },
  cuisineBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(201,169,98,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201,169,98,0.3)",
  },
  cuisineBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#C9A962",
    letterSpacing: 1.5,
    fontFamily: "Inter",
  },
  dishName: {
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 34,
    fontFamily: "PlayfairDisplay-Bold",
  },
  description: {
    fontSize: 14,
    color: "#AAA",
    lineHeight: 20,
    fontFamily: "Inter",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 13,
    color: "#CCC",
    fontFamily: "Inter",
  },
  statDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#555",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingTop: 4,
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: "#999",
    fontFamily: "Inter",
  },

  // ── Sections (Ingredients / Steps) ──
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    overflow: "hidden",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    color: "#FFF",
    fontFamily: "PlayfairDisplay-Bold",
  },
  countBadge: {
    backgroundColor: "rgba(201,169,98,0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    color: "#C9A962",
    fontFamily: "Inter",
  },
  ingredientsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  ingredientDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#C9A962",
  },
  ingredientAmount: {
    fontSize: 14,
    color: "#C9A962",
    minWidth: 60,
    fontFamily: "Inter-Medium",
  },
  ingredientName: {
    fontSize: 14,
    color: "#FFF",
    flex: 1,
    fontFamily: "Inter",
  },
  stepsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 20,
  },
  stepItem: {
    flexDirection: "row",
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#C9A962",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontFamily: "Inter-Medium",
  },
  stepContent: {
    flex: 1,
    gap: 8,
  },
  stepInstruction: {
    fontSize: 14,
    color: "#FFF",
    lineHeight: 22,
    fontFamily: "Inter",
  },
  stepImage: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 4,
  },
  stepMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepMetaText: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Inter",
  },
  stepTip: {
    backgroundColor: "rgba(201,169,98,0.1)",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#C9A962",
  },
  stepTipText: {
    fontSize: 14,
    color: "#C9A962",
    lineHeight: 20,
    fontFamily: "Caveat",
  },

  // ── Video Section ──
  videoSection: {
    marginTop: 20,
    marginHorizontal: 16,
  },
  videoPlayerContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    aspectRatio: 9 / 16,
    maxHeight: 400,
  },
  videoActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  videoActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(201,169,98,0.15)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(201,169,98,0.3)",
  },
  videoActionText: {
    fontSize: 14,
    color: "#C9A962",
    fontFamily: "Inter-Medium",
  },
  videoActionButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
  },
  videoActionTextSecondary: {
    fontSize: 13,
    color: "#888",
    fontFamily: "Inter",
  },
  videoGeneratingContainer: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
  },
  videoGeneratingTitle: {
    fontSize: 18,
    color: "#FFF",
    fontFamily: "PlayfairDisplay-Bold",
  },
  videoGeneratingStatus: {
    fontSize: 14,
    color: "#C9A962",
    fontFamily: "Inter",
  },
  videoGeneratingHint: {
    fontSize: 12,
    color: "#888",
    fontFamily: "Inter",
  },

  // ── Video CTA ──
  videoCTA: {
    borderRadius: 16,
    overflow: "hidden",
  },
  videoCTAGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  videoCTAContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  videoCTATextContainer: {
    gap: 2,
  },
  videoCTATitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter",
  },
  videoCTASubtitle: {
    fontSize: 13,
    color: "rgba(26,26,26,0.7)",
    fontFamily: "Inter",
  },

  // ── Step Images CTA ──
  stepImagesCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
    marginHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stepImagesCTAText: {
    fontSize: 14,
    color: "#CCC",
    fontFamily: "Inter",
  },
  stepImagesCTAPrice: {
    fontSize: 13,
    color: "#C9A962",
    fontFamily: "Inter-Medium",
  },

  // ── Bottom Bar ──
  bottomBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 20,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  bottomBarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bottomBarButtonText: {
    fontSize: 14,
    color: "#C9A962",
    fontFamily: "Inter-Medium",
  },

  // ── Sticky CTA ──
  stickyCTA: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "rgba(26,26,26,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  stickyCTAButton: {
    borderRadius: 14,
    overflow: "hidden",
  },
  stickyCTAGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  stickyCTAText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    fontFamily: "Inter",
  },
});
