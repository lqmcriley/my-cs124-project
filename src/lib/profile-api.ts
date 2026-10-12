// Saving the profile form to Supabase: photo upload, profile row, and car row.

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { supabase } from './supabase';
import { ProfileFormValues, toCarRow, toContactRow, toPaymentRow, toProfileRow } from './profile-form';

export type PickedPhoto = { uri: string; mimeType: string };

// Profile photos only ever show small, so they're shrunk to this width (pixels)
// before uploading: about 50 KB instead of several MB, so saving is quick.
const AVATAR_WIDTH = 512;

// Shrinks a picked photo on the phone and returns it ready to upload.
export async function shrinkPhoto(uri: string): Promise<PickedPhoto> {
  const context = ImageManipulator.manipulate(uri);
  context.resize({ width: AVATAR_WIDTH });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, mimeType: 'image/jpeg' };
}

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

  // The profile goes first (the car, payment and phone rows point at it)...
  const { error: profileError } = await supabase.from('profiles').upsert(profileRow);
  if (profileError) throw new Error(`Couldn't save your profile: ${profileError.message}`);

  // ...then the rest all save at the same time.
  await Promise.all([saveCar(userId, values, hadCar), savePayment(userId, values), saveContact(userId, values)]);
}

async function saveCar(userId: string, values: ProfileFormValues, hadCar: boolean) {
  if (values.isDriver) {
    const { error } = await supabase.from('cars').upsert(toCarRow(userId, values), { onConflict: 'owner_id' });
    if (error) throw new Error(`Couldn't save your car: ${error.message}`);
  } else if (hadCar) {
    const { error } = await supabase.from('cars').delete().eq('owner_id', userId);
    if (error) throw new Error(`Couldn't remove your car: ${error.message}`);
  }
}

async function savePayment(userId: string, values: ProfileFormValues) {
  const paymentRow = toPaymentRow(userId, values);
  const { error } = paymentRow
    ? await supabase.from('payment_methods').upsert(paymentRow)
    : await supabase.from('payment_methods').delete().eq('user_id', userId);
  if (error) throw new Error(`Couldn't save your payment handles: ${error.message}`);
}

async function saveContact(userId: string, values: ProfileFormValues) {
  const contactRow = toContactRow(userId, values);
  const { error } = contactRow
    ? await supabase.from('contact_info').upsert(contactRow)
    : await supabase.from('contact_info').delete().eq('user_id', userId);
  if (error) throw new Error(`Couldn't save your phone number: ${error.message}`);
}
