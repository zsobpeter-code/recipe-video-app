import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const projectRoot = path.join(__dirname, "..");

describe("Phase 4 & 5: Video Generation & Monetization", () => {
  describe("Profile Tab", () => {
    it("should have profile screen with user info components", () => {
      const profilePath = path.join(projectRoot, "app/(tabs)/profile.tsx");
      expect(fs.existsSync(profilePath)).toBe(true);
      
      const content = fs.readFileSync(profilePath, "utf-8");
      
      // Check for user info display
      expect(content).toContain("avatar");
      expect(content).toContain("userEmail");
      expect(content).toContain("userInitials");
    });

    it("should have stats section for recipes and videos", () => {
      const profilePath = path.join(projectRoot, "app/(tabs)/profile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");
      
      expect(content).toContain("recipesCount");
      expect(content).toContain("videosGenerated");
      expect(content).toContain("statsContainer");
    });

    it("should have subscription status section", () => {
      const profilePath = path.join(projectRoot, "app/(tabs)/profile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");
      
      expect(content).toContain("subscriptionCard");
      expect(content).toContain("handleUpgrade");
      expect(content).toContain("Free Plan");
    });

    it("should have settings links", () => {
      const profilePath = path.join(projectRoot, "app/(tabs)/profile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");
      
      expect(content).toContain("Notifications");
      expect(content).toContain("Appearance");
      expect(content).toContain("Help & FAQ");
      expect(content).toContain("Terms of Service");
      expect(content).toContain("Privacy Policy");
    });

    it("should have sign out with confirmation", () => {
      const profilePath = path.join(projectRoot, "app/(tabs)/profile.tsx");
      const content = fs.readFileSync(profilePath, "utf-8");
      
      expect(content).toContain("handleSignOut");
      expect(content).toContain("Sign Out");
      expect(content).toContain("Alert.alert");
      expect(content).toContain("logout");
    });
  });

  describe("Paywall Screen", () => {
    it("should have paywall screen file", () => {
      const paywallPath = path.join(projectRoot, "app/paywall.tsx");
      expect(fs.existsSync(paywallPath)).toBe(true);
    });

    it("should have premium illustration/icon", () => {
      const paywallPath = path.join(projectRoot, "app/paywall.tsx");
      const content = fs.readFileSync(paywallPath, "utf-8");
      
      expect(content).toContain("premiumIcon");
      expect(content).toContain("crown.fill");
    });

    it("should have feature list", () => {
      const paywallPath = path.join(projectRoot, "app/paywall.tsx");
      const content = fs.readFileSync(paywallPath, "utf-8");
      
      expect(content).toContain("FEATURES");
      expect(content).toContain("Generate cooking tutorial videos");
      expect(content).toContain("AI-enhanced food photography");
      expect(content).toContain("Unlimited recipe storage");
      expect(content).toContain("Cloud sync across devices");
    });

    it("should have pricing options", () => {
      const paywallPath = path.join(projectRoot, "app/paywall.tsx");
      const content = fs.readFileSync(paywallPath, "utf-8");
      
      // Video pricing
      expect(content).toContain("VIDEO_PRICING_OPTIONS");
      expect(content).toContain("$4.99");
      expect(content).toContain("$17.49");
      expect(content).toContain("$29.99/mo");
      // Step photos pricing
      expect(content).toContain("STEP_PHOTOS_PRICING_OPTIONS");
      expect(content).toContain("$1.99");
      expect(content).toContain("$7.49");
      expect(content).toContain("$9.99/mo");
      expect(content).toContain("Best Value");
    });

    it("should have continue button and restore purchases", () => {
      const paywallPath = path.join(projectRoot, "app/paywall.tsx");
      const content = fs.readFileSync(paywallPath, "utf-8");
      
      expect(content).toContain("handleContinue");
      expect(content).toContain("handleRestorePurchases");
      expect(content).toContain("Restore Purchases");
    });
  });

  describe("Video Generation Screen", () => {
    it("should have video generation screen file", () => {
      const videoGenPath = path.join(projectRoot, "app/video-generation.tsx");
      expect(fs.existsSync(videoGenPath)).toBe(true);
    });

    it("should have progress animation", () => {
      const videoGenPath = path.join(projectRoot, "app/video-generation.tsx");
      const content = fs.readFileSync(videoGenPath, "utf-8");
      
      expect(content).toContain("spinValue");
      expect(content).toContain("pulseValue");
      expect(content).toContain("progressValue");
      expect(content).toContain("Animated");
    });

    it("should have generation steps", () => {
      const videoGenPath = path.join(projectRoot, "app/video-generation.tsx");
      const content = fs.readFileSync(videoGenPath, "utf-8");
      
      expect(content).toContain("GENERATION_STEPS");
      expect(content).toContain("Analyzing recipe structure");
      expect(content).toContain("Generating scene compositions");
      expect(content).toContain("Creating cooking animations");
    });

    it("should navigate to video player on completion", () => {
      const videoGenPath = path.join(projectRoot, "app/video-generation.tsx");
      const content = fs.readFileSync(videoGenPath, "utf-8");
      
      expect(content).toContain("setIsComplete(true)");
      expect(content).toContain("/video-player");
    });
  });

  describe("Video Player Screen", () => {
    it("should have video player screen file", () => {
      const videoPlayerPath = path.join(projectRoot, "app/video-player.tsx");
      expect(fs.existsSync(videoPlayerPath)).toBe(true);
    });

    it("should have step navigation", () => {
      const videoPlayerPath = path.join(projectRoot, "app/video-player.tsx");
      const content = fs.readFileSync(videoPlayerPath, "utf-8");
      
      expect(content).toContain("currentStepIndex");
      expect(content).toContain("handlePrevious");
      expect(content).toContain("handleNext");
      expect(content).toContain("handleStepPress");
    });

    it("should have play/pause controls", () => {
      const videoPlayerPath = path.join(projectRoot, "app/video-player.tsx");
      const content = fs.readFileSync(videoPlayerPath, "utf-8");
      
      expect(content).toContain("isPlaying");
      expect(content).toContain("handlePlayPause");
      expect(content).toContain("play.fill");
      expect(content).toContain("pause.fill");
    });

    it("should display current step instruction", () => {
      const videoPlayerPath = path.join(projectRoot, "app/video-player.tsx");
      const content = fs.readFileSync(videoPlayerPath, "utf-8");
      
      expect(content).toContain("currentStep");
      expect(content).toContain("instruction");
      expect(content).toContain("STEP");
    });

    it("should have steps list", () => {
      const videoPlayerPath = path.join(projectRoot, "app/video-player.tsx");
      const content = fs.readFileSync(videoPlayerPath, "utf-8");
      
      expect(content).toContain("ALL STEPS");
      expect(content).toContain("stepsList");
      expect(content).toContain("steps.map");
    });
  });

  describe("Navigation Integration", () => {
    it("should have all new screens in root layout", () => {
      const layoutPath = path.join(projectRoot, "app/_layout.tsx");
      const content = fs.readFileSync(layoutPath, "utf-8");
      
      expect(content).toContain('name="paywall"');
      expect(content).toContain('name="video-generation"');
      expect(content).toContain('name="video-player"');
    });

    it("should have generate video button connected to paywall", () => {
      const recipeCardPath = path.join(projectRoot, "app/recipe-card.tsx");
      const content = fs.readFileSync(recipeCardPath, "utf-8");
      
      expect(content).toContain("handleGenerateVideo");
      expect(content).toContain("/paywall");
      expect(content).toContain("recipeData");
    });
  });

  describe("Icon Mappings", () => {
    it("should have all required icons for new screens", () => {
      const iconPath = path.join(projectRoot, "components/ui/icon-symbol.tsx");
      const content = fs.readFileSync(iconPath, "utf-8");
      
      // Profile & Settings icons
      expect(content).toContain("gearshape.fill");
      expect(content).toContain("bell.fill");
      expect(content).toContain("paintbrush.fill");
      expect(content).toContain("questionmark.circle.fill");
      expect(content).toContain("doc.text.fill");
      expect(content).toContain("lock.fill");
      expect(content).toContain("crown.fill");
      
      // Video player icons
      expect(content).toContain("backward.fill");
      expect(content).toContain("forward.fill");
    });
  });
});
