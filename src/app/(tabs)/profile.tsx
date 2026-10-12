// Your profile, as a menu: who you are at the top, then rows that open each
// section on its own page (vibes, car, payment, reviews, reliability).

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { MenuGroup, MenuRow } from '@/components/menu';
import { PressableScale } from '@/components/motion';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { Badge, Body, Heading, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { tapHaptic } from '@/lib/haptics';
import { Reliability, reliabilitySummary } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import { formatRating, RatingSummary } from '@/lib/reviews';
import { fetchRatingSummary } from '@/lib/reviews-api';
import { VIBES, vibeLabel, vibesFrom } from '@/lib/vibes';
import { useAuth } from '@/providers/auth-provider';

export default function ProfileScreen() {
  const colors = useTheme();
  const { session, profile, car, payment } = useAuth();
  const [reliability, setReliability] = useState<Reliability | undefined>(undefined);
  const [rating, setRating] = useState<RatingSummary | undefined>(undefined);
  const userId = session?.user.id;

  // Your rating and "Shows up X of Y trips", refreshed whenever you open this tab.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      fetchReliability([userId]).then((result) => setReliability(result[userId]));
      fetchRatingSummary([userId]).then((result) => setRating(result[userId]));
    }, [userId]),
  );

  if (!profile) return null;

  const details = [profile.year, profile.major].filter(Boolean).join(' · ');
  const chat = VIBES[0];
  const handles = payment
    ? [payment.venmo_username && 'Venmo', payment.cashapp_cashtag && 'Cash App', payment.paypal_username && 'PayPal'].filter(Boolean).join(', ')
    : '';

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Avatar uri={profile.avatar_url} name={profile.full_name} size={88} />
        <Heading style={{ fontSize: 22 }}>{profile.full_name}</Heading>
        {profile.nickname ? <Body style={{ fontWeight: '600' }}>Goes by {profile.nickname}</Body> : null}
        {details ? <Body muted>{details}</Body> : null}
        {profile.bio ? (
          <Text style={{ color: colors.textSecondary, fontSize: 15, textAlign: 'center' }} numberOfLines={3}>
            {profile.bio}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {formatRating(rating) && <Badge label={formatRating(rating)!} tone="waiting" />}
          <ReliabilityBadge stats={reliability} />
        </View>
      </View>

      <MenuGroup>
        <MenuRow title="Vibe check" value={vibeLabel(chat, vibesFrom(profile)[chat.key])} onPress={() => router.push('/me/vibes')} />
        <MenuRow
          title="My car"
          value={car ? [car.model_year, car.make, car.model].filter(Boolean).join(' ') : 'Add a car'}
          onPress={() => router.push('/me/car')}
        />
        <MenuRow title="Payment" value={handles || 'Not set up'} onPress={() => router.push('/me/payment')} />
        <MenuRow title="Reviews" value={formatRating(rating) ?? 'None yet'} onPress={() => router.push('/me/reviews')} />
        <MenuRow title="Reliability" value={reliabilitySummary(reliability).label} onPress={() => router.push('/me/reliability')} />
      </MenuGroup>

      <MenuGroup>
        <MenuRow title="Edit profile" onPress={() => router.push('/edit-profile')} />
        <MenuRow title="Blocked people" onPress={() => router.push('/blocked')} />
      </MenuGroup>

      <PressableScale
        onPress={() => {
          tapHaptic();
          router.push('/sign-out');
        }}
        accessibilityRole="button"
        style={styles.signOut}>
        <Text style={{ color: colors.danger, fontSize: 16, fontWeight: '600' }}>Sign out</Text>
      </PressableScale>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  signOut: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    minHeight: 44,
    justifyContent: 'center',
  },
});
