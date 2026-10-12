// Web version of date-time-field.tsx: uses the browser's built-in date and
// time box (the phone picker library doesn't work in a browser).

import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';

import { ErrorText, Label } from '@/components/ui';
import { FontFamily, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

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

const pad = (n: number) => String(n).padStart(2, '0');

// The browser's boxes use local-time text like "2026-10-14" or "2026-10-14T09:00".
function toInputValue(date: Date, mode: Props['mode']): string {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  return mode === 'date' ? day : `${day}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromInputValue(text: string, mode: Props['mode']): Date | null {
  if (!text) return null;
  const [day, time = '00:00'] = mode === 'date' ? [text] : text.split('T');
  const [year, month, date] = day.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const result = new Date(year, month - 1, date, hours, minutes);
  return Number.isNaN(result.getTime()) ? null : result;
}

export function DateTimeField({ label, value, onChange, mode, minimumDate, clearable, error }: Props) {
  const colors = useTheme();
  const scheme = useColorScheme();

  return (
    <View style={{ gap: Spacing.xs }}>
      <Label>{label}</Label>
      <View style={styles.row}>
        <View style={[styles.field, { backgroundColor: colors.inputBackground, borderColor: error ? colors.danger : colors.border }]}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <input
            type={mode === 'date' ? 'date' : 'datetime-local'}
            aria-label={label}
            value={value ? toInputValue(value, mode) : ''}
            min={minimumDate ? toInputValue(minimumDate, mode) : undefined}
            step={mode === 'datetime' ? 300 : undefined}
            onChange={(event) => onChange(fromInputValue(event.target.value, mode))}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              color: colors.text,
              fontFamily: FontFamily,
              fontSize: 16,
              colorScheme: scheme === 'dark' ? 'dark' : 'light',
            }}
          />
        </View>
        {clearable && value && (
          <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel={`Clear ${label}`} hitSlop={12}>
            <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
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
});
