import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Pressable } from "react-native";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface WalkCardProps {
  distance: number;
  duration: number;
  date: string;
  userNickname: string;
  onPress?: () => void;
  style?: ViewStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function WalkCard({
  distance,
  duration,
  date,
  userNickname,
  onPress,
  style,
}: WalkCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98);
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={onPress ? handlePressIn : undefined}
      onPressOut={onPress ? handlePressOut : undefined}
      style={[styles.container, style, animatedStyle]}
    >
      <LinearGradient
        colors={[`${theme.primary}15`, theme.backgroundDefault]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${theme.primary}30` }]}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Feather name="user" size={16} color={theme.buttonText} />
            </View>
            <ThemedText type="body" style={styles.nickname}>
              {userNickname}
            </ThemedText>
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {formatDate(date)}
          </ThemedText>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Feather name="map-pin" size={18} color={theme.secondary} />
            <ThemedText style={styles.statValue}>
              {distance.toFixed(2)} km
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Feather name="clock" size={18} color={theme.accent} />
            <ThemedText style={styles.statValue}>
              {formatDuration(duration)}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <Feather name="trending-up" size={18} color={Colors.dark.success} />
            <ThemedText style={styles.statValue}>
              {duration > 0 ? ((distance / duration) * 3600).toFixed(1) : 0} km/h
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  nickname: {
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  statValue: {
    fontWeight: "600",
  },
});
