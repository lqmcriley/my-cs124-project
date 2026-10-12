// The trip fields shared by "Post a trip" and "Edit trip", as fold-out sections:
//   Airport (only for airport trips) · When · Seats & luggage · Notes
// Each section shows a one-line summary when closed.

import { StyleSheet, View } from 'react-native';

import { DateTimeField } from '@/components/date-time-field';
import { FoldSection } from '@/components/fold-section';
import { Body, Button, Chip, ErrorText, IconRow, Label, SegmentedControl, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { suggestedLeaveTime, terminalArrival } from '@/lib/airport';
import { FLEX_WINDOWS, LUGGAGE_OPTIONS, SHUTTLE_MINUTE_OPTIONS, TRIP_NOTES_MAX_LENGTH } from '@/lib/config';
import { formatDeparture, formatFlex, formatTime } from '@/lib/format';
import { estimatedArrival, isLongTrip, longTripLabel, ROOM_RULE } from '@/lib/long-trip';
import type { TripFormErrors, TripFormValues } from '@/lib/trip-form';

export type TripSection = 'where' | 'airport' | 'long' | 'when' | 'seats' | 'notes' | 'gas';

// Which form fields live in which section (used to open sections that have errors).
const SECTION_FIELDS: Record<TripSection, (keyof TripFormValues)[]> = {
  where: ['from', 'to', 'route'],
  airport: ['flightNumber', 'flightDepartsAt', 'parkingLocation'],
  long: ['overnightStop'],
  when: ['departure'],
  seats: ['seats'],
  notes: ['notes'],
  gas: ['gasPrice'],
};

export function sectionHasError(section: TripSection, errors: TripFormErrors): boolean {
  return SECTION_FIELDS[section].some((field) => errors[field]);
}

export function sectionsWithErrors(errors: TripFormErrors): TripSection[] {
  return (Object.keys(SECTION_FIELDS) as TripSection[]).filter((section) => sectionHasError(section, errors));
}

type Props = {
  values: TripFormValues;
  errors: TripFormErrors;
  set: <K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) => void;
  maxSeats: number;
  minSeats?: number; // can't go below riders already approved
  open: Partial<Record<TripSection, boolean>>;
  toggle: (section: TripSection) => void;
};

