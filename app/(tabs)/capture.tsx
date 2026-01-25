import { useState, useRef, useEffect } from "react";
import { Text, View, TouchableOpacity, Platform, StyleSheet } from "react-native";
import { CameraView, CameraType, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PrimaryButton } from "@/components/ui";

export default function CaptureScreen() {
  const router = useRouter();
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  
  // Animation values
  const shutterScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const scanLineY = useSharedValue(0);

  // Scanning animation
  useEffect(() => {
    scanLineY.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000 }),
        withTiming(0, { duration: 2000 })
      ),
      -1,
      false
    );
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanLineY.value * 300 }],
  }));

  const shutterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shutterScale.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // Handle camera permission
  if (!permission) {
    return (
      <ScreenContainer className="items-center justify-center">
        <Text style={{ fontFamily: "Inter" }} className="text-muted">
          Loading camera...
        </Text>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer className="items-center justify-center p-6">
        <View className="items-center gap-6">
          <View 
            className="w-24 h-24 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(201, 169, 98, 0.2)" }}
          >
            <IconSymbol name="camera.fill" size={48} color="#C9A962" />
          </View>
          <View className="items-center gap-2">
            <Text style={{ fontFamily: "PlayfairDisplay-Bold" }} className="text-2xl text-foreground text-center">
              Camera Access
            </Text>
            <Text style={{ fontFamily: "Inter" }} className="text-base text-muted text-center">
              We need camera access to capture your dishes and recipes
            </Text>
          </View>
          <PrimaryButton 
            title="Grant Permission" 
            onPress={requestPermission}
            fullWidth
          />
        </View>
      </ScreenContainer>
    );
  }

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    
    setIsCapturing(true);
    
    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    // Shutter animation
    shutterScale.value = withSpring(0.9, { damping: 15 }, () => {
      shutterScale.value = withSpring(1);
    });
    
    // Flash animation
    flashOpacity.value = withSequence(
      withTiming(0.8, { duration: 50 }),
      withTiming(0, { duration: 200 })
    );

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      if (photo?.uri) {
        // Navigate to input details with the captured image
        router.push({
          pathname: "/input-details",
          params: { imageUri: photo.uri, source: "camera" }
        });
      }
    } catch (error) {
      console.error("Failed to capture photo:", error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handlePickImage = async () => {
    // Haptic feedback
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      router.push({
        pathname: "/input-details",
        params: { imageUri: result.assets[0].uri, source: "gallery" }
      });
    }
  };

  const toggleCameraFacing = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setFacing(current => (current === "back" ? "front" : "back"));
  };

  return (
    <View style={styles.container}>
      {/* Camera View */}
      <CameraView 
        ref={cameraRef}
        style={styles.camera} 
        facing={facing}
      >
        {/* Flash overlay */}
        <Animated.View style={[styles.flashOverlay, flashStyle]} pointerEvents="none" />
        
        {/* Scanning overlay */}
        <View style={styles.scanOverlay}>
          {/* Corner brackets */}
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
          
          {/* Scanning line */}
          <Animated.View style={[styles.scanLine, scanLineStyle]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerText, { fontFamily: "PlayfairDisplay-Bold" }]}>
            Capture Recipe
          </Text>
          <Text style={[styles.headerSubtext, { fontFamily: "Inter" }]}>
            Point at a dish or recipe card
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {/* Gallery Button */}
          <TouchableOpacity 
            style={styles.sideButton}
            onPress={handlePickImage}
            activeOpacity={0.7}
          >
            <IconSymbol name="photo.fill" size={28} color="#FFFFFF" />
          </TouchableOpacity>

          {/* Capture Button */}
          <Animated.View style={shutterStyle}>
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleCapture}
              disabled={isCapturing}
              activeOpacity={0.8}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </Animated.View>

          {/* Flip Camera Button */}
          <TouchableOpacity 
            style={styles.sideButton}
            onPress={toggleCameraFacing}
            activeOpacity={0.7}
          >
            <IconSymbol name="camera.fill" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
  },
  scanOverlay: {
    position: "absolute",
    top: "20%",
    left: "10%",
    right: "10%",
    height: 300,
    justifyContent: "center",
    alignItems: "center",
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#C9A962",
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: "#C9A962",
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: "#C9A962",
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: "#C9A962",
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 2,
    backgroundColor: "#C9A962",
    opacity: 0.8,
    shadowColor: "#C9A962",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  header: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  headerText: {
    fontSize: 24,
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  headerSubtext: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: 4,
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  controls: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 40,
    paddingHorizontal: 40,
  },
  sideButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
});
