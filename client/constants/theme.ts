import { Platform } from "react-native";

// Step Ritual - 80s Vibe Color Palette
const neonCyan = "#00E5FF";
const accentMagenta = "#FF2FB3";
const primaryPink = "#FF4D6D";
const secondaryPurple = "#B88BFF";
const textSecondaryPurple = "#3B2F8A";

// Light theme base colors
const lightBackground = "#FFF3D6";
const lightSurface = "#FFFBF0";
const lightSurfaceSecondary = "#FFF8E7";
const darkText = "#1A1458";

export const Colors = {
  light: {
    text: darkText,
    textSecondary: textSecondaryPurple,
    buttonText: "#FFFFFF",
    tabIconDefault: textSecondaryPurple,
    tabIconSelected: secondaryPurple,
    link: neonCyan,
    primary: primaryPink,
    secondary: secondaryPurple,
    accent: neonCyan,
    accentCyan: neonCyan,
    accentMagenta: accentMagenta,
    success: "#00C853",
    error: "#FF4757",
    warning: "#FFB300",
    backgroundRoot: lightBackground,
    backgroundDefault: lightSurface,
    backgroundSecondary: lightSurfaceSecondary,
    backgroundTertiary: "#FFF0D6",
    neonGlow: primaryPink,
    cardBorder: "rgba(184, 139, 255, 0.3)",
    cardBackground: "rgba(255, 255, 255, 0.9)",
    overlay: "rgba(26, 20, 88, 0.8)",
    overlayLight: "rgba(26, 20, 88, 0.6)",
  },
  dark: {
    text: darkText,
    textSecondary: textSecondaryPurple,
    buttonText: "#FFFFFF",
    tabIconDefault: textSecondaryPurple,
    tabIconSelected: secondaryPurple,
    link: neonCyan,
    primary: primaryPink,
    secondary: secondaryPurple,
    accent: neonCyan,
    accentCyan: neonCyan,
    accentMagenta: accentMagenta,
    success: "#00C853",
    error: "#FF4757",
    warning: "#FFB300",
    backgroundRoot: lightBackground,
    backgroundDefault: lightSurface,
    backgroundSecondary: lightSurfaceSecondary,
    backgroundTertiary: "#FFF0D6",
    neonGlow: primaryPink,
    cardBorder: "rgba(184, 139, 255, 0.3)",
    cardBackground: "rgba(255, 255, 255, 0.9)",
    overlay: "rgba(26, 20, 88, 0.8)",
    overlayLight: "rgba(26, 20, 88, 0.6)",
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 52,
  buttonHeight: 56,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  "2xl": 40,
  "3xl": 50,
  full: 9999,
};

export const Typography = {
  h1: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: "700" as const,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400" as const,
  },
  stat: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const Shadows = {
  neonGlow: {
    shadowColor: primaryPink,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  neonGlowPurple: {
    shadowColor: secondaryPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  neonGlowCyan: {
    shadowColor: neonCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  card: {
    shadowColor: "#1A1458",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardElevated: {
    shadowColor: "#1A1458",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};
