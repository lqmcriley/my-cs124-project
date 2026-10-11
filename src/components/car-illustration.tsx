// A side-view car drawing in the driver's car color and body style, that slides
// in gently (like ride apps show your car). Never shows a license plate.
// The slide turns off when the phone's Reduce Motion setting is on.

import Animated, { FadeInLeft } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import type { CarBodyType } from '@/lib/config';
import { adjust, carColorHex } from '@/lib/car-color';

// Each shape is drawn on a 240 x 110 canvas, facing right, wheels at x = 62 and 186.
type Shape = {
  body: string; // outline of the whole car
  windows: string[];
  shine: string; // light reflection along the roof
  doors: number[]; // x positions of door lines
  wheel: number; // tire radius
  lightsY: number; // height of the head/tail lights
  roofRails?: boolean; // bars on the roof (SUV)
  cladding?: boolean; // black plastic trim and wheel-arch flares along the bottom (SUV)
  spoiler?: boolean; // small wing on the trunk (coupe)
  sportyRims?: boolean; // bigger rims (coupe)
};

const SHAPES: Record<CarBodyType, Shape> = {
  sedan: {
    body: 'M10 72 Q10 58 26 56 L62 52 L92 30 Q100 24 112 24 L156 24 Q168 24 176 32 L198 52 L222 56 Q234 58 234 70 L234 80 Q234 86 228 86 L16 86 Q10 86 10 80 Z',
    windows: ['M72 52 L95 34 Q98 31 102 31 L124 31 L124 52 Z', 'M130 31 L152 31 Q158 31 162 36 L178 52 L130 52 Z'],
    shine: 'M30 60 L64 56 L94 34 Q101 29 112 29 L150 29',
    doors: [127],
    wheel: 17,
    lightsY: 61,
  },
  hatchback: {
    body: 'M12 74 Q12 60 20 58 L30 34 Q33 26 43 26 L148 26 Q160 26 170 34 L196 54 L222 58 Q234 60 234 72 L234 80 Q234 86 228 86 L18 86 Q12 86 12 80 Z',
    windows: ['M34 54 L41 33 Q43 30 47 30 L84 30 L84 54 Z', 'M90 30 L124 30 L124 54 L90 54 Z', 'M130 30 L148 30 Q156 30 162 36 L180 54 L130 54 Z'],
    shine: 'M36 30 Q38 28 44 28 L146 28',
    doors: [87, 127],
    wheel: 17,
    lightsY: 62,
  },
  suv: {
    // Modern crossover SUV (think RAV4 / CR-V): taller than a sedan, raked windshield and back.
    body: 'M14 76 Q14 66 20 62 L28 34 Q32 24 44 23 L150 21 Q162 21 172 30 L194 50 L222 54 Q233 56 233 68 L233 78 Q233 84 227 84 L20 84 Q14 84 14 78 Z',
    windows: ['M32 50 L37 32 Q39 28 45 28 L60 28 L60 50 Z', 'M66 28 L114 27 L114 50 L66 50 Z', 'M120 27 L148 26 Q157 26 164 32 L182 50 L120 50 Z'],
    shine: 'M36 27 Q40 25 46 25 L148 23',
    doors: [117],
    wheel: 20,
    lightsY: 58,
  },
  pickup: {
    body: 'M10 80 L10 56 L94 56 L94 26 Q94 19 102 19 L150 19 Q161 19 169 27 L196 52 L222 56 Q234 58 234 70 L234 80 Q234 86 228 86 L16 86 Q10 86 10 80 Z',
    windows: ['M100 52 L100 25 L124 25 L124 52 Z', 'M130 25 L150 25 Q158 25 164 31 L182 52 L130 52 Z'],
    shine: 'M100 22 L150 22',
    doors: [127],
    wheel: 19,
    lightsY: 60,
  },
  minivan: {
    body: 'M10 76 Q10 60 18 58 L22 26 Q24 18 34 18 L168 18 Q177 18 183 25 L208 52 L224 56 Q234 58 234 70 L234 80 Q234 86 228 86 L16 86 Q10 86 10 80 Z',
    windows: ['M27 52 L30 27 Q31 23 36 23 L74 23 L74 52 Z', 'M80 23 L124 23 L124 52 L80 52 Z', 'M130 23 L166 23 Q173 23 178 29 L196 52 L130 52 Z'],
    shine: 'M28 22 Q30 20 36 20 L166 20',
    doors: [77, 127],
    wheel: 17,
    lightsY: 60,
  },
  coupe: {
    // Low two-door with a fastback roof that slopes in one line to the tail, plus a spoiler.
    body: 'M10 76 Q10 68 20 66 L40 62 Q70 50 104 38 Q114 34 124 34 L140 34 Q150 34 158 40 L182 58 L222 62 Q234 64 234 74 L234 80 Q234 86 228 86 L16 86 Q10 86 10 80 Z',
    windows: ['M74 58 Q94 47 110 41 Q116 39 124 39 L138 39 Q146 39 152 44 L167 58 Z'],
    shine: 'M44 62 Q72 51 104 40 Q113 36 124 36 L140 36',
    doors: [158],
    wheel: 17,
    lightsY: 67,
    spoiler: true,
    sportyRims: true,
  },
};

