// Edit trip (drivers): seats, time, flexibility, luggage, notes and airport details.
// The route, pickup spot and gas price stay locked so the price riders saw stays fair.

import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { PriceBreakdown } from '@/components/price-breakdown';
import { sectionsWithErrors, TripDetailsFields, TripSection } from '@/components/trip-details-fields';
import { Body, Button, Card, ErrorText, Heading, Label, Screen } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { payingRiders } from '@/lib/booking';
import { fetchTripSeats } from '@/lib/booking-api';
import { friendlyError } from '@/lib/errors';
import { energy } from '@/lib/fuel';
import { formatMoney } from '@/lib/format';
import type { SeatHold } from '@/lib/seats';
import { toTripUpdate, tripFormFromTrip, TripFormErrors, TripFormValues, validateTripForm } from '@/lib/trip-form';
import { fetchTrip, updateTrip } from '@/lib/trips-api';
import type { TripWithDriver } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function EditTripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { session } = useAuth();
  const [trip, setTrip] = useState<TripWithDriver | null | undefined>(undefined);
  const [holds, setHolds] = useState<SeatHold[]>([]); // seats riders already asked for
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    Promise.all([fetchTrip(id), fetchTripSeats(id).catch(() => [])])
      .then(([result, seatHolds]) => {
        if (stale) return;
        setTrip(result);
        setHolds(seatHolds);
      })
      .catch((err: Error) => {
        if (!stale) setError(friendlyError(err));
      });
    return () => {
      stale = true;
    };
  }, [id]);

  if (error) {
    return (
      <Screen edges={['bottom']}>
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }
  if (trip === undefined) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.xl }} />
      </Screen>
    );
  }
  if (trip === null || trip.driver_id !== session?.user.id) {
    return (
      <Screen edges={['bottom']}>
        <Heading>Can&apos;t edit this trip</Heading>
        <Body muted>Only the driver can change a trip.</Body>
      </Screen>
    );
  }
  return <EditTripForm trip={trip} holds={holds} />;
}

function EditTripForm({ trip, holds }: { trip: TripWithDriver; holds: SeatHold[] }) {
  const [values, setValues] = useState<TripFormValues>(() => tripFormFromTrip(trip));
  const [errors, setErrors] = useState<TripFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  // Which sections are open. Seats start open, since that's the most common edit.
  const [open, setOpen] = useState<Partial<Record<TripSection, boolean>>>({ seats: true });
  function toggle(section: TripSection) {
    setOpen((current) => ({ ...current, [section]: !current[section] }));
  }
  // You can offer up to as many seats as your car has.
  const maxSeats = trip.car?.seats ?? trip.seats_offered;

  function set<K extends keyof TripFormValues>(field: K, value: TripFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function onSave() {
    setSaveError('');
    const found = validateTripForm(values, maxSeats);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setOpen((current) => ({ ...current, ...Object.fromEntries(sectionsWithErrors(found).map((section) => [section, true])) }));
      setSaveError('Please fix the sections outlined in red.');
      return;
    }
    setSaving(true);
    try {
      await updateTrip(trip.id, toTripUpdate(values));
      router.back();
    } catch (err) {
      setSaveError(friendlyError(err, 'Something went wrong. Please try again.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Card>
        <Label>
          {trip.origin_name} → {trip.dest_name}
        </Label>
        <Body muted>
          {trip.route_miles} mi · {energy(trip.fuel).thing} at {formatMoney(trip.gas_price)}/{energy(trip.fuel).unit}. The route,
          pickup spot and {energy(trip.fuel).priceName.toLowerCase()} can&apos;t change after posting, so riders&apos; prices stay fair.
          To change those, cancel and post a new trip. If you update your car&apos;s {energy(trip.fuel).efficiencyUnit} in your
          profile, this trip updates too, as long as nobody has booked yet.
        </Body>
      </Card>

      <TripDetailsFields
        values={values}
        errors={errors}
        set={set}
        maxSeats={maxSeats}
        minSeats={Math.max(trip.seats_booked, 1)}
        holds={holds}
        open={open}
        toggle={toggle}
      />

      <PriceBreakdown
        miles={trip.route_miles}
        mpg={trip.mpg}
        fuel={trip.fuel}
        gasPrice={trip.gas_price}
        seatsOffered={values.seats}
        ridersBooked={payingRiders(trip)}
        viewer="driver"
      />

      <ErrorText>{saveError}</ErrorText>
      <Button title="Save changes" onPress={onSave} loading={saving} />
    </Screen>
  );
}
