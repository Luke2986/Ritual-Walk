import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthStackNavigator from "@/navigation/AuthStackNavigator";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { isAuthenticated, isLoading } = useAuth();
  const screenOptions = useScreenOptions();

  if (isLoading) {
    return <LoadingScreen message="Caricamento..." />;
  }

  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainTabNavigator} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStackNavigator} />
      )}
    </Stack.Navigator>
  );
}
