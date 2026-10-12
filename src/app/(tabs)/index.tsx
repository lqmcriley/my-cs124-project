// Screen 3: Home / Find a ride.
// Loads upcoming trips from Supabase, then filters them on the phone by From, To and date.

import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { AnimatedItem } from '@/components/motion';
import { PlaceSearchField } from '@/components/place-search-field';
import { TripCard } from '@/components/trip-card';
import { ReturnTripNote } from '@/components/return-trip-note';
import { EmptyState, LoadError, SkeletonList } from '@/components/states';
import { Body, Chip, ChipRow, ErrorText, Heading, Screen, SegmentedControl } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Place, QUICK_PICKS, QuickPick } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { firstName } from '@/lib/format';
import { Direction, searchByDirection } from '@/lib/trip-search';
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
  // Leaving campus: search where you're going. Back to campus: search where you're coming from.
  const [direction, setDirection] = useState<Direction>('leaving');
  const [place, setPlace] = useState<Place | QuickPick | null>(null);
  const [date, setDate] = useState<Date | null>(null);
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

  // Leaving: trips ending at your destination, then trips passing near it on the way.
  const results = trips ? searchByDirection(trips, direction, place, date) : [];
  const passingBy = results.filter((match) => match.along).length;
  const hasFilters = place !== null || date !== null;
  const stop = direction === 'leaving' ? place : null; // for "along the way" prices

  function clearFilters() {
    setPlace(null);
    setDate(null);
  }

  function changeDirection(next: Direction) {
    setDirection(next);
    setPlace(null);
  }

  return (
    <Screen edges={['top']} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}>
      <Heading>Hey {firstName(profile?.full_name ?? '') || 'there'}</Heading>

      <SegmentedControl
        options={[
          { value: 'leaving', label: 'Leaving campus', icon: 'arrow-up-circle-outline' },
          { value: 'returning', label: 'Back to campus', icon: 'school-outline' },
        ]}
        value={direction}
        onChange={changeDirection}
      />

      <PlaceSearchField
        label={direction === 'leaving' ? 'Going to' : 'Coming from'}
        value={place}
        onChange={setPlace}
        placeholder="Search a city, address or airport">
        <ChipRow>
          {QUICK_PICKS.map((pick) => (
            <Chip key={pick.name} label={pick.name} icon={pick.isAirport ? 'airplane-outline' : undefined} selected={false} onPress={() => setPlace(pick)} />
          ))}
        </ChipRow>
      </PlaceSearchField>

      <DateTimeField label="Date" mode="date" value={date} onChange={setDate} placeholder="Any day" minimumDate={new Date()} clearable />

      {direction === 'returning' && <ReturnTripNote compact />}

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
            title={direction === 'leaving' ? 'No upcoming rides yet' : 'No rides back to campus yet'}
            message={
              direction === 'leaving'
                ? 'Driving somewhere soon? Post your trip and split the gas.'
                : 'Driving back to campus? Post your ride and split the gas.'
            }
            action={{ title: 'Post a trip', icon: 'add', onPress: () => router.navigate('/post') }}
          />
        )
      ) : (
        <View style={styles.list}>
          <Body muted>
            {results.length} {results.length === 1 ? 'ride' : 'rides'} found
            {passingBy > 0 && stop ? `, including ${passingBy} passing near ${stop.name} on the way` : ''}
          </Body>
          {results.map(({ trip, along }, index) => (
            <AnimatedItem key={trip.id} index={index}>
              <TripCard trip={trip} reliability={reliability[trip.driver_id]} rating={ratings[trip.driver_id]} along={along} stop={stop} />
            </AnimatedItem>
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
