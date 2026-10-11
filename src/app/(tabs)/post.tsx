// Screen 4: Post a trip (drivers).
// Pick a pickup spot and destination -> we ask Google for the driving route ->
// the price per seat updates live as you change seats or gas price.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { PlaceSearchField } from '@/components/place-search-field';
import { PriceBreakdown } from '@/components/price-breakdown';
import { RouteMap } from '@/components/route-map';
import { TripDetailsFields } from '@/components/trip-details-fields';
import { Body, Button, Card, Chip, ErrorText, Heading, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PICKUP_SPOTS, Place, QUICK_PICKS } from '@/lib/config';
import { formatDuration } from '@/lib/format';
import { computeRoute } from '@/lib/maps';
import { emptyTripForm, toTripRow, TripFormErrors, TripFormValues, validateTripForm } from '@/lib/trip-form';
import { createTrip } from '@/lib/trips-api';
import type { Car } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function PostTripScreen() {
  const { session, car } = useAuth();

  if (!car) {
    return (
      <Screen edges={['top']}>
        <Heading>Post a trip</Heading>
        <Card>
          <Body style={{ fontWeight: '700' }}>Add your car first</Body>
          <Body muted>We need your car&apos;s MPG and seats to work out a fair gas split.</Body>
          <Button title="Add my car" onPress={() => router.push('/edit-profile')} />
        </Card>
      </Screen>
    );
  }

  // A new car (different id) starts a fresh form.
  return <PostTripForm key={car.id} car={car} driverId={session!.user.id} />;
}

function PostTripForm({ car, driverId }: { car: Car; driverId: string }) {
  const colors = useTheme();
  const [values, setValues] = useState<TripFormValues>(() => emptyTripForm(car));
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [routeError, setRouteError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  function set<K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  // Changing either place clears the old route; the effect below fetches a new one.
  function setPlace(field: 'from' | 'to', place: Place | null) {
    setValues((current) => ({ ...current, [field]: place, route: null }));
    setErrors((current) => ({ ...current, [field]: undefined, route: undefined }));
    setRouteError('');
  }

  const { from, to } = values;
  const routeLoading = from !== null && to !== null && values.route === null && !routeError;

  // When both places are set, ask Google for the driving route.
  useEffect(() => {
    if (!from || !to) return;
    let stale = false;
    computeRoute(from, to)
      .then((route) => {
        if (!stale) setValues((current) => ({ ...current, route }));
      })
      .catch((err: Error) => {
        if (!stale) setRouteError(err.message);
      });
    return () => {
      stale = true;
    };
  }, [from, to]);

  const gasPrice = Number(values.gasPrice);
  const canPrice = values.route !== null && Number.isFinite(gasPrice) && gasPrice > 0;

  async function onSubmit() {
    setSaveError('');
    const found = validateTripForm(values, car.seats);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    try {
      const id = await createTrip(toTripRow(driverId, car, values));
      setValues(emptyTripForm(car));
      router.push(`/trip/${id}`);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['top']}>
      <Heading>Post a trip</Heading>
      <Body muted>
        Already driving somewhere? Share the seats and split the gas. You&apos;re driving your {car.color} {car.make}{' '}
        {car.model} ({car.mpg} MPG).
      </Body>

      <PlaceSearchField label="Pickup spot" value={from} onChange={(place) => setPlace('from', place)} error={errors.from} placeholder="Or search another spot">
        <View style={styles.chips}>
          {PICKUP_SPOTS.map((spot) => (
            <Chip key={spot.name} label={spot.name} selected={false} onPress={() => setPlace('from', spot)} />
          ))}
        </View>
      </PlaceSearchField>

      <PlaceSearchField label="Going to" value={to} onChange={(place) => setPlace('to', place)} error={errors.to} placeholder="Search a city, address or airport">
        <View style={styles.chips}>
          {QUICK_PICKS.map((pick) => (
            <Chip
              key={pick.name}
              label={pick.name}
              icon={pick.isAirport ? 'airplane-outline' : undefined}
              selected={false}
              onPress={() =>
                setPlace('to', { name: pick.name, address: pick.address, latitude: pick.latitude, longitude: pick.longitude, isAirport: pick.isAirport })
              }
            />
          ))}
        </View>
      </PlaceSearchField>

      {(from || to) && (
        <RouteMap from={from && { ...from, title: from.name }} to={to && { ...to, title: to.name }} route={values.route?.points} />
      )}
      {routeLoading && <ActivityIndicator color={colors.primary} />}
      {values.route && (
        <Body muted>
          {values.route.miles.toFixed(1)} miles · about {formatDuration(values.route.minutes)} driving
        </Body>
      )}
      <ErrorText>{routeError || errors.route}</ErrorText>

      <TripDetailsFields values={values} errors={errors} set={set} maxSeats={car.seats} />

      <TextField
        label="Gas price ($ per gallon)"
        value={values.gasPrice}
        onChangeText={(text) => set('gasPrice', text)}
        keyboardType="decimal-pad"
        hint="Pre-filled with the local average. Use what you'll actually pay."
        error={errors.gasPrice}
      />

      {canPrice && values.route ? (
        <PriceBreakdown miles={values.route.miles} mpg={car.mpg} gasPrice={gasPrice} seatsOffered={values.seats} ridersBooked={0} viewer="driver" />
      ) : (
        <Card>
          <Body muted>Pick a pickup spot and destination to see the price per seat.</Body>
        </Card>
      )}

      <ErrorText>{saveError}</ErrorText>
      <Button title="Post trip" onPress={onSubmit} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
