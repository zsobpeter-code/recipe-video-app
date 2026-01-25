import { TextInput as RNTextInput, View, Text, StyleSheet, TextInputProps } from "react-native";
import { useState } from "react";

interface CustomTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  variant?: "default" | "handwritten";
}

export function TextInput({
  label,
  error,
  variant = "default",
  style,
  ...props
}: CustomTextInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>{label}</Text>
      )}
      <RNTextInput
        style={[
          styles.input,
          variant === "handwritten" && styles.handwritten,
          isFocused && styles.focused,
          error && styles.error,
          style,
        ]}
        placeholderTextColor="#808080"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 8,
  },
  label: {
    fontFamily: "Inter",
    fontSize: 14,
    color: "#B3B3B3",
  },
  input: {
    backgroundColor: "rgba(45, 45, 45, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontFamily: "Inter",
    fontSize: 16,
    color: "#FFFFFF",
  },
  handwritten: {
    fontFamily: "Caveat",
    fontSize: 20,
    lineHeight: 28,
  },
  focused: {
    borderColor: "#C9A962",
  },
  error: {
    borderColor: "#8B4049",
  },
  errorText: {
    fontFamily: "Inter",
    fontSize: 12,
    color: "#8B4049",
  },
});
