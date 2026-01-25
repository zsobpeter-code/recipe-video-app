import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { GlassmorphismCard, TextInput, PrimaryButton, IconSymbol } from "@/components/ui";

export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async () => {
    if (!displayName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    setLoading(true);
    setError("");
    
    // TODO: Implement actual registration with Supabase
    // For now, simulate a signup
    setTimeout(() => {
      setLoading(false);
      router.replace("/(tabs)");
    }, 1000);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Back Button */}
          <TouchableOpacity 
            onPress={() => router.back()}
            className="absolute top-0 left-0 p-2"
            style={{ zIndex: 10 }}
          >
            <IconSymbol name="chevron.left" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Logo Section */}
          <View className="items-center mb-8">
            <View 
              className="w-20 h-20 rounded-2xl items-center justify-center mb-4"
              style={{ backgroundColor: "#C9A962" }}
            >
              <IconSymbol name="book.fill" size={40} color="#1A1A1A" />
            </View>
            <Text 
              style={{ fontFamily: "PlayfairDisplay-Bold" }} 
              className="text-2xl text-foreground"
            >
              Recipe Studio
            </Text>
          </View>

          {/* Sign Up Card */}
          <GlassmorphismCard className="gap-6">
            <View className="gap-2">
              <Text 
                style={{ fontFamily: "PlayfairDisplay-Bold" }} 
                className="text-2xl text-foreground"
              >
                Create Account
              </Text>
              <Text 
                style={{ fontFamily: "Inter" }} 
                className="text-base text-muted"
              >
                Start preserving your family recipes
              </Text>
            </View>

            {error ? (
              <View className="bg-error/20 rounded-lg p-3">
                <Text style={{ fontFamily: "Inter" }} className="text-error text-sm">
                  {error}
                </Text>
              </View>
            ) : null}

            <View className="gap-4">
              <TextInput
                label="Display Name"
                placeholder="Your name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
              />

              <TextInput
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
              />
              
              <TextInput
                label="Password"
                placeholder="At least 6 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="next"
              />

              <TextInput
                label="Confirm Password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
            </View>

            <PrimaryButton
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
            />
          </GlassmorphismCard>

          {/* Sign In Link */}
          <View className="flex-row justify-center mt-6 gap-1">
            <Text style={{ fontFamily: "Inter" }} className="text-muted">
              Already have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={{ fontFamily: "Inter-Medium" }} className="text-primary">
                Sign In
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
