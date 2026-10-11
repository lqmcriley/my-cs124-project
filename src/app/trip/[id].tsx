// Screen 5: Trip detail. Route map, airport + parking info, driver and car,
// booked riders, price breakdown, and booking:
//   riders  -> request a seat, see your status, cancel
//   drivers -> approve/decline requests (screen 6), edit or cancel the trip

import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Linking, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AnimatedItem, PressableScale } from '@/components/motion';
import { PayButtons } from '@/components/pay-buttons';
import { PriceBreakdown } from '@/components/price-breakdown';
import { CarIllustration } from '@/components/car-illustration';
import { OdometerCard } from '@/components/odometer-card';
import { showPersonActions } from '@/components/person-actions';
import { SafetyCard } from '@/components/safety-card';
import { ReliabilityBadge } from '@/components/reliability-badge';
import { VibeMeters } from '@/components/vibes';
import { RouteMap } from '@/components/route-map';
import { Badge, Body, Button, Card, ErrorText, Heading, IconRow, Label, Screen, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { terminalArrival } from '@/lib/airport';
import {
  isUpcoming,
  fairSplit,
  isWithin24Hours,
  payingRiders,
  paymentNote,
  REQUEST_STATUS_TEXT,
  requestBlocker,
  riderEstimate,
} from '@/lib/booking';
import {
  cancelRequest,
  cancelTrip,
  fetchMyRequest,
  fetchPaymentHandles,
  fetchTripSplit,
  fetchRequestsForTrip,
  fetchTripRiders,
  reportDriverNoShow,
  respondToRequest,
  setNoShow,
  setRequestPaid,
  SplitRow,
} from '@/lib/booking-api';
import { LUGGAGE_OPTIONS } from '@/lib/config';
import { firstName, formatDeparture, formatDuration, formatFlex, formatMoney } from '@/lib/format';
import { decodePolyline } from '@/lib/geo';
import { errorHaptic, successHaptic, tapHaptic } from '@/lib/haptics';
import type { PaymentMethods } from '@/lib/payments';
import type { Reliability } from '@/lib/reliability';
import { fetchReliability } from '@/lib/reliability-api';
import { canReviewNow, formatRating, RatingSummary } from '@/lib/reviews';
import { fetchMyReviewsForTrip, fetchRatingSummary } from '@/lib/reviews-api';
import { fetchTripContacts, TripContact } from '@/lib/safety-api';
import { formatPhone } from '@/lib/phone';
import { alongTheWay, StopParams, stopFromParams, stopToParams } from '@/lib/trip-search';
import { fetchTrip } from '@/lib/trips-api';
import type { Stretch } from '@/lib/pricing';
import type { RequestWithRider, TripRequest, TripRider, TripWithDriver } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type Loaded = {
  trip: TripWithDriver | null;
  riders: TripRider[];
  requests: RequestWithRider[]; // driver only
  myRequest: TripRequest | null; // rider only
  handles: PaymentMethods | null; // driver's pay handles, approved riders only
  reliability: Record<string, Reliability>; // driver + people requesting
  ratings: Record<string, RatingSummary>; // star ratings for the same people
  contacts: TripContact[]; // phone numbers, only for people in the car
  reviewedCount: number; // how many people you've already rated on this trip
  split: SplitRow[]; // how far each paying rider rides (riders only; drivers use requests)
  loadedAt: Date; // "now" for deciding if the trip has left
};

async function loadTripPage(tripId: string, userId: string): Promise<Loaded> {
  const trip = await fetchTrip(tripId);
  const loadedAt = new Date();
  if (!trip) return { trip: null, riders: [], requests: [], myRequest: null, handles: null, reliability: {}, ratings: {}, contacts: [], reviewedCount: 0, split: [], loadedAt };
  const isDriver = trip.driver_id === userId;
  const [riders, requests, myRequest] = await Promise.all([
    fetchTripRiders(tripId),
    isDriver ? fetchRequestsForTrip(tripId) : Promise.resolve([]),
    isDriver ? Promise.resolve(null) : fetchMyRequest(tripId, userId),
  ]);
  const owes = myRequest !== null && (myRequest.status === 'approved' || myRequest.late_cancel);
  const inCar = isDriver || myRequest?.status === 'approved';
  const people = [trip.driver_id, ...requests.map((request) => request.rider_id), ...riders.map((rider) => rider.rider_id)];
  const [handles, reliability, ratings, contacts, myReviews, split] = await Promise.all([
    owes ? fetchPaymentHandles(tripId) : Promise.resolve(null),
    fetchReliability(people),
    fetchRatingSummary(people),
    inCar ? fetchTripContacts(tripId) : Promise.resolve([]),
    inCar ? fetchMyReviewsForTrip(tripId, userId) : Promise.resolve([]),
    owes ? fetchTripSplit(tripId) : Promise.resolve([]),
  ]);
  return { trip, riders, requests, myRequest, handles, reliability, ratings, contacts, reviewedCount: myReviews.length, split, loadedAt };
}

export default function TripDetailScreen() {
  const { id, ...stopParams } = useLocalSearchParams<{ id: string } & StopParams>();
  // Set when you came here from a search for a stop this trip passes on the way.
  const stop = stopFromParams(stopParams);
  const colors = useTheme();
  const { session, phone: myPhone } = useAuth();
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

  // Run a booking action, then refresh the page. Approving and marking paid get
  // a "success" vibration; everything else (decline, cancel, undo) a light tap.
  async function run(key: string, action: () => Promise<void>) {
    setBusy(key);
    setActionError('');
    try {
      await action();
      if (key.startsWith('approve') || key.startsWith('paid')) successHaptic();
      else tapHaptic();
      await reload();
    } catch (err) {
      errorHaptic();
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
  const { trip, riders, requests, myRequest, handles, reliability, ratings, contacts, reviewedCount, split, loadedAt } = data;
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
  const departed = departure.getTime() <= loadedAt.getTime(); // payments open once the trip leaves
  const approvedRequests = requests.filter((request) => request.status === 'approved');
  // Everyone who owes a share: approved riders plus late cancellers.
  const payingRequests = requests.filter((request) => request.status === 'approved' || request.late_cancel);
  const iOwe = myRequest !== null && (myRequest.status === 'approved' || myRequest.late_cancel);
  const driverName = firstName(trip.driver.full_name);
  const lateNow = isWithin24Hours(trip, loadedAt);
  const cancelCutoff = new Date(departure.getTime() - 24 * 60 * 60 * 1000);
  // No-shows can be reported for 7 days after the trip leaves.
  const canReport = departed && loadedAt.getTime() - departure.getTime() < 7 * 24 * 60 * 60 * 1000;
  const canCancelTrip = isMyTrip && isUpcoming(trip, loadedAt);
  const inCar = isMyTrip || myRequest?.status === 'approved';
  // The fair gas split: each stretch of road shared by whoever is in the car for it.
  const legs = isMyTrip
    ? payingRequests.map((request) => ({ id: request.id, miles: request.rider_miles }))
    : split.map((row) => ({ id: row.request_id, miles: row.rider_miles }));
  const gasSplit = fairSplit(trip, legs);
  const myShare = myRequest ? (gasSplit.shares[myRequest.id] ?? 0) : 0;
  const myStretches = myRequest ? gasSplit.stretches.filter((stretch) => stretch.riderIds.includes(myRequest.id)) : [];
  const along = stop && !isMyTrip ? alongTheWay(trip, stop) : null;

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

      {/* You searched for a stop this trip passes on the way */}
      {along && stop && !myRequestOpen && (
        <View style={[styles.headsUp, { borderColor: colors.primary, backgroundColor: colors.card }]}>
          <View style={styles.row}>
            <Ionicons name="git-branch-outline" size={20} color={colors.primary} />
            <Label>Getting off at {stop.name}?</Label>
          </View>
          <Body>
            This trip passes about {Math.max(1, Math.round(along.distanceMiles))} mi from {stop.name} on the way to {trip.dest_name}. You&apos;d ride
            about {Math.round(along.riderMiles)} mi and pay only for your part, about{' '}
            {formatMoney(riderEstimate(trip, along.riderMiles).now)}.
          </Body>
          <Body muted style={{ fontSize: 13 }}>
            The driver drops you on their route, near {stop.name}. Confirm the exact spot with them in the group chat.
          </Body>
        </View>
      )}

      {/* Rider: your request */}
      {!isMyTrip && myRequest && (
        <Card>
          <View style={styles.spread}>
            <Label>Your request</Label>
            <Badge
              label={myRequest.late_cancel ? 'Late cancel' : REQUEST_STATUS_TEXT[myRequest.status]}
              tone={myRequest.late_cancel ? 'bad' : statusTone(myRequest.status)}
            />
          </View>
          {myRequest.dropoff_name && <IconRow icon="flag-outline" text={`Getting off at ${myRequest.dropoff_name}`} />}
          {myRequestOpen && !departed && (
            <Body muted>
              Your share right now: about {formatMoney(riderEstimate(trip, myRequest.rider_miles, myRequest.status === 'approved').now)}. It drops if more riders join.
            </Body>
          )}
          {myRequest.status === 'approved' && !departed && (
            <IconRow
              muted
              icon={lateNow ? 'alert-circle-outline' : 'shield-checkmark-outline'}
              text={lateNow ? 'Less than 24 hours to go: cancelling now counts as a late cancel.' : `Free to cancel until ${formatDeparture(cancelCutoff)}`}
            />
          )}
          {myRequest.status === 'approved' && (
            <Button title="Open group chat" variant="secondary" onPress={() => router.push(`/chat/${trip.id}`)} />
          )}
          {myRequestOpen && trip.status === 'scheduled' && !departed && (
            <Button
              title={myRequest.status === 'approved' ? 'Leave this trip' : 'Cancel request'}
              variant="secondary"
              loading={busy === 'cancel-request'}
              onPress={() =>
                confirm(
                  myRequest.status === 'approved' ? 'Leave this trip?' : 'Cancel your request?',
                  myRequest.status === 'approved' && lateNow
                    ? `It's less than 24 hours before the trip, so this counts as a late cancel on your reliability. You'll still owe your share (about ${formatMoney(riderEstimate(trip, myRequest.rider_miles, true).now)}) so the others don't pay more.`
                    : `${driverName} will see that you're no longer coming.${myRequest.status === 'approved' ? ' Cancelling more than 24 hours ahead is free.' : ''}`,
                  myRequest.status === 'approved' ? 'Leave trip' : 'Cancel request',
                  () => run('cancel-request', () => cancelRequest(myRequest.id)),
                )
              }
            />
          )}
        </Card>
      )}

      {/* People in the car: phone numbers, safety tools */}
      {inCar && trip.status !== 'cancelled' && <ContactCard contacts={contacts} hasOwnPhone={!!myPhone} />}
      {inCar && trip.status !== 'cancelled' && <SafetyCard trip={trip} arrival={arrival} />}

      {/* After the trip: rate everyone in the car (screen 9) */}
      {inCar && canReviewNow(trip, loadedAt) && (
        <Card>
          <Label>Rate your trip</Label>
          <Body muted style={{ fontSize: 14 }}>
            {reviewedCount > 0 ? 'Thanks for rating! You can still rate anyone you skipped.' : 'How did it go? Your ratings help other students choose who to ride with.'}
          </Body>
          <Button title={reviewedCount > 0 ? 'Rate the others' : 'Rate your trip'} icon="star-outline" onPress={() => router.push(`/review/${trip.id}`)} />
        </Card>
      )}

      {inCar && trip.status !== 'cancelled' && <OdometerCard tripId={trip.id} isDriver={isMyTrip} />}

      {/* Rider: pay the driver once the trip has left (late cancellers too) */}
      {!isMyTrip && myRequest && iOwe && trip.status !== 'cancelled' && (
        <Card>
          <Label>Pay {driverName}</Label>
          {myRequest.driver_no_show ? (
            <>
              <IconRow icon="alert-circle-outline" text={`You reported that ${driverName} didn't show up, so you don't need to pay.`} />
              {canReport && (
                <Button
                  title="Undo report"
                  variant="ghost"
                  loading={busy === 'driver-no-show'}
                  onPress={() => run('driver-no-show', () => reportDriverNoShow(trip.id, false))}
                />
              )}
            </>
          ) : !departed ? (
            <Body muted>
              {myRequest.late_cancel
                ? `You cancelled within 24 hours, so you still owe your share so the others don't pay more. After the trip leaves, you can pay ${driverName} right here.`
                : `After the ride, you'll pay your share right here, about ${formatMoney(riderEstimate(trip, myRequest.rider_miles, true).now)} based on who's riding now.`}
            </Body>
          ) : myRequest.paid_at ? (
            <IconRow icon="checkmark-circle" text={`Paid. ${driverName} marked your ${formatMoney(myShare)} as received.`} />
          ) : (
            <>
              <View style={styles.amountRow}>
                <Text style={[styles.amount, { color: colors.text }]}>{formatMoney(myShare)}</Text>
                <Body muted>your share of the gas</Body>
              </View>
              <StretchBreakdown stretches={myStretches} />
              <Body muted style={{ fontSize: 13 }}>
                Each stretch of road is split between whoever was in the car for it. {driverName} will mark you paid.
              </Body>
              <PayButtons handles={handles} amount={myShare} note={paymentNote(trip)} driverName={driverName} />
              {myRequest.status === 'approved' && canReport && (
                <Button
                  title={`${driverName} didn't show up?`}
                  variant="ghost"
                  loading={busy === 'driver-no-show'}
                  onPress={() =>
                    confirm(
                      `Report that ${driverName} didn't show?`,
                      "This counts against their reliability, and you won't be asked to pay. Only report it if the trip didn't happen.",
                      'Report',
                      () => run('driver-no-show', () => reportDriverNoShow(trip.id, true)),
                    )
                  }
                />
              )}
            </>
          )}
        </Card>
      )}

      {/* Driver: group chat and payments */}
      {isMyTrip && approvedRequests.length > 0 && trip.status !== 'cancelled' && (
        <Button title="Open group chat" variant="secondary" onPress={() => router.push(`/chat/${trip.id}`)} />
      )}
      {isMyTrip && departed && payingRequests.length > 0 && trip.status !== 'cancelled' && (
        <Card>
          <Label>Payments</Label>
          <Body muted style={{ fontSize: 13 }}>
            Each stretch of road is split between whoever was in the car for it, including you. Tap Mark paid when the money arrives. If a rider never came, tap No-show.
          </Body>
          {payingRequests.map((request) => (
            <View key={request.id} style={{ gap: Spacing.xs }}>
              <View style={styles.paymentRow}>
                <Avatar uri={request.rider.avatar_url} name={request.rider.full_name} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{request.rider.full_name}</Text>
                  <Body muted style={{ fontSize: 14 }}>
                    {formatMoney(gasSplit.shares[request.id] ?? 0)}
                    {request.paid_at ? ' · Paid' : ' · Not paid yet'}
                    {request.late_cancel ? ' · Late cancel' : ''}
                    {request.no_show ? ' · No-show' : ''}
                  </Body>
                  {request.driver_no_show && <Body style={{ fontSize: 13, color: colors.danger }}>Reported that you didn&apos;t show</Body>}
                </View>
                <View style={{ width: 120 }}>
                  <Button
                    title={request.paid_at ? 'Undo' : 'Mark paid'}
                    variant={request.paid_at ? 'ghost' : 'primary'}
                    loading={busy === `${request.paid_at ? 'unpay' : 'paid'}-${request.id}`}
                    disabled={busy !== null}
                    onPress={() => run(`${request.paid_at ? 'unpay' : 'paid'}-${request.id}`, () => setRequestPaid(request.id, !request.paid_at))}
                  />
                </View>
              </View>
              {request.status === 'approved' && canReport && (
                <Button
                  title={request.no_show ? 'Undo no-show' : `${firstName(request.rider.full_name)} didn't show up`}
                  variant="ghost"
                  loading={busy === `noshow-${request.id}`}
                  disabled={busy !== null}
                  onPress={() =>
                    request.no_show
                      ? run(`noshow-${request.id}`, () => setNoShow(request.id, false))
                      : confirm(
                          `Mark ${firstName(request.rider.full_name)} as a no-show?`,
                          'This counts against their reliability. They still owe their share, since they held a seat.',
                          'Mark no-show',
                          () => run(`noshow-${request.id}`, () => setNoShow(request.id, true)),
                        )
                  }
                />
              )}
            </View>
          ))}
        </Card>
      )}

      {/* Driver: requests waiting for an answer (screen 6) */}
      {isMyTrip && pendingRequests.length > 0 && (
        <View style={{ gap: Spacing.sm }}>
          <Label>Requests waiting for you ({pendingRequests.length})</Label>
          {pendingRequests.map((request, index) => (
            <AnimatedItem key={request.id} index={index}>
            <RequestCard
              request={request}
              reliability={reliability[request.rider_id]}
              rating={ratings[request.rider_id]}
              onMore={() => showPersonActions({ userId, personId: request.rider_id, name: firstName(request.rider.full_name), tripId: trip.id, onBlocked: reload })}
              trip={trip}
              busy={busy}
              onApprove={() => run(`approve-${request.id}`, () => respondToRequest(request.id, true))}
              onDecline={() => run(`decline-${request.id}`, () => respondToRequest(request.id, false))}
            />
            </AnimatedItem>
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
            <View style={styles.badges}>
              {formatRating(ratings[trip.driver_id]) && <Badge label={formatRating(ratings[trip.driver_id])!} tone="waiting" />}
              <ReliabilityBadge stats={reliability[trip.driver_id]} />
            </View>
          </View>
          {!isMyTrip && (
            <PressableScale
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Report or block ${driverName}`}
              onPress={() => showPersonActions({ userId, personId: trip.driver_id, name: driverName, tripId: trip.id, onBlocked: reload })}>
              <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color={colors.textSecondary} />
            </PressableScale>
          )}
        </View>
        {trip.driver.bio ? <Body>{trip.driver.bio}</Body> : null}
        <Label>Vibe check</Label>
        <VibeMeters profile={trip.driver} />
        {trip.car ? (
          <View style={styles.carRow}>
            <CarIllustration color={trip.car.color} bodyType={trip.car.body_type} width={130} />
            <View style={{ flex: 1 }}>
              <Body style={{ fontWeight: '600' }}>
                {trip.car.color} {trip.car.make} {trip.car.model}
              </Body>
              <Body muted style={{ fontSize: 14 }}>Plate {trip.car.plate}</Body>
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <Label>Riders</Label>
        {riders.length === 0 ? (
          <Body muted>No riders booked yet.</Body>
        ) : (
          <View style={styles.riders}>
            {riders.map((rider) => (
              <PressableScale
                key={rider.rider_id}
                disabled={rider.rider_id === userId}
                accessibilityRole="button"
                accessibilityLabel={`${rider.first_name}: report or block`}
                onPress={() => showPersonActions({ userId, personId: rider.rider_id, name: rider.first_name, tripId: trip.id, onBlocked: reload })}
                style={styles.rider}>
                <Avatar uri={rider.avatar_url} name={rider.first_name} size={48} />
                <Body style={{ fontSize: 13 }}>{rider.first_name}</Body>
                {formatRating(ratings[rider.rider_id]) && <Body muted style={{ fontSize: 12 }}>{formatRating(ratings[rider.rider_id])}</Body>}
              </PressableScale>
            ))}
          </View>
        )}
      </Card>

      <PriceBreakdown
        miles={trip.route_miles}
        mpg={trip.mpg}
        gasPrice={trip.gas_price}
        seatsOffered={trip.seats_offered}
        ridersBooked={payingRiders(trip)}
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
                    ? `${trip.seats_booked} booked ${trip.seats_booked === 1 ? 'rider' : 'riders'} will see it was cancelled.${
                        lateNow ? " It's less than 24 hours before the trip, so this counts as a late cancel on your reliability." : ''
                      } This can't be undone.`
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
          <Button
            title={along && stop ? `Request a seat to ${stop.name}` : `Request a seat with ${firstName(trip.driver.full_name)}`}
            onPress={() =>
              router.push(
                along && stop
                  ? { pathname: '/request-seat/[id]', params: { id: trip.id, ...stopToParams(stop) } }
                  : `/request-seat/${trip.id}`,
              )
            }
          />
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
  reliability,
  rating,
  onMore,
  trip,
  busy,
  onApprove,
  onDecline,
}: {
  request: RequestWithRider;
  reliability: Reliability | undefined;
  rating: RatingSummary | undefined;
  onMore: () => void;
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
          <View style={styles.badges}>
            {formatRating(rating) && <Badge label={formatRating(rating)!} tone="waiting" />}
            <ReliabilityBadge stats={reliability} />
          </View>
        </View>
        <PressableScale hitSlop={10} accessibilityRole="button" accessibilityLabel="Report or block" onPress={onMore}>
          <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color={colors.textSecondary} />
        </PressableScale>
      </View>
      <VibeMeters profile={request.rider} />
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
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  stretches: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: 4,
  },
  stretchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: 2,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  amount: {
    fontSize: 28,
    fontWeight: '700',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});

// Phone numbers of everyone else in the car, with Text and Call buttons.
function ContactCard({ contacts, hasOwnPhone }: { contacts: TripContact[]; hasOwnPhone: boolean }) {
  const colors = useTheme();
  return (
    <Card>
      <Label>Contact</Label>
      {contacts.length === 0 ? (
        <Body muted style={{ fontSize: 14 }}>
          Nobody else in the car has added a phone number yet. Use the group chat to coordinate.
        </Body>
      ) : (
        contacts.map((contact) => (
          <View key={contact.user_id} style={styles.contactRow}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>
                {contact.first_name}
                {contact.role === 'driver' ? ' (driver)' : ''}
              </Text>
              <Body muted style={{ fontSize: 14 }}>{formatPhone(contact.phone)}</Body>
            </View>
            <PressableScale
              onPress={() => Linking.openURL(`sms:${contact.phone}`)}
              accessibilityRole="button"
              accessibilityLabel={`Text ${contact.first_name}`}
              style={[styles.circleButton, { backgroundColor: colors.track }]}>
              <Ionicons name="chatbubble-outline" size={20} color={colors.text} />
            </PressableScale>
            <PressableScale
              onPress={() => Linking.openURL(`tel:${contact.phone}`)}
              accessibilityRole="button"
              accessibilityLabel={`Call ${contact.first_name}`}
              style={[styles.circleButton, { backgroundColor: colors.primary }]}>
              <Ionicons name="call-outline" size={20} color={colors.onPrimary} />
            </PressableScale>
          </View>
        ))
      )}
      {!hasOwnPhone && <Body muted style={{ fontSize: 13 }}>Add your number in Edit profile so the others can reach you too.</Body>}
    </Card>
  );
}

// "Miles 0–100 · 3 people · $3.33" for each stretch of road this rider was in the car for.
function StretchBreakdown({ stretches }: { stretches: Stretch[] }) {
  const colors = useTheme();
  if (stretches.length <= 1) return null; // one stretch = a simple even split, nothing to explain
  return (
    <View style={[styles.stretches, { borderColor: colors.border }]}>
      {stretches.map((stretch) => (
        <View key={stretch.fromMile} style={styles.stretchRow}>
          <Text style={{ color: colors.textSecondary, fontSize: 14, flex: 1 }}>
            Miles {Math.round(stretch.fromMile)}–{Math.round(stretch.toMile)} · {stretch.people} people
          </Text>
          <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>{formatMoney(stretch.perPerson)}</Text>
        </View>
      ))}
    </View>
  );
}
