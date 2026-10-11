// Screen 3: Home / Find a ride.
// Loads upcoming trips from Supabase, then filters them on the phone by From, To and date.

import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { PlaceSearchField } from '@/components/place-search-field';
import { TripCard } from '@/components/trip-card';
import { TripsMap } from '@/components/trips-map';
import { Body, Card, Chip, ErrorText, Heading, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Place, QUICK_PICKS, QuickPick } from '@/lib/config';
import { firstName } from '@/lib/format';
import { filterTrips } from '@/lib/trip-search';
import { fetchUpcomingTrips } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const colors = useTheme();
  const { profile } = useAuth();
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | QuickPick | null>(null);
  const [date, setDate] = useState<Date | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [trips, setTrips] = useState<TripWithDriver[] | null>(null); // null = still loading
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return fetchUpcomingTrips()
      .then((result) => {
        setTrips(result);
        setLoadError('');
      })
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  // Reload every time this tab comes into view (e.g. after posting a trip).
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

  const results = trips ? filterTrips(trips, { from, to, date }) : [];
  const hasFilters = from !== null || to !== null || date !== null;

  return (
    <Screen edges={['top']} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <Heading>Hey {firstName(profile?.full_name ?? '') || 'there'}</Heading>
      <Body muted>Where are you headed?</Body>

      <PlaceSearchField label="To" value={to} onChange={setTo} placeholder="Search a city or address">
        <View style={styles.chips}>
          {QUICK_PICKS.map((pick) => (
            <Chip key={pick.name} label={pick.name} icon={pick.isAirport ? 'airplane-outline' : undefined} selected={false} onPress={() => setTo(pick)} />
          ))}
        </View>
      </PlaceSearchField>

      <PlaceSearchField label="From (optional)" value={from} onChange={setFrom} placeholder="Anywhere near campus" />

      <DateTimeField label="Date" mode="date" value={date} onChange={setDate} placeholder="Any day" minimumDate={new Date()} clearable />

      <View style={styles.chips}>
        <Chip label="List" icon="list" selected={view === 'list'} onPress={() => setView('list')} />
        <Chip label="Map" icon="map-outline" selected={view === 'map'} onPress={() => setView('map')} />
      </View>

      <ErrorText>{loadError}</ErrorText>

      {trips === null && !loadError ? (
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.lg }} />
      ) : results.length === 0 ? (
        <Card>
          <Body style={{ fontWeight: '700' }}>{hasFilters ? 'No rides match yet' : 'No upcoming rides yet'}</Body>
          <Body muted>
            {hasFilters
              ? 'Try another day or a nearby destination, or check back later.'
              : 'Be the first! Driving somewhere? Post your trip in the "Post a trip" tab.'}
          </Body>
        </Card>
      ) : view === 'map' ? (
        <TripsMap trips={results} />
      ) : (
        <View style={styles.list}>
          <Body muted>
            {results.length} {results.length === 1 ? 'ride' : 'rides'} found
          </Body>
          {results.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  list: {
    gap: Spacing.md,
  },
});