export function TripDetailsFields({ values, errors, set, maxSeats, minSeats = 1, open, toggle }: Props) {
  const isAirport = values.to?.isAirport === true;
  const driveMinutes = values.route?.minutes ?? null;
  const shuttleMinutes = values.parking === 'offsite' ? values.shuttleMinutes : 0;
  const luggage = LUGGAGE_OPTIONS.find((option) => option.value === values.luggage)?.label ?? '';

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

  const airportSummary =
    [
      values.flightNumber.trim().toUpperCase() || null,
      values.flightDepartsAt ? `flight at ${formatTime(values.flightDepartsAt)}` : null,
      values.parking === 'offsite' ? 'Park + shuttle' : 'Drop-off at terminal',
    ]
      .filter(Boolean)
      .join(' · ');

  return (
    <View style={styles.group}>
      {isAirport && (
        <FoldSection
          title="Airport"
          icon="airplane-outline"
          summary={airportSummary}
          open={!!open.airport}
          onToggle={() => toggle('airport')}
          hasError={sectionHasError('airport', errors)}>
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
          <SegmentedControl
            options={[
              { value: 'domestic', label: 'Domestic' },
              { value: 'international', label: 'International' },
            ]}
            value={values.flightInternational ? 'international' : 'domestic'}
            onChange={(kind) => set('flightInternational', kind === 'international')}
          />

          <Label>Getting to the terminal</Label>
          <SegmentedControl
            options={[
              { value: 'terminal', label: 'Drop-off', icon: 'airplane-outline' },
              { value: 'offsite', label: 'Park + shuttle', icon: 'bus-outline' },
            ]}
            value={values.parking}
            onChange={(parking) => set('parking', parking)}
          />
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
              <SegmentedControl
                options={SHUTTLE_MINUTE_OPTIONS.map((minutes) => ({ value: minutes as number, label: `${minutes} min` }))}
                value={values.shuttleMinutes}
                onChange={(minutes) => set('shuttleMinutes', minutes)}
              />
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
              <Button title="Use this time" icon="checkmark" variant="secondary" onPress={() => set('departure', suggestion)} />
            </View>
          )}
        </FoldSection>
      )}

      {isLongTrip(driveMinutes) && driveMinutes !== null && (
        <FoldSection
          title="Long drive"
          icon="moon-outline"
          summary={longTripLabel(values.longTripPlan, values.overnightStop.trim() || null) ?? ''}
          open={!!open.long}
          onToggle={() => toggle('long')}
          hasError={sectionHasError('long', errors)}>
          <Body muted>
            This drive is about {Math.round(driveMinutes / 60)} hours. Let riders know your plan.
          </Body>
          <SegmentedControl
            options={[
              { value: 'overnight', label: 'Overnight stop', icon: 'moon-outline' },
              { value: 'straight', label: 'Straight through', icon: 'car-outline' },
            ]}
            value={values.longTripPlan}
            onChange={(plan) => set('longTripPlan', plan)}
          />
          {values.longTripPlan === 'overnight' && (
            <TextField
              label="Roughly where you'll stop (optional)"
              placeholder="e.g. Youngstown, OH"
              value={values.overnightStop}
              onChangeText={(text) => set('overnightStop', text)}
              maxLength={100}
              error={errors.overnightStop}
            />
          )}
          {values.departure && (
            <IconRow
              icon="flag-outline"
              muted
              text={`Arrives around ${formatDeparture(estimatedArrival(values.departure, driveMinutes, values.longTripPlan))}`}
            />
          )}
          <Body muted style={{ fontSize: 14 }}>
            {values.longTripPlan === 'overnight' ? ROOM_RULE : 'Plan a short break every few hours. Breaks are included in the arrival time.'}
          </Body>
        </FoldSection>
      )}

      <FoldSection
        title="When"
        icon="time-outline"
        summary={values.departure ? `${formatDeparture(values.departure)} · ${formatFlex(values.flexMinutes)}` : 'Pick a date and time'}
        open={!!open.when}
        onToggle={() => toggle('when')}
        hasError={sectionHasError('when', errors)}>
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
        <SegmentedControl
          options={FLEX_WINDOWS.map((window) => ({ value: window.minutes, label: window.label }))}
          value={values.flexMinutes}
          onChange={(minutes) => set('flexMinutes', minutes)}
        />
      </FoldSection>

      <FoldSection
        title="Seats & luggage"
        icon="people-outline"
        summary={`${values.seats} ${values.seats === 1 ? 'seat' : 'seats'} · ${luggage}`}
        open={!!open.seats}
        onToggle={() => toggle('seats')}
        hasError={sectionHasError('seats', errors)}>
        <Label>Seats offered</Label>
        <SegmentedControl
          options={Array.from({ length: maxSeats - minSeats + 1 }, (_, i) => i + minSeats).map((count) => ({ value: count, label: String(count) }))}
          value={values.seats}
          onChange={(count) => set('seats', count)}
        />
        {minSeats > 1 && <Body muted>You&apos;ve approved {minSeats} riders, so you can&apos;t offer fewer seats.</Body>}
        <ErrorText>{errors.seats}</ErrorText>
        <Label>Luggage space per rider</Label>
        <View style={styles.chips}>
          {LUGGAGE_OPTIONS.map((option) => (
            <Chip key={option.value} label={option.label} selected={values.luggage === option.value} onPress={() => set('luggage', option.value)} />
          ))}
        </View>
      </FoldSection>

      <FoldSection
        title="Notes"
        icon="chatbox-ellipses-outline"
        summary={values.notes.trim() || 'Optional: meeting spot, stops, rules'}
        open={!!open.notes}
        onToggle={() => toggle('notes')}
        hasError={sectionHasError('notes', errors)}>
        <TextField
          label="Notes for riders"
          placeholder="e.g. Meeting at the north entrance. Can stop for food."
          value={values.notes}
          onChangeText={(text) => set('notes', text)}
          multiline
          maxLength={TRIP_NOTES_MAX_LENGTH}
          error={errors.notes}
        />
      </FoldSection>
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: Spacing.sm,
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
