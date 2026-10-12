// An address box with Google autocomplete. Type 3+ letters, tap a suggestion,
// and onChange receives the place with its coordinates.
// Pass quick-pick chips as children; they show while nothing is picked.

import Ionicons from '@expo/vector-icons/Ionicons';
import { ReactNode, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { PressableScale } from '@/components/motion';
import { Body, ErrorText, KEYBOARD_DONE_ID, Label, Text } from '@/components/ui';
import { FontFamily, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
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
  const [focused, setFocused] = useState(false); // orange outline while typing
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

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
          setLoadingSuggestions(false);
        })
        .catch((err: Error) => {
          if (stale) return;
          setSearchError(friendlyError(err));
          setLoadingSuggestions(false);
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
      setSearchError(friendlyError(err, "Couldn't load that place."));
    } finally {
      setPicking(false);
    }
  }

  // Something is picked: show it as a pill with a "Change" button.
  if (value) {
    return (
      <View style={{ gap: Spacing.xs }}>
        <Label>{label}</Label>
        <View style={[styles.bar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
          <Ionicons name="location" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.mainText, { color: colors.text }]} numberOfLines={1}>
              {value.name}
            </Text>
            <Text style={[styles.secondaryText, { color: colors.textSecondary }]} numberOfLines={1}>
              {value.address}
            </Text>
          </View>
          <PressableScale
            onPress={() => onChange(null)}
            accessibilityRole="button"
            accessibilityLabel={`Change ${label}`}
            hitSlop={10}
            style={[styles.changeButton, { backgroundColor: colors.track }]}>
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 14 }}>Change</Text>
          </PressableScale>
        </View>
      </View>
    );
  }

  return (
    <View style={{ gap: Spacing.sm }}>
      <View style={{ gap: Spacing.xs }}>
        <Label>{label}</Label>
        {/* The search bar: magnifying glass, text box, and a clear (x) button. */}
        <View
          style={[
            styles.bar,
            {
              backgroundColor: colors.inputBackground,
              borderColor: error ? colors.danger : focused ? colors.primary : colors.border,
              borderWidth: focused ? 1.5 : 1,
            },
          ]}>
          <Ionicons name="search" size={19} color={focused ? colors.primary : colors.textSecondary} />
          <TextInput
            inputAccessoryViewID={KEYBOARD_DONE_ID}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setLoadingSuggestions(text.trim().length >= MIN_CHARACTERS);
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={placeholder ?? 'Search an address or place'}
            placeholderTextColor={colors.textSecondary}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={label}
            style={[styles.input, { color: colors.text, fontFamily: FontFamily }]}
          />
          {(picking || (searching && loadingSuggestions)) && <ActivityIndicator color={colors.primary} />}
          {query.length > 0 && (
            <Pressable
              onPress={() => {
                setQuery('');
                setLoadingSuggestions(false);
              }}
              accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>
        <ErrorText>{error}</ErrorText>
      </View>

      {searching && suggestions.length > 0 && (
        <Animated.View entering={FadeIn.duration(150)} style={[styles.list, { borderColor: colors.border, backgroundColor: colors.card }]}>
          {suggestions.map((suggestion, index) => (
            <PressableScale
              key={suggestion.placeId}
              scaleTo={0.98}
              onPress={() => pick(suggestion)}
              accessibilityRole="button"
              style={[styles.row, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              <View style={[styles.pin, { backgroundColor: colors.track }]}>
                <Ionicons name="location-outline" size={16} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.mainText, { color: colors.text }]} numberOfLines={1}>
                  {suggestion.mainText}
                </Text>
                {suggestion.secondaryText ? (
                  <Text style={[styles.secondaryText, { color: colors.textSecondary }]} numberOfLines={1}>
                    {suggestion.secondaryText}
                  </Text>
                ) : null}
              </View>
            </PressableScale>
          ))}
          <Body muted style={styles.attribution}>
            Results powered by Google
          </Body>
        </Animated.View>
      )}
      {searching && !loadingSuggestions && suggestions.length === 0 && !searchError && (
        <Body muted style={{ fontSize: 14 }}>No matches yet. Try a city name or a full address.</Body>
      )}
      {!searching && children}
      <ErrorText>{searchError}</ErrorText>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: TapTarget + 4,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  changeButton: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryText: {
    fontSize: 13,
  },
  list: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    minHeight: TapTarget + 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  pin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    fontSize: 11,
    textAlign: 'right',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
});
