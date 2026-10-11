// Talking to Google Maps: address autocomplete (Places API New) and driving routes (Routes API).
// The key comes from .env. It's restricted in Google Cloud to only these two APIs.

import * as Crypto from 'expo-crypto';

import { CAMPUS_CENTER, Place } from './config';
import { decodePolyline, LatLng, METERS_PER_MILE } from './geo';

const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

function requireKey(): string {
  if (!apiKey) {
    throw new Error('Missing Google Maps key. Add EXPO_PUBLIC_GOOGLE_MAPS_API_KEY to .env and restart Expo.');
  }
  return apiKey;
}

async function googleRequest<T>(url: string, init: { method?: string; body?: unknown; fieldMask?: string }): Promise<T> {
  const response = await fetch(url, {
    method: init.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': requireKey(),
      ...(init.fieldMask ? { 'X-Goog-FieldMask': init.fieldMask } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error?.message ?? `Google Maps request failed (${response.status})`);
  }
  return json as T;
}

// Google bills autocomplete per "session" (typing + picking one result), so each
// search box gets a session token and makes a new one after a pick.
export function newSessionToken(): string {
  return Crypto.randomUUID();
}

export type Suggestion = { placeId: string; mainText: string; secondaryText: string };

type AutocompleteResponse = {
  suggestions?: {
    placePrediction?: {
      placeId: string;
      structuredFormat: { mainText: { text: string }; secondaryText?: { text: string } };
    };
  }[];
};

export async function autocomplete(input: string, sessionToken: string): Promise<Suggestion[]> {
  const data = await googleRequest<AutocompleteResponse>('https://places.googleapis.com/v1/places:autocomplete', {
    body: {
      input,
      sessionToken,
      includedRegionCodes: ['us'],
      // Prefer places near campus, but still find Chicago, Indy, etc.
      locationBias: { circle: { center: CAMPUS_CENTER, radius: 50000 } },
    },
  });
  return (data.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction) => prediction !== undefined)
    .map((prediction) => ({
      placeId: prediction.placeId,
      mainText: prediction.structuredFormat.mainText.text,
      secondaryText: prediction.structuredFormat.secondaryText?.text ?? '',
    }));
}

type PlaceDetailsResponse = {
  displayName?: { text: string };
  types?: string[];
  formattedAddress?: string;
  location: { latitude: number; longitude: number };
};

// Look up the coordinates of a suggestion the user tapped.
export async function placeDetails(placeId: string, sessionToken: string): Promise<Place> {
  const data = await googleRequest<PlaceDetailsResponse>(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${sessionToken}`,
    { method: 'GET', fieldMask: 'displayName,formattedAddress,location,types' },
  );
  return {
    name: data.displayName?.text ?? data.formattedAddress ?? 'Selected place',
    address: data.formattedAddress ?? '',
    latitude: data.location.latitude,
    longitude: data.location.longitude,
    isAirport: (data.types ?? []).some((type) => type === 'airport' || type === 'international_airport'),
  };
}

export type Route = {
  miles: number;
  minutes: number;
  encodedPolyline: string;
  points: LatLng[];
};

type RoutesResponse = {
  routes?: { distanceMeters: number; duration: string; polyline: { encodedPolyline: string } }[];
};

// Driving route between two places. Its distance is what the price is based on.
export async function computeRoute(origin: LatLng, destination: LatLng): Promise<Route> {
  const toWaypoint = (point: LatLng) => ({
    location: { latLng: { latitude: point.latitude, longitude: point.longitude } },
  });
  const data = await googleRequest<RoutesResponse>('https://routes.googleapis.com/directions/v2:computeRoutes', {
    fieldMask: 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline',
    body: { origin: toWaypoint(origin), destination: toWaypoint(destination), travelMode: 'DRIVE' },
  });
  const route = data.routes?.[0];
  if (!route) throw new Error("Couldn't find a driving route between those places.");

  return {
    miles: route.distanceMeters / METERS_PER_MILE,
    minutes: parseInt(route.duration, 10) / 60, // duration looks like "9123s"
    encodedPolyline: route.polyline.encodedPolyline,
    points: decodePolyline(route.polyline.encodedPolyline),
  };
}
