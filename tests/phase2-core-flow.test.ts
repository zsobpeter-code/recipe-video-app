import { describe, it, expect } from "vitest";
import * as fs from "fs";

describe("Phase 2: Core Flow - Capture Screen", () => {
  it("should have capture screen file", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toBeDefined();
    expect(captureContent.length).toBeGreaterThan(0);
  });

  it("should use expo-camera for camera functionality", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toContain("expo-camera");
    expect(captureContent).toContain("CameraView");
    expect(captureContent).toContain("useCameraPermissions");
  });

  it("should have gallery picker functionality", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toContain("expo-image-picker");
    expect(captureContent).toContain("launchImageLibraryAsync");
  });

  it("should handle camera permissions", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toContain("permission");
    expect(captureContent).toContain("requestPermission");
    expect(captureContent).toContain("Grant Permission");
  });

  it("should have capture button with animation", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toContain("handleCapture");
    expect(captureContent).toContain("takePictureAsync");
    expect(captureContent).toContain("shutterScale");
  });

  it("should navigate to input-details after capture", () => {
    const captureContent = fs.readFileSync("./app/(tabs)/capture.tsx", "utf-8");
    expect(captureContent).toContain("/input-details");
    expect(captureContent).toContain("imageUri");
  });
});

describe("Phase 2: Core Flow - Input Details Screen", () => {
  it("should have input-details screen file", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toBeDefined();
    expect(inputDetailsContent.length).toBeGreaterThan(0);
  });

  it("should have dish name input field", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toContain("dishName");
    expect(inputDetailsContent).toContain("setDishName");
    expect(inputDetailsContent).toContain("Dish Name");
  });

  it("should have user notes input field", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toContain("userNotes");
    expect(inputDetailsContent).toContain("setUserNotes");
    expect(inputDetailsContent).toContain("Notes");
  });

  it("should display image preview", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toContain("imageUri");
    expect(inputDetailsContent).toContain("Image");
    expect(inputDetailsContent).toContain("imageContainer");
  });

  it("should have continue button to processing", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toContain("handleContinue");
    expect(inputDetailsContent).toContain("/processing");
    expect(inputDetailsContent).toContain("Analyze Recipe");
  });

  it("should have back/retake functionality", () => {
    const inputDetailsContent = fs.readFileSync("./app/input-details.tsx", "utf-8");
    expect(inputDetailsContent).toContain("handleBack");
    expect(inputDetailsContent).toContain("Retake");
  });
});

describe("Phase 2: Core Flow - Processing Screen", () => {
  it("should have processing screen file", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toBeDefined();
    expect(processingContent.length).toBeGreaterThan(0);
  });

  it("should have processing steps defined", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toContain("PROCESSING_STEPS");
    expect(processingContent).toContain("Analyzing image");
    expect(processingContent).toContain("Identifying ingredients");
    expect(processingContent).toContain("Extracting recipe steps");
  });

  it("should have loading animations", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toContain("react-native-reanimated");
    expect(processingContent).toContain("useSharedValue");
    expect(processingContent).toContain("useAnimatedStyle");
    expect(processingContent).toContain("withRepeat");
  });

  it("should have progress bar", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toContain("progressWidth");
    expect(processingContent).toContain("progressTrack");
    expect(processingContent).toContain("progressFill");
  });

  it("should display current step", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toContain("currentStep");
    expect(processingContent).toContain("setCurrentStep");
    expect(processingContent).toContain("Step");
  });

  it("should receive params from input-details", () => {
    const processingContent = fs.readFileSync("./app/processing.tsx", "utf-8");
    expect(processingContent).toContain("useLocalSearchParams");
    expect(processingContent).toContain("imageUri");
    expect(processingContent).toContain("dishName");
    expect(processingContent).toContain("userNotes");
  });
});

describe("Phase 2: Navigation Flow", () => {
  it("should have input-details screen registered in root layout", () => {
    const layoutContent = fs.readFileSync("./app/_layout.tsx", "utf-8");
    expect(layoutContent).toContain('name="input-details"');
  });

  it("should have processing screen registered in root layout", () => {
    const layoutContent = fs.readFileSync("./app/_layout.tsx", "utf-8");
    expect(layoutContent).toContain('name="processing"');
  });

  it("should have processing screen as fullScreenModal", () => {
    const layoutContent = fs.readFileSync("./app/_layout.tsx", "utf-8");
    expect(layoutContent).toContain('name="processing"');
    expect(layoutContent).toContain("fullScreenModal");
    expect(layoutContent).toContain("gestureEnabled: false");
  });
});

describe("Phase 2: UI Components", () => {
  it("should have PrimaryButton with style prop", () => {
    const buttonContent = fs.readFileSync("./components/ui/primary-button.tsx", "utf-8");
    expect(buttonContent).toContain("style?: ViewStyle");
  });

  it("should have SecondaryButton with style prop", () => {
    const buttonContent = fs.readFileSync("./components/ui/secondary-button.tsx", "utf-8");
    expect(buttonContent).toContain("style?: ViewStyle");
  });
});
