import { useWindowDimensions } from "react-native";

// Mobile-only app: wider screens (tablets, desktop browsers) get a phone-width column.
export const MAX_APP_WIDTH = 480;

export function useAppWidth() {
  return Math.min(useWindowDimensions().width, MAX_APP_WIDTH);
}
