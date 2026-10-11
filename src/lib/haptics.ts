// Small vibration "clicks" for important taps. They never throw: if a phone
// has no haptics (or they're turned off), nothing happens.

import * as Haptics from 'expo-haptics';

function safely(run: () => Promise<void>) {
  run().catch(() => {});
}

// A light tap, e.g. sending a chat message.
export function tapHaptic() {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

// Something worked: trip posted, request sent, rider approved, marked paid.
export function successHaptic() {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

// Something failed.
export function errorHaptic() {
  safely(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

// A tiny tick, e.g. each stop of a slider.
export function selectionHaptic() {
  safely(() => Haptics.selectionAsync());
}
