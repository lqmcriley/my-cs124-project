// A top-down drawing of the car with a tile for every seat.
//   mode="offer"  drivers tap seats to offer them or not (held seats stay locked)
//   mode="pick"   riders tap one open seat
//   mode="view"   just shows who sits where

import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { selectionHaptic } from '@/lib/haptics';
import { Seat, SeatHold, SeatId, SeatLayout, seatRows, seatState, SeatState } from '@/lib/seats';

type Props = {
  layout: SeatLayout;
  openSeats: string[];
  holds?: SeatHold[];
  driver?: { name: string; avatarUrl: string | null };
  mode: 'offer' | 'pick' | 'view';
  selected?: SeatId | null; // pick mode: the seat you chose
  onToggle?: (seat: SeatId) => void; // offer mode
  onPick?: (seat: SeatId) => void; // pick mode
};

const TILE = 64;

export function SeatMap({ layout, openSeats, holds = [], driver, mode, selected = null, onToggle, onPick }: Props) {
  const colors = useTheme();
  const rows = seatRows(layout);
  // Every row is as wide as the widest one, so the driver sits on the left, the
  // front passenger on the right, and two-seat rows leave an aisle in the middle.
  const widest = Math.max(2, ...rows.map((row) => row.length));
  const rowWidth = widest * TILE + (widest - 1) * Spacing.sm;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.car, { borderColor: colors.border, backgroundColor: colors.background }]}>
        {/* Windshield */}
        <View style={[styles.windshield, { backgroundColor: colors.track }]} />
        {rows.map((row, index) => (
          <View key={index} style={[styles.row, { width: rowWidth }]}>
            {index === 0 && <DriverTile driver={driver} />}
            {row.map((seat) => (
              <SeatTile
                key={seat.id}
                seat={seat}
                state={seatState(seat.id, openSeats, holds)}
                hold={holds.find((candidate) => candidate.seat === seat.id)}
                mode={mode}
                selected={selected === seat.id}
                onPress={() => {
                  selectionHaptic();
                  if (mode === 'offer') onToggle?.(seat.id);
                  else if (mode === 'pick') onPick?.(seat.id);
                }}
              />
            ))}
          </View>
        ))}
      </View>
      <Legend mode={mode} />
    </View>
  );
}

function DriverTile({ driver }: { driver?: { name: string; avatarUrl: string | null } }) {
  const colors = useTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.track, borderColor: colors.track }]} accessibilityLabel="Driver's seat">
      {driver ? <Avatar uri={driver.avatarUrl} name={driver.name} size={30} /> : <Ionicons name="disc-outline" size={24} color={colors.textSecondary} />}
      <Text style={[styles.tileLabel, { color: colors.textSecondary }]}>Driver</Text>
    </View>
  );
}

function SeatTile({
  seat,
  state,
  hold,
  mode,
  selected,
  onPress,
}: {
  seat: Seat;
  state: SeatState;
  hold?: SeatHold;
  mode: Props['mode'];
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();

  // Can this seat be tapped right now?
  const tappable = (mode === 'offer' && (state === 'open' || state === 'off')) || (mode === 'pick' && state === 'open');

  let background: string = colors.card;
  let border: string = colors.border;
  let foreground: string = colors.text;
  let icon: keyof typeof Ionicons.glyphMap | null = null;
  let label = '';
  let faded = false;

  if (selected) {
    background = colors.selected;
    border = colors.selected;
    foreground = colors.onSelected;
    icon = 'checkmark';
    label = 'Yours';
  } else if (state === 'open') {
    border = colors.primary;
    foreground = colors.primary;
    icon = mode === 'offer' ? 'checkmark' : 'add';
    label = mode === 'offer' ? 'Offered' : 'Open';
  } else if (state === 'off') {
    background = colors.track;
    border = colors.track;
    foreground = colors.textSecondary;
    icon = 'close';
    label = mode === 'offer' ? 'Not offered' : 'No';
    faded = true;
  } else if (state === 'held') {
    background = colors.track;
    foreground = colors.textSecondary;
    icon = 'time-outline';
    label = hold?.firstName ?? 'Held';
  } else if (state === 'mine') {
    background = colors.selected;
    border = colors.selected;
    foreground = colors.onSelected;
    label = 'You';
  } else if (state === 'taken') {
    label = hold?.firstName ?? 'Taken';
  }

  const showAvatar = (state === 'taken' || state === 'mine' || (state === 'held' && hold?.firstName)) && hold;
  const description = `${seat.label}${seat.cramped ? ', cramped' : ''}: ${selected ? 'your pick' : label}`;

  return (
    <PressableScale
      disabled={!tappable}
      onPress={onPress}
      scaleTo={0.92}
      accessibilityRole="button"
      accessibilityLabel={description}
      accessibilityState={{ disabled: !tappable, selected }}
      style={[styles.tile, { backgroundColor: background, borderColor: border, opacity: faded ? 0.6 : 1 }]}>
      {showAvatar ? (
        <Avatar uri={hold.avatarUrl} name={hold.firstName ?? '?'} size={30} />
      ) : (
        icon && <Ionicons name={icon} size={22} color={foreground} />
      )}
      <Text style={[styles.tileLabel, { color: foreground }]} numberOfLines={1}>
        {label}
      </Text>
      {seat.cramped && (
        <View style={[styles.cramped, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.crampedText, { color: colors.textSecondary }]}>Tight</Text>
        </View>
      )}
    </PressableScale>
  );
}

function Legend({ mode }: { mode: Props['mode'] }) {
  const colors = useTheme();
  const text =
    mode === 'offer'
      ? 'Tap a seat to offer it or not. Seats someone asked for stay put.'
      : mode === 'pick'
        ? 'Tap an open seat. It stays yours while the driver decides.'
        : null;
  if (!text) return null;
  return <Text style={[styles.legend, { color: colors.textSecondary }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  car: {
    borderWidth: 2,
    borderTopLeftRadius: 56,
    borderTopRightRadius: 56,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    gap: Spacing.md,
    alignItems: 'center',
  },
  windshield: {
    width: '70%',
    height: 10,
    borderRadius: Radius.pill,
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tile: {
    width: TILE,
    height: TILE + 8,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
  },
  tileLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  cramped: {
    position: 'absolute',
    top: -8,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 6,
  },
  crampedText: {
    fontSize: 10,
    fontWeight: '700',
  },
  legend: {
    fontSize: 13,
    textAlign: 'center',
  },
});
