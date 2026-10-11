import React, { useEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import TrackStackNavigator from "@/navigation/TrackStackNavigator";
import HistoryStackNavigator from "@/navigation/HistoryStackNavigator";
import PremiStackNavigator from "@/navigation/PremiStackNavigator";
import AccountStackNavigator from "@/navigation/AccountStackNavigator";
import CustomTabBar from "@/components/CustomTabBar";
import { useNotificationSync } from "@/hooks/useNotificationSync";
import { usePendingInviteCode } from "@/lib/inviteLink";

export type MainTabParamList = {
  DashboardTab: undefined;
  PremiTab: undefined;
  TrackTab: undefined;
  HistoryTab: undefined;
  AccountTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  useNotificationSync();

  // An invite link opens the account screen, where the code gets filled in.
  const navigation = useNavigation<any>();
  const pendingInvite = usePendingInviteCode();
  useEffect(() => {
    if (pendingInvite) {
      navigation.navigate("Main", {
        screen: "AccountTab",
        params: { screen: "Account" },
      });
    }
  }, [pendingInvite, navigation]);

  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="DashboardTab" component={DashboardStackNavigator} />
      <Tab.Screen name="PremiTab" component={PremiStackNavigator} />
      <Tab.Screen
        name="TrackTab"
        component={TrackStackNavigator}
        options={{ lazy: false }}
      />
      <Tab.Screen name="HistoryTab" component={HistoryStackNavigator} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} />
    </Tab.Navigator>
  );
}
