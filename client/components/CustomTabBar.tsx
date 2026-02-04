import React from "react";
import { View, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import FootprintsIcon from "@/components/FootprintsIcon";

const TAB_BAR_HEIGHT = 60;
const FAB_SIZE = 56;
const NOTCH_DEPTH = 30;
const NOTCH_WIDTH = 70;

function createNotchPath(width: number): string {
  const mid = width / 2;
  const curveWidth = 35;
  
  return `
    M 0 ${NOTCH_DEPTH}
    L ${mid - NOTCH_WIDTH} ${NOTCH_DEPTH}
    Q ${mid - curveWidth} ${NOTCH_DEPTH} ${mid - curveWidth + 10} ${NOTCH_DEPTH + 20}
    Q ${mid} ${NOTCH_DEPTH + 35} ${mid + curveWidth - 10} ${NOTCH_DEPTH + 20}
    Q ${mid + curveWidth} ${NOTCH_DEPTH} ${mid + NOTCH_WIDTH} ${NOTCH_DEPTH}
    L ${width} ${NOTCH_DEPTH}
    L ${width} ${NOTCH_DEPTH + TAB_BAR_HEIGHT + 50}
    L 0 ${NOTCH_DEPTH + TAB_BAR_HEIGHT + 50}
    Z
  `;
}

const TAB_CONFIG: { [key: string]: { icon: keyof typeof Feather.glyphMap; label: string } } = {
  DashboardTab: { icon: "home", label: "Home" },
  PremiTab: { icon: "award", label: "Premi" },
  TrackTab: { icon: "navigation", label: "" },
  HistoryTab: { icon: "clock", label: "Storia" },
  AccountTab: { icon: "user", label: "Account" },
};

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bottomPadding = Math.max(insets.bottom, 10);

  const handlePress = (routeName: string, routeKey: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const event = navigation.emit({
      type: "tabPress",
      target: routeKey,
      canPreventDefault: true,
    });

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const leftTabs = state.routes.filter((r) => r.name === "DashboardTab" || r.name === "PremiTab");
  const rightTabs = state.routes.filter((r) => r.name === "HistoryTab" || r.name === "AccountTab");
  const centerTab = state.routes.find((r) => r.name === "TrackTab");

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }]}>
      {/* SVG Background */}
      <Svg
        width={screenWidth}
        height={TAB_BAR_HEIGHT + NOTCH_DEPTH + 50}
        style={styles.svgBackground}
      >
        <Path d={createNotchPath(screenWidth)} fill="#FDF5E6" />
      </Svg>

      {/* Tab Buttons Row */}
      <View style={styles.tabRow}>
        {/* Left Tabs */}
        <View style={styles.tabGroup}>
          {leftTabs.map((route) => {
            const isFocused = state.routes[state.index].name === route.name;
            const config = TAB_CONFIG[route.name];
            return (
              <Pressable
                key={route.key}
                onPress={() => handlePress(route.name, route.key, isFocused)}
                style={styles.tabItem}
              >
                <Feather
                  name={config.icon}
                  size={24}
                  color={isFocused ? "#B88BFF" : "#3B2F8A"}
                />
                <ThemedText
                  style={[styles.tabLabel, { color: isFocused ? "#B88BFF" : "#3B2F8A" }]}
                >
                  {config.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        {/* Center Space for FAB */}
        <View style={styles.centerSpace} />

        {/* Right Tabs */}
        <View style={styles.tabGroup}>
          {rightTabs.map((route) => {
            const isFocused = state.routes[state.index].name === route.name;
            const config = TAB_CONFIG[route.name];
            return (
              <Pressable
                key={route.key}
                onPress={() => handlePress(route.name, route.key, isFocused)}
                style={styles.tabItem}
              >
                <Feather
                  name={config.icon}
                  size={24}
                  color={isFocused ? "#B88BFF" : "#3B2F8A"}
                />
                <ThemedText
                  style={[styles.tabLabel, { color: isFocused ? "#B88BFF" : "#3B2F8A" }]}
                >
                  {config.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* FAB Button - Centered above notch */}
      {centerTab ? (
        <Pressable
          style={[styles.fabWrapper, { left: screenWidth / 2 - FAB_SIZE / 2 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const isFocused = state.routes[state.index].name === "TrackTab";
            handlePress("TrackTab", centerTab.key, isFocused);
          }}
        >
          <LinearGradient
            colors={["#FF4D6D", "#E84574"]}
            style={styles.fab}
          >
            <FootprintsIcon size={26} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
  },
  svgBackground: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
  tabRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 10,
  },
  tabGroup: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
  },
  centerSpace: {
    width: FAB_SIZE + 30,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
  fabWrapper: {
    position: "absolute",
    top: 0,
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    shadowColor: "#FF4D6D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export const CUSTOM_TAB_BAR_HEIGHT = TAB_BAR_HEIGHT + NOTCH_DEPTH;
