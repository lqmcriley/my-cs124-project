// The profile + car form. Used by both "Profile setup" and "Edit profile".

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { SeatMap } from '@/components/seat-map';
import { CarIllustration } from '@/components/car-illustration';
import { PressableScale } from '@/components/motion';
import { VibeSliders } from '@/components/vibes';
import { Body, Button, Card, Chip, ErrorText, Label, Text, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BIO_MAX_LENGTH, CAR_BODY_TYPES, CLASS_YEARS } from '@/lib/config';
import { friendlyError } from '@/lib/errors';
import { energy, FUELS, isElectric } from '@/lib/fuel';
import { PickedPhoto, saveProfile } from '@/lib/profile-api';
import { initialFormValues, ProfileFormErrors, ProfileFormValues, validateProfileForm } from '@/lib/profile-form';
import { layoutSeats, SEAT_LAYOUTS } from '@/lib/seats';
import { useAuth } from '@/providers/auth-provider';

export function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved?: () => void }) {
  const colors = useTheme();
  const { session, profile, car, payment, phone, refreshProfile } = useAuth();
  const [values, setValues] = useState<ProfileFormValues>(() => initialFormValues(profile, car, payment, phone));
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  // Update one field, and clear its error message as you fix it.
  function set<K extends keyof ProfileFormValues>(field: K, value: ProfileFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function onSubmit() {
    if (!session) return;
    setSaveError('');
    const found = validateProfileForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setSaveError('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile(session.user.id, values, photo, car !== null);
      await refreshProfile();
      onSaved?.();
    } catch (error) {
      const message = friendlyError(error, 'Something went wrong. Please try again.');
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  const photoUri = photo?.uri ?? profile?.avatar_url;

  return (
    <View style={styles.form}>
      {/* Photo */}
      <PressableScale onPress={pickPhoto} style={styles.photoRow} accessibilityRole="button" accessibilityLabel="Choose a profile photo">
        <Avatar uri={photoUri} name={values.fullName} size={104} />
        <View style={[styles.photoPill, { backgroundColor: colors.track }]}>
          <Ionicons name="camera-outline" size={17} color={colors.text} />
          <Text style={{ color: colors.text, fontWeight: '600', fontSize: 15 }}>{photoUri ? 'Change photo' : 'Add a photo'}</Text>
        </View>
      </PressableScale>

      <TextField
        label="Name"
        placeholder="First and last name"
        value={values.fullName}
        onChangeText={(text) => set('fullName', text)}
        autoComplete="name"
        textContentType="name"
        error={errors.fullName}
      />

      <Label>Year (optional)</Label>
      <View style={styles.chipRow}>
        {CLASS_YEARS.map((year) => (
          <Chip
            key={year}
            label={year}
            selected={values.year === year}
            onPress={() => set('year', values.year === year ? null : year)}
          />
        ))}
      </View>

      <TextField
        label="Major (optional)"
        placeholder="e.g. Computer Science"
        value={values.major}
        onChangeText={(text) => set('major', text)}
      />

      <TextField
        label="Short bio"
        placeholder="A sentence or two so riders and drivers know who you are."
        value={values.bio}
        onChangeText={(text) => set('bio', text)}
        multiline
        maxLength={BIO_MAX_LENGTH}
        hint={`${values.bio.length}/${BIO_MAX_LENGTH}`}
        error={errors.bio}
      />

      <Label>Vibe check</Label>
      <Body muted style={{ fontSize: 14 }}>Slide to show how you like a ride. Riders and drivers see this so you can find your match.</Body>
      <Card>
        <VibeSliders vibes={values.vibes} onChange={(vibes) => set('vibes', vibes)} />
      </Card>

      {/* Car */}
      <Card>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Label>I want to drive too</Label>
            <Body muted>Add your car so you can post trips.</Body>
          </View>
          <Switch
            value={values.isDriver}
            onValueChange={(on) => set('isDriver', on)}
            trackColor={{ true: colors.primary }}
            accessibilityLabel="I want to drive too"
          />
        </View>

        {values.isDriver && (
          <View style={styles.form}>
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <TextField
                  label="Year"
                  placeholder="2019"
                  value={values.modelYear}
                  onChangeText={(t) => set('modelYear', t)}
                  keyboardType="number-pad"
                  maxLength={4}
                  error={errors.modelYear}
                />
              </View>
              <View style={styles.column}>
                <TextField label="Make" placeholder="Honda" value={values.make} onChangeText={(t) => set('make', t)} error={errors.make} />
              </View>
            </View>
            <TextField label="Model" placeholder="Civic" value={values.model} onChangeText={(t) => set('model', t)} error={errors.model} />
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <TextField label="Color" placeholder="Silver" value={values.color} onChangeText={(t) => set('color', t)} error={errors.color} />
              </View>
              <View style={styles.column}>
                <TextField
                  label="Plate"
                  placeholder="ABC1234"
                  value={values.plate}
                  onChangeText={(t) => set('plate', t)}
                  autoCapitalize="characters"
                  maxLength={10}
                  error={errors.plate}
                />
              </View>
            </View>
            <Label>Fuel</Label>
            <View style={styles.chips}>
              {FUELS.map((option) => (
                <Chip key={option.value} label={option.label} selected={values.fuel === option.value} onPress={() => set('fuel', option.value)} />
              ))}
            </View>
            <TextField
              label={energy(values.fuel).efficiencyName}
              placeholder={isElectric(values.fuel) ? '3.5' : '32'}
              value={values.mpg}
              onChangeText={(t) => set('mpg', t)}
              keyboardType="decimal-pad"
              error={errors.mpg}
            />
            <Body muted>
              {isElectric(values.fuel)
                ? "Used to split the charging cost fairly. Your car's screen shows miles per kWh (usually 3–4)."
                : 'Used to work out a fair gas split.'}
              {values.fuel === 'premium' ? ' Riders will see that your car takes premium. You can set a higher gas price when you post.' : ''}
            </Body>

            <Label>Seats (counting you)</Label>
            <View style={styles.chips}>
              {SEAT_LAYOUTS.map((option) => (
                <Chip key={option.value} label={option.label} selected={values.seatLayout === option.value} onPress={() => set('seatLayout', option.value)} />
              ))}
            </View>
            <Body muted>{SEAT_LAYOUTS.find((option) => option.value === values.seatLayout)?.hint}</Body>
            <SeatMap layout={values.seatLayout} openSeats={layoutSeats(values.seatLayout).map((seat) => seat.id)} mode="view" />

            <Label>Body style</Label>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bodyTypes}>
              {CAR_BODY_TYPES.map((option) => {
                const selected = values.bodyType === option.value;
                return (
                  <PressableScale
                    key={option.value}
                    scaleTo={0.95}
                    onPress={() => set('bodyType', option.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={option.label}
                    style={[
                      styles.bodyTile,
                      { borderColor: selected ? colors.primary : colors.border, backgroundColor: colors.card },
                      selected && { borderWidth: 2 },
                    ]}>
                    <CarIllustration color={values.color} bodyType={option.value} width={104} animate={false} />
                    <Text style={{ color: selected ? colors.primary : colors.text, fontSize: 13, fontWeight: '600' }}>{option.label}</Text>
                  </PressableScale>
                );
              })}
            </ScrollView>
          </View>
        )}
      </Card>

      {/* Phone number */}
      <Card>
        <Label>Phone number (optional)</Label>
        <Body muted>Private. Only shared with your driver or riders once someone is approved for a trip, so you can text or call.</Body>
        <TextField
          label="Phone"
          placeholder="(217) 555-0123"
          value={values.phone}
          onChangeText={(t) => set('phone', t)}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          error={errors.phone}
        />
      </Card>

      {/* Payment handles */}
      <Card>
        <Label>Get paid (optional)</Label>
        <Body muted>Add any you use. Riders on your trips get a one-tap pay button. Nobody else sees these.</Body>
        <TextField
          label="Venmo username"
          placeholder="alma-mater"
          value={values.venmo}
          onChangeText={(t) => set('venmo', t)}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.venmo}
        />
        <TextField
          label="Cash App $cashtag"
          placeholder="AlmaMater"
          value={values.cashapp}
          onChangeText={(t) => set('cashapp', t)}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.cashapp}
        />
        <TextField
          label="PayPal.me name"
          placeholder="almamater"
          value={values.paypal}
          onChangeText={(t) => set('paypal', t)}
          autoCapitalize="none"
          autoCorrect={false}
          error={errors.paypal}
        />
      </Card>

      <ErrorText>{saveError}</ErrorText>
      <Button title={submitLabel} onPress={onSubmit} loading={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: Spacing.md,
  },
  photoRow: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignSelf: 'center',
  },
  photoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  twoColumns: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  column: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  bodyTypes: {
    gap: Spacing.sm,
    paddingVertical: 2,
  },
  bodyTile: {
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
});
