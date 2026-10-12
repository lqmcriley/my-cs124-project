// Web version of route-map.tsx: the phone map library doesn't run in a browser,
// so the route is drawn as a simple line (start = orange dot, end = blue dot),
// with a button to open the real map in Google Maps.

import { Linking, StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Button } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { LatLng } from '@/lib/geo';

type Props = {
  from?: (LatLng & { title?: string }) | null;
  to?: (LatLng & { title?: string }) | null;
  route?: LatLng[];
  height?: number;
};

const SIZE = 300; // drawing units; the drawing scales to fit the card
const PAD = 24;

export function RouteMap({ from, to, route, height = 220 }: Props) {
  const colors = useTheme();
  const points = route && route.length > 1 ? route : [from, to].filter((point): point is LatLng => !!point);
  if (points.length === 0) return null;

  // Fit every point in the box, keeping the shape (east-west is squashed by latitude).
  const lngScale = Math.cos(((points[0].latitude ?? 40) * Math.PI) / 180);
  const xs = points.map((point) => point.longitude * lngScale);
  const ys = points.map((point) => -point.latitude);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 0.01);
  const toXY = (point: LatLng) => ({
    x: PAD + ((point.longitude * lngScale - minX) / span) * (SIZE - PAD * 2),
    y: PAD + ((-point.latitude - minY) / span) * (SIZE - PAD * 2),
  });
  const line = points.map((point) => toXY(point)).map(({ x, y }) => `${x},${y}`).join(' ');

  const mapsUrl =
    from && to
      ? `https://www.google.com/maps/dir/?api=1&origin=${from.latitude},${from.longitude}&destination=${to.latitude},${to.longitude}&travelmode=driving`
      : `https://www.google.com/maps/search/?api=1&query=${points[0].latitude},${points[0].longitude}`;

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={[styles.wrapper, { height, borderColor: colors.border, backgroundColor: colors.track }]}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${SIZE} ${SIZE}`} preserveAspectRatio="xMidYMid meet">
          {points.length > 1 && <Polyline points={line} fill="none" stroke={colors.primary} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />}
          {from && <Circle {...toCircle(toXY(from))} fill={colors.primary} stroke="#FFFFFF" strokeWidth={3} />}
          {to && <Circle {...toCircle(toXY(to))} fill={colors.selected} stroke="#FFFFFF" strokeWidth={3} />}
        </Svg>
      </View>
      <Button title="Open in Google Maps" icon="map-outline" variant="secondary" onPress={() => Linking.openURL(mapsUrl)} />
    </View>
  );
}

function toCircle({ x, y }: { x: number; y: number }) {
  return { cx: x, cy: y, r: 8 };
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
});
