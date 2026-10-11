// The rules for the profile + car form, kept separate from the screen so they're easy to test.

import { BIO_MAX_LENGTH, CarBodyType, MAX_MPG, MAX_PASSENGER_SEATS, MIN_MPG } from './config';
import { cleanHandle, handleError, PaymentMethods } from './payments';
import { formatPhone, normalizePhone } from './phone';
import type { Car, ClassYear, Profile } from './types';
import { chatPreferenceFromVibe, Vibes, vibesFrom } from './vibes';

// What the form holds while you're typing. Numbers are strings until we save.
export type ProfileFormValues = {
  fullName: string;
  year: ClassYear | null;
  major: string;
  bio: string;
  vibes: Vibes; // vibe check sliders
  isDriver: boolean;
  make: string;
  model: string;
  color: string;
  plate: string;
  mpg: string;
  seats: string;
  bodyType: CarBodyType;
  // Payment handles (optional, private)
  venmo: string;
  cashapp: string;
  paypal: string;
  phone: string; // private; shared only with people on your trips
};

export type ProfileFormErrors = Partial<Record<keyof ProfileFormValues, string>>;

export function initialFormValues(
  profile: Profile | null,
  car: Car | null,
  payment: PaymentMethods | null = null,
  phone: string | null = null,
): ProfileFormValues {
  return {
    fullName: profile?.full_name ?? '',
    year: profile?.year ?? null,
    major: profile?.major ?? '',
    bio: profile?.bio ?? '',
    vibes: initialVibes(profile),
    isDriver: car !== null,
    make: car?.make ?? '',
    model: car?.model ?? '',
    color: car?.color ?? '',
    plate: car?.plate ?? '',
    mpg: car ? String(car.mpg) : '',
    seats: car ? String(car.seats) : '',
    bodyType: car?.body_type ?? 'sedan',
    venmo: payment?.venmo_username ?? '',
    cashapp: payment?.cashapp_cashtag ?? '',
    paypal: payment?.paypal_username ?? '',
    phone: phone ? formatPhone(phone) : '',
  };
}

// Vibes from the profile. Profiles saved before the sliders existed start their
// chat slider from the old "Quiet ride / Down to talk" choice.
function initialVibes(profile: Profile | null): Vibes {
  const vibes = vibesFrom(profile);
  if (profile && profile.vibe_chat === undefined) vibes.vibe_chat = profile.chat_preference === 'quiet' ? 0 : 3;
  return vibes;
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

  const venmoError = handleError('venmo', cleanHandle(values.venmo));
  const cashappError = handleError('cashapp', cleanHandle(values.cashapp));
  const paypalError = handleError('paypal', cleanHandle(values.paypal));
  if (venmoError) errors.venmo = venmoError;
  if (cashappError) errors.cashapp = cashappError;
  if (paypalError) errors.paypal = paypalError;
  if (values.phone.trim() && !normalizePhone(values.phone)) errors.phone = 'Enter a 10-digit phone number, e.g. (217) 555-0123.';

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
    chat_preference: chatPreferenceFromVibe(values.vibes.vibe_chat),
    ...values.vibes,
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
    body_type: values.bodyType,
  };
}

// Payment handles row, or null if every handle is blank.
export function toPaymentRow(userId: string, values: ProfileFormValues) {
  const row = {
    user_id: userId,
    venmo_username: cleanHandle(values.venmo) || null,
    cashapp_cashtag: cleanHandle(values.cashapp) || null,
    paypal_username: cleanHandle(values.paypal) || null,
  };
  return row.venmo_username || row.cashapp_cashtag || row.paypal_username ? row : null;
}

// Phone number row, or null if the field is blank.
export function toContactRow(userId: string, values: ProfileFormValues) {
  const phone = normalizePhone(values.phone);
  return phone ? { user_id: userId, phone } : null;
}
