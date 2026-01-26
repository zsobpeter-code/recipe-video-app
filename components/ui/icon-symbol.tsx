// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  // Navigation
  "house.fill": "home",
  "camera.fill": "camera-alt",
  "person.fill": "person",
  "book.fill": "menu-book",
  
  // Actions
  "paperplane.fill": "send",
  "square.and.arrow.up": "share",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "xmark": "close",
  "heart.fill": "favorite",
  "heart": "favorite-border",
  "plus": "add",
  "photo.fill": "photo-library",
  "bolt.fill": "flash-on",
  
  // Recipe related
  "clock.fill": "schedule",
  "person.2.fill": "people",
  "flame.fill": "local-fire-department",
  "checkmark": "check",
  "play.fill": "play-arrow",
  "pause.fill": "pause",
  
  // Recipe card icons
  "list.bullet": "format-list-bulleted",
  "list.number": "format-list-numbered",
  "chevron.up": "keyboard-arrow-up",
  "chevron.down": "keyboard-arrow-down",
  "bookmark.fill": "bookmark",
  "video.fill": "videocam",
  "star.fill": "star",
  "magnifyingglass": "search",
  "trash.fill": "delete",
  "ellipsis": "more-horiz",
  
  // Profile & Settings
  "gearshape.fill": "settings",
  "bell.fill": "notifications",
  "paintbrush.fill": "palette",
  "questionmark.circle.fill": "help",
  "doc.text.fill": "description",
  "lock.fill": "lock",
  "rectangle.portrait.and.arrow.right": "logout",
  "crown.fill": "workspace-premium",
  "checkmark.circle.fill": "check-circle",
  "arrow.clockwise": "refresh",
  
  // Video player
  "backward.fill": "skip-previous",
  "forward.fill": "skip-next",
  "arrow.left": "arrow-back",
  "arrow.right": "arrow-forward",
  
  // Cook mode
  "frying.pan.fill": "restaurant",
  "timer": "timer",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
