import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AccountScreen from "@/screens/AccountScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import ReminderSettingsScreen from "@/screens/ReminderSettingsScreen";
import WeeklySummarySettingsScreen from "@/screens/WeeklySummarySettingsScreen";
import QuietHoursSettingsScreen from "@/screens/QuietHoursSettingsScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type AccountStackParamList = {
  Account: undefined;
  Notifications: undefined;
  ReminderSettings: undefined;
  WeeklySummarySettings: undefined;
  QuietHoursSettings: undefined;
};

const Stack = createNativeStackNavigator<AccountStackParamList>();

export default function AccountStackNavigator() {
  const screenOptions = useScreenOptions();

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Account" />,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Notifiche" />,
        }}
      />
      <Stack.Screen
        name="ReminderSettings"
        component={ReminderSettingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Promemoria" />,
        }}
      />
      <Stack.Screen
        name="WeeklySummarySettings"
        component={WeeklySummarySettingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Riepilogo" />,
        }}
      />
      <Stack.Screen
        name="QuietHoursSettings"
        component={QuietHoursSettingsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="Ore silenziose" />,
        }}
      />
    </Stack.Navigator>
  );
}
