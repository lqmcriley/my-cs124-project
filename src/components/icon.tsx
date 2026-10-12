// Every icon in the app. On iPhone it draws Apple's own icon (SF Symbols), so
// icons match the system tab bar, sheets and buttons. Elsewhere it falls back
// to the matching Ionicons icon. Use it like Ionicons: <Icon name="car-outline" />.

import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Platform, type ColorValue } from 'react-native';

export type IconName = keyof typeof Ionicons.glyphMap;

// Ionicons name -> SF Symbol. Names not listed here use Ionicons everywhere.
const SF: Partial<Record<IconName, SFSymbol>> = {
  add: 'plus',
  'add-circle': 'plus.circle.fill',
  'add-circle-outline': 'plus.circle',
  airplane: 'airplane',
  'airplane-outline': 'airplane',
  'alert-circle-outline': 'exclamationmark.circle',
  'arrow-up': 'arrow.up',
  'arrow-up-circle-outline': 'arrow.up.circle',
  'ban-outline': 'nosign',
  'briefcase-outline': 'suitcase',
  'bus-outline': 'bus',
  calendar: 'calendar',
  'calendar-outline': 'calendar',
  call: 'phone.fill',
  'call-outline': 'phone',
  camera: 'camera.fill',
  'camera-outline': 'camera',
  car: 'car.fill',
  'car-outline': 'car',
  'cash-outline': 'banknote',
  'chatbox-ellipses-outline': 'text.bubble',
  'chatbubble-outline': 'bubble.left',
  'chatbubbles-outline': 'bubble.left.and.bubble.right',
  checkbox: 'checkmark.square.fill',
  checkmark: 'checkmark',
  'checkmark-circle': 'checkmark.circle.fill',
  'checkmark-circle-outline': 'checkmark.circle',
  'chevron-forward': 'chevron.right',
  close: 'xmark',
  'close-circle': 'xmark.circle.fill',
  'close-circle-outline': 'xmark.circle',
  'cloud-offline-outline': 'icloud.slash',
  'color-palette-outline': 'paintpalette',
  'create-outline': 'square.and.pencil',
  'disc-outline': 'steeringwheel',
  'ellipsis-horizontal-circle-outline': 'ellipsis.circle',
  'flag-outline': 'flag',
  'flash-outline': 'bolt',
  'git-branch-outline': 'arrow.triangle.branch',
  'grid-outline': 'square.grid.2x2',
  'information-circle-outline': 'info.circle',
  list: 'list.bullet',
  location: 'mappin.circle.fill',
  'location-outline': 'mappin.and.ellipse',
  'lock-closed-outline': 'lock',
  'log-out-outline': 'rectangle.portrait.and.arrow.right',
  map: 'map.fill',
  'map-outline': 'map',
  'moon-outline': 'moon',
  'navigate-outline': 'location.north',
  'paper-plane-outline': 'paperplane',
  'people-outline': 'person.2',
  'person-add-outline': 'person.badge.plus',
  'person-outline': 'person',
  refresh: 'arrow.clockwise',
  'scan-outline': 'viewfinder',
  'school-outline': 'graduationcap',
  search: 'magnifyingglass',
  'search-outline': 'magnifyingglass',
  'share-outline': 'square.and.arrow.up',
  'shield-checkmark-outline': 'checkmark.shield',
  'speedometer-outline': 'fuelpump',
  'square-outline': 'square',
  star: 'star.fill',
  'star-outline': 'star',
  'pricetags-outline': 'tag',
  time: 'clock.fill',
  'time-outline': 'clock',
  'wallet-outline': 'wallet.pass',
  'water-outline': 'drop',
};

type Props = {
  name: IconName;
  size?: number;
  color?: ColorValue;
};

export function Icon({ name, size = 20, color }: Props) {
  const fallback = <Ionicons name={name} size={size} color={color as string} />;
  const symbol = Platform.OS === 'ios' ? SF[name] : undefined;
  if (!symbol) return fallback;
  return <SymbolView name={symbol} size={size} tintColor={color} type="monochrome" weight="medium" fallback={fallback} />;
}
