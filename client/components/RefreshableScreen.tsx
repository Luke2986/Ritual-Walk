import React, { useState, useCallback, ReactNode } from "react";
import { ScrollView, RefreshControl, StyleSheet, ViewStyle, Alert, Platform } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface RefreshableScreenProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
}

export function RefreshableScreen({
  onRefresh,
  children,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
}: RefreshableScreenProps) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      const message = "Sei offline: dati non aggiornati";
      if (Platform.OS === "web") {
        console.warn(message);
      } else {
        Alert.alert("Errore", message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh, refreshing]);

  return (
    <ScrollView
      style={style}
      contentContainerStyle={[styles.container, contentContainerStyle]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.primary}
          colors={[theme.primary]}
        />
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
});

export function useRefreshState() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async (refreshFn: () => Promise<void>) => {
    if (refreshing) return;
    
    setRefreshing(true);
    try {
      await refreshFn();
    } catch (error) {
      const message = "Sei offline: dati non aggiornati";
      if (Platform.OS === "web") {
        console.warn(message);
      } else {
        Alert.alert("Errore", message);
      }
    } finally {
      setRefreshing(false);
    }
  }, [refreshing]);

  return { refreshing, handleRefresh, setRefreshing };
}
