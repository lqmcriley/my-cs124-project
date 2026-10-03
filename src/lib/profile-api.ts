// Saving the profile form to Supabase: photo upload, profile row, and car row.

import { supabase } from './supabase';
import { ProfileFormValues, toCarRow, toProfileRow } from './profile-form';

export type PickedPhoto = { uri: string; mimeType: string };

// Uploads a photo to avatars/<userId>/avatar and returns its public web address.
async function uploadAvatar(userId: string, photo: PickedPhoto): Promise<string> {
  const fileBytes = await fetch(photo.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/avatar`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, fileBytes, { contentType: photo.mimeType, upsert: true });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // The ?v= part makes phones show the new photo instead of a cached old one.
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function saveProfile(
  userId: string,
  values: ProfileFormValues,
  newPhoto: PickedPhoto | null,
  hadCar: boolean,
) {
  const profileRow: ReturnType<typeof toProfileRow> & { avatar_url?: string } = toProfileRow(userId, values);
  if (newPhoto) profileRow.avatar_url = await uploadAvatar(userId, newPhoto);

  const { error: profileError } = await supabase.from('profiles').upsert(profileRow);
  if (profileError) throw new Error(`Couldn't save your profile: ${profileError.message}`);

  if (values.isDriver) {
    const { error } = await supabase.from('cars').upsert(toCarRow(userId, values), { onConflict: 'owner_id' });
    if (error) throw new Error(`Couldn't save your car: ${error.message}`);
  } else if (hadCar) {
    const { error } = await supabase.from('cars').delete().eq('owner_id', userId);
    if (error) throw new Error(`Couldn't remove your car: ${error.message}`);
  }
}
