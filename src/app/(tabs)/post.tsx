// Screen 4: Post a trip (drivers).
// Pick a pickup spot and destination -> we ask Google for the driving route ->
// the price per seat updates live as you change seats or gas price.

import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { CarIllustration } from '@/components/car-illustration';
import { FoldSection } from '@/components/fold-section';
import { PlaceSearchField } from '@/components/place-search-field';
import { PriceBreakdown } from '@/components/price-breakdown';
import { RouteMap } from '@/components/route-map';
import { sectionHasError, sectionsWithErrors, TripDetailsFields, TripSection } from '@/components/trip-details-fields';
import { Body, Button, Card, Chip, ErrorText, Heading, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PICKUP_SPOTS, Place, QUICK_PICKS } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { carName, efficiencyText, energy, fuelTag, isElectric } from '@/lib/fuel';
import { formatDuration } from '@/lib/format';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { isLongTrip } from '@/lib/long-trip';
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
          <Body muted>We need your car&apos;s MPG (or miles per kWh) and seats to work out a fair split.</Body>
          <Button title="Add my car" onPress={() => router.push('/edit-profile')} />
        </Card>
      </Screen>
    );
  }

  // A new car, or a new fuel or seat layout for it, starts a fresh form.
  return <PostTripForm key={`${car.id}-${car.fuel}-${car.seat_layout}`} car={car} driverId={session!.user.id} />;
}

function PostTripForm({ car, driverId }: { car: Car; driverId: string }) {
  const colors = useTheme();
  const [values, setValues] = useState<TripFormValues>(() => emptyTripForm(car));
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [routeError, setRouteError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  // Which fold-out sections are open. "Where" starts open.
  const [open, setOpen] = useState<Partial<Record<TripSection, boolean>>>({ where: true });

  function toggle(section: TripSection) {
    setOpen((current) => ({ ...current, [section]: !current[section] }));
  }

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

  // When both places are set, ask Google for the driving route. Once it's in,
  // fold up "Where" and open the next section, to guide the driver along.
  useEffect(() => {
    if (!from || !to) return;
    let stale = false;
    computeRoute(from, to)
      .then((route) => {
        if (stale) return;
        setValues((current) => ({ ...current, route }));
        setOpen((current) => ({ ...current, where: false, [to.isAirport ? 'airport' : isLongTrip(route.minutes) ? 'long' : 'when']: true }));
      })
      .catch((err: Error) => {
        if (!stale) setRouteError(friendlyError(err));
      });
    return () => {
      stale = true;
    };
  }, [from, to]);

  const gasPrice = Number(values.gasPrice);
  const power = energy(car.fuel); // gas words, or charging words for electric cars
  const canPrice = values.route !== null && Number.isFinite(gasPrice) && gasPrice > 0;
  const whereSummary =
    from && to
      ? `${from.name} → ${to.name}${values.route ? ` · ${values.route.miles.toFixed(0)} mi` : ''}`
      : from
        ? `${from.name} → choose a destination`
        : 'Pickup spot and destination';

  async function onSubmit() {
    setSaveError('');
    const found = validateTripForm(values, car.seats);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Open every section that has something to fix.
      setOpen((current) => ({ ...current, ...Object.fromEntries(sectionsWithErrors(found).map((section) => [section, true])) }));
      setSaveError('Please fix the sections outlined in red.');
      errorHaptic();
      return;
    }
    setSaving(true);
    try {
      const id = await createTrip(toTripRow(driverId, car, values));
      successHaptic();
      setValues(emptyTripForm(car));
      setOpen({ where: true });
      router.push(`/trip/${id}`);
    } catch (err) {
      errorHaptic();
      setSaveError(friendlyError(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['top']}>
      <Heading>Post a trip</Heading>
      <View style={styles.carRow}>
        <CarIllustration color={car.color} bodyType={car.body_type} width={150} />
        <View style={{ flex: 1 }}>
          <Body muted>You&apos;re driving your</Body>
          <Body style={{ fontWeight: '600' }}>{carName(car)}</Body>
          <Body muted style={{ fontSize: 13 }}>
            {[efficiencyText(car.mpg, car.fuel), fuelTag(car.fuel), `up to ${car.seats} riders`].filter(Boolean).join(' · ')}
          </Body>
        </View>
      </View>

      <FoldSection
        title="Where"
        icon="navigate-outline"
        summary={whereSummary}
        open={!!open.where}
        onToggle={() => toggle('where')}
        hasError={sectionHasError('where', errors) || !!routeError}>
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
      </FoldSection>

      <TripDetailsFields values={values} errors={errors} set={set} maxSeats={car.seats} open={open} toggle={toggle} />

      <FoldSection
        title={power.priceName}
        icon={isElectric(car.fuel) ? 'flash-outline' : 'speedometer-outline'}
        summary={`$${values.gasPrice || '?'} per ${power.unit}`}
        open={!!open.gas}
        onToggle={() => toggle('gas')}
        hasError={sectionHasError('gas', errors)}>
        <TextField
          label={`${power.priceName} ($ per ${power.unit})`}
          value={values.gasPrice}
          onChangeText={(text) => set('gasPrice', text)}
          keyboardType="decimal-pad"
          hint={
            isElectric(car.fuel)
              ? 'About $0.15 charging at home, $0.40+ at fast chargers. Use what you expect to pay.'
              : car.fuel === 'premium'
                ? 'Your car takes premium, which usually costs about $0.70 more per gallon than regular. Use what you\'ll actually pay.'
                : "Pre-filled with the local average. Use what you'll actually pay."
          }
          error={errors.gasPrice}
        />
      </FoldSection>

      {canPrice && values.route ? (
        <PriceBreakdown
          miles={values.route.miles}
          mpg={car.mpg}
          gasPrice={gasPrice}
          fuel={car.fuel}
          seatsOffered={values.seats}
          ridersBooked={0}
          viewer="driver"
        />
      ) : (
        <Card>
          <Body muted>Pick a pickup spot and destination to see the price per seat.</Body>
        </Card>
      )}

      <ErrorText>{saveError}</ErrorText>
      <Button title="Post trip" icon="paper-plane-outline" onPress={onSubmit} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
});
