// Profile → My car: the drawing, details and seat layout.

import { router } from 'expo-router';
import { View } from 'react-native';

import { CarIllustration } from '@/components/car-illustration';
import { SeatMap } from '@/components/seat-map';
import { Body, Button, Card, Label, Screen } from '@/components/ui';
import { carName, efficiencyText, fuelTag } from '@/lib/fuel';
import { layoutForSeats, layoutSeats } from '@/lib/seats';
import { useAuth } from '@/providers/auth-provider';

export default function MyCarScreen() {
  const { car } = useAuth();

  if (!car) {
    return (
      <Screen edges={['bottom']}>
        <Body muted>No car added. Add one if you want to drive and split gas with riders.</Body>
        <Button title="Add my car" onPress={() => router.push('/edit-profile')} />
      </Screen>
    );
  }

  const layout = car.seat_layout ?? layoutForSeats(car.seats);
  return (
    <Screen edges={['bottom']}>
      <Card>
        <View style={{ alignItems: 'center' }}>
          <CarIllustration color={car.color} bodyType={car.body_type} width={240} />
        </View>
        <Body style={{ textAlign: 'center', fontWeight: '600' }}>{carName(car)}</Body>
        <Body muted style={{ textAlign: 'center' }}>
          {[`Plate ${car.plate}`, efficiencyText(car.mpg, car.fuel), fuelTag(car.fuel)].filter(Boolean).join(' · ')}
        </Body>
        {!car.model_year && <Body muted style={{ textAlign: 'center' }}>Add your car&apos;s year and fuel when you edit it.</Body>}
      </Card>
      <Card>
        <Label>
          Seats: {car.seats} for riders
        </Label>
        <SeatMap layout={layout} openSeats={layoutSeats(layout).map((seat) => seat.id)} mode="view" />
      </Card>
      <Button title="Edit my car" variant="secondary" onPress={() => router.push('/edit-profile')} />
    </Screen>
  );
}
