// Screen 5: Trip detail. Route map, airport + parking info, driver and car,
// booked riders, price breakdown, and booking:
//   riders  -> request a seat, see your status, cancel
//   drivers -> approve/decline requests (screen 6), edit or cancel the trip

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PriceBreakdown } from '@/components/price-breakdown';
import { RouteMap } from '@/components/route-map';
import { Badge, Body, Button, Card, ErrorText, Heading, IconRow, Label, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { terminalArrival } from '@/lib/airport';
import { isUpcoming, REQUEST_STATUS_TEXT, requestBlocker, riderEstimate } from '@/lib/booking';
import { cancelRequest, cancelTrip, fetchMyRequest, fetchRequestsForTrip, fetchTripRiders, respondToRequest } from '@/lib/booking-api';
import { LUGGAGE_OPTIONS } from '@/lib/config';
import { firstName, formatDeparture, formatDuration, formatFlex, formatMoney } from '@/lib/format';
import { decodePolyline } from '@/lib/geo';
import { fetchTrip } from '@/lib/trips-api';
import type { RequestWithRider, TripRequest, TripRider, TripWithDriver } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type Loaded = {
  trip: TripWithDriver | null;
  riders: TripRider[];
  requests: RequestWithRider[]; // driver only
  myRequest: TripRequest | null; // rider only
  loadedAt: Date; // "now" for deciding if the trip has left
};

async function loadTripPage(tripId: string, userId: string): Promise<Loaded> {
  const trip = await fetchTrip(tripId);
  const loadedAt = new Date();
  if (!trip) return { trip: null, riders: [], requests: [], myRequest: null, loadedAt };
  const isDriver = trip.driver_id === userId;
  const [riders, requests, myRequest] = await Promise.all([
    fetchTripRiders(tripId),
    isDriver ? fetchRequestsForTrip(tripId) : Promise.resolve([]),
    isDriver ? Promise.resolve(null) : fetchMyRequest(tripId, userId),
  ]);
  return { trip, riders, requests, myRequest, loadedAt };
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [data, setData] = useState<Loaded | undefined>(undefined); // undefined = loading
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null); // which action is running
  const [actionError, setActionError] = useState('');

  const reload = useCallback(
    () =>
      loadTripPage(id, userId)
        .then((result) => {
          setData(result);
          setError('');
        })
        .catch((err: Error) => setError(err.message)),
    [id, userId],
  );

  // Reload whenever this screen comes into view (after editing, requesting, etc.).
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  // Run a booking action, then refresh the page.
  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setActionError('');
    try {
      await action();
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  function confirm(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
    Alert.alert(title, message, [
      { text: 'Keep it', style: 'cancel' },
      { text: confirmLabel, style: 'destructive', onPress: onConfirm },
    ]);
  }

  if (error && !data) {
    return (
      <Screen edges={['bottom']}>
        <ErrorText>{error}</ErrorText>
      </Screen>
    );
  }
  if (data === undefined) {
    return (
      <Screen edges={['bottom']}>
        <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.xl }} />
      </Screen>
    );
  }
  const { trip, riders, requests, myRequest, loadedAt } = data;
  if (!trip) {
    return (
      <Screen edges={['bottom']}>
        <Heading>Trip not found</Heading>
        <Body muted>It may have been removed.</Body>
      </Screen>
    );
  }

  const isMyTrip = trip.driver_id === userId;
  const seatsLeft = trip.seats_offered - trip.seats_booked;
  const departure = new Date(trip.departure_at);
  const luggage = LUGGAGE_OPTIONS.find((option) => option.value === trip.luggage)?.label ?? trip.luggage;
  const details = [trip.driver.year, trip.driver.major].filter(Boolean).join(' · ');
  const arrival =
    trip.is_airport && trip.route_minutes
      ? terminalArrival({ departure, driveMinutes: trip.route_minutes, shuttleMinutes: trip.shuttle_minutes })
      : null;
  const pendingRequests = requests.filter((request) => request.status === 'pending');
  const blocker = requestBlocker(trip, userId, myRequest, loadedAt);
  const myRequestOpen = myRequest?.status === 'pending' || myRequest?.status === 'approved';
  const canCancelTrip = isMyTrip && isUpcoming(trip, loadedAt);

  return (
    <Screen edges={['bottom']}>
      <RouteMap
        from={{ latitude: trip.origin_lat, longitude: trip.origin_lng, title: trip.origin_name }}
        to={{ latitude: trip.dest_lat, longitude: trip.dest_lng, title: trip.dest_name }}
        route={trip.route_polyline ? decodePolyline(trip.route_polyline) : undefined}
        height={240}
      />

      <View style={{ gap: Spacing.xs }}>
        <Heading style={{ fontSize: 22 }}>
          {trip.origin_name} → {trip.dest_name}
        </Heading>
        {trip.status === 'cancelled' && <ErrorText>This trip was cancelled by the driver.</ErrorText>}
        <IconRow icon="time-outline" text={`Leaves ${formatDeparture(departure)} (${formatFlex(trip.flex_minutes)})`} />
        {arrival && <IconRow icon="airplane-outline" text={`At the terminal around ${formatDeparture(arrival)}`} />}
        <IconRow icon="location-outline" text={`Pickup: ${trip.pickup_spot}`} />
        <IconRow icon="flag-outline" text={trip.dest_address} />
        <IconRow
          icon="car-outline"
          text={`${trip.route_miles} mi${trip.route_minutes ? ` · about ${formatDuration(trip.route_minutes)} driving` : ''}`}
        />
        <IconRow icon="people-outline" text={seatsLeft > 0 ? `${seatsLeft} of ${trip.seats_offered} seats left` : 'Full'} />
        <IconRow icon="briefcase-outline" text={`Luggage: ${luggage}`} />
      </View>

      {/* Rider: your request */}
      {!isMyTrip && myRequest && (
        <Card>
          <View style={styles.spread}>
            <Label>Your request</Label>
            <Badge label={REQUEST_STATUS_TEXT[myRequest.status]} tone={statusTone(myRequest.status)} />
          </View>
          {myRequest.dropoff_name && <IconRow icon="flag-outline" text={`Getting off at ${myRequest.dropoff_name}`} />}
          {myRequestOpen && (
            <Body muted>
              Your share right now: about {formatMoney(riderEstimate(trip, myRequest.rider_miles, myRequest.status === 'approved').now)}. It drops if more riders join.
            </Body>
          )}
          {myRequest.status === 'approved' && (
            <Body muted>Group chat and payment arrive in the next update. Meet at {trip.pickup_spot}.</Body>
          )}
          {myRequestOpen && trip.status === 'scheduled' && (
            <Button
              title={myRequest.status === 'approved' ? 'Leave this trip' : 'Cancel request'}
              variant="secondary"
              loading={busy === 'cancel-request'}
              onPress={() =>
                confirm(
                  myRequest.status === 'approved' ? 'Leave this trip?' : 'Cancel your request?',
                  `${firstName(trip.driver.full_name)} will see that you're no longer coming.`,
                  myRequest.status === 'approved' ? 'Leave trip' : 'Cancel request',
                  () => run('cancel-request', () => cancelRequest(myRequest.id)),
                )
              }
            />
          )}
        </Card>
      )}

      {/* Driver: requests waiting for an answer (screen 6) */}
      {isMyTrip && pendingRequests.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Requests waiting for you ({pendingRequests.length})</Label>
          {pendingRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              trip={trip}
              busy={busy}
              onApprove={() => run(`approve-${request.id}`, () => respondToRequest(request.id, true))}
              onDecline={() => run(`decline-${request.id}`, () => respondToRequest(request.id, false))}
            />
          ))}
        </View>
      )}
      <ErrorText>{actionError}</ErrorText>

      {trip.parking === 'offsite' && (
        <View style={[styles.headsUp, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Ionicons name="bus-outline" size={20} color={colors.primary} />
            <Label>Heads up: parking + shuttle</Label>
          </View>
          <Body>
            {firstName(trip.driver.full_name)} is parking at {trip.parking_location}. Everyone takes the shuttle from there,
            about {trip.shuttle_minutes} min to the terminal. That time is already included above.
          </Body>
        </View>
      )}

      {trip.is_airport && (trip.flight_number || trip.flight_departs_at) && (
        <Card>
          <Label>Driver&apos;s flight</Label>
          <IconRow
            icon="airplane-outline"
            text={[
              trip.flight_number,
              trip.flight_departs_at ? `departs ${formatDeparture(new Date(trip.flight_departs_at))}` : null,
              trip.flight_international ? 'international' : 'domestic',
            ]
              .filter(Boolean)
              .join(' · ')}
          />
          {!isMyTrip && <Body muted style={{ fontSize: 13 }}>Check this lines up with your own flight before you request a seat.</Body>}
        </Card>
      )}

      {trip.notes ? (
        <Card>
          <Label>Driver&apos;s notes</Label>
          <Body>{trip.notes}</Body>
        </Card>
      ) : null}

      <Card>
        <Label>Driver</Label>
        <View style={styles.person}>
          <Avatar uri={trip.driver.avatar_url} name={trip.driver.full_name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.text }]}>{trip.driver.full_name}</Text>
            {details ? <Body muted>{details}</Body> : null}
            <Body muted>New driver</Body>
          </View>
        </View>
        {trip.driver.bio ? <Body>{trip.driver.bio}</Body> : null}
        <IconRow
          muted
          icon={trip.driver.chat_preference === 'quiet' ? 'volume-mute-outline' : 'chatbubbles-outline'}
          text={trip.driver.chat_preference === 'quiet' ? 'Prefers a quiet ride' : 'Down to talk'}
        />
        {trip.car ? (
          <IconRow muted icon="car-sport-outline" text={`${trip.car.color} ${trip.car.make} ${trip.car.model} · Plate ${trip.car.plate}`} />
        ) : null}
      </Card>

      <Card>
        <Label>Riders</Label>
        {riders.length === 0 ? (
          <Body muted>No riders booked yet.</Body>
        ) : (
          <View style={styles.riders}>
            {riders.map((rider) => (
              <View key={rider.rider_id} style={styles.rider}>
                <Avatar uri={rider.avatar_url} name={rider.first_name} size={48} />
                <Body style={{ fontSize: 13 }}>{rider.first_name}</Body>
              </View>
            ))}
          </View>
        )}
      </Card>

      <PriceBreakdown
        miles={trip.route_miles}
        mpg={trip.mpg}
        gasPrice={trip.gas_price}
        seatsOffered={trip.seats_offered}
        ridersBooked={trip.seats_booked}
        viewer={isMyTrip ? 'driver' : 'rider'}
      />

      {/* Bottom actions */}
      {isMyTrip ? (
        canCancelTrip && (
          <View style={{ gap: Spacing.sm }}>
            <Button title="Edit trip" variant="secondary" onPress={() => router.push(`/edit-trip/${trip.id}`)} />
            <Button
              title="Cancel trip"
              variant="ghost"
              loading={busy === 'cancel-trip'}
              onPress={() =>
                confirm(
                  'Cancel this trip?',
                  trip.seats_booked > 0
                    ? `${trip.seats_booked} booked ${trip.seats_booked === 1 ? 'rider' : 'riders'} will see it was cancelled. This can't be undone.`
                    : "This can't be undone.",
                  'Cancel trip',
                  () => run('cancel-trip', () => cancelTrip(trip.id)),
                )
              }
            />
          </View>
        )
      ) : !myRequestOpen ? (
        blocker ? (
          <Body muted style={{ textAlign: 'center' }}>
            {blocker}
          </Body>
        ) : (
          <Button title={`Request a seat with ${firstName(trip.driver.full_name)}`} onPress={() => router.push(`/request-seat/${trip.id}`)} />
        )
      ) : null}
    </Screen>
  );
}

