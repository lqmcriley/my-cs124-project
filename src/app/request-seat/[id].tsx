// Request a seat (riders). Choose where you're getting off, add a note for the
// driver, confirm the parking plan if there is one, and see what you'd pay.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { CarIllustration } from '@/components/car-illustration';
import { PlaceSearchField } from '@/components/place-search-field';
import { SeatMap } from '@/components/seat-map';
import { EmptyState } from '@/components/states';
import { Body, Button, Card, Checkbox, ErrorText, Heading, IconRow, Label, Screen, SegmentedControl, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { terminalArrival } from '@/lib/airport';
import { fetchTripSeats, requestSeat } from '@/lib/booking-api';
import { riderEstimate } from '@/lib/booking';
import type { Place } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { carName, fuelTag } from '@/lib/fuel';
import { firstName, formatDeparture, formatMoney } from '@/lib/format';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { computeRoute } from '@/lib/maps';
import { longTripLabel, ROOM_RULE } from '@/lib/long-trip';
import { freeSeats, layoutSeats, SeatHold, SeatId, seatLabel } from '@/lib/seats';
import { StopParams, stopFromParams } from '@/lib/trip-search';
import { fetchTrip } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';

const MESSAGE_MAX_LENGTH = 300;

export default function RequestSeatScreen() {
  const { id, seat: seatParam, ...stopParams } = useLocalSearchParams<{ id: string; seat?: string } & StopParams>();
  // Coming from an "along the way" search? Start with your stop filled in.
  const stop = stopFromParams(stopParams);
  const colors = useTheme();
  const [trip, setTrip] = useState<TripWithDriver | null | undefined>(undefined);
  const [holds, setHolds] = useState<SeatHold[]>([]); // who holds which seat on the map
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let stale = false;
    Promise.all([fetchTrip(id), fetchTripSeats(id).catch(() => [])])
      .then(([result, seatHolds]) => {
        if (stale) return;
        setTrip(result);
        setHolds(seatHolds);
      })
      .catch((err: Error) => {
        if (!stale) setLoadError(friendlyError(err));
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
  if (trip.is_sample) {
    return (
      <Screen edges={['bottom']}>
        <EmptyState icon="information-circle-outline" title="This is a sample trip" message="It shows how Hitch Illini works, so you can't request a seat. Real trips work exactly like this one." />
      </Screen>
    );
  }
  return <RequestForm trip={trip} holds={holds} initialStop={stop} initialSeat={seatParam ?? null} />;
}

function RequestForm({
  trip,
  holds,
  initialStop,
  initialSeat,
}: {
  trip: TripWithDriver;
  holds: SeatHold[];
  initialStop: Place | null;
  initialSeat: string | null; // tapped on the trip page's seat map
}) {
  const colors = useTheme();
  const layout = trip.seat_layout ?? null;
  const openSeats = trip.open_seats ?? [];
  const free = layout ? freeSeats(layout, openSeats, holds) : [];
  // Start with the seat you tapped on the trip page (if it's still free), or the only one left.
  const [seat, setSeat] = useState<SeatId | null>(
    () => free.find((id) => id === initialSeat) ?? (free.length === 1 ? free[0] : null),
  );
  const [wholeWay, setWholeWay] = useState(initialStop === null);
  const [dropoff, setDropoff] = useState<Place | null>(initialStop);
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
        if (!stale) setDropoffError(friendlyError(err));
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
    if (layout && !seat) {
      setSaveError('Tap the seat you want on the car map.');
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
        seat,
      });
      successHaptic();
      if (trip.is_practice) {
        Alert.alert("You're in!", 'Practice rides are approved right away. On a real trip, the driver approves you first. Open the trip to see your seat and the group chat.');
      }
      router.back();
    } catch (err) {
      errorHaptic();
      setSaveError(friendlyError(err, 'Something went wrong. Please try again.'));
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
        {trip.car && !layout && (
          <View style={{ alignItems: 'center', paddingTop: Spacing.sm }}>
            <CarIllustration color={trip.car.color} bodyType={trip.car.body_type} width={200} />
            <Body muted style={{ fontSize: 14 }}>{carName(trip.car)}</Body>
          </View>
        )}
      </View>

      {layout && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Pick your seat</Label>
          {trip.car && (
            <Body muted style={{ fontSize: 14 }}>{[carName(trip.car), fuelTag(trip.fuel)].filter(Boolean).join(' · ')}</Body>
          )}
          <SeatMap
            layout={layout}
            openSeats={openSeats}
            holds={holds}
            driver={{ name: trip.driver.full_name, avatarUrl: trip.driver.avatar_url }}
            mode="pick"
            selected={seat}
            onPick={(picked) => setSeat(picked === seat ? null : picked)}
          />
          {free.length === 0 ? (
            <ErrorText>Every seat is taken or held right now. Check back later in case someone cancels.</ErrorText>
          ) : (
            seat && (
              <Body style={{ textAlign: 'center', fontWeight: '600' }}>
                {seatLabel(seat)} seat{layoutSeats(layout).find((candidate) => candidate.id === seat)?.cramped ? ' (a bit tight)' : ''}
              </Body>
            )
          )}
        </View>
      )}

      <Card>
        <Label>Before you request</Label>
        {trip.long_trip_plan === 'overnight' && <Body muted>{longTripLabel('overnight', trip.overnight_stop ?? null)}. {ROOM_RULE}</Body>}
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
      <Button
        title={seat ? `Request the ${seatLabel(seat).toLowerCase()} seat` : 'Send request'}
        onPress={onSubmit}
        loading={saving}
        disabled={measuring || (layout !== null && free.length === 0)}
      />
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
