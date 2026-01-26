import { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton, SecondaryButton, GlassmorphismCard } from "@/components/ui";
import { trpc } from "@/lib/trpc";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
    recipeId?: string; // If viewing an existing recipe
  }>();

  // Parse JSON params
  const ingredients: Ingredient[] = params.ingredients ? JSON.parse(params.ingredients) : [];
  const tags: string[] = params.tags ? JSON.parse(params.tags) : [];
  
  // Parse steps - handle both string array (demo recipes) and Step object array (AI-generated)
  const rawSteps = params.steps ? JSON.parse(params.steps) : [];
  const steps: Step[] = rawSteps.map((step: unknown, index: number) => {
    if (typeof step === "string") {
      // Demo recipes have simple string steps
      return {
        stepNumber: index + 1,
        instruction: step,
      };
    }
    // AI-generated recipes have Step objects
    const stepObj = step as Record<string, unknown>;
    return {
      stepNumber: typeof stepObj.stepNumber === "number" ? stepObj.stepNumber : index + 1,
      instruction: typeof stepObj.instruction === "string" ? stepObj.instruction : String(stepObj.instruction || `Step ${index + 1}`),
      duration: typeof stepObj.duration === "number" ? stepObj.duration : undefined,
      tips: typeof stepObj.tips === "string" ? stepObj.tips : undefined,
    };
  });

  const [expandedSection, setExpandedSection] = useState<"ingredients" | "steps" | null>("ingredients");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(!!params.recipeId);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(params.recipeId || null);
  const [isGeneratingPhoto, setIsGeneratingPhoto] = useState(false);
  const [generatedPhotoUri, setGeneratedPhotoUri] = useState<string | null>(null);
  const [showOriginalImage, setShowOriginalImage] = useState(false); // Toggle between original and AI-generated
  const [isFavorite, setIsFavorite] = useState(false); // Favorite status
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  
  // Check if we have both original and generated images (for toggle)
  const hasOriginalImage = !!params.imageUri && params.imageUri.length > 0;
  const hasGeneratedImage = !!generatedPhotoUri;
  const canToggleImages = hasOriginalImage && hasGeneratedImage;
  
  // Animation values
  const ingredientsHeight = useSharedValue(1);
  const stepsHeight = useSharedValue(0);

  // tRPC mutations
  const uploadImage = trpc.recipe.uploadImage.useMutation();
  const saveRecipe = trpc.recipe.save.useMutation();
  const generateAIImage = trpc.recipe.generateImage.useMutation();
  const toggleFavoriteMutation = trpc.recipe.toggleFavorite.useMutation();

  const handleToggleFavorite = async () => {
    // Only allow toggling if recipe is saved (either from params or after saving)
    const recipeIdToUse = savedRecipeId || params.recipeId;
    
    if (!recipeIdToUse) {
      Alert.alert(
        "Save First",
        "Please save this recipe to your collection before adding it to favorites.",
        [{ text: "OK" }]
      );
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
      } else {
        throw new Error(result.error || "Failed to update favorite");
      }
    } catch (error) {
      console.error("Toggle favorite error:", error);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        "Error",
        "Unable to update favorite status. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const handleGenerateAIPhoto = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    setIsGeneratingPhoto(true);
    
    try {
      // Call real AI image generation endpoint
      const result = await generateAIImage.mutateAsync({
        dishName: params.dishName || "delicious dish",
        description: params.description || undefined,
        cuisine: params.cuisine || undefined,
      });
      
      if (result.success && result.imageUrl) {
        setGeneratedPhotoUri(result.imageUrl);
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Alert.alert(
          "Photo Generated! ✨",
          `AI has created a beautiful photo for "${params.dishName}".`,
          [{ text: "Nice!" }]
        );
      } else {
        throw new Error(result.error || "Failed to generate image");
      }
    } catch (error) {
      console.error("Photo generation error:", error);
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        "Generation Failed",
        "Unable to generate photo. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsGeneratingPhoto(false);
    }
  };

  // Use generated photo if available, otherwise original
  // When user toggles, show the original image instead
  const displayImageUri = showOriginalImage ? params.imageUri : (generatedPhotoUri || params.imageUri);
  
  const handleToggleImage = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowOriginalImage(!showOriginalImage);
  };

  const toggleSection = (section: "ingredients" | "steps") => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    if (section === "ingredients") {
      ingredientsHeight.value = withTiming(expandedSection === "ingredients" ? 0 : 1);
      if (expandedSection !== "ingredients") {
        stepsHeight.value = withTiming(0);
      }
      setExpandedSection(expandedSection === "ingredients" ? null : "ingredients");
    } else {
      stepsHeight.value = withTiming(expandedSection === "steps" ? 0 : 1);
      if (expandedSection !== "steps") {
        ingredientsHeight.value = withTiming(0);
      }
      setExpandedSection(expandedSection === "steps" ? null : "steps");
    }
  };

  const ingredientsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(ingredientsHeight.value, [0, 1], [0, 1000]),
    opacity: ingredientsHeight.value,
    overflow: "hidden" as const,
  }));

  const stepsStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(stepsHeight.value, [0, 1], [0, 2000]),
    opacity: stepsHeight.value,
    overflow: "hidden" as const,
  }));

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleCookMode = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate to dedicated Cook Mode screen (free, no paywall)
    const cookImageUri = generatedPhotoUri || displayImageUri;
    
    router.push({
      pathname: "/cook-mode" as any,
      params: {
        dishName: params.dishName,
        recipeData: JSON.stringify({
          dishName: params.dishName,
          description: params.description,
          ingredients: params.ingredients,
          steps: params.steps,
          prepTime: params.prepTime,
          cookTime: params.cookTime,
          servings: params.servings,
          difficulty: params.difficulty,
        }),
        imageUri: cookImageUri,
        recipeId: savedRecipeId || undefined,
      },
    });
  };

  const handleGenerateVideo = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Use generated AI photo if available, otherwise original image
    // This ensures text recipe photos are replaced with AI-generated food images
    const videoImageUri = generatedPhotoUri || displayImageUri;
    
    // Navigate to paywall with recipe data
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
        imageUri: videoImageUri,
        hasGeneratedPhoto: generatedPhotoUri ? "true" : "false",
      },
    });
  };

  const handleSaveToCollection = async () => {
    if (isSaved) {
      // Already saved, just navigate
      router.replace("/(tabs)/collection");
      return;
    }

    setIsSaving(true);
    
    try {
      let originalImageUrl: string | undefined;
      let imageUrl: string | undefined;
      
      // Upload original image if we have one (the captured/uploaded image)
      if (params.imageUri) {
        let imageBase64 = "";
        
        if (Platform.OS === "web") {
          // On web, fetch the image and convert to base64
          const response = await fetch(params.imageUri);
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
          // On native, use FileSystem
          imageBase64 = await FileSystem.readAsStringAsync(params.imageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
        }
        
        const uploadResult = await uploadImage.mutateAsync({
          imageBase64,
          fileName: `${params.dishName?.replace(/\s+/g, "-") || "recipe"}-original.jpg`,
        });
        
        if (uploadResult.success && uploadResult.url) {
          originalImageUrl = uploadResult.url;
        }
      }
      
      // If we have a generated AI photo, use that as the main display image
      // Otherwise, use the original image as the main display
      if (generatedPhotoUri) {
        imageUrl = generatedPhotoUri; // AI-generated images are already URLs
      } else {
        imageUrl = originalImageUrl; // Use original as main display if no AI photo
      }
      
      // Determine category based on cuisine/tags
      let category = "Main";
      const lowerTags = tags.map(t => t.toLowerCase());
      const lowerCuisine = (params.cuisine || "").toLowerCase();
      
      if (lowerTags.includes("dessert") || lowerTags.includes("sweet")) {
        category = "Dessert";
      } else if (lowerTags.includes("soup") || lowerCuisine.includes("soup")) {
        category = "Soup";
      } else if (lowerTags.includes("appetizer") || lowerTags.includes("starter")) {
        category = "Appetizer";
      }
      
      // Save recipe with both original and display images
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
        imageUrl, // Main display image (AI-generated if available)
        originalImageUrl, // Original captured/uploaded image
      });
      
      if (saveResult.success && saveResult.recipe) {
        setIsSaved(true);
        setSavedRecipeId(saveResult.recipe.id); // Store the recipe ID for favorites toggle
        setIsFavorite(saveResult.recipe.isFavorite || false);
        
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        Alert.alert(
          "Recipe Saved! 🎉",
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
      
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      
      Alert.alert(
        "Save Failed",
        error instanceof Error ? error.message : "Unable to save recipe. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const totalTime = (parseInt(params.prepTime || "0") + parseInt(params.cookTime || "0"));

  return (
    <View style={styles.container}>
      {/* Full-screen background image */}
      <View style={styles.imageContainer}>
        {displayImageUri ? (
          <Image
            source={{ uri: displayImageUri }}
            style={styles.backgroundImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.noPhotoContainer}>
            <IconSymbol name="doc.text.fill" size={64} color="#444444" />
            <Text style={[styles.noPhotoText, { fontFamily: "Inter" }]}>
              Text Recipe
            </Text>
          </View>
        )}
        {/* Vignette overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(26,26,26,0.95)", "#1A1A1A"]}
          locations={[0, 0.3, 0.6, 0.85]}
          style={styles.vignette}
        />
        
        {/* Image toggle button - shown when both original and generated images exist */}
        {canToggleImages && (
          <TouchableOpacity
            style={styles.imageToggleButton}
            onPress={handleToggleImage}
            activeOpacity={0.8}
          >
            <View style={styles.imageToggleInner}>
              <IconSymbol 
                name={showOriginalImage ? "sparkles" : "doc.text.fill"} 
                size={16} 
                color="#FFFFFF" 
              />
              <Text style={[styles.imageToggleText, { fontFamily: "Inter-Medium" }]}>
                {showOriginalImage ? "View AI Photo" : "View Original"}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
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

      {/* Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Spacer for image */}
        <View style={{ height: SCREEN_WIDTH * 0.7 }} />

        {/* Main info card */}
        <GlassmorphismCard className="mx-4 gap-4">
          {/* Dish name and description */}
          <View className="gap-2">
            <Text style={[styles.dishName, { fontFamily: "PlayfairDisplay-Bold" }]}>
              {params.dishName || "Delicious Recipe"}
            </Text>
            <Text style={[styles.description, { fontFamily: "Inter" }]}>
              {params.description || "A wonderful dish to enjoy"}
            </Text>
          </View>

          {/* Generate AI Photo button - in scroll flow */}
          {!generatedPhotoUri && (
            <TouchableOpacity
              style={styles.generatePhotoButtonInline}
              onPress={handleGenerateAIPhoto}
              disabled={isGeneratingPhoto}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["rgba(201,169,98,0.9)", "rgba(168,139,74,0.9)"]}
                style={styles.generatePhotoGradient}
              >
                {isGeneratingPhoto ? (
                  <>
                    <ActivityIndicator size="small" color="#1A1A1A" />
                    <Text style={[styles.generatePhotoText, { fontFamily: "Inter-Medium" }]}>
                      Generating...
                    </Text>
                  </>
                ) : (
                  <>
                    <IconSymbol name="sparkles" size={20} color="#1A1A1A" />
                    <Text style={[styles.generatePhotoText, { fontFamily: "Inter-Medium" }]}>
                      Generate AI Photo
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {params.cuisine && (
                <View style={styles.tag}>
                  <Text style={[styles.tagText, { fontFamily: "Inter" }]}>{params.cuisine}</Text>
                </View>
              )}
              {tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={[styles.tagText, { fontFamily: "Inter" }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <IconSymbol name="clock.fill" size={20} color="#C9A962" />
              <Text style={[styles.statValue, { fontFamily: "Inter-Medium" }]}>
                {totalTime} min
              </Text>
              <Text style={[styles.statLabel, { fontFamily: "Inter" }]}>Total</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <IconSymbol name="person.2.fill" size={20} color="#C9A962" />
              <Text style={[styles.statValue, { fontFamily: "Inter-Medium" }]}>
                {params.servings || "4"}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: "Inter" }]}>Servings</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <IconSymbol name="bolt.fill" size={20} color="#C9A962" />
              <Text style={[styles.statValue, { fontFamily: "Inter-Medium" }]}>
                {params.difficulty || "Medium"}
              </Text>
              <Text style={[styles.statLabel, { fontFamily: "Inter" }]}>Difficulty</Text>
            </View>
          </View>
        </GlassmorphismCard>

        {/* Ingredients section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection("ingredients")}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="list.bullet" size={20} color="#C9A962" />
              <Text style={[styles.sectionTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
                Ingredients
              </Text>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, { fontFamily: "Inter" }]}>
                  {ingredients.length}
                </Text>
              </View>
            </View>
            <IconSymbol 
              name={expandedSection === "ingredients" ? "chevron.up" : "chevron.down"} 
              size={20} 
              color="#888888" 
            />
          </TouchableOpacity>
          
          <Animated.View style={ingredientsStyle}>
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <View style={styles.ingredientDot} />
                  <Text style={[styles.ingredientAmount, { fontFamily: "Inter-Medium" }]}>
                    {ingredient.amount} {ingredient.unit}
                  </Text>
                  <Text style={[styles.ingredientName, { fontFamily: "Inter" }]}>
                    {ingredient.name}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Steps section */}
        <View style={styles.section}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => toggleSection("steps")}
            activeOpacity={0.7}
          >
            <View style={styles.sectionTitleRow}>
              <IconSymbol name="list.number" size={20} color="#C9A962" />
              <Text style={[styles.sectionTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
                Instructions
              </Text>
              <View style={styles.badge}>
                <Text style={[styles.badgeText, { fontFamily: "Inter" }]}>
                  {steps.length}
                </Text>
              </View>
            </View>
            <IconSymbol 
              name={expandedSection === "steps" ? "chevron.up" : "chevron.down"} 
              size={20} 
              color="#888888" 
            />
          </TouchableOpacity>
          
          <Animated.View style={stepsStyle}>
            <View style={styles.stepsList}>
              {steps.map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={[styles.stepNumberText, { fontFamily: "Inter-Medium" }]}>
                      {step.stepNumber}
                    </Text>
                  </View>
                  <View style={styles.stepContent}>
                    <Text style={[styles.stepInstruction, { fontFamily: "Inter" }]}>
                      {step.instruction}
                    </Text>
                    {step.duration && (
                      <View style={styles.stepDuration}>
                        <IconSymbol name="clock.fill" size={12} color="#888888" />
                        <Text style={[styles.stepDurationText, { fontFamily: "Inter" }]}>
                          {step.duration} min
                        </Text>
                      </View>
                    )}
                    {step.tips && (
                      <View style={styles.stepTip}>
                        <Text style={[styles.stepTipText, { fontFamily: "Caveat" }]}>
                          💡 {step.tips}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Bottom action buttons - 3 equal buttons */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        <SecondaryButton
          title={isSaved ? "Saved" : "Save"}
          onPress={handleSaveToCollection}
          icon={isSaving ? (
            <ActivityIndicator size="small" color="#C9A962" />
          ) : (
            <IconSymbol name="bookmark.fill" size={16} color="#C9A962" />
          )}
          style={{ flex: 1, opacity: isSaving ? 0.7 : 1 }}
          disabled={isSaving}
        />
        <PrimaryButton
          title="Cook"
          onPress={handleCookMode}
          icon={<IconSymbol name="frying.pan.fill" size={16} color="#1A1A1A" />}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1A1A1A",
  },
  imageContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_WIDTH,
  },
  backgroundImage: {
    width: "100%",
    height: "100%",
  },
  noPhotoContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  noPhotoText: {
    fontSize: 16,
    color: "#666666",
  },
  generatePhotoButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -80 }, { translateY: -24 }],
    zIndex: 5,
  },
  generatePhotoButtonInline: {
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  generatePhotoGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 24,
  },
  generatePhotoText: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  imageToggleButton: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    zIndex: 5,
  },
  imageToggleInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  imageToggleText: {
    fontSize: 13,
    color: "#FFFFFF",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
  },
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
  },
  dishName: {
    fontSize: 28,
    color: "#FFFFFF",
    lineHeight: 34,
  },
  description: {
    fontSize: 14,
    color: "#AAAAAA",
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  tagText: {
    fontSize: 12,
    color: "#C9A962",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 8,
  },
  stat: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  statLabel: {
    fontSize: 11,
    color: "#888888",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  section: {
    marginTop: 16,
    marginHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
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
    fontSize: 18,
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: "rgba(201, 169, 98, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    color: "#C9A962",
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
  },
  ingredientName: {
    fontSize: 14,
    color: "#FFFFFF",
    flex: 1,
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
  },
  stepContent: {
    flex: 1,
    gap: 8,
  },
  stepInstruction: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 22,
  },
  stepDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stepDurationText: {
    fontSize: 12,
    color: "#888888",
  },
  stepTip: {
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 2,
    borderLeftColor: "#C9A962",
  },
  stepTipText: {
    fontSize: 14,
    color: "#C9A962",
    lineHeight: 20,
  },
  bottomActions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "rgba(26, 26, 26, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
});
