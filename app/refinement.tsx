import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
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
  withSpring,
  withRepeat,
  Easing,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton, GlassmorphismCard } from "@/components/ui";
import { trpc } from "@/lib/trpc";

export default function RefinementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri: string;
    dishName: string;
    confidence: string;
    alternatives: string;
    recipeData: string;
  }>();

  const detectedName = params.dishName || "Unknown Dish";
  const confidence = parseFloat(params.confidence || "0.85");
  const alternatives: string[] = params.alternatives 
    ? JSON.parse(params.alternatives) 
    : ["Pasta Carbonara", "Fettuccine Alfredo", "Spaghetti Bolognese"];
  const recipeData = params.recipeData ? JSON.parse(params.recipeData) : {};

  const [showCorrection, setShowCorrection] = useState(false);
  const [correctedName, setCorrectedName] = useState("");
  const [selectedAlternative, setSelectedAlternative] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerationStatus, setRegenerationStatus] = useState("");
  
  // Animation for loading spinner
  const spinValue = useSharedValue(0);
  
  useEffect(() => {
    if (isRegenerating) {
      spinValue.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      spinValue.value = 0;
    }
  }, [isRegenerating]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spinValue.value}deg` }],
  }));

  // tRPC mutation for recipe regeneration
  const regenerateRecipe = trpc.recipe.analyze.useMutation({
    onSuccess: (data) => {
      setIsRegenerating(false);
      if (data.success && data.recipe) {
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        // Navigate to decision point screen with NEW recipe data (V2)
        router.replace({
          pathname: "/recipe-card" as any,
          params: {
            imageUri: params.imageUri,
            dishName: data.recipe.dishName,
            description: data.recipe.description,
            cuisine: data.recipe.cuisine || "",
            difficulty: data.recipe.difficulty,
            prepTime: String(data.recipe.prepTime),
            cookTime: String(data.recipe.cookTime),
            servings: String(data.recipe.servings),
            ingredients: JSON.stringify(data.recipe.ingredients),
            steps: JSON.stringify(data.recipe.steps),
            tags: JSON.stringify(data.recipe.tags || []),
          },
        });
      } else {
        // Fallback to original recipe with updated name
        navigateToRecipeCardWithOriginal(correctedName.trim() || selectedAlternative || detectedName);
      }
    },
    onError: (err) => {
      console.error("Recipe regeneration error:", err);
      setIsRegenerating(false);
      // Fallback to original recipe with updated name
      navigateToRecipeCardWithOriginal(correctedName.trim() || selectedAlternative || detectedName);
    },
  });

  const handleYes = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Proceed with detected name and original recipe
    navigateToRecipeCardWithOriginal(detectedName);
  };

  const handleNo = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowCorrection(true);
  };

  const handleAlternativeSelect = (alternative: string) => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedAlternative(alternative);
    setCorrectedName("");
  };

  const handleConfirm = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    const finalName = correctedName.trim() || selectedAlternative || detectedName;
    
    // If name is different, regenerate recipe with AI
    if (finalName !== detectedName) {
      setIsRegenerating(true);
      setRegenerationStatus("Updating recipe...");
      
      try {
        // Read image and convert to base64
        let imageBase64 = "";
        if (params.imageUri && Platform.OS !== "web") {
          try {
            setRegenerationStatus("Reading image...");
            imageBase64 = await FileSystem.readAsStringAsync(params.imageUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
          } catch (err) {
            console.log("Could not read image for regeneration");
          }
        }
        
        setRegenerationStatus("Generating new recipe for " + finalName + "...");
        
        // Call AI with corrected dish name
        regenerateRecipe.mutate({
          imageBase64: imageBase64 || "placeholder",
          dishName: finalName,
          userNotes: `The user corrected the dish name from "${detectedName}" to "${finalName}". Please generate a complete recipe for ${finalName}.`,
        });
      } catch (err) {
        console.error("Error during regeneration:", err);
        setIsRegenerating(false);
        navigateToRecipeCardWithOriginal(finalName);
      }
    } else {
      navigateToRecipeCardWithOriginal(finalName);
    }
  };

  const navigateToRecipeCardWithOriginal = (dishName: string) => {
    // Navigate to decision point screen (V2) with original recipe data
    router.replace({
      pathname: "/recipe-card" as any,
      params: {
        imageUri: params.imageUri,
        dishName,
        description: recipeData.description || "",
        cuisine: recipeData.cuisine || "",
        difficulty: recipeData.difficulty || "medium",
        prepTime: String(recipeData.prepTime || 15),
        cookTime: String(recipeData.cookTime || 30),
        servings: String(recipeData.servings || 4),
        ingredients: JSON.stringify(recipeData.ingredients || []),
        steps: JSON.stringify(recipeData.steps || []),
        tags: JSON.stringify(recipeData.tags || []),
      },
    });
  };

  const getConfidenceColor = () => {
    if (confidence >= 0.8) return "#4ADE80"; // Green
    if (confidence >= 0.6) return "#FBBF24"; // Yellow
    return "#F87171"; // Red
  };

  const getConfidenceLabel = () => {
    if (confidence >= 0.8) return "High confidence";
    if (confidence >= 0.6) return "Medium confidence";
    return "Low confidence";
  };

  // Show loading overlay when regenerating
  if (isRegenerating) {
    return (
      <ScreenContainer edges={["top", "left", "right", "bottom"]}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingSpinner, spinStyle]}>
            <LinearGradient
              colors={["#C9A962", "#A88B4A"]}
              style={styles.spinnerGradient}
            >
              <IconSymbol name="sparkles" size={32} color="#1A1A1A" />
            </LinearGradient>
          </Animated.View>
          <Text style={[styles.loadingTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
            Updating Recipe
          </Text>
          <Text style={[styles.loadingStatus, { fontFamily: "Inter" }]}>
            {regenerationStatus}
          </Text>
          <Text style={[styles.loadingSubtext, { fontFamily: "Caveat" }]}>
            Generating a new recipe for your corrected dish...
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer edges={["top", "left", "right", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: "Inter-Medium" }]}>
              Verify Dish
            </Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Image Preview */}
          <Animated.View 
            entering={FadeIn.duration(400)}
            style={styles.imageContainer}
          >
            {params.imageUri ? (
              <Image
                source={{ uri: params.imageUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
            ) : (
              <View style={styles.noImagePlaceholder}>
                <IconSymbol name="doc.text.fill" size={48} color="#555555" />
                <Text style={[styles.noImageText, { fontFamily: "Inter" }]}>
                  Text Recipe Detected
                </Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(26,26,26,0.8)"]}
              style={styles.imageGradient}
            />
          </Animated.View>

          {/* Detection Result Card */}
          <Animated.View entering={FadeInDown.delay(200).duration(400)}>
            <GlassmorphismCard className="mx-4 gap-4">
              {/* AI Icon */}
              <View style={styles.aiIconContainer}>
                <LinearGradient
                  colors={["#C9A962", "#A88B4A"]}
                  style={styles.aiIconGradient}
                >
                  <IconSymbol name="sparkles" size={24} color="#1A1A1A" />
                </LinearGradient>
              </View>

              {/* Detected Dish */}
              <View style={styles.detectionResult}>
                <Text style={[styles.detectionLabel, { fontFamily: "Inter" }]}>
                  AI detected this dish as:
                </Text>
                <Text style={[styles.dishName, { fontFamily: "PlayfairDisplay-Bold" }]}>
                  {detectedName}
                </Text>
                
                {/* Confidence Score */}
                <View style={styles.confidenceContainer}>
                  <View style={styles.confidenceBar}>
                    <View
                      style={[
                        styles.confidenceFill,
                        {
                          width: `${confidence * 100}%`,
                          backgroundColor: getConfidenceColor(),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.confidenceText, { fontFamily: "Inter", color: getConfidenceColor() }]}>
                    {Math.round(confidence * 100)}% • {getConfidenceLabel()}
                  </Text>
                </View>
              </View>

              {/* Question */}
              {!showCorrection ? (
                <View style={styles.questionSection}>
                  <Text style={[styles.questionText, { fontFamily: "Inter-Medium" }]}>
                    Is this correct?
                  </Text>
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.choiceButton, styles.yesButton]}
                      onPress={handleYes}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="checkmark" size={20} color="#1A1A1A" />
                      <Text style={[styles.choiceButtonText, { fontFamily: "Inter-Medium" }]}>
                        Yes, correct
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.choiceButton, styles.noButton]}
                      onPress={handleNo}
                      activeOpacity={0.8}
                    >
                      <IconSymbol name="xmark" size={20} color="#FFFFFF" />
                      <Text style={[styles.choiceButtonTextLight, { fontFamily: "Inter-Medium" }]}>
                        No, fix it
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Animated.View 
                  entering={FadeInDown.duration(300)}
                  style={styles.correctionSection}
                >
                  <Text style={[styles.correctionLabel, { fontFamily: "Inter-Medium" }]}>
                    Select the correct dish:
                  </Text>

                  {/* Alternative Suggestions */}
                  <View style={styles.alternativesContainer}>
                    {alternatives.map((alt, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.alternativeChip,
                          selectedAlternative === alt && styles.alternativeChipSelected,
                        ]}
                        onPress={() => handleAlternativeSelect(alt)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.alternativeText,
                            { fontFamily: "Inter" },
                            selectedAlternative === alt && styles.alternativeTextSelected,
                          ]}
                        >
                          {alt}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Manual Input */}
                  <View style={styles.manualInputContainer}>
                    <Text style={[styles.orText, { fontFamily: "Inter" }]}>
                      Or enter manually:
                    </Text>
                    <TextInput
                      style={[styles.textInput, { fontFamily: "Inter" }]}
                      placeholder="Type dish name..."
                      placeholderTextColor="#666666"
                      value={correctedName}
                      onChangeText={(text) => {
                        setCorrectedName(text);
                        setSelectedAlternative(null);
                      }}
                      returnKeyType="done"
                    />
                  </View>

                  {/* Info about regeneration */}
                  <View style={styles.regenerationInfo}>
                    <IconSymbol name="sparkles" size={14} color="#C9A962" />
                    <Text style={[styles.regenerationInfoText, { fontFamily: "Inter" }]}>
                      A new recipe will be generated for the corrected dish
                    </Text>
                  </View>

                  {/* Confirm Button */}
                  <PrimaryButton
                    title="Confirm & Generate New Recipe"
                    onPress={handleConfirm}
                    disabled={!correctedName.trim() && !selectedAlternative}
                    style={{ marginTop: 16 }}
                  />
                </Animated.View>
              )}
            </GlassmorphismCard>
          </Animated.View>

          {/* Tip */}
          <Animated.View 
            entering={FadeInDown.delay(400).duration(400)}
            style={styles.tipContainer}
          >
            <IconSymbol name="lightbulb.fill" size={16} color="#C9A962" />
            <Text style={[styles.tipText, { fontFamily: "Caveat" }]}>
              Correcting the dish name generates a completely new recipe!
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    color: "#FFFFFF",
  },
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    height: 200,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  noImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noImageText: {
    fontSize: 14,
    color: "#888888",
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
  },
  aiIconContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  aiIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  detectionResult: {
    alignItems: "center",
    gap: 8,
  },
  detectionLabel: {
    fontSize: 14,
    color: "#888888",
  },
  dishName: {
    fontSize: 28,
    color: "#FFFFFF",
    textAlign: "center",
  },
  confidenceContainer: {
    width: "100%",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  confidenceBar: {
    width: "80%",
    height: 4,
    backgroundColor: "#333333",
    borderRadius: 2,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 2,
  },
  confidenceText: {
    fontSize: 12,
  },
  questionSection: {
    alignItems: "center",
    gap: 16,
    marginTop: 8,
  },
  questionText: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  choiceButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  yesButton: {
    backgroundColor: "#C9A962",
  },
  noButton: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  choiceButtonText: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  choiceButtonTextLight: {
    fontSize: 15,
    color: "#FFFFFF",
  },
  correctionSection: {
    gap: 12,
  },
  correctionLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  alternativesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  alternativeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  alternativeChipSelected: {
    backgroundColor: "rgba(201,169,98,0.2)",
    borderColor: "#C9A962",
  },
  alternativeText: {
    fontSize: 14,
    color: "#CCCCCC",
  },
  alternativeTextSelected: {
    color: "#C9A962",
  },
  manualInputContainer: {
    gap: 8,
    marginTop: 8,
  },
  orText: {
    fontSize: 14,
    color: "#888888",
  },
  textInput: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  regenerationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(201,169,98,0.1)",
    borderRadius: 8,
  },
  regenerationInfoText: {
    fontSize: 12,
    color: "#C9A962",
    flex: 1,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 24,
    marginTop: 20,
  },
  tipText: {
    fontSize: 16,
    color: "#888888",
    flex: 1,
  },
  // Loading styles
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingSpinner: {
    marginBottom: 24,
  },
  spinnerGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingTitle: {
    fontSize: 24,
    color: "#FFFFFF",
    marginBottom: 8,
  },
  loadingStatus: {
    fontSize: 16,
    color: "#C9A962",
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 18,
    color: "#888888",
    textAlign: "center",
  },
});
