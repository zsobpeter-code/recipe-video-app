import { View, Text, StyleSheet, Platform, Dimensions } from "react-native";
import { Image } from "expo-image";
import { TouchableOpacity, Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import { IconSymbol } from "@/components/ui/icon-symbol";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2; // 16px padding on each side + 16px gap

interface RecipeCardProps {
  id: string;
  dishName: string;
  imageUrl: string | null;
  cookTime: number;
  isFavorite: boolean;
  onPress: () => void;
  onFavoriteToggle: () => void;
  onLongPress?: () => void;
}

export function RecipeCard({
  id,
  dishName,
  imageUrl,
  cookTime,
  isFavorite,
  onPress,
  onFavoriteToggle,
  onLongPress,
}: RecipeCardProps) {
  const handleFavoritePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onFavoriteToggle();
  };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [
        styles.card,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ]}
    >
      {/* Image */}
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholderImage}>
            <IconSymbol name="photo.fill" size={32} color="#555555" />
          </View>
        )}
        
        {/* Favorite button */}
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={handleFavoritePress}
          activeOpacity={0.7}
        >
          <IconSymbol
            name={isFavorite ? "heart.fill" : "heart"}
            size={18}
            color={isFavorite ? "#C9A962" : "#FFFFFF"}
          />
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text 
          style={[styles.dishName, { fontFamily: "Inter-Medium" }]}
          numberOfLines={2}
        >
          {dishName}
        </Text>
        <View style={styles.timeRow}>
          <IconSymbol name="clock.fill" size={12} color="#888888" />
          <Text style={[styles.timeText, { fontFamily: "Inter" }]}>
            {cookTime} min
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  imageContainer: {
    width: "100%",
    height: CARD_WIDTH,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2A2A2A",
    justifyContent: "center",
    alignItems: "center",
  },
  favoriteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  info: {
    padding: 12,
    gap: 6,
  },
  dishName: {
    fontSize: 14,
    color: "#FFFFFF",
    lineHeight: 18,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 12,
    color: "#888888",
  },
});
