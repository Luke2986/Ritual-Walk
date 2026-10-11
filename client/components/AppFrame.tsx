import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { MAX_APP_WIDTH } from "@/hooks/useAppWidth";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const framed = useWindowDimensions().width > MAX_APP_WIDTH;

  return (
    <View style={styles.backdrop}>
      <View style={[styles.column, framed && styles.framed]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "#0D0221",
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: MAX_APP_WIDTH,
    overflow: "hidden",
  },
  framed: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
});
