// One trip in the search results. Tapping it opens the trip detail screen.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { Avatar } from '@/components/avatar';
import { FadeSwap, PressableScale } from '@/components/motion';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { firstName, formatDeparture, formatMoney, formatTime } from '@/lib/format';
import { terminalArrival } from '@/lib/airport';
import { payingRiders } from '@/lib/booking';
import { tripPriceSummary } from '@/lib/pricing';
import { Reliability, reliabilitySummary } from '@/lib/reliability';
import type { TripWithDriver } from '@/lib/types';

export function TripCard({ trip, reliability }: { trip: TripWithDriver; reliability?: Reliability }) {
  const colors = useTheme();
  const ridersBooked = payingRiders(trip);
  const { ifYouJoin, ifFull } = tripPriceSummary({
    miles: trip.route_miles,
    mpg: trip.mpg,
    gasPrice: trip.gas_price,
    seatsOffered: trip.seats_offered,
    ridersBooked,
  });
  const seatsLeft = trip.seats_offered - trip.seats_booked;
  const trust = reliabilitySummary(reliability);
  const trustColor = { good: colors.success, waiting: colors.primary, bad: colors.danger, neutral: colors.textSecondary }[trust.tone];
  const arrival =
    trip.is_airport && trip.route_minutes
      ? terminalArrival({ departure: new Date(trip.departure_at), driveMinutes: trip.route_minutes, shuttleMinutes: trip.shuttle_minutes })
      : null;
  const driverName = firstName(trip.driver.full_name);

  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => router.push(`/trip/${trip.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${driverName}'s trip to ${trip.dest_name}, ${formatDeparture(new Date(trip.departure_at))}, ${formatMoney(ifYouJoin.perSeat)} per seat if you join now`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.top}>
        <Avatar uri={trip.driver.avatar_url} name={trip.driver.full_name} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.route, { color: colors.text }]} numberOfLines={2}>
            {trip.origin_name} → {trip.dest_name}
          </Text>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            {driverName} · <Text style={{ color: trustColor, fontWeight: '600' }}>{trust.label}</Text>
          </Text>
        </View>
        <View style={styles.priceBox}>
          <FadeSwap value={ifYouJoin.perSeat}>
            <Text style={[styles.price, { color: colors.text }]}>{formatMoney(ifYouJoin.perSeat)}</Text>
          </FadeSwap>
          <Text style={[styles.meta, { color: colors.textSecondary }]}>per seat</Text>
          {ifFull.perSeat < ifYouJoin.perSeat && (
            <Text style={[styles.meta, { color: colors.success, fontWeight: '600' }]}>as low as {formatMoney(ifFull.perSeat)}</Text>
          )}
        </View>
      </View>

      <View style={styles.details}>
        <Detail icon="time-outline" text={formatDeparture(new Date(trip.departure_at))} />
        {arrival && <Detail icon="airplane-outline" text={`At terminal ~${formatTime(arrival)}`} />}
        {trip.parking === 'offsite' && <Detail icon="bus-outline" text="Park + shuttle to terminal" />}
        <Detail icon="people-outline" text={`${seatsLeft} ${seatsLeft === 1 ? 'seat' : 'seats'} left`} />
        <Detail icon="location-outline" text={`Pickup: ${trip.pickup_spot}`} />
      </View>
    </PressableScale>
  );
}

function Detail({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const colors = useTheme();
  return (
    <View style={styles.detail}>
      <Ionicons name={icon} size={16} color={colors.textSecondary} />
      <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  route: {
    fontSize: 16,
    fontWeight: '700',
  },
  meta: {
    fontSize: 14,
  },
  priceBox: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
  },
  details: {
    gap: Spacing.xs,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
});
