import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import TrackWalkScreen from "@/screens/TrackWalkScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type TrackStackParamList = {
  TrackWalk: undefined;
};

const Stack = createNativeStackNavigator<TrackStackParamList>();

export default function TrackStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="TrackWalk"
        component={TrackWalkScreen}
        options={{
          headerTitle: "Nuova Camminata",
        }}
      />
    </Stack.Navigator>
  );
}
