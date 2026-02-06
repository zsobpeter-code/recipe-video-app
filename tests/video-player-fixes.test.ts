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
    it("should have step-specific animations for different steps", () => {
      // New video player uses inline visual array instead of STEP_VISUALS constant
      expect(videoPlayerContent).toContain("scale:");
      expect(videoPlayerContent).toContain("translateX:");
      expect(videoPlayerContent).toContain("translateY:");
    });

    it("should use currentStepIndex to select visual style", () => {
      expect(videoPlayerContent).toContain("currentStepIndex % 5");
    });

    it("should have step-specific color overlay", () => {
      // New video player uses gradient overlay instead of animated overlay
      expect(videoPlayerContent).toContain("gradient");
      expect(videoPlayerContent).toContain("LinearGradient");
    });
  });

  describe("BUG 2: Simplified controls - only play overlay", () => {
    it("should NOT have playButtonOverlay style", () => {
      expect(videoPlayerContent).not.toContain("playButtonOverlay:");
    });

    it("should have swipe navigation hint instead of buttons", () => {
      expect(videoPlayerContent).toContain("swipeHint");
      expect(videoPlayerContent).toContain("Swipe left/right or tap a step below");
    });

    it("should have play overlay when paused", () => {
      // Tap to play text was removed, now just shows play icon
      expect(videoPlayerContent).toContain("playOverlay");
      expect(videoPlayerContent).toContain("playIconContainer");
    });
  });

  describe("BUG 3: Scrollable steps section", () => {
    it("should have ScrollView for steps list", () => {
      expect(videoPlayerContent).toContain("ScrollView");
      expect(videoPlayerContent).toContain("stepsScroll");
    });

    it("should have nestedScrollEnabled for proper scrolling", () => {
      expect(videoPlayerContent).toContain("nestedScrollEnabled={true}");
    });

    it("should have proper padding for safe area", () => {
      expect(videoPlayerContent).toContain("insets.bottom");
    });
  });

  describe("BUG 4: Share functionality", () => {
    it("should import Share from react-native", () => {
      expect(videoPlayerContent).toContain("Share,");
      expect(videoPlayerContent).toContain('from "react-native"');
    });

    it("should have handleShare function", () => {
      expect(videoPlayerContent).toContain("handleShare");
    });

    it("should share actual video file using Sharing.shareAsync", () => {
      expect(videoPlayerContent).toContain("Sharing.shareAsync");
      expect(videoPlayerContent).toContain("mimeType");
      expect(videoPlayerContent).toContain("video/mp4");
    });

    it("should handle share errors gracefully", () => {
      expect(videoPlayerContent).toContain("Share error");
      expect(videoPlayerContent).toContain("console.error");
    });
  });

  describe("BUG 5: Step Images and Video functionality on Recipe Card", () => {
    it("should have step images generation handler", () => {
      expect(recipeCardContent).toContain("handleGenerateStepImages");
    });

    it("should have TikTok video generation handler", () => {
      expect(recipeCardContent).toContain("handleGenerateTikTokVideo");
    });

    it("should have video regeneration handler", () => {
      expect(recipeCardContent).toContain("handleRegenerateVideo");
    });
  });

  describe("Video Player structure", () => {
    it("should have proper header with close, download, and share buttons", () => {
      expect(videoPlayerContent).toContain("handleClose");
      expect(videoPlayerContent).toContain("handleShare");
      expect(videoPlayerContent).toContain("handleDownload");
      expect(videoPlayerContent).toContain('name="xmark"');
      expect(videoPlayerContent).toContain('name="square.and.arrow.up"');
      expect(videoPlayerContent).toContain('name="arrow.down.circle"');
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

    it("should NOT have progress bar (removed per user request)", () => {
      // Progress bar and time indicator were intentionally removed
      expect(videoPlayerContent).not.toContain("progressContainer");
      expect(videoPlayerContent).not.toContain("progressBar");
    });
  });

  describe("Download functionality", () => {
    it("should have handleDownload function", () => {
      expect(videoPlayerContent).toContain("handleDownload");
    });

    it("should request MediaLibrary permissions", () => {
      expect(videoPlayerContent).toContain("MediaLibrary.requestPermissionsAsync");
    });

    it("should save to library using MediaLibrary.saveToLibraryAsync", () => {
      expect(videoPlayerContent).toContain("MediaLibrary.saveToLibraryAsync");
    });

    it("should show success alert after saving", () => {
      expect(videoPlayerContent).toContain("Video saved to your Camera Roll");
    });
  });
});
