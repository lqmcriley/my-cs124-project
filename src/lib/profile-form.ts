// The rules for the profile + car form, kept separate from the screen so they're easy to test.

import { BIO_MAX_LENGTH, MAX_MPG, MAX_PASSENGER_SEATS, MIN_MPG } from './config';
import type { Car, ChatPreference, ClassYear, Profile } from './types';

// What the form holds while you're typing. Numbers are strings until we save.
export type ProfileFormValues = {
  fullName: string;
  year: ClassYear | null;
  major: string;
  bio: string;
  chatPreference: ChatPreference;
  isDriver: boolean;
  make: string;
  model: string;
  color: string;
  plate: string;
  mpg: string;
  seats: string;
};

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

export function initialFormValues(profile: Profile | null, car: Car | null): ProfileFormValues {
  return {
    fullName: profile?.full_name ?? '',
    year: profile?.year ?? null,
    major: profile?.major ?? '',
    bio: profile?.bio ?? '',
    chatPreference: profile?.chat_preference ?? 'talk',
    isDriver: car !== null,
    make: car?.make ?? '',
    model: car?.model ?? '',
    color: car?.color ?? '',
    plate: car?.plate ?? '',
    mpg: car ? String(car.mpg) : '',
    seats: car ? String(car.seats) : '',
  };
}

// Returns an error message for each field that needs fixing. Empty object = all good.
export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!values.fullName.trim()) errors.fullName = 'Please enter your name.';
  if (values.bio.length > BIO_MAX_LENGTH) errors.bio = `Keep your bio under ${BIO_MAX_LENGTH} characters.`;

  if (values.isDriver) {
    if (!values.make.trim()) errors.make = 'Required';
    if (!values.model.trim()) errors.model = 'Required';
    if (!values.color.trim()) errors.color = 'Required';
    if (!values.plate.trim()) errors.plate = 'Required';
    else if (values.plate.trim().length > 10) errors.plate = 'Plates are 10 characters or fewer.';

    const mpg = Number(values.mpg);
    if (!values.mpg.trim() || !Number.isFinite(mpg) || mpg < MIN_MPG || mpg > MAX_MPG) {
      errors.mpg = `Enter your car's MPG (${MIN_MPG}–${MAX_MPG}).`;
    }

    const seats = Number(values.seats);
    if (!Number.isInteger(seats) || seats < 1 || seats > MAX_PASSENGER_SEATS) {
      errors.seats = `Enter 1–${MAX_PASSENGER_SEATS} passenger seats.`;
    }
  }

  return errors;
}

// Turn form values into database rows. Blank optional fields become null.
export function toProfileRow(userId: string, values: ProfileFormValues) {
  return {
    id: userId,
    full_name: values.fullName.trim(),
    year: values.year,
    major: values.major.trim() || null,
    bio: values.bio.trim() || null,
    chat_preference: values.chatPreference,
  };
}

export function toCarRow(userId: string, values: ProfileFormValues) {
  return {
    owner_id: userId,
    make: values.make.trim(),
    model: values.model.trim(),
    color: values.color.trim(),
    plate: values.plate.trim().toUpperCase(),
    mpg: Number(values.mpg),
    seats: Number(values.seats),
  };
}
