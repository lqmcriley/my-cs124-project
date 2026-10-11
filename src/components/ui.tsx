// Small building blocks used on every screen. They all read colors from
// useTheme(), so light and dark mode work automatically.

import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactElement, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { FontFamily, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = 'primary', loading, disabled }: ButtonProps) {
  const colors = useTheme();
  const isDisabled = disabled || loading;
  const background = variant === 'primary' ? colors.primary : variant === 'secondary' ? colors.card : 'transparent';
  const textColor = variant === 'primary' ? colors.onPrimary : variant === 'secondary' ? colors.text : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
      ]}>
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

type TextFieldProps = TextInputProps & { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, style, ...inputProps }: TextFieldProps) {
  const colors = useTheme();
  return (
    <View style={{ gap: Spacing.xs }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={label}
        {...inputProps}
        style={[
          styles.input,
          {
            color: colors.text,
            fontFamily: FontFamily,
            backgroundColor: colors.inputBackground,
            borderColor: error ? colors.danger : colors.border,
          },
          inputProps.multiline && { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.md },
          style,
        ]}
      />
      {error ? <ErrorText>{error}</ErrorText> : hint ? <Body muted style={styles.small}>{hint}</Body> : null}
    </View>
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
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const colors = useTheme();
  const textColor = selected ? colors.onPrimary : colors.text;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      hitSlop={4}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      {icon && <Ionicons name={icon} size={18} color={textColor} />}
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const colors = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, style]}>{children}</View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
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
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});

// A line of text with a small icon in front, e.g. a trip detail or a profile fact.
export function IconRow({ icon, text, muted }: { icon: keyof typeof Ionicons.glyphMap; text: string; muted?: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.iconRow}>
      <Ionicons name={icon} size={18} color={muted ? colors.textSecondary : colors.primary} />
      <Text style={[styles.body, { color: muted ? colors.textSecondary : colors.text, flex: 1 }]}>{text}</Text>
    </View>
  );
}

// A tappable checkbox with a label.
export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={styles.checkbox}>
      <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={24} color={checked ? colors.primary : colors.textSecondary} />
      <Text style={[styles.body, { color: colors.text, flex: 1 }]}>{label}</Text>
    </Pressable>
  );
}

// A small colored label, e.g. a request's status.
export function Badge({ label, tone }: { label: string; tone: 'waiting' | 'good' | 'bad' | 'neutral' }) {
  const colors = useTheme();
  const color = { waiting: colors.primary, good: colors.success, bad: colors.danger, neutral: colors.textSecondary }[tone];
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}