function statusTone(status: TripRequest['status']) {
  return status === 'approved' ? 'good' : status === 'declined' ? 'bad' : status === 'pending' ? 'waiting' : 'neutral';
}

// One rider's request, with Approve / Decline buttons for the driver.
function RequestCard({
  request,
  trip,
  busy,
  onApprove,
  onDecline,
}: {
  request: RequestWithRider;
  trip: TripWithDriver;
  busy: string | null;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const colors = useTheme();
  const details = [request.rider.year, request.rider.major].filter(Boolean).join(' · ');
  const estimate = riderEstimate(trip, request.rider_miles);
  const full = trip.seats_booked >= trip.seats_offered;
  return (
    <Card>
      <View style={styles.person}>
        <Avatar uri={request.rider.avatar_url} name={request.rider.full_name} size={48} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>{request.rider.full_name}</Text>
          {details ? <Body muted>{details}</Body> : null}
        </View>
      </View>
      <IconRow
        icon="flag-outline"
        text={request.dropoff_name ? `Getting off at ${request.dropoff_name} (${request.rider_miles} mi)` : 'Riding the whole way'}
      />
      <IconRow icon="cash-outline" text={`Would pay about ${formatMoney(estimate.now)}`} />
      {request.parking_acknowledged && <IconRow icon="checkmark-circle-outline" text="OK with the parking + shuttle plan" />}
      {request.message ? <Body style={{ fontStyle: 'italic' }}>&ldquo;{request.message}&rdquo;</Body> : null}
      {full && <Body muted>Your car is full. Add a seat in Edit trip to approve more riders.</Body>}
      <View style={styles.buttons}>
        <View style={{ flex: 1 }}>
          <Button title="Decline" variant="secondary" onPress={onDecline} loading={busy === `decline-${request.id}`} disabled={busy !== null} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Approve" onPress={onApprove} loading={busy === `approve-${request.id}`} disabled={busy !== null || full} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
  },
  spread: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headsUp: {
    borderWidth: 2,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  riders: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  rider: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
