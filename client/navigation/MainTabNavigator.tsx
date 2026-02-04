import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import DashboardStackNavigator from "@/navigation/DashboardStackNavigator";
import TrackStackNavigator from "@/navigation/TrackStackNavigator";
import HistoryStackNavigator from "@/navigation/HistoryStackNavigator";
import PremiStackNavigator from "@/navigation/PremiStackNavigator";
import AccountStackNavigator from "@/navigation/AccountStackNavigator";
import CustomTabBar from "@/components/CustomTabBar";

export type MainTabParamList = {
  DashboardTab: undefined;
  PremiTab: undefined;
  TrackTab: undefined;
  HistoryTab: undefined;
  AccountTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
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
      <Tab.Screen name="TrackTab" component={TrackStackNavigator} />
      <Tab.Screen name="HistoryTab" component={HistoryStackNavigator} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} />
    </Tab.Navigator>
  );
}
