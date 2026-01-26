import { Text, TouchableOpacity, ActivityIndicator, View, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export interface SecondaryButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function SecondaryButton({
  title,
  subtitle,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: SecondaryButtonProps) {
  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#C9A962" size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <View style={styles.textContainer}>
            <Text style={styles.text} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C9A962",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    minWidth: 100,
  },
  fullWidth: {
    width: "100%",
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontFamily: "Inter-Medium",
    fontSize: 15,
    color: "#C9A962",
    textAlign: "center",
    flexShrink: 0,
  },
  textContainer: {
    alignItems: "center",
  },
  subtitle: {
    fontFamily: "Inter",
    fontSize: 11,
    color: "#888888",
    marginTop: 2,
  },
});
