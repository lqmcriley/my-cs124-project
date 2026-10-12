// Screen 7: Trip group chat. Only the driver and approved riders can open it.
// New messages arrive live through Supabase Realtime.

import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeInDown, LayoutAnimationConfig } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Avatar } from '@/components/avatar';
import { PressableScale } from '@/components/motion';
import { EmptyState, LoadError } from '@/components/states';
import { Body, ErrorText, Text } from '@/components/ui';
import { FontFamily, Radius, Spacing, TapTarget } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchTripRiders } from '@/lib/booking-api';
import { fetchMessages, MESSAGE_MAX_LENGTH, sendMessage, subscribeToMessages } from '@/lib/chat-api';
import { friendlyError } from '@/lib/errors';
import { errorHaptic, tapHaptic } from '@/lib/haptics';
import { formatTime, shortName } from '@/lib/format';
import { fetchTrip } from '@/lib/trips-api';
import type { Message } from '@/lib/types';
import { useAuth } from '@/providers/auth-provider';

type Member = { name: string; avatarUrl: string | null };
type ChatInfo = { title: string; members: Record<string, Member>; isMember: boolean };

async function loadChatInfo(tripId: string, userId: string): Promise<ChatInfo> {
  const [trip, riders] = await Promise.all([fetchTrip(tripId), fetchTripRiders(tripId)]);
  if (!trip) throw new Error('Trip not found.');
  const members: Record<string, Member> = {
    [trip.driver_id]: { name: `${shortName(trip.driver)} (driver)`, avatarUrl: trip.driver.avatar_url },
  };
  for (const rider of riders) members[rider.rider_id] = { name: rider.first_name, avatarUrl: rider.avatar_url };
  return { title: `${trip.dest_name} chat`, members, isMember: userId in members };
}

// Add a message unless we already have it (our own sends arrive twice: once
// from the send itself and once from the live feed).
function addMessage(list: Message[], message: Message): Message[] {
  return list.some((existing) => existing.id === message.id) ? list : [...list, message];
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useTheme();
  const { session } = useAuth();
  const userId = session!.user.id;
  const [info, setInfo] = useState<ChatInfo | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0); // bumped by "Try again"

  // Load who's in the trip and the message history.
  useEffect(() => {
    let stale = false;
    Promise.all([loadChatInfo(id, userId), fetchMessages(id)])
      .then(([chatInfo, history]) => {
        if (stale) return;
        setInfo(chatInfo);
        setMessages(history);
      })
      .catch((err: Error) => {
        if (!stale) setError(friendlyError(err));
      });
    return () => {
      stale = true;
    };
  }, [id, userId, attempt]);

  // Listen for new messages while this screen is open.
  useEffect(() => subscribeToMessages(id, (message) => setMessages((list) => addMessage(list ?? [], message))), [id]);

  async function onSend() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setError('');
    try {
      const message = await sendMessage(id, userId, body);
      tapHaptic();
      setMessages((list) => addMessage(list ?? [], message));
      setDraft('');
    } catch (err) {
      errorHaptic();
      setError(friendlyError(err, "Couldn't send. Try again."));
    } finally {
      setSending(false);
    }
  }

  const loading = (info === null || messages === null) && !error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['bottom']}>
      <Stack.Screen options={{ title: info?.title ?? 'Group chat' }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={100}>
        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginTop: Spacing.xl }} />
        ) : !info ? (
          <View style={styles.padded}>
            <LoadError
              message={error}
              onRetry={() => {
                setError('');
                setAttempt((count) => count + 1);
              }}
            />
          </View>
        ) : !info.isMember ? (
          <View style={styles.padded}>
            <EmptyState
              icon="lock-closed-outline"
              title="Chat opens after approval"
              message="Once the driver approves your request, you can chat with everyone in the car here."
            />
          </View>
        ) : (
          <>
            {/* Messages already in the chat appear instantly; new ones slide in. */}
            <LayoutAnimationConfig skipEntering>
            <FlatList
              // Newest at the bottom: reverse the list and flip it upside down.
              data={[...(messages ?? [])].reverse()}
              inverted
              keyExtractor={(message) => message.id}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Body muted style={styles.empty}>
                  No messages yet. Say hi and sort out the pickup details!
                </Body>
              }
              renderItem={({ item }) => <Bubble message={item} mine={item.sender_id === userId} member={info.members[item.sender_id]} />}
            />
            </LayoutAnimationConfig>
            <ErrorText>{error}</ErrorText>
            <View style={[styles.inputBar, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message"
                placeholderTextColor={colors.textSecondary}
                multiline
                maxLength={MESSAGE_MAX_LENGTH}
                accessibilityLabel="Message"
                style={[styles.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border, fontFamily: FontFamily }]}
              />
              <PressableScale
                scaleTo={0.9}
                onPress={onSend}
                disabled={sending || !draft.trim()}
                accessibilityRole="button"
                accessibilityLabel="Send"
                style={[styles.send, { backgroundColor: colors.primary, opacity: sending || !draft.trim() ? 0.4 : 1 }]}>
                {sending ? <ActivityIndicator color={colors.onPrimary} /> : <Icon name="arrow-up" size={22} color={colors.onPrimary} />}
              </PressableScale>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Bubble({ message, mine, member }: { message: Message; mine: boolean; member?: Member }) {
  const colors = useTheme();
  const time = formatTime(new Date(message.created_at));
  if (mine) {
    return (
      <Animated.View entering={FadeInDown.duration(200)} style={[styles.bubbleRow, { justifyContent: 'flex-end' }]}>
        <View style={[styles.bubble, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.onPrimary, fontSize: 15 }}>{message.body}</Text>
          <Text style={[styles.time, { color: colors.onPrimary }]}>{time}</Text>
        </View>
      </Animated.View>
    );
  }
  const name = member?.name ?? 'Former rider';
  return (
    <Animated.View entering={FadeInDown.duration(200)} style={styles.bubbleRow}>
      <Avatar uri={member?.avatarUrl} name={name} size={32} />
      <View style={[styles.bubble, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{name}</Text>
        <Text style={{ color: colors.text, fontSize: 15 }}>{message.body}</Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>{time}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  padded: {
    padding: Spacing.md,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.sm,
    flexGrow: 1,
  },
  empty: {
    textAlign: 'center',
    // The list is flipped, so flip the empty message back.
    transform: [{ scaleY: -1 }],
  },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: Radius.lg,
    borderCurve: 'continuous',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 2,
  },
  time: {
    fontSize: 11,
    opacity: 0.7,
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.md,
    paddingTop: 12,
    fontSize: 16,
  },
  send: {
    width: TapTarget - 2,
    height: 44,
    borderRadius: 22,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
