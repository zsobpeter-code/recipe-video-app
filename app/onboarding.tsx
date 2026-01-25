import { View, Text, Dimensions, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useState, useRef } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { GlassmorphismCard, PrimaryButton, SecondaryButton, IconSymbol } from "@/components/ui";

const { width } = Dimensions.get("window");

const ONBOARDING_SLIDES = [
  {
    id: 1,
    icon: "camera.fill" as const,
    title: "Capture Your Recipes",
    description: "Photograph a dish or a handwritten recipe card to get started",
  },
  {
    id: 2,
    icon: "book.fill" as const,
    title: "AI-Powered Recognition",
    description: "Our AI identifies ingredients and creates step-by-step instructions",
  },
  {
    id: 3,
    icon: "play.fill" as const,
    title: "Visual Cooking Tutorials",
    description: "Generate beautiful cooking videos to bring your recipes to life",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / width);
    setCurrentIndex(index);
  };

  const handleGetStarted = () => {
    router.replace("/login");
  };

  const handleSkip = () => {
    router.replace("/login");
  };

  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-0">
      <View className="flex-1">
        {/* Skip Button */}
        {!isLastSlide && (
          <View className="absolute top-4 right-6 z-10">
            <SecondaryButton title="Skip" onPress={handleSkip} />
          </View>
        )}

        {/* Slides */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {ONBOARDING_SLIDES.map((slide) => (
            <View
              key={slide.id}
              style={{ width }}
              className="flex-1 items-center justify-center px-6"
            >
              {/* Icon */}
              <View 
                className="w-32 h-32 rounded-full items-center justify-center mb-8"
                style={{ backgroundColor: "rgba(201, 169, 98, 0.2)" }}
              >
                <IconSymbol name={slide.icon} size={56} color="#C9A962" />
              </View>

              {/* Content Card */}
              <GlassmorphismCard className="w-full items-center">
                <Text 
                  style={{ fontFamily: "PlayfairDisplay-Bold" }} 
                  className="text-2xl text-foreground text-center mb-4"
                >
                  {slide.title}
                </Text>
                <Text 
                  style={{ fontFamily: "Inter" }} 
                  className="text-base text-muted text-center leading-6"
                >
                  {slide.description}
                </Text>
              </GlassmorphismCard>
            </View>
          ))}
        </ScrollView>

        {/* Bottom Section */}
        <View className="px-6 pb-8">
          {/* Page Indicators */}
          <View className="flex-row justify-center gap-2 mb-6">
            {ONBOARDING_SLIDES.map((_, index) => (
              <View
                key={index}
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: index === currentIndex ? "#C9A962" : "rgba(255, 255, 255, 0.3)",
                }}
              />
            ))}
          </View>

          {/* Get Started Button (only on last slide) */}
          {isLastSlide && (
            <PrimaryButton
              title="Get Started"
              onPress={handleGetStarted}
              fullWidth
            />
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
