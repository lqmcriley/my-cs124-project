// A map showing a trip's start (orange pin), end (navy pin) and the driving route.
// It zooms to fit whatever it's given.

import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Colors, Radius } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { CAMPUS_CENTER } from '@/lib/config';
import type { LatLng } from '@/lib/geo';

type Props = {
  from?: (LatLng & { title?: string }) | null;
  to?: (LatLng & { title?: string }) | null;
  route?: LatLng[];
  height?: number;
};

export function RouteMap({ from, to, route, height = 220 }: Props) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const mapRef = useRef<MapView>(null);
  const [ready, setReady] = useState(false);

  // Zoom the map to show the pins and route whenever they change.
  useEffect(() => {
    if (!ready) return;
    const points = [...(route ?? []), ...(from ? [from] : []), ...(to ? [to] : [])];
    if (points.length === 0) return;
    if (points.length === 1) {
      mapRef.current?.animateToRegion({ ...points[0], latitudeDelta: 0.03, longitudeDelta: 0.03 });
    } else {
      mapRef.current?.fitToCoordinates(points, {
        edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
        animated: true,
      });
    }
  }, [ready, from, to, route]);

  return (
    <View style={[styles.wrapper, { height, borderColor: colors.border }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...CAMPUS_CENTER, latitudeDelta: 0.05, longitudeDelta: 0.05 }}
        onMapReady={() => setReady(true)}
        userInterfaceStyle={scheme === 'dark' ? 'dark' : 'light'}
        rotateEnabled={false}
        pitchEnabled={false}>
        {route && route.length > 1 && <Polyline coordinates={route} strokeColor={colors.primary} strokeWidth={4} />}
        {from && <Marker coordinate={from} title={from.title} pinColor={Colors.light.primary} />}
        {to && <Marker coordinate={to} title={to.title} pinColor={Colors.light.text} />}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
