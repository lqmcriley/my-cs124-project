// Shows the price per seat (big and bold), how it drops as more riders join, and the math behind it.

import { StyleSheet, View } from 'react-native';

import { FadeSwap } from '@/components/motion';
import { Card, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { IRS_MILEAGE_RATE } from '@/lib/config';
import { formatMoney } from '@/lib/format';
import { energy, Fuel, isElectric } from '@/lib/fuel';
import { priceTable, tripPriceSummary } from '@/lib/pricing';

type Props = {
  miles: number;
  mpg: number;
  gasPrice: number; // $ per kWh for electric cars
  fuel?: Fuel; // electric cars show mi/kWh and charging cost
  seatsOffered: number;
  ridersBooked: number;
  viewer: 'rider' | 'driver';
};

export function PriceBreakdown({ miles, mpg, gasPrice, fuel, seatsOffered, ridersBooked, viewer }: Props) {
  const colors = useTheme();
  const power = energy(fuel);
  const { ifYouJoin, ifFull } = tripPriceSummary({ miles, mpg, gasPrice, seatsOffered, ridersBooked });
  const table = priceTable({ miles, mpg, gasPrice, seatsOffered });
  // The row to highlight: what a new rider would pay now, or the current split for the driver.
  const currentRiders = viewer === 'rider' ? ifYouJoin.riders : Math.max(ridersBooked, 1);

  return (
    <Card>
      <View style={styles.header}>
        <FadeSwap value={ifYouJoin.perSeat}>
          <Text style={[styles.big, { color: colors.text }]}>{formatMoney(ifYouJoin.perSeat)}</Text>
        </FadeSwap>
        <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
          {viewer === 'rider' ? 'per seat if you join now' : 'per rider if only 1 joins'}
        </Text>
      </View>
      {seatsOffered > 1 && (
        <Text style={{ color: colors.success, fontSize: 15, fontWeight: '600' }}>
          Drops to {formatMoney(ifFull.perSeat)} if all {seatsOffered} seats fill
        </Text>
      )}

      {seatsOffered > 1 && (
        <View style={[styles.table, { borderColor: colors.border }]}>
          {table.map((row) => {
            const current = row.riders === currentRiders;
            return (
              <View
                key={row.riders}
                style={[styles.tableRow, current && { backgroundColor: colors.primary }]}
                accessibilityLabel={`${row.riders} riders: ${formatMoney(row.perSeat)} each`}>
                <Text style={[styles.cell, { color: current ? colors.onPrimary : colors.text }]}>
                  {row.riders} {row.riders === 1 ? 'rider' : 'riders'}
                </Text>
                <Text style={[styles.cell, styles.amount, { color: current ? colors.onPrimary : colors.text }]}>
                  {formatMoney(row.perSeat)} each
                </Text>
              </View>
            );
          })}
        </View>
      )}

      <Line label="Distance" value={`${miles.toFixed(1)} mi`} />
      {isElectric(fuel) ? (
        <>
          <Line label={`Energy used (${mpg} mi/kWh)`} value={`${ifFull.gallons.toFixed(1)} kWh`} />
          <Line label={`Charging cost at ${formatMoney(gasPrice)}/kWh`} value={formatMoney(ifFull.totalGasCost)} />
        </>
      ) : (
        <>
          <Line label={`Gas used (${mpg} MPG)`} value={`${ifFull.gallons.toFixed(2)} gal`} />
          <Line label={`Gas cost at ${formatMoney(gasPrice)}/gal`} value={formatMoney(ifFull.totalGasCost)} />
        </>
      )}
      {ifYouJoin.capped && (
        <Text style={{ color: colors.success, fontSize: 14 }}>
          Some prices are lowered to the IRS cap of {formatMoney(IRS_MILEAGE_RATE)}/mile.
        </Text>
      )}
      <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
        The {power.thing} cost is split between everyone in the car, driver included, and the price drops as others join. If someone gets
        off early, each stretch of road is split between whoever is in the car for it, so everyone pays their fair
        share. Drivers never make a profit.
      </Text>
    </Card>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.line}>
      <Text style={{ color: colors.textSecondary, fontSize: 15, flex: 1 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  big: {
    fontSize: 30,
    fontWeight: '700',
  },
  table: {
    borderWidth: 1,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  cell: {
    fontSize: 15,
    flex: 1,
  },
  amount: {
    textAlign: 'right',
    fontWeight: '700',
  },
  line: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
});
