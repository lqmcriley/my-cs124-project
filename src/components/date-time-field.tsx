// Tap to pick a date (or date + time). iPhone shows the picker under the field;
// Android shows its own pop-up calendar, then a clock for the time.

import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Button, ErrorText, Label, Text } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { formatDay, formatDeparture } from '@/lib/format';

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  mode: 'date' | 'datetime';
  placeholder: string;
  minimumDate?: Date;
  clearable?: boolean;
  error?: string;
};

// Tomorrow at 9:00 AM — a sensible starting point for a new trip.
function defaultDate(mode: 'date' | 'datetime'): Date {
  const date = new Date();
  if (mode === 'date') return date;
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

export function DateTimeField({ label, value, onChange, mode, placeholder, minimumDate, clearable, error }: Props) {
  const colors = useTheme();
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);

  function openPicker() {
    const start = value ?? defaultDate(mode);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: start,
        mode: 'date',
        minimumDate,
        // onValueChange only fires when the user taps OK (not when they cancel).
        onValueChange: (_event, date) => {
          if (mode === 'date') {
            onChange(date);
            return;
          }
          DateTimePickerAndroid.open({
            value: date,
            mode: 'time',
            onValueChange: (_timeEvent, time) => onChange(time),
          });
        },
      });
      return;
    }
    if (!value) onChange(start);
    setOpen(!open);
  }

  const text = value ? (mode === 'date' ? formatDay(value) : formatDeparture(value)) : placeholder;

  return (
    <View style={{ gap: Spacing.xs }}>
      <Label>{label}</Label>
      <View style={styles.row}>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${text}`}
          style={[
            styles.field,
            { backgroundColor: colors.inputBackground, borderColor: error ? colors.danger : colors.border },
          ]}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={{ color: value ? colors.text : colors.textSecondary, fontSize: 16 }}>{text}</Text>
        </Pressable>
        {clearable && value && (
          <Pressable
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            hitSlop={12}>
            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>

      {Platform.OS === 'ios' && open && value && (
        <View style={[styles.iosPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <DateTimePicker
            value={value}
            mode={mode}
            display={mode === 'date' ? 'inline' : 'spinner'}
            minimumDate={minimumDate}
            minuteInterval={5}
            themeVariant={scheme === 'dark' ? 'dark' : 'light'}
            accentColor={colors.primary}
            onValueChange={(_event, date) => onChange(date)}
          />
          <Button title="Done" variant="secondary" onPress={() => setOpen(false)} />
        </View>
      )}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  field: {
    flex: 1,
    minHeight: TapTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iosPicker: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
});
