import { ScrollView, Text, View, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScreenContainer className="px-6 pt-4">
      <ScrollView 
        contentContainerStyle={{ flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 gap-8">
          {/* Header */}
          <View className="gap-2">
            <Text 
              style={{ fontFamily: "PlayfairDisplay-Bold" }} 
              className="text-4xl text-foreground"
            >
              Recipe Studio
            </Text>
            <Text 
              style={{ fontFamily: "Inter" }} 
              className="text-base text-muted"
            >
              Bring your family recipes to life
            </Text>
          </View>

          {/* Hero Card */}
          <View 
            className="w-full rounded-3xl p-6 border"
            style={{
              backgroundColor: "rgba(45, 45, 45, 0.7)",
              borderColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <View className="gap-4">
              <Text 
                style={{ fontFamily: "PlayfairDisplay-Bold" }} 
                className="text-2xl text-foreground"
              >
                Create Your First Recipe
              </Text>
              <Text 
                style={{ fontFamily: "Caveat" }} 
                className="text-lg text-primaryLight"
              >
                "Photograph grandma's handwritten recipe and watch it come alive as a visual cooking tutorial."
              </Text>
              <TouchableOpacity 
                className="bg-primary rounded-xl py-4 px-8 items-center mt-2"
                style={{ alignSelf: "flex-start" }}
                onPress={() => router.push("/(tabs)/capture")}
              >
                <View className="flex-row items-center gap-2">
                  <IconSymbol name="camera.fill" size={20} color="#1A1A1A" />
                  <Text 
                    style={{ fontFamily: "Inter-Medium" }} 
                    className="text-base text-background"
                  >
                    Start Capturing
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Recipes Section (Placeholder) */}
          <View className="gap-4">
            <Text 
              style={{ fontFamily: "PlayfairDisplay-Bold" }} 
              className="text-xl text-foreground"
            >
              Recent Recipes
            </Text>
            <View 
              className="w-full rounded-2xl p-8 items-center border"
              style={{
                backgroundColor: "rgba(45, 45, 45, 0.5)",
                borderColor: "rgba(255, 255, 255, 0.05)",
              }}
            >
              <IconSymbol name="book.fill" size={40} color="#808080" />
              <Text 
                style={{ fontFamily: "Inter" }} 
                className="text-base text-subtle mt-4 text-center"
              >
                No recipes yet
              </Text>
              <Text 
                style={{ fontFamily: "Inter" }} 
                className="text-sm text-subtle text-center mt-1"
              >
                Capture a photo to create your first recipe
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
