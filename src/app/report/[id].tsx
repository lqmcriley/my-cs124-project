// Report someone. Reports are private: only you (and the app owner, in the
// Supabase dashboard) can see them. The person isn't told.

import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Body, Button, Chip, ErrorText, Heading, Label, Screen, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { errorHaptic, successHaptic } from '@/lib/haptics';
import { REPORT_REASONS, reportUser } from '@/lib/safety-api';
import type { ReportReason } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

export default function ReportScreen() {
  const { id, name, trip } = useLocalSearchParams<{ id: string; name?: string; trip?: string }>();
  const { session } = useAuth();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const who = name || 'this person';

  async function onSubmit() {
    if (!reason) {
      setError('Pick what happened.');
      errorHaptic();
      return;
    }
    setSaving(true);
    setError('');
    try {
      await reportUser({ reporterId: session!.user.id, reportedId: id, tripId: trip || null, reason, details });
      successHaptic();
      Alert.alert('Report sent', `Thanks for telling us. ${who} won't be told who reported them.`);
      router.back();
    } catch (err) {
      errorHaptic();
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen edges={['bottom']}>
      <Heading style={{ fontSize: 22 }}>Report {who}</Heading>
      <Body muted>Reports are private. {who} won&apos;t be told. If you&apos;re in danger right now, call 911.</Body>

      <Label>What happened?</Label>
      <View style={styles.chips}>
        {REPORT_REASONS.map((option) => (
          <Chip key={option.value} label={option.label} selected={reason === option.value} onPress={() => setReason(option.value)} />
        ))}
      </View>

      <TextField
        label="Details (optional)"
        placeholder="What should we know?"
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={1000}
      />

      <ErrorText>{error}</ErrorText>
      <Button title="Send report" icon="flag-outline" variant="danger" onPress={onSubmit} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
});
