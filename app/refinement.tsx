import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton, GlassmorphismCard } from "@/components/ui";

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

  // Animation values
  const cardScale = useSharedValue(1);

  const handleYes = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Proceed with detected name
    navigateToRecipeCard(detectedName);
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

  const handleConfirm = () => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const finalName = correctedName.trim() || selectedAlternative || detectedName;
    navigateToRecipeCard(finalName);
  };

  const navigateToRecipeCard = (dishName: string) => {
    // Update recipe data with corrected name
    const updatedRecipeData = {
      ...recipeData,
      dishName,
    };

    router.replace({
      pathname: "/recipe-card" as any,
      params: {
        imageUri: params.imageUri,
        dishName,
        description: updatedRecipeData.description || "",
        cuisine: updatedRecipeData.cuisine || "",
        difficulty: updatedRecipeData.difficulty || "Medium",
        prepTime: String(updatedRecipeData.prepTime || 15),
        cookTime: String(updatedRecipeData.cookTime || 30),
        servings: String(updatedRecipeData.servings || 4),
        ingredients: JSON.stringify(updatedRecipeData.ingredients || []),
        steps: JSON.stringify(updatedRecipeData.steps || []),
        tags: JSON.stringify(updatedRecipeData.tags || []),
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
            {params.imageUri && (
              <Image
                source={{ uri: params.imageUri }}
                style={styles.previewImage}
                contentFit="cover"
              />
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

                  {/* Confirm Button */}
                  <PrimaryButton
                    title="Confirm & Continue"
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
              Correcting the dish name helps generate more accurate recipes!
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
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  confidenceFill: {
    height: "100%",
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 13,
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
    paddingVertical: 14,
    paddingHorizontal: 24,
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
    gap: 16,
  },
  correctionLabel: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
  },
  alternativesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
  },
  alternativeChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  },
  orText: {
    fontSize: 14,
    color: "#888888",
    textAlign: "center",
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
  tipContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 24,
    marginTop: 24,
    justifyContent: "center",
  },
  tipText: {
    fontSize: 16,
    color: "#888888",
  },
});
