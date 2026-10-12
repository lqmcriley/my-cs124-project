// Small building blocks used on every screen. They all read colors from
// useTheme(), so light and dark mode work automatically.

import { ReactElement, ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { Icon, type IconName } from '@/components/icon';
import { FadeSwap, PressableScale } from '@/components/motion';
import { FontFamily, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';

// Segmented switch sizes and the bubble's spring (smooth, barely any bounce).
const SEGMENT_PAD = 3;
const SEGMENT_GAP = 3;
const SEGMENT_SPRING = { damping: 22, stiffness: 260, mass: 0.7 };

// Use this instead of React Native's Text so every word uses the app font.
export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ fontFamily: FontFamily }, style]} />;
}

// A full screen that scrolls and moves out of the keyboard's way.
export function Screen({
  children,
  edges,
  refreshControl,
}: {
  children: ReactNode;
  edges?: ('top' | 'bottom')[];
  refreshControl?: ReactElement<RefreshControlProps>; // pull-to-refresh
}) {
  // Tab screens skip the bottom safe area; leave room for the floating tab bar instead.
  const insideTabs = edges !== undefined && !edges.includes('bottom');
  const colors = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges ?? ['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.screenContent, insideTabs && { paddingBottom: 120 }]}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Heading({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  const colors = useTheme();
  return <Text style={[styles.heading, { color: colors.text }, style]}>{children}</Text>;
}

export function Label({ children }: { children: ReactNode }) {
  const colors = useTheme();
  return <Text style={[styles.label, { color: colors.text }]}>{children}</Text>;
}

export function Body({
  children,
  muted,
  style,
}: {
  children: ReactNode;
  muted?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const colors = useTheme();
  return (
    <Text style={[styles.body, { color: muted ? colors.textSecondary : colors.text }, style]}>{children}</Text>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const colors = useTheme();
  if (!children) return null;
  return (
    <Text style={[styles.body, { color: colors.danger }]} accessibilityRole="alert">
      {children}
    </Text>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
};

// A pill-shaped button that shrinks slightly while pressed and springs back.
//   primary   = orange (the main action on a screen)
//   secondary = white/outlined
//   ghost     = text only
//   danger    = outlined red (sign out, cancel trip)
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled }: ButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;
  const background = variant === 'primary' ? colors.primary : variant === 'ghost' ? 'transparent' : colors.card;
  const textColor =
    variant === 'primary' ? colors.onPrimary : variant === 'danger' ? colors.danger : variant === 'secondary' ? colors.text : colors.primary;
  const borderColor = variant === 'danger' ? colors.danger : colors.border;

  return (
    <PressableScale
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.button,
        { backgroundColor: background, opacity: isDisabled ? 0.5 : 1 },
        (variant === 'secondary' || variant === 'danger') && { borderWidth: 1, borderColor },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Icon name={icon} size={19} color={textColor} />}
          <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
        </>
      )}
    </PressableScale>
  );
}

type TextFieldProps = TextInputProps & { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, style, onFocus, onBlur, ...inputProps }: TextFieldProps) {
  const colors = useTheme();
  const [focused, setFocused] = useState(false); // orange border while typing
  return (
    <View style={{ gap: Spacing.xs }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        returnKeyType={inputProps.multiline ? 'default' : 'done'}
        inputAccessoryViewID={KEYBOARD_DONE_ID}
        {...inputProps}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[
          styles.input,
          {
            color: colors.text,
            fontFamily: FontFamily,
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
            borderWidth: focused ? 1.5 : 1,
          },
          inputProps.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.md },
          style,
        ]}
      />
      {error ? <ErrorText>{error}</ErrorText> : hint ? <Body muted style={styles.small}>{hint}</Body> : null}
    </View>
  );
}

// A bar on top of the iPhone keyboard with a Done button that closes it.
// Text fields point at it with inputAccessoryViewID={KEYBOARD_DONE_ID}.
// Rendered once, in the root layout. (Android keyboards have their own hide key.)
export const KEYBOARD_DONE_ID = 'keyboard-done';

export function KeyboardDoneBar() {
  const colors = useTheme();
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYBOARD_DONE_ID}>
      <View style={[styles.doneBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <PressableScale
          onPress={() => Keyboard.dismiss()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Done, close the keyboard"
          style={[styles.doneButton, { backgroundColor: colors.selected }]}>
          <Text style={[styles.doneText, { color: colors.onSelected }]}>Done</Text>
        </PressableScale>
      </View>
    </InputAccessoryView>
  );
}

// A rounded, tappable option. Use a row of these to pick one choice.
export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  const colors = useTheme();
  const textColor = selected ? colors.onSelected : colors.text;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.selected : colors.card,
          borderColor: selected ? colors.selected : colors.border,
        },
      ]}>
      {icon && <Icon name={icon} size={18} color={textColor} />}
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </PressableScale>
  );
}

