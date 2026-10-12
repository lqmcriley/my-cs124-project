// Screen 3: Home / Find a ride.
// Loads upcoming trips from Supabase, then filters them on the phone by From, To and date.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { AnimatedItem } from '@/components/motion';
import { PlaceSearchField } from '@/components/place-search-field';
import { TripCard } from '@/components/trip-card';
import { TripsMap } from '@/components/trips-map';
import { EmptyState, LoadError, SkeletonList } from '@/components/states';
import { Body, Chip, ErrorText, Heading, Screen, SegmentedControl } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Place, QUICK_PICKS, QuickPick } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { firstName } from '@/lib/format';
import { searchTrips } from '@/lib/trip-search';
import { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import type { RatingSummary } from '@/lib/reviews';
import { fetchRatingSummary } from '@/lib/reviews-api';
import { fetchBlockedIds } from '@/lib/safety-api';
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
  const [reliability, setReliability] = useState<Record<string, Reliability>>({});
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [loadError, setLoadError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(() => {
    return Promise.all([fetchUpcomingTrips(), fetchBlockedIds()])
      .then(async ([result, blocked]) => {
        // Hide trips from people you blocked (or who blocked you).
        const visible = result.filter((trip) => !blocked.has(trip.driver_id));
        setTrips(visible);
        setLoadError('');
        // Every driver's reliability and star rating, one request each.
        const drivers = visible.map((trip) => trip.driver_id);
        const [reliabilityResult, ratingResult] = await Promise.all([fetchReliability(drivers), fetchRatingSummary(drivers)]);
        setReliability(reliabilityResult);
        setRatings(ratingResult);
      })
      .catch((err: Error) => setLoadError(friendlyError(err)));
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

  // Trips ending at your destination, then trips that pass near it on the way.
  const results = trips ? searchTrips(trips, { from, to, date }) : [];
  const passingBy = results.filter((match) => match.along).length;
  const hasFilters = from !== null || to !== null || date !== null;

  function clearFilters() {
    setFrom(null);
    setTo(null);
    setDate(null);
  }

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

      <SegmentedControl
        options={[
          { value: 'list', label: 'List', icon: 'list' },
          { value: 'map', label: 'Map', icon: 'map-outline' },
        ]}
        value={view}
        onChange={setView}
      />

      {trips !== null && <ErrorText>{loadError}</ErrorText>}
      {trips === null ? (
        loadError ? <LoadError message={loadError} onRetry={load} /> : <SkeletonList />
      ) : results.length === 0 ? (
        hasFilters ? (
          <EmptyState
            icon="search-outline"
            title="No rides match yet"
            message="Try another day or a nearby destination. New trips get posted all the time."
            action={{ title: 'Clear search', icon: 'close', onPress: clearFilters }}
          />
        ) : (
          <EmptyState
            icon="car-outline"
            title="No upcoming rides yet"
            message="Driving somewhere soon? Post your trip and split the gas."
            action={{ title: 'Post a trip', icon: 'add', onPress: () => router.navigate('/post') }}
          />
        )
      ) : view === 'map' ? (
        <TripsMap trips={results.map((match) => match.trip)} />
      ) : (
        <View style={styles.list}>
          <Body muted>
            {results.length} {results.length === 1 ? 'ride' : 'rides'} found
            {passingBy > 0 && to ? `, including ${passingBy} passing near ${to.name} on the way` : ''}
          </Body>
          {results.map(({ trip, along }, index) => (
            <AnimatedItem key={trip.id} index={index}>
              <TripCard trip={trip} reliability={reliability[trip.driver_id]} rating={ratings[trip.driver_id]} along={along} stop={to} />
            </AnimatedItem>
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
