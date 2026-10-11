// Search results on a map: one pin per trip destination. Tap a pin, then its bubble, to open the trip.

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_CENTER } from '@/lib/config';
import { formatDeparture, formatMoney } from '@/lib/format';
import { payingRiders } from '@/lib/booking';
import { tripPriceSummary } from '@/lib/pricing';
import type { TripWithDriver } from '@/lib/types';

export function TripsMap({ trips }: { trips: TripWithDriver[] }) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  // Fit campus plus every destination on screen.
  useEffect(() => {
    if (!ready || trips.length === 0) return;
    const points = [CAMPUS_CENTER, ...trips.map((trip) => ({ latitude: trip.dest_lat, longitude: trip.dest_lng }))];
    mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
  }, [ready, trips]);

  return (
    <View style={[styles.wrapper, { borderColor: colors.border }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...CAMPUS_CENTER, latitudeDelta: 4, longitudeDelta: 4 }}
        onMapReady={() => setReady(true)}
        userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}>
        <Marker coordinate={CAMPUS_CENTER} title="UIUC campus" pinColor={Colors.light.text} />
        {trips.map((trip) => {
          const { ifYouJoin } = tripPriceSummary({
            miles: trip.route_miles,
            mpg: trip.mpg,
            gasPrice: trip.gas_price,
            seatsOffered: trip.seats_offered,
            ridersBooked: payingRiders(trip),
          });
          return (
            <Marker
              key={trip.id}
              coordinate={{ latitude: trip.dest_lat, longitude: trip.dest_lng }}
              title={`${trip.dest_name} · ${formatMoney(ifYouJoin.perSeat)}/seat`}
              description={`${formatDeparture(new Date(trip.departure_at))} · tap for details`}
              pinColor={Colors.light.primary}
              onCalloutPress={() => router.push(`/trip/${trip.id}`)}
            />
          );
        })}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: 420,
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
