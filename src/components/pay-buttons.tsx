// "Pay with Venmo / Cash App / PayPal" buttons. Each opens the app (or website)
// with the amount and a note filled in. Nothing is charged inside Hitch Illini.

import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, StyleSheet, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { Body, Text } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { cashAppLink, PaymentMethods, payPalLink, venmoPayLink, venmoWebLink } from '@/lib/payments';

type Props = { handles: PaymentMethods | null; amount: number; note: string; driverName: string };

export function PayButtons({ handles, amount, note, driverName }: Props) {
  if (!handles || (!handles.venmo_username && !handles.cashapp_cashtag && !handles.paypal_username)) {
    return <Body muted>{driverName} hasn&apos;t added Venmo, Cash App or PayPal yet. Ask in the group chat how they&apos;d like to be paid.</Body>;
  }

  async function openVenmo(username: string) {
    // Open the Venmo app; if it isn't installed, open Venmo's website instead.
    try {
      await Linking.openURL(venmoPayLink(username, amount, note));
    } catch {
      await Linking.openURL(venmoWebLink(username, amount, note));
    }
  }

  return (
    <View style={styles.buttons}>
      {handles.venmo_username && (
        <PayButton label="Pay with Venmo" icon="wallet-outline" onPress={() => openVenmo(handles.venmo_username!)} />
      )}
      {handles.cashapp_cashtag && (
        <PayButton label="Pay with Cash App" icon="cash-outline" onPress={() => Linking.openURL(cashAppLink(handles.cashapp_cashtag!, amount))} />
      )}
      {handles.paypal_username && (
        <PayButton label="Pay with PayPal" icon="logo-paypal" onPress={() => Linking.openURL(payPalLink(handles.paypal_username!, amount))} />
      )}
    </View>
  );
}

function PayButton({ label, icon, onPress }: { label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  const colors = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: colors.primary }]}>
      <Ionicons name={icon} size={20} color={colors.onPrimary} />
      <Text style={[styles.label, { color: colors.onPrimary }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  buttons: {
    gap: Spacing.sm,
  },
  button: {
    minHeight: TapTarget,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
