import React from "react";
import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";

interface BadgeIconProps {
  icon: string;
  earned: boolean;
  // 0..1, drawn as a fill rising from the bottom of a locked badge.
  progress?: number;
  size?: number;
}

export function BadgeIcon({
  icon,
  earned,
  progress = 0,
  size = 72,
}: BadgeIconProps) {
  const shape = { width: size, height: size, borderRadius: size / 2 };
  const iconSize = Math.round(size * 0.39);

  if (earned) {
    return (
      <LinearGradient
        colors={["#FF4D6D", "#FF2FB3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.earned, shape]}
      >
        <Feather name={icon as any} size={iconSize} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <View style={[styles.locked, shape]}>
      <View
        style={[
          styles.progress,
          { height: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
        ]}
      />
      <Feather
        name={icon as any}
        size={iconSize}
        color="rgba(59, 47, 138, 0.4)"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  earned: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  locked: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(59, 47, 138, 0.1)",
    borderWidth: 2,
    borderColor: "rgba(59, 47, 138, 0.2)",
    overflow: "hidden",
  },
  progress: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(184, 139, 255, 0.3)",
  },
});
