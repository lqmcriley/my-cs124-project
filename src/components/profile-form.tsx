// The profile + car form. Used by both "Profile setup" and "Edit profile".

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Body, Button, Card, Chip, ErrorText, Label, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BIO_MAX_LENGTH, CLASS_YEARS } from '@/lib/config';
import { PickedPhoto, saveProfile } from '@/lib/profile-api';
import { initialFormValues, ProfileFormErrors, ProfileFormValues, validateProfileForm } from '@/lib/profile-form';
import { useAuth } from '@/providers/auth-provider';

export function ProfileForm({ submitLabel, onSaved }: { submitLabel: string; onSaved?: () => void }) {
  const colors = useTheme();
  const { session, profile, car, payment, refreshProfile } = useAuth();
  const [values, setValues] = useState<ProfileFormValues>(() => initialFormValues(profile, car, payment));
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
      const message = error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setSaveError(message);
    } finally {
      setSaving(false);
    }
  }

  const photoUri = photo?.uri ?? profile?.avatar_url;

  return (
    <View style={styles.form}>
      {/* Photo */}
      <Pressable onPress={pickPhoto} style={styles.photoRow} accessibilityRole="button" accessibilityLabel="Choose a profile photo">
        <Avatar uri={photoUri} name={values.fullName} size={88} />
        <Body style={{ color: colors.primary, fontWeight: '700' }}>{photoUri ? 'Change photo' : 'Add a photo'}</Body>
      </Pressable>

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

      <Label>In the car, I&apos;m usually…</Label>
      <View style={styles.chipRow}>
        <Chip label="Quiet ride" icon="volume-mute-outline" selected={values.chatPreference === 'quiet'} onPress={() => set('chatPreference', 'quiet')} />
        <Chip label="Down to talk" icon="chatbubbles-outline" selected={values.chatPreference === 'talk'} onPress={() => set('chatPreference', 'talk')} />
      </View>

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
                <TextField label="Make" placeholder="Honda" value={values.make} onChangeText={(t) => set('make', t)} error={errors.make} />
              </View>
              <View style={styles.column}>
                <TextField label="Model" placeholder="Civic" value={values.model} onChangeText={(t) => set('model', t)} error={errors.model} />
              </View>
            </View>
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
            <View style={styles.twoColumns}>
              <View style={styles.column}>
                <TextField
                  label="MPG"
                  placeholder="32"
                  value={values.mpg}
                  onChangeText={(t) => set('mpg', t)}
                  keyboardType="decimal-pad"
                  error={errors.mpg}
                />
              </View>
              <View style={styles.column}>
                <TextField
                  label="Passenger seats"
                  placeholder="3"
                  value={values.seats}
                  onChangeText={(t) => set('seats', t)}
                  keyboardType="number-pad"
                  maxLength={1}
                  error={errors.seats}
                />
              </View>
            </View>
            <Body muted>MPG is used to work out a fair gas split. Seats don&apos;t count you, the driver.</Body>
          </View>
        )}
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
});
