import { View, StyleSheet, ViewProps } from "react-native";
import { cn } from "@/lib/utils";

interface GlassmorphismCardProps extends ViewProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle";
}

export function GlassmorphismCard({
  children,
  className,
  variant = "default",
  style,
  ...props
}: GlassmorphismCardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === "subtle" && styles.subtle,
        style,
      ]}
      className={cn("rounded-3xl p-6", className)}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "rgba(45, 45, 45, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    // Note: backdrop-blur is not natively supported in React Native
    // For iOS, you can use BlurView from expo-blur
    // For now, we use a semi-transparent background
  },
  subtle: {
    backgroundColor: "rgba(45, 45, 45, 0.5)",
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
});
