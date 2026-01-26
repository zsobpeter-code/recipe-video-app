/**
 * ShareMenu Component
 * 
 * A modal menu that shows available sharing options for a recipe.
 */

import { useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import ViewShot from "react-native-view-shot";
import * as Haptics from "expo-haptics";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShareableRecipeCard } from "@/components/shareable-recipe-card";
import {
  shareRecipePDF,
  shareRecipeCardImage,
  shareAIPhoto,
  shareVideo,
  type RecipeData,
} from "@/lib/recipeShareService";

interface ShareMenuProps {
  visible: boolean;
  onClose: () => void;
  recipe: RecipeData;
}

export function ShareMenu({ visible, onClose, recipe }: ShareMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const hasVideo = !!recipe.finalVideoUrl;
  const hasAIPhoto = !!recipe.imageUrl;

  const handleHaptic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleShareCard = async () => {
    handleHaptic();
    setIsLoading(true);
    setLoadingAction("card");

    try {
      if (viewShotRef.current) {
        const uri = await viewShotRef.current.capture?.();
        if (uri) {
          const result = await shareRecipeCardImage(uri, recipe);
          if (!result.success) {
            Alert.alert("Error", result.error || "Failed to share recipe card");
          }
        }
      }
    } catch (error) {
      console.error("Share card error:", error);
      Alert.alert("Error", "Failed to capture recipe card");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleSharePDF = async () => {
    handleHaptic();
    setIsLoading(true);
    setLoadingAction("pdf");

    try {
      const result = await shareRecipePDF(recipe);
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to share PDF");
      }
    } catch (error) {
      console.error("Share PDF error:", error);
      Alert.alert("Error", "Failed to generate PDF");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleShareAIPhoto = async () => {
    handleHaptic();
    if (!recipe.imageUrl) return;

    setIsLoading(true);
    setLoadingAction("photo");

    try {
      const result = await shareAIPhoto(recipe.imageUrl, recipe.dishName);
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to share photo");
      }
    } catch (error) {
      console.error("Share AI photo error:", error);
      Alert.alert("Error", "Failed to share AI photo");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleShareVideo = async () => {
    handleHaptic();
    if (!recipe.finalVideoUrl) return;

    setIsLoading(true);
    setLoadingAction("video");

    try {
      const result = await shareVideo(recipe.finalVideoUrl, recipe.dishName);
      if (!result.success) {
        Alert.alert("Error", result.error || "Failed to share video");
      }
    } catch (error) {
      console.error("Share video error:", error);
      Alert.alert("Error", "Failed to share video");
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  };

  const handleClose = () => {
    handleHaptic();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={handleClose}
      >
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={styles.menu}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
                Share Recipe
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <IconSymbol name="xmark" size={20} color="#888888" />
              </TouchableOpacity>
            </View>

            {/* Share Options */}
            <View style={styles.options}>
              {/* Recipe Card */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleShareCard}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  {loadingAction === "card" ? (
                    <ActivityIndicator size="small" color="#C9A962" />
                  ) : (
                    <IconSymbol name="photo" size={24} color="#C9A962" />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { fontFamily: "Inter-Medium" }]}>
                    Recipe Card
                  </Text>
                  <Text style={[styles.optionSubtitle, { fontFamily: "Inter" }]}>
                    Share as image
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#555555" />
              </TouchableOpacity>

              {/* Full Recipe PDF */}
              <TouchableOpacity
                style={styles.option}
                onPress={handleSharePDF}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.optionIcon}>
                  {loadingAction === "pdf" ? (
                    <ActivityIndicator size="small" color="#C9A962" />
                  ) : (
                    <IconSymbol name="doc.text" size={24} color="#C9A962" />
                  )}
                </View>
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, { fontFamily: "Inter-Medium" }]}>
                    Full Recipe PDF
                  </Text>
                  <Text style={[styles.optionSubtitle, { fontFamily: "Inter" }]}>
                    With ingredients & steps
                  </Text>
                </View>
                <IconSymbol name="chevron.right" size={16} color="#555555" />
              </TouchableOpacity>

              {/* AI Photo */}
              {hasAIPhoto && (
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleShareAIPhoto}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIcon}>
                    {loadingAction === "photo" ? (
                      <ActivityIndicator size="small" color="#C9A962" />
                    ) : (
                      <IconSymbol name="sparkles" size={24} color="#C9A962" />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { fontFamily: "Inter-Medium" }]}>
                      AI Photo
                    </Text>
                    <Text style={[styles.optionSubtitle, { fontFamily: "Inter" }]}>
                      Share enhanced image
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color="#555555" />
                </TouchableOpacity>
              )}

              {/* Cooking Video */}
              {hasVideo && (
                <TouchableOpacity
                  style={styles.option}
                  onPress={handleShareVideo}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIcon}>
                    {loadingAction === "video" ? (
                      <ActivityIndicator size="small" color="#C9A962" />
                    ) : (
                      <IconSymbol name="video" size={24} color="#C9A962" />
                    )}
                  </View>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionTitle, { fontFamily: "Inter-Medium" }]}>
                      Cooking Video
                    </Text>
                    <Text style={[styles.optionSubtitle, { fontFamily: "Inter" }]}>
                      Share to TikTok / Instagram
                    </Text>
                  </View>
                  <IconSymbol name="chevron.right" size={16} color="#555555" />
                </TouchableOpacity>
              )}
            </View>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelText, { fontFamily: "Inter-Medium" }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Hidden ViewShot for capturing recipe card */}
      <View style={styles.hiddenCapture}>
        <ShareableRecipeCard
          ref={viewShotRef}
          dishName={recipe.dishName}
          description={recipe.description}
          imageUrl={recipe.imageUrl || null}
          prepTime={recipe.prepTime}
          cookTime={recipe.cookTime}
          servings={recipe.servings}
          difficulty={recipe.difficulty}
          cuisine={recipe.cuisine}
          ingredientCount={recipe.ingredients?.length}
          stepCount={recipe.steps?.length}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
  },
  menu: {
    width: 340,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  title: {
    fontSize: 20,
    color: "#FFFFFF",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  options: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    color: "#FFFFFF",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#888888",
  },
  cancelButton: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    color: "#888888",
  },
  hiddenCapture: {
    position: "absolute",
    left: -9999,
    top: -9999,
  },
});
