import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import HistoryScreen from "@/screens/HistoryScreen";
import WalkDetailScreen from "@/screens/WalkDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type HistoryStackParamList = {
  History: { focus?: "stats"; range?: "week" | "month" | "year" } | undefined;
  WalkDetail: { walkId: string };
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export default function HistoryStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerTitle: "Storico",
        }}
      />
      <Stack.Screen
        name="WalkDetail"
        component={WalkDetailScreen}
        options={{
          headerTitle: "Dettagli Camminata",
        }}
      />
    </Stack.Navigator>
  );
}
