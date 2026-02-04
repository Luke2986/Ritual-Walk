import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PremiScreen from "@/screens/PremiScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type PremiStackParamList = {
  Premi: undefined;
};

const Stack = createNativeStackNavigator<PremiStackParamList>();

export default function PremiStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Premi"
        component={PremiScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Premi" />,
        }}
      />
    </Stack.Navigator>
  );
}
