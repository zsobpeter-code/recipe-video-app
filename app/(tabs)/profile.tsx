import { useState } from "react";
import { 
  View, 
  Text, 
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";
import { useRevenueCat, PRICING } from "@/lib/revenuecat";

interface SettingsItemProps {
  icon: any;
  label: string;
  onPress: () => void;
  showBadge?: boolean;
  danger?: boolean;
}

function SettingsItem({ icon, label, onPress, showBadge, danger }: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={styles.settingsItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsItemLeft}>
        <View style={[styles.settingsIconContainer, danger && styles.settingsIconDanger]}>
          <IconSymbol 
            name={icon} 
            size={20} 
            color={danger ? "#EF4444" : "#C9A962"} 
          />
        </View>
        <Text style={[
          styles.settingsLabel, 
          { fontFamily: "Inter" },
          danger && styles.settingsLabelDanger
        ]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingsItemRight}>
        {showBadge && <View style={styles.badge} />}
        <IconSymbol name="chevron.right" size={18} color="#666666" />
      </View>
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Fetch user stats
  const { data: stats } = trpc.recipe.list.useQuery({});
  const recipesCount = stats?.recipes?.length || 0;
  const videosGenerated = 0; // Will be tracked later

  // Get subscription status
  const { hasStudioSubscription } = useRevenueCat();

  // Get user initials for avatar
  const userEmail = user?.email || "guest@example.com";
  const userInitials = userEmail.substring(0, 2).toUpperCase();

  const handleSignOut = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            setIsSigningOut(true);
            try {
              await logout();
              router.replace("/login");
            } catch (error) {
              console.error("Sign out error:", error);
            } finally {
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handleUpgrade = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push("/paywall" as any);
  };

  const showComingSoon = (feature: string) => {
    Alert.alert(feature, "This feature is coming soon!");
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView 
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { fontFamily: "PlayfairDisplay-Bold" }]}>
            Profile
          </Text>
        </View>

        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={[styles.avatarText, { fontFamily: "Inter-Medium" }]}>
              {userInitials}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { fontFamily: "Inter-Medium" }]}>
              {userEmail.split("@")[0]}
            </Text>
            <Text style={[styles.userEmail, { fontFamily: "Inter" }]}>
              {userEmail}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: "PlayfairDisplay-Bold" }]}>
              {recipesCount}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: "Inter" }]}>
              Recipes
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { fontFamily: "PlayfairDisplay-Bold" }]}>
              {videosGenerated}
            </Text>
            <Text style={[styles.statLabel, { fontFamily: "Inter" }]}>
              Videos
            </Text>
          </View>
        </View>

        {/* Subscription Status */}
        <TouchableOpacity 
          style={[styles.subscriptionCard, hasStudioSubscription && styles.subscriptionCardActive]}
          onPress={handleUpgrade}
          activeOpacity={0.8}
        >
          <View style={styles.subscriptionLeft}>
            <View style={styles.crownContainer}>
              <IconSymbol name="crown.fill" size={24} color="#C9A962" />
            </View>
            <View>
              <Text style={[styles.subscriptionTitle, { fontFamily: "Inter-Medium" }]}>
                {hasStudioSubscription ? "Dishcraft Studio" : "Free Plan"}
              </Text>
              <Text style={[styles.subscriptionSubtitle, { fontFamily: "Inter" }]}>
                {hasStudioSubscription 
                  ? "Unlimited photos + 10 videos/month"
                  : `Upgrade to Studio for ${PRICING.STUDIO_MONTHLY}`}
              </Text>
            </View>
          </View>
          {!hasStudioSubscription && (
            <View style={styles.upgradeButton}>
              <Text style={[styles.upgradeButtonText, { fontFamily: "Inter-Medium" }]}>
                Upgrade
              </Text>
            </View>
          )}
          {hasStudioSubscription && (
            <View style={styles.activeIndicator}>
              <IconSymbol name="checkmark.circle.fill" size={20} color="#22C55E" />
            </View>
          )}
        </TouchableOpacity>

        {/* Settings Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter-Medium" }]}>
            Settings
          </Text>
          
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="bell.fill"
              label="Notifications"
              onPress={() => showComingSoon("Notifications")}
            />
            <SettingsItem
              icon="paintbrush.fill"
              label="Appearance"
              onPress={() => showComingSoon("Appearance")}
            />
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.settingsSection}>
          <Text style={[styles.sectionTitle, { fontFamily: "Inter-Medium" }]}>
            Support
          </Text>
          
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="questionmark.circle.fill"
              label="Help & FAQ"
              onPress={() => showComingSoon("Help & FAQ")}
            />
            <SettingsItem
              icon="doc.text.fill"
              label="Terms of Service"
              onPress={() => Linking.openURL("https://dishcraft.ai/terms.html")}
            />
            <SettingsItem
              icon="lock.fill"
              label="Privacy Policy"
              onPress={() => Linking.openURL("https://dishcraft.ai/privacy.html")}
            />
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.settingsSection}>
          <View style={styles.settingsGroup}>
            <SettingsItem
              icon="rectangle.portrait.and.arrow.right"
              label="Sign Out"
              onPress={handleSignOut}
              danger
            />
          </View>
        </View>

        {/* App Version */}
        <Text style={[styles.versionText, { fontFamily: "Inter" }]}>
          Dishcraft v1.0.0
        </Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    color: "#FFFFFF",
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    gap: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#C9A962",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 22,
    color: "#1A1A1A",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    color: "#FFFFFF",
  },
  userEmail: {
    fontSize: 14,
    color: "#888888",
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    color: "#C9A962",
  },
  statLabel: {
    fontSize: 14,
    color: "#888888",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    marginVertical: 4,
  },
  subscriptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(201, 169, 98, 0.1)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 98, 0.3)",
  },
  subscriptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  crownContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(201, 169, 98, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  subscriptionTitle: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  subscriptionSubtitle: {
    fontSize: 12,
    color: "#888888",
    marginTop: 2,
  },
  upgradeButton: {
    backgroundColor: "#C9A962",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  upgradeButtonText: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  subscriptionCardActive: {
    borderColor: "rgba(34, 197, 94, 0.3)",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
  },
  activeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: "#888888",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  settingsGroup: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    overflow: "hidden",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  settingsItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  settingsIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(201, 169, 98, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  settingsIconDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  settingsLabel: {
    fontSize: 16,
    color: "#FFFFFF",
  },
  settingsLabelDanger: {
    color: "#EF4444",
  },
  settingsItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#C9A962",
  },
  versionText: {
    fontSize: 12,
    color: "#555555",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 16,
  },
});
