/**
 * ShareableRecipeCard Component
 * 
 * A styled recipe card that can be captured as an image for sharing.
 * Uses ViewShot to capture the card as a PNG image.
 */

import { forwardRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { Image } from "expo-image";
import ViewShot from "react-native-view-shot";
import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 40, 350);

interface ShareableRecipeCardProps {
  dishName: string;
  description?: string;
  imageUrl: string | null;
  prepTime?: number;
  cookTime?: number;
  servings?: number;
  difficulty?: string;
  cuisine?: string;
  ingredientCount?: number;
  stepCount?: number;
}

export const ShareableRecipeCard = forwardRef<ViewShot, ShareableRecipeCardProps>(
  (
    {
      dishName,
      description,
      imageUrl,
      prepTime,
      cookTime,
      servings,
      difficulty,
      cuisine,
      ingredientCount,
      stepCount,
    },
    ref
  ) => {
    const totalTime = (prepTime || 0) + (cookTime || 0);

    return (
      <ViewShot
        ref={ref}
        options={{ format: "png", quality: 1 }}
        style={styles.viewShot}
      >
        <View style={styles.card}>
          {/* Header with gradient */}
          <View style={styles.header}>
            {imageUrl ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                contentFit="cover"
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <IconSymbol name="photo" size={48} color="#555555" />
              </View>
            )}
            <View style={styles.imageOverlay} />
            
            {/* Cuisine badge */}
            {cuisine && (
              <View style={styles.cuisineBadge}>
                <Text style={[styles.cuisineText, { fontFamily: "Inter-Medium" }]}>
                  {cuisine}
                </Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Title */}
            <Text
              style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}
              numberOfLines={2}
            >
              {dishName}
            </Text>

            {/* Description */}
            {description && (
              <Text
                style={[styles.description, { fontFamily: "Inter" }]}
                numberOfLines={2}
              >
                {description}
              </Text>
            )}

            {/* Stats row */}
            <View style={styles.statsRow}>
              {totalTime > 0 && (
                <View style={styles.stat}>
                  <IconSymbol name="clock" size={14} color="#C9A962" />
                  <Text style={[styles.statText, { fontFamily: "Inter" }]}>
                    {totalTime} min
                  </Text>
                </View>
              )}
              
              {servings && (
                <View style={styles.stat}>
                  <IconSymbol name="person.2" size={14} color="#C9A962" />
                  <Text style={[styles.statText, { fontFamily: "Inter" }]}>
                    {servings}
                  </Text>
                </View>
              )}
              
              {difficulty && (
                <View style={styles.stat}>
                  <IconSymbol name="chart.bar" size={14} color="#C9A962" />
                  <Text style={[styles.statText, { fontFamily: "Inter" }]}>
                    {difficulty}
                  </Text>
                </View>
              )}
            </View>

            {/* Ingredients and steps count */}
            <View style={styles.countsRow}>
              {ingredientCount && ingredientCount > 0 && (
                <Text style={[styles.countText, { fontFamily: "Inter" }]}>
                  {ingredientCount} ingredients
                </Text>
              )}
              {stepCount && stepCount > 0 && (
                <Text style={[styles.countText, { fontFamily: "Inter" }]}>
                  {stepCount} steps
                </Text>
              )}
            </View>

            {/* Branding */}
            <View style={styles.branding}>
              <IconSymbol name="sparkles" size={12} color="#C9A962" />
              <Text style={[styles.brandText, { fontFamily: "Inter-Medium" }]}>
                Recipe Studio
              </Text>
            </View>
          </View>
        </View>
      </ViewShot>
    );
  }
);

const styles = StyleSheet.create({
  viewShot: {
    backgroundColor: "transparent",
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    width: "100%",
    height: 200,
    position: "relative",
  },
  image: {
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
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "transparent",
    // Gradient effect via linear gradient would be better
  },
  cuisineBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisineText: {
    fontSize: 11,
    color: "#C9A962",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 22,
    color: "#FFFFFF",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#888888",
    lineHeight: 18,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.1)",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: "#AAAAAA",
  },
  countsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  countText: {
    fontSize: 12,
    color: "#666666",
  },
  branding: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  brandText: {
    fontSize: 11,
    color: "#C9A962",
    letterSpacing: 0.5,
  },
});
