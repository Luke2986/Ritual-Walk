import { Colors } from "@/constants/theme";

// Step Ritual always uses dark theme for the neon aesthetic
export function useTheme() {
  const theme = Colors.dark;
  const isDark = true;

  return {
    theme,
    isDark,
  };
}