type Props = {
  color: string | null | undefined; // what the driver typed, e.g. "dark blue"
  bodyType?: CarBodyType | null;
  width?: number;
  animate?: boolean;
};

export function CarIllustration({ color, bodyType, width = 200, animate = true }: Props) {
  const shape = SHAPES[bodyType ?? 'sedan'] ?? SHAPES.sedan;
  const paint = carColorHex(color);
  const outline = adjust(paint, -0.35);
  const shade = adjust(paint, -0.18);
  const height = (width * 110) / 240;

  const car = (
    <Svg width={width} height={height} viewBox="0 0 240 110" accessibilityLabel={`${color ?? ''} ${bodyType ?? 'car'}`.trim()}>
      {/* Shadow on the ground */}
      <Ellipse cx={122} cy={100} rx={104} ry={6} fill="#000000" opacity={0.12} />

      {/* Wheel wells */}
      <Circle cx={62} cy={86} r={shape.wheel + 4} fill={outline} />
      <Circle cx={186} cy={86} r={shape.wheel + 4} fill={outline} />

      {/* Body */}
      <Path d={shape.body} fill={paint} stroke={outline} strokeWidth={2} />
      {!shape.cladding && <Path d="M12 74 L232 74 L232 80 Q232 85 227 85 L17 85 Q12 85 12 80 Z" fill={shade} />}
      <Path d={shape.shine} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} fill="none" strokeLinecap="round" />

      {/* SUV: roof rails, black lower trim and wheel-arch flares */}
      {shape.roofRails && (
        <G fill={outline}>
          <Rect x={34} y={14} width={124} height={3.5} rx={1.75} />
          <Rect x={40} y={16} width={4} height={5} />
          <Rect x={148} y={16} width={4} height={5} />
        </G>
      )}
      {shape.cladding && (
        <G>
          <Path d="M16 70 L232 70 L232 76 Q232 80 228 80 L20 80 Q16 80 16 76 Z" fill="#2B2F36" />
          {[62, 186].map((x) => (
            <Path
              key={x}
              d={`M${x - shape.wheel - 7} 80 A ${shape.wheel + 7} ${shape.wheel + 7} 0 0 1 ${x + shape.wheel + 7} 80`}
              fill="none"
              stroke="#2B2F36"
              strokeWidth={6}
            />
          ))}
        </G>
      )}

      {/* Coupe spoiler */}
      {shape.spoiler && <Path d="M10 60 L32 57 L32 61 L14 64 Z" fill={outline} />}

      {/* Pickup truck bed rail */}
      {bodyType === 'pickup' && <Line x1={14} y1={60} x2={90} y2={60} stroke={outline} strokeWidth={2} opacity={0.6} />}

      {/* Windows */}
      <G fill="#1E2A3A" opacity={0.88}>
        {shape.windows.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>

      {/* Doors and handles */}
      {shape.doors.map((x) => (
        <G key={x}>
          <Line x1={x} y1={shape.lightsY - 6} x2={x} y2={82} stroke={outline} strokeWidth={1.5} opacity={0.6} />
          <Rect x={x + 7} y={shape.lightsY} width={10} height={3} rx={1.5} fill={outline} opacity={0.6} />
        </G>
      ))}

      {/* Lights */}
      <Rect x={222} y={shape.lightsY} width={10} height={6} rx={3} fill="#FFE7A3" />
      <Rect x={11} y={shape.lightsY} width={8} height={6} rx={3} fill="#E53935" />

      {/* Wheels */}
      {[62, 186].map((x) => (
        <G key={x}>
          <Circle cx={x} cy={86} r={shape.wheel} fill="#1A1D21" />
          <Circle cx={x} cy={86} r={shape.wheel * (shape.sportyRims ? 0.7 : 0.53)} fill="#C9CED6" />
          <Circle cx={x} cy={86} r={3} fill="#6B7280" />
        </G>
      ))}
    </Svg>
  );

  if (!animate) return car;
  return <Animated.View entering={FadeInLeft.duration(600).springify().damping(18)}>{car}</Animated.View>;
}
