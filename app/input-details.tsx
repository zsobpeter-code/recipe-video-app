import { useState } from "react";
import { 
  View, 
  Text, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { GlassmorphismCard, TextInput, PrimaryButton, SecondaryButton, IconSymbol } from "@/components/ui";

export default function InputDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ imageUri: string; source: string }>();
  const { imageUri, source } = params;
  
  const [dishName, setDishName] = useState("");
  const [userNotes, setUserNotes] = useState("");

  const handleContinue = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Navigate to processing screen with all the data
    router.push({
      pathname: "/processing",
      params: {
        imageUri: imageUri || "",
        dishName: dishName.trim() || "Untitled Dish",
        userNotes: userNotes.trim(),
        source: source || "camera",
      }
    });
  };

  const handleBack = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={handleBack}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { fontFamily: "PlayfairDisplay-Bold" }]}>
              Add Details
            </Text>
            <View style={styles.backButton} />
          </View>

          {/* Image Preview */}
          <View style={styles.imageContainer}>
            {imageUri ? (
              <Image
                source={{ uri: imageUri }}
                style={styles.image}
                contentFit="cover"
                transition={300}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <IconSymbol name="photo.fill" size={48} color="#666666" />
                <Text style={[styles.placeholderText, { fontFamily: "Inter" }]}>
                  No image selected
                </Text>
              </View>
            )}
            
            {/* Source badge */}
            <View style={styles.sourceBadge}>
              <IconSymbol 
                name={source === "camera" ? "camera.fill" : "photo.fill"} 
                size={14} 
                color="#C9A962" 
              />
              <Text style={[styles.sourceBadgeText, { fontFamily: "Inter" }]}>
                {source === "camera" ? "Camera" : "Gallery"}
              </Text>
            </View>
          </View>

          {/* Input Form */}
          <View style={styles.formContainer}>
            <GlassmorphismCard className="gap-5">
              <View className="gap-2">
                <Text 
                  style={{ fontFamily: "PlayfairDisplay-Bold" }} 
                  className="text-xl text-foreground"
                >
                  What's cooking?
                </Text>
                <Text 
                  style={{ fontFamily: "Inter" }} 
                  className="text-sm text-muted"
                >
                  Add a name and any notes about this dish
                </Text>
              </View>

              <TextInput
                label="Dish Name"
                placeholder="e.g., Grandma's Apple Pie"
                value={dishName}
                onChangeText={setDishName}
                autoCapitalize="words"
                returnKeyType="next"
              />

              <View className="gap-2">
                <Text 
                  style={{ fontFamily: "Inter-Medium" }} 
                  className="text-sm text-foreground"
                >
                  Notes{" "}
                  <Text className="text-muted">(optional)</Text>
                </Text>
                <TextInput
                  placeholder="Any special instructions, ingredient substitutions, or family secrets..."
                  value={userNotes}
                  onChangeText={setUserNotes}
                  multiline
                  numberOfLines={4}
                  style={{ minHeight: 100, textAlignVertical: "top" }}
                />
              </View>

              {/* Tip */}
              <View style={styles.tipContainer}>
                <IconSymbol name="bolt.fill" size={16} color="#C9A962" />
                <Text style={[styles.tipText, { fontFamily: "Caveat" }]}>
                  Our AI will analyze the image and extract the recipe details automatically!
                </Text>
              </View>
            </GlassmorphismCard>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <SecondaryButton
              title="Retake"
              onPress={handleBack}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              title="Analyze Recipe"
              onPress={handleContinue}
              style={{ flex: 2 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  imageContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 4 / 3,
    backgroundColor: "#1A1A1A",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  placeholderText: {
    fontSize: 14,
    color: "#666666",
  },
  sourceBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  sourceBadgeText: {
    fontSize: 12,
    color: "#C9A962",
  },
  formContainer: {
    paddingHorizontal: 16,
    flex: 1,
  },
  tipContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.2)",
  },
  tipText: {
    flex: 1,
    fontSize: 16,
    color: "#C9A962",
    lineHeight: 22,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
