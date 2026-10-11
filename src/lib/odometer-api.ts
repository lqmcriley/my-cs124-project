// Optional odometer photos: the driver adds a start and end photo to a trip.
// Stored privately; only people in the car can view them (through short-lived links).

import { supabase } from './supabase';

export type OdometerKind = 'start' | 'end';
export type OdometerPhotos = Partial<Record<OdometerKind, string>>; // kind -> viewable link

export async function fetchOdometerPhotos(tripId: string): Promise<OdometerPhotos> {
  const { data, error } = await supabase.from('odometer_photos').select('kind, path').eq('trip_id', tripId);
  if (error || !data) return {};
  const photos: OdometerPhotos = {};
  for (const row of data as { kind: OdometerKind; path: string }[]) {
    // A link that works for one hour, since the bucket is private.
    const { data: signed } = await supabase.storage.from('odometer').createSignedUrl(row.path, 60 * 60);
    if (signed?.signedUrl) photos[row.kind] = signed.signedUrl;
  }
  return photos;
}

export async function uploadOdometerPhoto(tripId: string, kind: OdometerKind, photo: { uri: string; mimeType: string }): Promise<void> {
  const path = `${tripId}/${kind}`;
  const bytes = await fetch(photo.uri).then((response) => response.arrayBuffer());
  const { error: uploadError } = await supabase.storage.from('odometer').upload(path, bytes, { contentType: photo.mimeType, upsert: true });
  if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
  const { error } = await supabase.from('odometer_photos').upsert({ trip_id: tripId, kind, path }, { onConflict: 'trip_id,kind' });
  if (error) throw new Error(`Couldn't save the photo: ${error.message}`);
}
