// Web version of the Map tab: the phone map library doesn't run in a browser,
// so every route is drawn together on one card (campus = blue dot), with the
// rides listed underneath. Tap a route or a ride to highlight it.

import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { AnimatedItem } from '@/components/motion';
import { EmptyState, LoadError, SkeletonList } from '@/components/states';
import { TripCard } from '@/components/trip-card';
import { Body, Heading, Screen, SegmentedControl } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_CENTER } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { decodePolyline, LatLng } from '@/lib/geo';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import type { RatingSummary } from '@/lib/reviews';
import { fetchRatingSummary } from '@/lib/reviews-api';
import { fetchBlockedIds } from '@/lib/safety-api';
import { Direction, filterTrips, tripDirection } from '@/lib/trip-search';
import { fetchUpcomingTrips } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';

const SIZE = 400;
const PAD = 20;

type Shown = 'all' | Direction;

export default function MapScreen() {
  const colors = useTheme();
  const [trips, setTrips] = useState<TripWithDriver[] | null>(null);
  const [reliability, setReliability] = useState<Record<string, Reliability>>({});
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [shown, setShown] = useState<Shown>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    Promise.all([fetchUpcomingTrips(), fetchBlockedIds()])
      .then(async ([result, blocked]) => {
        const visible = result.filter((trip) => !blocked.has(trip.driver_id));
        setTrips(visible);
        setError('');
        const drivers = visible.map((trip) => trip.driver_id);
        const [reliabilityResult, ratingResult] = await Promise.all([fetchReliability(drivers), fetchRatingSummary(drivers)]);
        setReliability(reliabilityResult);
        setRatings(ratingResult);
      })
      .catch((err: Error) => setError(friendlyError(err)));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const visible = useMemo(
    () =>
      filterTrips(trips ?? [], { from: null, to: null, date: null })
        .filter((trip) => shown === 'all' || tripDirection(trip) === shown)
        .map((trip) => ({ trip, route: trip.route_polyline ? decodePolyline(trip.route_polyline) : [] })),
    [trips, shown],
  );

  // Fit campus and every route in the drawing.
  const all: LatLng[] = [CAMPUS_CENTER, ...visible.flatMap(({ route }) => route)];
  const lngScale = Math.cos((CAMPUS_CENTER.latitude * Math.PI) / 180);
  const minX = Math.min(...all.map((point) => point.longitude * lngScale));
  const minY = Math.min(...all.map((point) => -point.latitude));
  const span = Math.max(
    Math.max(...all.map((point) => point.longitude * lngScale)) - minX,
    Math.max(...all.map((point) => -point.latitude)) - minY,
    0.5,
  );
  const toXY = (point: LatLng) => ({
    x: PAD + ((point.longitude * lngScale - minX) / span) * (SIZE - PAD * 2),
    y: PAD + ((-point.latitude - minY) / span) * (SIZE - PAD * 2),
  });
  const campus = toXY(CAMPUS_CENTER);

  return (
    <Screen edges={['top']}>
      <Heading>Map</Heading>
      <SegmentedControl
        options={[
          { value: 'all', label: 'All' },
          { value: 'leaving', label: 'Leaving' },
          { value: 'returning', label: 'To campus' },
        ]}
        value={shown}
        onChange={(next) => {
          setShown(next);
          setSelectedId(null);
        }}
      />

      {trips === null ? (
        error ? <LoadError message={error} onRetry={load} /> : <SkeletonList count={2} />
      ) : visible.length === 0 ? (
        <EmptyState icon="map-outline" title="No rides to show" message="Check back soon, or switch to All." />
      ) : (
        <>
          <View style={[styles.drawing, { backgroundColor: colors.track, borderColor: colors.border }]}>
            <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet">
              {visible.map(({ trip, route }) =>
                route.length > 1 ? (
                  <Polyline
                    key={trip.id}
                    points={route.map((point) => toXY(point)).map(({ x, y }) => `${x},${y}`).join(' ')}
                    fill="none"
                    stroke={trip.id === selectedId ? colors.selected : colors.primary}
                    strokeWidth={trip.id === selectedId ? 5 : 2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    onPress={() => setSelectedId(trip.id)}
                  />
                ) : null,
              )}
              <Circle cx={campus.x} cy={campus.y} r={7} fill={colors.selected} stroke="#FFFFFF" strokeWidth={2} />
            </Svg>
          </View>
          <Body muted>
            {visible.length} {visible.length === 1 ? 'ride' : 'rides'}. The blue dot is campus. Tap a route to find its ride below.
          </Body>
          <View style={{ gap: Spacing.md }}>
            {[...visible]
              .sort((a, b) => Number(b.trip.id === selectedId) - Number(a.trip.id === selectedId))
              .map(({ trip }, index) => (
                <AnimatedItem key={trip.id} index={index}>
                  <TripCard trip={trip} reliability={reliability[trip.driver_id]} rating={ratings[trip.driver_id]} />
                </AnimatedItem>
              ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  drawing: {
    height: 340,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
