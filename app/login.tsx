import { View, Text, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";

import { ScreenContainer } from "@/components/screen-container";
import { GlassmorphismCard, TextInput, PrimaryButton, SecondaryButton, IconSymbol } from "@/components/ui";
import { useAuth } from "@/lib/auth-provider";
import { signInWithApple } from "@/lib/apple-auth";

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    
    setLoading(true);
    setError("");
    
    const { error: authError } = await signInWithEmail(email, password);
    
    setLoading(false);
    
    if (authError) {
      setError(authError.message);
    } else {
      router.replace("/(tabs)");
    }
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    setError("");
    
    const result = await signInWithApple();
    
    setAppleLoading(false);
    
    if (result.success) {
      router.replace("/(tabs)");
    } else if (result.error && result.error !== "Sign in was cancelled") {
      setError(result.error);
    }
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
              Dishcraft
            </Text>
          </View>

          {/* Login Card */}
          <GlassmorphismCard className="gap-6">
            <View className="gap-2">
              <Text 
                style={{ fontFamily: "PlayfairDisplay-Bold" }} 
                className="text-2xl text-foreground"
              >
                Welcome Back
              </Text>
              <Text 
                style={{ fontFamily: "Inter" }} 
                className="text-base text-muted"
              >
                Sign in to access your recipes
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
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
            </View>

            <PrimaryButton
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
            />

            <View className="items-center gap-4">
              <View className="flex-row items-center gap-4 w-full">
                <View className="flex-1 h-px bg-border" />
                <Text style={{ fontFamily: "Inter" }} className="text-subtle text-sm">
                  or
                </Text>
                <View className="flex-1 h-px bg-border" />
              </View>

              <TouchableOpacity
                onPress={handleAppleSignIn}
                disabled={appleLoading}
                className="w-full bg-foreground rounded-xl py-4 items-center"
                activeOpacity={0.8}
                style={{ opacity: appleLoading ? 0.7 : 1 }}
              >
                <View className="flex-row items-center gap-2">
                  <Text style={{ fontFamily: "Inter-Medium", fontSize: 20 }} className="text-background">
                    
                  </Text>
                  <Text style={{ fontFamily: "Inter-Medium" }} className="text-background text-base">
                    {appleLoading ? "Signing in..." : "Sign in with Apple"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </GlassmorphismCard>

          {/* Sign Up Link */}
          <View className="flex-row justify-center mt-6 gap-1">
            <Text style={{ fontFamily: "Inter" }} className="text-muted">
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={() => router.push("/signup")}>
              <Text style={{ fontFamily: "Inter-Medium" }} className="text-primary">
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
