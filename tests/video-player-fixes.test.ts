import { describe, it, expect, vi, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Video Player Bug Fixes", () => {
  const videoPlayerPath = path.join(__dirname, "../app/video-player.tsx");
  const recipeCardPath = path.join(__dirname, "../app/recipe-card.tsx");
  
  let videoPlayerContent: string;
  let recipeCardContent: string;
  
  beforeAll(() => {
    videoPlayerContent = fs.readFileSync(videoPlayerPath, "utf-8");
    recipeCardContent = fs.readFileSync(recipeCardPath, "utf-8");
  });

  describe("BUG 1: Step-specific visuals", () => {
    it("should have STEP_VISUALS array for different step animations", () => {
      expect(videoPlayerContent).toContain("STEP_VISUALS");
      expect(videoPlayerContent).toContain("scale:");
      expect(videoPlayerContent).toContain("translateX:");
      expect(videoPlayerContent).toContain("translateY:");
    });

    it("should use currentStepIndex to select visual style", () => {
      expect(videoPlayerContent).toContain("currentStepIndex % STEP_VISUALS.length");
    });

    it("should have step-specific color overlay", () => {
      expect(videoPlayerContent).toContain("stepOverlay");
      expect(videoPlayerContent).toContain("overlayOpacity");
    });
  });

  describe("BUG 2: Duplicate play buttons removed", () => {
    it("should NOT have playButtonOverlay style", () => {
      expect(videoPlayerContent).not.toContain("playButtonOverlay:");
    });

    it("should have only one play/pause button in navigation controls", () => {
      expect(videoPlayerContent).toContain("playPauseButton");
      // The video container should be touchable for play/pause
      expect(videoPlayerContent).toContain("TouchableOpacity");
      expect(videoPlayerContent).toContain("onPress={handlePlayPause}");
    });

    it("should have tap to play hint when paused", () => {
      expect(videoPlayerContent).toContain("Tap to play");
      expect(videoPlayerContent).toContain("pausedIndicator");
    });
  });

  describe("BUG 3: Scrollable steps section", () => {
    it("should have ScrollView for steps list", () => {
      expect(videoPlayerContent).toContain("ScrollView");
      expect(videoPlayerContent).toContain("stepsScrollRef");
    });

    it("should have nestedScrollEnabled for proper scrolling", () => {
      expect(videoPlayerContent).toContain("nestedScrollEnabled={true}");
    });

    it("should have proper padding for safe area", () => {
      expect(videoPlayerContent).toContain("paddingBottom: insets.bottom");
    });
  });

  describe("BUG 4: Share functionality", () => {
    it("should import Share from react-native", () => {
      expect(videoPlayerContent).toContain("Share,");
      expect(videoPlayerContent).toContain('from "react-native"');
    });

    it("should have handleShare function with Share.share call", () => {
      expect(videoPlayerContent).toContain("handleShare");
      expect(videoPlayerContent).toContain("Share.share");
    });

    it("should share recipe name, step count, and total time", () => {
      expect(videoPlayerContent).toContain("dishName");
      expect(videoPlayerContent).toContain("totalSteps");
      expect(videoPlayerContent).toContain("totalMins");
    });

    it("should handle share errors gracefully", () => {
      expect(videoPlayerContent).toContain("Share Failed");
      expect(videoPlayerContent).toContain("Alert.alert");
    });
  });

  describe("BUG 5: Generate AI Photo button on Recipe Card", () => {
    it("should have Generate AI Photo button", () => {
      expect(recipeCardContent).toContain("Generate AI Photo");
      expect(recipeCardContent).toContain("handleGenerateAIPhoto");
    });

    it("should show button when no generated photo exists", () => {
      expect(recipeCardContent).toContain("!generatedPhotoUri");
    });

    it("should call generateImage mutation", () => {
      expect(recipeCardContent).toContain("generateAIImage.mutateAsync");
    });

    it("should update generatedPhotoUri on success", () => {
      expect(recipeCardContent).toContain("setGeneratedPhotoUri");
    });
  });

  describe("Video Player structure", () => {
    it("should have proper header with close and share buttons", () => {
      expect(videoPlayerContent).toContain("handleClose");
      expect(videoPlayerContent).toContain("handleShare");
      expect(videoPlayerContent).toContain('name="xmark"');
      expect(videoPlayerContent).toContain('name="paperplane.fill"');
    });

    it("should have navigation controls with previous, play/pause, next", () => {
      expect(videoPlayerContent).toContain("handlePrevious");
      expect(videoPlayerContent).toContain("handleNext");
      expect(videoPlayerContent).toContain("handlePlayPause");
    });

    it("should display current step instruction", () => {
      expect(videoPlayerContent).toContain("STEP");
      expect(videoPlayerContent).toContain("currentStep?.instruction");
    });

    it("should have progress bar", () => {
      expect(videoPlayerContent).toContain("progressBarContainer");
      expect(videoPlayerContent).toContain("progressPercent");
    });
  });
});
