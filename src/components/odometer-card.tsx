// Optional odometer photos for a trip. The driver adds a start and end photo
// (camera or library); everyone in the car can see them. Prices still come
// from the route distance; these are just a record.

import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';

import { Body, Button, Card, ErrorText, Label, Text } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { friendlyError } from '@/lib/errors';
import { successHaptic } from '@/lib/haptics';
import { fetchOdometerPhotos, OdometerKind, OdometerPhotos, uploadOdometerPhoto } from '@/lib/odometer-api';

export function OdometerCard({ tripId, isDriver }: { tripId: string; isDriver: boolean }) {
  const colors = useTheme();
  const [photos, setPhotos] = useState<OdometerPhotos | null>(null);
  const [uploading, setUploading] = useState<OdometerKind | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stale = false;
    fetchOdometerPhotos(tripId).then((result) => {
      if (!stale) setPhotos(result);
    });
    return () => {
      stale = true;
    };
  }, [tripId]);

  async function pick(kind: OdometerKind, source: 'camera' | 'library') {
    setError('');
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError('Camera access is off. You can allow it in Settings, or choose from your photos.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const asset = result.assets[0];
    setUploading(kind);
    try {
      await uploadOdometerPhoto(tripId, kind, { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
      successHaptic();
      setPhotos(await fetchOdometerPhotos(tripId));
    } catch (err) {
      setError(friendlyError(err, 'Upload failed. Please try again.'));
    } finally {
      setUploading(null);
    }
  }

  function choose(kind: OdometerKind) {
    Alert.alert(kind === 'start' ? 'Start odometer photo' : 'End odometer photo', undefined, [
      { text: 'Take photo', onPress: () => pick(kind, 'camera') },
      { text: 'Choose from photos', onPress: () => pick(kind, 'library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const hasAny = photos && (photos.start || photos.end);
  if (!isDriver && !hasAny) return null; // riders only see this once the driver adds a photo

  return (
    <Card>
      <Label>Odometer photos</Label>
      <Body muted style={{ fontSize: 14 }}>
        {isDriver
          ? 'Optional: snap the odometer at the start and end as a record. The price always uses the route distance.'
          : 'The driver added these as a record of the trip.'}
      </Body>
      {photos === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={styles.slots}>
          {(['start', 'end'] as const).map((kind) => (
            <View key={kind} style={styles.slot}>
              <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{kind === 'start' ? 'Start' : 'End'}</Text>
              {photos[kind] ? (
                <Image source={{ uri: photos[kind] }} style={[styles.photo, { borderColor: colors.border }]} contentFit="cover" accessibilityLabel={`${kind} odometer photo`} />
              ) : (
                <View style={[styles.photo, styles.empty, { borderColor: colors.border, backgroundColor: colors.track }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No photo</Text>
                </View>
              )}
              {isDriver && (
                <Button
                  title={photos[kind] ? 'Replace' : 'Add photo'}
                  icon="camera-outline"
                  variant="secondary"
                  loading={uploading === kind}
                  disabled={uploading !== null}
                  onPress={() => choose(kind)}
                />
              )}
            </View>
          ))}
        </View>
      )}
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

const styles = StyleSheet.create({
  slots: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  slot: {
    flex: 1,
    gap: Spacing.xs,
  },
  photo: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
