import { Text, TouchableOpacity, ActivityIndicator, View, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

export interface PrimaryButtonProps {
  title: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  subtitle,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  style,
}: PrimaryButtonProps) {
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
      activeOpacity={0.8}
      style={[
        styles.button,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#1A1A1A" size="small" />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <View style={styles.textContainer}>
            <Text style={styles.text}>{title}</Text>
            {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#C9A962",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
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
    fontSize: 16,
    color: "#1A1A1A",
  },
  textContainer: {
    alignItems: "center",
  },
  subtitle: {
    fontFamily: "Inter",
    fontSize: 11,
    color: "rgba(26, 26, 26, 0.7)",
    marginTop: 2,
  },
});
