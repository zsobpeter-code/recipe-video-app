import { Text, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";

export default function ProfileScreen() {
  return (
    <ScreenContainer className="items-center justify-center">
      <View className="items-center gap-4">
        <Text style={{ fontFamily: "PlayfairDisplay-Bold" }} className="text-3xl text-foreground">
          Profile
        </Text>
        <Text style={{ fontFamily: "Inter" }} className="text-base text-muted text-center px-8">
          Your account settings and preferences
        </Text>
      </View>
    </ScreenContainer>
  );
}
