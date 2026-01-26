/**
 * ImageSelector Component
 * 
 * Allows users to choose between their original photo and AI-generated photo
 * as the primary display image for a recipe.
 */

import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface ImageSelectorProps {
  originalImage: string | null;
  generatedImage: string | null;
  selected: "original" | "generated" | null;
  onSelect: (type: "original" | "generated") => void;
}

export function ImageSelector({
  originalImage,
  generatedImage,
  selected,
  onSelect,
}: ImageSelectorProps) {
  // Only show if both images exist
  if (!originalImage || !generatedImage) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { fontFamily: "Inter-Medium" }]}>
        Choose Main Photo
      </Text>
      
      <View style={styles.row}>
        {/* Original Photo Option */}
        <TouchableOpacity
          style={[
            styles.option,
            selected === "original" && styles.optionSelected,
          ]}
          onPress={() => onSelect("original")}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: originalImage }}
              style={styles.thumbnail}
              contentFit="cover"
            />
            {selected === "original" && (
              <View style={styles.checkBadge}>
                <IconSymbol name="checkmark" size={14} color="#1A1A1A" />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.label,
              { fontFamily: "Inter" },
              selected === "original" && styles.labelSelected,
            ]}
          >
            Your Photo
          </Text>
        </TouchableOpacity>

        {/* AI Generated Option */}
        <TouchableOpacity
          style={[
            styles.option,
            selected === "generated" && styles.optionSelected,
          ]}
          onPress={() => onSelect("generated")}
          activeOpacity={0.7}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: generatedImage }}
              style={styles.thumbnail}
              contentFit="cover"
            />
            <View style={styles.aiBadge}>
              <IconSymbol name="sparkles" size={10} color="#C9A962" />
            </View>
            {selected === "generated" && (
              <View style={styles.checkBadge}>
                <IconSymbol name="checkmark" size={14} color="#1A1A1A" />
              </View>
            )}
          </View>
          <Text
            style={[
              styles.label,
              { fontFamily: "Inter" },
              selected === "generated" && styles.labelSelected,
            ]}
          >
            AI Enhanced
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: "rgba(201, 169, 98, 0.08)",
    borderRadius: 12,
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    color: "#C9A962",
    marginBottom: 12,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  option: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  optionSelected: {
    borderColor: "#C9A962",
    backgroundColor: "rgba(201, 169, 98, 0.1)",
  },
  imageContainer: {
    position: "relative",
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  aiBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(26, 26, 26, 0.8)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#C9A962",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    color: "#888888",
  },
  labelSelected: {
    color: "#C9A962",
  },
});
