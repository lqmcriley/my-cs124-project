// Map tab: every upcoming trip drawn on one big map. Tap a route or pin to see
// the ride at the bottom, then tap the card to open it.

import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion';
import { TripCard } from '@/components/trip-card';
import { SegmentedControl, Text } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_CENTER } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { decodePolyline, LatLng } from '@/lib/geo';
import { selectionHaptic } from '@/lib/haptics';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import type { RatingSummary } from '@/lib/reviews';
import { fetchRatingSummary } from '@/lib/reviews-api';
import { fetchBlockedIds } from '@/lib/safety-api';
import { Direction, filterTrips, tripDirection } from '@/lib/trip-search';
import { fetchUpcomingTrips } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';

// Space for the tab bar at the bottom of the screen.
const TAB_BAR_HEIGHT = 64;

type Shown = 'all' | Direction;

export default function MapScreen() {
  const colors = useTheme();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const [trips, setTrips] = useState<TripWithDriver[]>([]);
  const [reliability, setReliability] = useState<Record<string, Reliability>>({});
  const [ratings, setRatings] = useState<Record<string, RatingSummary>>({});
  const [shown, setShown] = useState<Shown>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false); // the map has loaded

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

  // Open, upcoming trips going the chosen way, each with its route decoded once.
  const visible = useMemo(
    () =>
      filterTrips(trips, { from: null, to: null, date: null })
        .filter((trip) => shown === 'all' || tripDirection(trip) === shown)
        .map((trip) => ({ trip, route: trip.route_polyline ? decodePolyline(trip.route_polyline) : [] })),
    [trips, shown],
  );
  const selected = visible.find((item) => item.trip.id === selectedId)?.trip ?? null;

  function select(trip: TripWithDriver) {
    selectionHaptic();
    setSelectedId(trip.id);
  }

  // Every pickup and destination (plus campus), used to zoom the map to fit.
  const allPoints: LatLng[] = useMemo(
    () => [
      CAMPUS_CENTER,
      ...visible.flatMap(({ trip }) => [
        { latitude: trip.origin_lat, longitude: trip.origin_lng },
        { latitude: trip.dest_lat, longitude: trip.dest_lng },
      ]),
    ],
    [visible],
  );
  const padding = { top: insets.top + 120, right: 40, bottom: TAB_BAR_HEIGHT + insets.bottom + 40, left: 40 };

  function showAll() {
    mapRef.current?.fitToCoordinates(allPoints, { edgePadding: padding, animated: true });
  }

  // Zoom to fit once the map is ready, and again when you switch which trips to show.
  const fitKey = `${ready}-${shown}-${visible.length}`;
  const lastFit = useRef('');
  useEffect(() => {
    if (!ready || lastFit.current === fitKey) return;
    lastFit.current = fitKey;
    mapRef.current?.fitToCoordinates(allPoints, { edgePadding: padding, animated: true });
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...CAMPUS_CENTER, latitudeDelta: 6, longitudeDelta: 6 }}
        onMapReady={() => setReady(true)}
        userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}>
        <Marker coordinate={CAMPUS_CENTER} title="UIUC campus" pinColor={Colors.light.text} />
        {visible.map(({ trip, route }) => {
          const isSelected = trip.id === selectedId;
          const leaving = tripDirection(trip) !== 'returning';
          // Pin the far end: the destination when leaving campus, the pickup when coming back.
          const pin = leaving ? { latitude: trip.dest_lat, longitude: trip.dest_lng } : { latitude: trip.origin_lat, longitude: trip.origin_lng };
          return (
            <Fragment key={trip.id}>
              {route.length > 1 && (
                <Polyline
                  coordinates={route}
                  strokeColor={isSelected ? colors.text : colors.primary}
                  strokeWidth={isSelected ? 6 : 3}
                  zIndex={isSelected ? 2 : 1}
                  tappable
                  onPress={() => select(trip)}
                />
              )}
              <Marker coordinate={pin} pinColor={isSelected ? Colors.light.text : Colors.light.primary} onPress={() => select(trip)} />
            </Fragment>
          );
        })}
      </MapView>

      {/* Top: which trips to show */}
      <View style={[styles.top, { paddingTop: insets.top + Spacing.sm }]} pointerEvents="box-none">
        <View style={[styles.glass, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
        </View>
        <View style={styles.row} pointerEvents="box-none">
          <View style={[styles.pill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
              {error || `${visible.length} ${visible.length === 1 ? 'ride' : 'rides'}`}
            </Text>
          </View>
          <PressableScale
            onPress={showAll}
            accessibilityRole="button"
            accessibilityLabel="Zoom to show every ride"
            style={[styles.pill, styles.iconPill, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="scan-outline" size={18} color={colors.text} />
          </PressableScale>
        </View>
      </View>

      {/* Bottom: the ride you tapped, or a hint */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + TAB_BAR_HEIGHT + Spacing.sm }]} pointerEvents="box-none">
        {selected ? (
          <Animated.View key={selected.id} entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(150)} style={{ gap: Spacing.xs }}>
            <PressableScale
              onPress={() => setSelectedId(null)}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={[styles.pill, styles.iconPill, styles.close, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="close" size={18} color={colors.text} />
            </PressableScale>
            <TripCard trip={selected} reliability={reliability[selected.driver_id]} rating={ratings[selected.driver_id]} />
          </Animated.View>
        ) : (
          <View style={[styles.pill, styles.hint, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Tap a route to see who&apos;s driving</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  glass: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pill: {
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  iconPill: {
    paddingHorizontal: 12,
    minWidth: 44,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.md,
  },
  hint: {
    alignSelf: 'center',
  },
  close: {
    alignSelf: 'flex-end',
  },
});
