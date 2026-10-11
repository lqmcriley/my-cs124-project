// Trip group chat: load messages, send one, and listen for new ones live.
// Only the driver and approved riders can read or post (enforced in the database).

import { supabase } from './supabase';
import type { Message } from './types';

export const MESSAGE_MAX_LENGTH = 1000;

export async function fetchMessages(tripId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(`Couldn't load the chat: ${error.message}`);
  return data as Message[];
}

export async function sendMessage(tripId: string, senderId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ trip_id: tripId, sender_id: senderId, body: body.trim() })
    .select()
    .single();
  if (error) throw new Error(`Couldn't send: ${error.message}`);
  return data as Message;
}

// Calls onMessage for every new message in this trip's chat. Returns a function that stops listening.
export function subscribeToMessages(tripId: string, onMessage: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`trip-chat-${tripId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `trip_id=eq.${tripId}` },
      (payload) => onMessage(payload.new as Message),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
