// The trip fields shared by "Post a trip" and "Edit trip": time, flexibility,
// seats, luggage, notes and, for airport trips, flight + parking details.

import { StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { Body, Button, Card, Chip, ErrorText, IconRow, Label, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { suggestedLeaveTime, terminalArrival } from '@/lib/airport';
import { FLEX_WINDOWS, LUGGAGE_OPTIONS, SHUTTLE_MINUTE_OPTIONS, TRIP_NOTES_MAX_LENGTH } from '@/lib/config';
import { formatDeparture } from '@/lib/format';
import type { TripFormErrors, TripFormValues } from '@/lib/trip-form';

type Props = {
  values: TripFormValues;
  errors: TripFormErrors;
  set: <K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) => void;
  maxSeats: number;
  minSeats?: number; // can't go below riders already approved
};

export function TripDetailsFields({ values, errors, set, maxSeats, minSeats = 1 }: Props) {
  const isAirport = values.to?.isAirport === true;
  const driveMinutes = values.route?.minutes ?? null;
  const shuttleMinutes = values.parking === 'offsite' ? values.shuttleMinutes : 0;

  const suggestion =
    isAirport && values.flightDepartsAt && driveMinutes !== null
      ? suggestedLeaveTime({
          flightDepartsAt: values.flightDepartsAt,
          international: values.flightInternational,
          driveMinutes,
          shuttleMinutes,
        })
      : null;

  const arrival =
    isAirport && values.departure && driveMinutes !== null
      ? terminalArrival({ departure: values.departure, driveMinutes, shuttleMinutes })
      : null;

  return (
    <View style={styles.group}>
      {isAirport && (
        <Card>
          <Label>Airport trip</Label>
          <Body muted>Add your flight and we&apos;ll suggest when to leave. Riders see this so they can match their own flights.</Body>

          <DateTimeField
            label="Your flight departs"
            mode="datetime"
            value={values.flightDepartsAt}
            onChange={(date) => set('flightDepartsAt', date)}
            placeholder="Optional"
            minimumDate={new Date()}
            clearable
            error={errors.flightDepartsAt}
          />
          <TextField
            label="Flight number (optional)"
            placeholder="e.g. AA 1234"
            value={values.flightNumber}
            onChangeText={(text) => set('flightNumber', text)}
            autoCapitalize="characters"
            maxLength={10}
            error={errors.flightNumber}
          />
          <View style={styles.chips}>
            <Chip label="Domestic" selected={!values.flightInternational} onPress={() => set('flightInternational', false)} />
            <Chip label="International" selected={values.flightInternational} onPress={() => set('flightInternational', true)} />
          </View>

          <Label>Getting to the terminal</Label>
          <View style={styles.chips}>
            <Chip label="Drop-off at terminal" icon="airplane-outline" selected={values.parking === 'terminal'} onPress={() => set('parking', 'terminal')} />
            <Chip label="Park + shuttle" icon="bus-outline" selected={values.parking === 'offsite'} onPress={() => set('parking', 'offsite')} />
          </View>
          {values.parking === 'offsite' && (
            <>
              <TextField
                label="Where you'll park"
                placeholder="e.g. Hilton Rosemont lot"
                value={values.parkingLocation}
                onChangeText={(text) => set('parkingLocation', text)}
                error={errors.parkingLocation}
              />
              <Label>Shuttle to the terminal takes about</Label>
              <View style={styles.chips}>
                {SHUTTLE_MINUTE_OPTIONS.map((minutes) => (
                  <Chip key={minutes} label={`${minutes} min`} selected={values.shuttleMinutes === minutes} onPress={() => set('shuttleMinutes', minutes)} />
                ))}
              </View>
              <Body muted>Riders see this as a heads-up before they request a seat.</Body>
            </>
          )}

          {suggestion && (
            <View style={styles.suggestion}>
              <IconRow icon="time-outline" text={`Suggested: leave by ${formatDeparture(suggestion)}`} />
              <Body muted style={{ fontSize: 14 }}>
                {values.flightInternational ? '3 hr' : '2 hr'} before your flight, plus the drive
                {shuttleMinutes ? `, ${shuttleMinutes} min shuttle` : ''} and 30 min for traffic.
              </Body>
              <Button title="Use this time" variant="secondary" onPress={() => set('departure', suggestion)} />
            </View>
          )}
        </Card>
      )}

      <DateTimeField
        label="Leaving at"
        mode="datetime"
        value={values.departure}
        onChange={(date) => set('departure', date)}
        placeholder="Pick a date and time"
        minimumDate={new Date()}
        error={errors.departure}
      />
      {arrival && <IconRow icon="airplane-outline" muted text={`At the terminal around ${formatDeparture(arrival)}`} />}

      <Label>Flexible by</Label>
      <View style={styles.chips}>
        {FLEX_WINDOWS.map((window) => (
          <Chip key={window.minutes} label={window.label} selected={values.flexMinutes === window.minutes} onPress={() => set('flexMinutes', window.minutes)} />
        ))}
      </View>

      <Label>Seats offered</Label>
      <View style={styles.chips}>
        {Array.from({ length: maxSeats - minSeats + 1 }, (_, i) => i + minSeats).map((count) => (
          <Chip key={count} label={String(count)} selected={values.seats === count} onPress={() => set('seats', count)} />
        ))}
      </View>
      {minSeats > 1 && <Body muted>You&apos;ve approved {minSeats} riders, so you can&apos;t offer fewer seats.</Body>}
      <ErrorText>{errors.seats}</ErrorText>

      <Label>Luggage space per rider</Label>
      <View style={styles.chips}>
        {LUGGAGE_OPTIONS.map((option) => (
          <Chip key={option.value} label={option.label} selected={values.luggage === option.value} onPress={() => set('luggage', option.value)} />
        ))}
      </View>

      <TextField
        label="Notes (optional)"
        placeholder="e.g. Meeting at the north entrance. Can stop for food."
        value={values.notes}
        onChangeText={(text) => set('notes', text)}
        multiline
        maxLength={TRIP_NOTES_MAX_LENGTH}
        error={errors.notes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestion: {
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
});
