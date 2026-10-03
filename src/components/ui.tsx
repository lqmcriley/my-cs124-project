// Small building blocks used on every screen. They all read colors from
// useTheme(), so light and dark mode work automatically.

import { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A full screen that scrolls and moves out of the keyboard's way.
export function Screen({ children, edges }: { children: ReactNode; edges?: ('top' | 'bottom')[] }) {
  const colors = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={edges ?? ['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled">
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
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderColor: selected ? colors.primary : colors.border,
        },
      ]}>
      <Text style={[styles.chipText, { color: selected ? colors.onPrimary : colors.text }]}>{label}</Text>
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
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
  },
  small: {
    fontSize: 14,
  },
  button: {
    minHeight: TapTarget,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
  },
  input: {
    minHeight: TapTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 17,
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
});
