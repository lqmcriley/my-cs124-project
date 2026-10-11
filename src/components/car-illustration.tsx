// A side-view car drawing, painted in the driver's car color, that slides in
// gently (like ride apps show your car). Never shows a license plate.
// Turns off the slide when the phone's Reduce Motion setting is on.

import Animated, { FadeInLeft } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import { adjust, carColorHex } from '@/lib/car-color';

type Props = {
  color: string | null | undefined; // what the driver typed, e.g. "dark blue"
  width?: number;
  animate?: boolean;
};

export function CarIllustration({ color, width = 200, animate = true }: Props) {
  const paint = carColorHex(color);
  const outline = adjust(paint, -0.35);
  const shade = adjust(paint, -0.18);
  const height = (width * 110) / 240;

  const car = (
    <Svg width={width} height={height} viewBox="0 0 240 110" accessibilityLabel={`${color ?? 'Car'} car`}>
      {/* Shadow on the ground */}
      <Ellipse cx={122} cy={100} rx={104} ry={6} fill="#000000" opacity={0.12} />

      {/* Wheel wells */}
      <Circle cx={62} cy={86} r={21} fill={outline} />
      <Circle cx={186} cy={86} r={21} fill={outline} />

      {/* Body and cabin */}
      <Path
        d="M10 72 Q10 58 26 56 L62 52 L92 30 Q100 24 112 24 L156 24 Q168 24 176 32 L198 52 L222 56 Q234 58 234 70 L234 80 Q234 86 228 86 L16 86 Q10 86 10 80 Z"
        fill={paint}
        stroke={outline}
        strokeWidth={2}
      />
      {/* Lower body shading */}
      <Path d="M12 74 L232 74 L232 80 Q232 85 227 85 L17 85 Q12 85 12 80 Z" fill={shade} />
      {/* Shine along the top */}
      <Path d="M30 60 L64 56 L94 34 Q101 29 112 29 L150 29" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} fill="none" strokeLinecap="round" />

      {/* Windows */}
      <G fill="#1E2A3A" opacity={0.88}>
        <Path d="M72 52 L95 34 Q98 31 102 31 L124 31 L124 52 Z" />
        <Path d="M130 31 L152 31 Q158 31 162 36 L178 52 L130 52 Z" />
      </G>
      <Path d="M100 35 L112 35" stroke="#FFFFFF" strokeOpacity={0.4} strokeWidth={2} strokeLinecap="round" />

      {/* Door line and handle */}
      <Line x1={127} y1={54} x2={127} y2={82} stroke={outline} strokeWidth={1.5} opacity={0.6} />
      <Rect x={134} y={60} width={10} height={3} rx={1.5} fill={outline} opacity={0.6} />
      <Rect x={98} y={60} width={10} height={3} rx={1.5} fill={outline} opacity={0.6} />

      {/* Lights */}
      <Rect x={222} y={61} width={10} height={6} rx={3} fill="#FFE7A3" />
      <Rect x={11} y={61} width={8} height={6} rx={3} fill="#E53935" />

      {/* Wheels */}
      {[62, 186].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={86} r={17} fill="#1A1D21" />
          <Circle cx={x} cy={86} r={9} fill="#C9CED6" />
          <Circle cx={x} cy={86} r={3} fill="#6B7280" />
        </G>
      ))}
    </Svg>
  );

  if (!animate) return car;
  return <Animated.View entering={FadeInLeft.duration(600).springify().damping(18)}>{car}</Animated.View>;
}
