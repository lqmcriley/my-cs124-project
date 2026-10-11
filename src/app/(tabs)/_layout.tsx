// The bottom tab bar. NativeTabs uses the phone's real tab bar, so on iOS 26+
// it gets Apple's Liquid Glass look automatically (and Material on Android).
// Icons: SF Symbols on iPhone (`sf`), Material icons on Android (`md`).

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { FontFamily } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const colors = useTheme();
  return (
    <NativeTabs tintColor={colors.primary} minimizeBehavior="onScrollDown" labelStyle={{ fontFamily: FontFamily }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Find a ride</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="post">
        <NativeTabs.Trigger.Label>Post a trip</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'plus.circle', selected: 'plus.circle.fill' }} md="add_circle" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="my-trips">
        <NativeTabs.Trigger.Label>My trips</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'car', selected: 'car.fill' }} md="directions_car" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