// A single row of chips you swipe sideways, instead of chips wrapping onto
// uneven lines. Keeps option groups to one tidy line.
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.chipRow}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  doneBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  doneButton: {
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.md,
  },
  screenContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
    flexGrow: 1,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
  },
  small: {
    fontSize: 13,
  },
  button: {
    minHeight: TapTarget,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: TapTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    minHeight: 44,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  segments: {
    flexDirection: 'row',
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    padding: SEGMENT_PAD,
    gap: SEGMENT_GAP,
  },
  segmentBubble: {
    position: 'absolute',
    top: SEGMENT_PAD,
    bottom: SEGMENT_PAD,
    left: 0,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
  },
  segment: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radius.pill,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});

// A line of text with a small icon in front, e.g. a trip detail or a profile fact.
export function IconRow({ icon, text, muted }: { icon: IconName; text: string; muted?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.iconRow}>
      <Icon name={icon} size={18} color={muted ? colors.textSecondary : colors.primary} />
      <Text style={[styles.body, { color: muted ? colors.textSecondary : colors.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// A tappable checkbox with a label.
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const colors = useTheme();
  return (
    <PressableScale
      scaleTo={0.98}
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkbox}>
      <Icon name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? colors.primary : colors.textSecondary} />
      <Text style={[styles.body, { color: colors.text, flex: 1 }]}>{label}</Text>
    </PressableScale>
  );
}

// A small colored label, e.g. a request's status.
export function Badge({ label, tone }: { label: string; tone: 'waiting' | 'good' | 'bad' | 'neutral' }) {
  const colors = useTheme();
  const color = { waiting: colors.primary, good: colors.success, bad: colors.danger, neutral: colors.textSecondary }[tone];
  return (
    <FadeSwap value={label} style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </FadeSwap>
  );
}

// One rounded bar split into equal parts, like iOS Settings. Use for 2–5 short
// choices (List / Map, Quiet / Talk...). Every option gets the same width, so rows line up.
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const colors = useTheme();
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const count = options.length;
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  // Each segment's width, and where segment i starts (inside the 3pt padding, with 3pt gaps).
  const segmentWidth = width > 0 ? (width - SEGMENT_PAD * 2 - SEGMENT_GAP * (count - 1)) / count : 0;
  const step = segmentWidth + SEGMENT_GAP;

  // The orange bubble's position. It follows the selected option, and you can drag it.
  const x = useSharedValue(SEGMENT_PAD);
  const dragStart = useSharedValue(0);
  useEffect(() => {
    const target = SEGMENT_PAD + selectedIndex * step;
    x.set(reduceMotion ? target : withSpring(target, SEGMENT_SPRING));
  }, [selectedIndex, step, reduceMotion, x]);

  function choose(index: number) {
    const option = options[index];
    if (option && option.value !== value) {
      selectionHaptic();
      onChange(option.value);
    } else {
      // Dropped back on the same option: settle into place.
      x.set(withSpring(SEGMENT_PAD + index * step, SEGMENT_SPRING));
    }
  }

  // Sideways drags move the bubble; up/down drags are left to the page so it still scrolls.
  const drag = Gesture.Pan()
    .activeOffsetX([-6, 6])
    .failOffsetY([-12, 12])
    .onStart(() => {
      dragStart.set(x.get());
    })
    .onUpdate((event) => {
      const min = SEGMENT_PAD;
      const max = SEGMENT_PAD + (count - 1) * step;
      x.set(Math.min(max, Math.max(min, dragStart.get() + event.translationX)));
    })
    .onEnd(() => {
      const index = Math.min(count - 1, Math.max(0, Math.round((x.get() - SEGMENT_PAD) / step)));
      scheduleOnRN(choose, index);
    });

  const bubble = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));

  return (
    <GestureDetector gesture={drag}>
      <View
        style={[styles.segments, { backgroundColor: colors.track }]}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        accessibilityRole="radiogroup">
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[styles.segmentBubble, { width: segmentWidth, backgroundColor: colors.selected }, bubble]}
          />
        )}
        {options.map((option) => {
          const selected = option.value === value;
          const textColor = selected ? colors.onSelected : colors.text;
          return (
            <PressableScale
              key={String(option.value)}
              scaleTo={0.97}
              onPress={() => {
                if (!selected) {
                  selectionHaptic();
                  onChange(option.value);
                }
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              style={styles.segment}>
              {option.icon && <Icon name={option.icon} size={16} color={textColor} />}
              <Text style={[styles.segmentText, { color: textColor }]} numberOfLines={1}>
                {option.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </GestureDetector>
  );
}
