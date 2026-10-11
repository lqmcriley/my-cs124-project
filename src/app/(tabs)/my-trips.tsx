// Screen 8: My trips. Upcoming and past, as driver and as rider, plus
// requests waiting for your answer. Tap any trip to open it.

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Badge, Body, Card, Chip, ErrorText, Heading, Label, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REQUEST_STATUS_TEXT, splitMyTrips } from '@/lib/booking';
import { fetchMyTrips, MyTrips } from '@/lib/booking-api';
import { firstName, formatDeparture } from '@/lib/format';
import type { RequestStatus, TripWithDriver } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function MyTripsScreen() {
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [data, setData] = useState<MyTrips | null>(null);
  const [error, setError] = useState('');
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    () =>
      fetchMyTrips(userId)
        .then((result) => {
          setData(result);
          setError('');
        })
        .catch((err: Error) => setError(err.message)),
    [userId],
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const groups = data ? splitMyTrips(data) : null;
  const shown = groups ? groups[view] : null;
  const nothing = shown && shown.driving.length === 0 && shown.riding.length === 0;

  return (
    <Screen edges={['top']} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <Heading>My trips</Heading>

      {groups && groups.needsAnswer.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Needs your answer</Label>
          {groups.needsAnswer.map((trip) => (
            <Pressable
              key={trip.id}
              onPress={() => router.push(`/trip/${trip.id}`)}
              accessibilityRole="button"
              style={[styles.alert, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <Ionicons name="person-add-outline" size={22} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {trip.pendingCount} {trip.pendingCount === 1 ? 'person wants' : 'people want'} to join
                </Text>
                <Body muted>
                  {trip.dest_name} · {formatDeparture(new Date(trip.departure_at))}
                </Body>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </Pressable>
          ))}
        </View>
      )}

      <View style={styles.chips}>
        <Chip label="Upcoming" selected={view === 'upcoming'} onPress={() => setView('upcoming')} />
        <Chip label="Past" selected={view === 'past'} onPress={() => setView('past')} />
      </View>

      <ErrorText>{error}</ErrorText>
      {!shown && !error && <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.lg }} />}

      {nothing && (
        <Card>
          <Body style={{ fontWeight: '600' }}>{view === 'upcoming' ? 'No upcoming trips' : 'No past trips yet'}</Body>
          <Body muted>
            {view === 'upcoming' ? 'Find a ride or post a trip, and it will show up here.' : 'Trips you have taken will show up here.'}
          </Body>
        </Card>
      )}

      {shown && shown.driving.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Driving</Label>
          {shown.driving.map((trip) => (
            <TripRow
              key={trip.id}
              trip={trip}
              subtitle={`${trip.seats_booked} of ${trip.seats_offered} seats booked`}
              badge={trip.status === 'cancelled' ? { label: 'Cancelled', tone: 'neutral' } : undefined}
            />
          ))}
        </View>
      )}

      {shown && shown.riding.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Riding</Label>
          {shown.riding.map((request) => (
            <TripRow
              key={request.id}
              trip={request.trip}
              subtitle={`with ${firstName(request.trip.driver.full_name)}`}
              showDriver
              badge={
                request.trip.status === 'cancelled'
                  ? { label: 'Trip cancelled', tone: 'neutral' }
                  : { label: REQUEST_STATUS_TEXT[request.status], tone: tone(request.status) }
              }
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function tone(status: RequestStatus) {
  return status === 'approved' ? 'good' : status === 'declined' ? 'bad' : status === 'pending' ? 'waiting' : 'neutral';
}

function TripRow({
  trip,
  subtitle,
  badge,
  showDriver,
}: {
  trip: TripWithDriver;
  subtitle: string;
  badge?: { label: string; tone: 'waiting' | 'good' | 'bad' | 'neutral' };
  showDriver?: boolean;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => router.push(`/trip/${trip.id}`)}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
      {showDriver && <Avatar uri={trip.driver.avatar_url} name={trip.driver.full_name} size={40} />}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {trip.origin_name} → {trip.dest_name}
        </Text>
        <Body muted style={{ fontSize: 14 }}>
          {formatDeparture(new Date(trip.departure_at))} · {subtitle}
        </Body>
        {badge && <Badge label={badge.label} tone={badge.tone} />}
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
});
