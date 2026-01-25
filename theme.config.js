/** @type {const} */
const themeColors = {
  // Primary accent (Muted Gold / Warm Beige)
  primary: { light: '#C9A962', dark: '#C9A962' },
  primaryLight: { light: '#E8DCC4', dark: '#E8DCC4' },
  primaryDark: { light: '#8B7355', dark: '#8B7355' },
  
  // Backgrounds (Dark Charcoal) - same for light/dark as app is always dark
  background: { light: '#1A1A1A', dark: '#1A1A1A' },
  surface: { light: '#2D2D2D', dark: '#2D2D2D' },
  surfaceSecondary: { light: '#3D3D3D', dark: '#3D3D3D' },
  
  // Text colors
  foreground: { light: '#FFFFFF', dark: '#FFFFFF' },
  muted: { light: '#B3B3B3', dark: '#B3B3B3' },
  subtle: { light: '#808080', dark: '#808080' },
  
  // Borders
  border: { light: 'rgba(255, 255, 255, 0.1)', dark: 'rgba(255, 255, 255, 0.1)' },
  
  // Status colors (muted tones)
  success: { light: '#4A7C59', dark: '#4A7C59' },
  warning: { light: '#C9A962', dark: '#C9A962' },
  error: { light: '#8B4049', dark: '#8B4049' },
};

module.exports = { themeColors };
