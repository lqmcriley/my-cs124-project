// Request a seat (riders). Choose where you're getting off, add a note for the
// driver, confirm the parking plan if there is one, and see what you'd pay.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarIllustration } from '@/components/car-illustration';
import { PlaceSearchField } from '@/components/place-search-field';
import { Body, Button, Card, Checkbox, ErrorText, Heading, IconRow, Label, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { terminalArrival } from '@/lib/airport';
import { requestSeat } from '@/lib/booking-api';
import { riderEstimate } from '@/lib/booking';
import type { Place } from '@/lib/config';
import { firstName, formatDeparture, formatMoney } from '@/lib/format';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { computeRoute } from '@/lib/maps';
import { fetchTrip } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';

const MESSAGE_MAX_LENGTH = 300;

export default function RequestSeatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const [trip, setTrip] = useState<TripWithDriver | null | undefined>(undefined);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let stale = false;
    fetchTrip(id)
      .then((result) => {
        if (!stale) setTrip(result);
      })
      .catch((err: Error) => {
        if (!stale) setLoadError(err.message);
      });
    return () => {
      stale = true;
    };
  }, [id]);

  if (loadError) {
    return (
      <Screen edges={['bottom']}>
        <ErrorText>{loadError}</ErrorText>
      </Screen>
    );
  }
  if (!trip) {
    return (
      <Screen edges={['bottom']}>
        {trip === null ? <Body>Trip not found.</Body> : <ActivityIndicator color={colors.primary} size="large" />}
      </Screen>
    );
  }
  return <RequestForm trip={trip} />;
}

function RequestForm({ trip }: { trip: TripWithDriver }) {
  const colors = useTheme();
  const [wholeWay, setWholeWay] = useState(true);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [dropoffMiles, setDropoffMiles] = useState<number | null>(null);
  const [dropoffError, setDropoffError] = useState('');
  const [message, setMessage] = useState('');
  const [parkingOk, setParkingOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Getting off early: measure the drive from the pickup spot to your drop-off.
  useEffect(() => {
    if (wholeWay || !dropoff) return;
    let stale = false;
    computeRoute({ latitude: trip.origin_lat, longitude: trip.origin_lng }, dropoff)
      .then((route) => {
        if (stale) return;
        if (route.miles > trip.route_miles + 1) {
          setDropoffError(`That's farther than ${trip.dest_name}. Pick a stop along the way.`);
        } else {
          setDropoffMiles(route.miles);
        }
      })
      .catch((err: Error) => {
        if (!stale) setDropoffError(err.message);
      });
    return () => {
      stale = true;
    };
  }, [wholeWay, dropoff, trip]);

  function chooseDropoff(place: Place | null) {
    setDropoff(place);
    setDropoffMiles(null);
    setDropoffError('');
  }

  const riderMiles = wholeWay ? null : dropoffMiles;
  const measuring = !wholeWay && dropoff !== null && dropoffMiles === null && !dropoffError;
  const estimate = wholeWay || dropoffMiles !== null ? riderEstimate(trip, riderMiles) : null;
  const needsParkingOk = trip.parking === 'offsite';
  const arrival =
    trip.is_airport && trip.route_minutes
      ? terminalArrival({ departure: new Date(trip.departure_at), driveMinutes: trip.route_minutes, shuttleMinutes: trip.shuttle_minutes })
      : null;

  async function onSubmit() {
    setSaveError('');
    if (!wholeWay && dropoffMiles === null) {
      setSaveError('Choose where you are getting off, or pick "The whole way".');
      return;
    }
    if (needsParkingOk && !parkingOk) {
      setSaveError('Please confirm the parking and shuttle plan.');
      return;
    }
    setSaving(true);
    try {
      await requestSeat({
        tripId: trip.id,
        dropoff: wholeWay ? null : dropoff,
        riderMiles,
        message,
        parkingAcknowledged: parkingOk,
      });
      successHaptic();
      router.back();
    } catch (err) {
      errorHaptic();
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <View style={{ gap: Spacing.xs }}>
        <Heading style={{ fontSize: 22 }}>
          {trip.origin_name} → {trip.dest_name}
        </Heading>
        <IconRow icon="time-outline" text={`Leaves ${formatDeparture(new Date(trip.departure_at))}`} />
        {arrival && <IconRow icon="airplane-outline" text={`At the terminal around ${formatDeparture(arrival)}`} />}
        <IconRow icon="person-outline" text={`Driving: ${trip.driver.full_name}`} />
        {trip.car && (
          <View style={{ alignItems: 'center', paddingTop: Spacing.sm }}>
            <CarIllustration color={trip.car.color} bodyType={trip.car.body_type} width={200} />
            <Body muted style={{ fontSize: 14 }}>
              {trip.car.color} {trip.car.make} {trip.car.model}
            </Body>
          </View>
        )}
      </View>

      <Card>
        <Label>Before you request</Label>
        <Body muted>
          Once you&apos;re approved, you can cancel for free until 24 hours before the trip. After that it counts as a late cancel on
          your reliability, and you still owe your share so the others don&apos;t pay more.
        </Body>
      </Card>

      <Label>Where are you getting off?</Label>
      <SegmentedControl
        options={[
          { value: 'whole', label: `All the way` },
          { value: 'early', label: 'Get off early' },
        ]}
        value={wholeWay ? 'whole' : 'early'}
        onChange={(choice) => setWholeWay(choice === 'whole')}
      />
      {!wholeWay && (
        <>
          <PlaceSearchField label="Drop-off" value={dropoff} onChange={chooseDropoff} placeholder="Search a town or address on the way" />
          {measuring && <ActivityIndicator color={colors.primary} />}
          {dropoffMiles !== null && (
            <Body muted>
              {dropoffMiles.toFixed(1)} of {trip.route_miles} miles. You only pay for your part.
            </Body>
          )}
          <ErrorText>{dropoffError}</ErrorText>
        </>
      )}

      {needsParkingOk && (
        <Card>
          <Label>Parking + shuttle plan</Label>
          <Body>
            {firstName(trip.driver.full_name)} is parking at {trip.parking_location}. Everyone takes the shuttle from there,
            about {trip.shuttle_minutes} min to the terminal.
          </Body>
          <Checkbox label="I understand and I'm OK with this plan" checked={parkingOk} onChange={setParkingOk} />
        </Card>
      )}

      <TextField
        label={`Note for ${firstName(trip.driver.full_name)} (optional)`}
        placeholder="e.g. I have one carry-on. My flight is at 10:15."
        value={message}
        onChangeText={setMessage}
        multiline
        maxLength={MESSAGE_MAX_LENGTH}
      />

      {estimate && (
        <Card>
          <View style={styles.priceRow}>
            <Text style={[styles.price, { color: colors.text }]}>{formatMoney(estimate.now)}</Text>
            <Body muted>if you&apos;re approved now</Body>
          </View>
          {estimate.ifFull < estimate.now && (
            <Text style={{ color: colors.success, fontWeight: '600' }}>Drops to {formatMoney(estimate.ifFull)} if the car fills up</Text>
          )}
          <Body muted style={{ fontSize: 13 }}>
            You&apos;ll pay your share of the gas based on who actually rides. Nothing is charged in the app.
          </Body>
        </Card>
      )}

      <ErrorText>{saveError}</ErrorText>
      <Button title="Send request" onPress={onSubmit} loading={saving} disabled={measuring} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
  },
});
