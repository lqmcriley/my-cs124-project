// An address box with Google autocomplete. Type 3+ letters, tap a suggestion,
// and onChange receives the place with its coordinates.
// Pass quick-pick chips as children; they show while nothing is picked.

import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Body, ErrorText, Label, Text, TextField } from '@/components/ui';
import { Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/lib/config';
import { autocomplete, newSessionToken, placeDetails, Suggestion } from '@/lib/maps';

const MIN_CHARACTERS = 3;

type Props = {
  label: string;
  value: Place | null;
  onChange: (place: Place | null) => void;
  placeholder?: string;
  error?: string;
  children?: ReactNode;
};

export function PlaceSearchField({ label, value, onChange, placeholder, error, children }: Props) {
  const colors = useTheme();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [sessionToken, setSessionToken] = useState(newSessionToken);
  const [searchError, setSearchError] = useState('');
  const [picking, setPicking] = useState(false);

  const searching = query.trim().length >= MIN_CHARACTERS;

  // Ask Google for suggestions 300ms after the user stops typing.
  useEffect(() => {
    if (query.trim().length < MIN_CHARACTERS) return;
    let stale = false;
    const timer = setTimeout(() => {
      autocomplete(query.trim(), sessionToken)
        .then((results) => {
          if (stale) return;
          setSuggestions(results);
          setSearchError('');
        })
        .catch((err: Error) => {
          if (!stale) setSearchError(err.message);
        });
    }, 300);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, sessionToken]);

  async function pick(suggestion: Suggestion) {
    setPicking(true);
    try {
      const place = await placeDetails(suggestion.placeId, sessionToken);
      onChange(place);
      setQuery('');
      setSuggestions([]);
      setSessionToken(newSessionToken());
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Couldn't load that place.");
    } finally {
      setPicking(false);
    }
  }

  // Something is picked: show it with a "Change" button.
  if (value) {
    return (
      <View style={{ gap: Spacing.xs }}>
        <Label>{label}</Label>
        <View style={[styles.selected, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="location" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={{ color: colors.textSecondary }} numberOfLines={1}>
              {value.address}
            </Text>
          </View>
          <Pressable onPress={() => onChange(null)} accessibilityRole="button" accessibilityLabel={`Change ${label}`} hitSlop={12}>
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 15 }}>Change</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <TextField
        label={label}
        placeholder={placeholder ?? 'Search an address or place'}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        error={error}
      />
      {children}
      {picking && <ActivityIndicator color={colors.primary} />}
      {searching && suggestions.length > 0 && (
        <View style={[styles.list, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {suggestions.map((suggestion) => (
            <Pressable
              key={suggestion.placeId}
              onPress={() => pick(suggestion)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.row, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
              <Text style={[styles.selectedName, { color: colors.text }]} numberOfLines={1}>
                {suggestion.mainText}
              </Text>
              {suggestion.secondaryText ? (
                <Text style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {suggestion.secondaryText}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      )}
      {searching && <Body muted style={styles.attribution}>Results powered by Google</Body>}
      <ErrorText>{searchError}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  selected: {
    minHeight: TapTarget,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  selectedName: {
    fontSize: 15,
    fontWeight: '600',
  },
  list: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  row: {
    minHeight: TapTarget,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  attribution: {
    fontSize: 12,
  },
});
