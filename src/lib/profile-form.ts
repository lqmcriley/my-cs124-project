// The rules for the profile + car form, kept separate from the screen so they're easy to test.

import { BIO_MAX_LENGTH, CarBodyType } from './config';
import { energy, Fuel, isElectric, validModelYear } from './fuel';
import { cleanHandle, handleError, PaymentMethods } from './payments';
import { formatPhone, normalizePhone } from './phone';
import { layoutForSeats, passengerCount, SeatLayout } from './seats';
import type { Car, ClassYear, Profile } from './types';
import type { RideTag } from './ride-tags';

// What the form holds while you're typing. Numbers are strings until we save.
export type ProfileFormValues = {
  firstName: string;
  lastName: string;
  nickname: string; // optional: what people call you, e.g. "Quinn"
  year: ClassYear | null;
  major: string;
  bio: string;
  rideTags: RideTag[]; // ride style, up to 4
  isDriver: boolean;
  make: string;
  model: string;
  color: string;
  plate: string;
  modelYear: string; // e.g. "2019"
  fuel: Fuel;
  mpg: string; // miles per kWh for electric cars
  seatLayout: SeatLayout; // how many seats, in which rows
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
    // Profiles saved before first/last names existed: split the full name.
    firstName: profile?.first_name ?? (profile?.full_name ?? '').trim().split(/\s+/)[0] ?? '',
    lastName: profile?.last_name ?? (profile?.full_name ?? '').trim().split(/\s+/).slice(1).join(' '),
    nickname: profile?.nickname ?? '',
    year: profile?.year ?? null,
    major: profile?.major ?? '',
    bio: profile?.bio ?? '',
    rideTags: (profile?.ride_tags ?? []) as RideTag[],
    isDriver: car !== null,
    make: car?.make ?? '',
    model: car?.model ?? '',
    color: car?.color ?? '',
    plate: car?.plate ?? '',
    modelYear: car?.model_year ? String(car.model_year) : '',
    fuel: car?.fuel ?? 'regular',
    mpg: car ? String(car.mpg) : '',
    seatLayout: car?.seat_layout ?? (car ? layoutForSeats(car.seats) : '5'),
    bodyType: car?.body_type ?? 'sedan',
    venmo: payment?.venmo_username ?? '',
    cashapp: payment?.cashapp_cashtag ?? '',
    paypal: payment?.paypal_username ?? '',
    phone: phone ? formatPhone(phone) : '',
  };
}

// Returns an error message for each field that needs fixing. Empty object = all good.
export function validateProfileForm(values: ProfileFormValues): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!values.firstName.trim()) errors.firstName = 'Please enter your first name.';
  if (!values.lastName.trim()) errors.lastName = 'Please enter your last name.';
  if (values.nickname.trim().length > 30) errors.nickname = 'Keep your nickname under 30 characters.';
  if (values.bio.length > BIO_MAX_LENGTH) errors.bio = `Keep your bio under ${BIO_MAX_LENGTH} characters.`;

  if (values.isDriver) {
    if (!values.make.trim()) errors.make = 'Required';
    if (!values.model.trim()) errors.model = 'Required';
    if (!values.color.trim()) errors.color = 'Required';
    if (!values.plate.trim()) errors.plate = 'Required';
    else if (values.plate.trim().length > 10) errors.plate = 'Plates are 10 characters or fewer.';

    if (!validModelYear(Number(values.modelYear))) errors.modelYear = `Enter the year, e.g. 2019.`;

    const { efficiencyName, minEfficiency, maxEfficiency } = energy(values.fuel);
    const mpg = Number(values.mpg);
    if (!values.mpg.trim() || !Number.isFinite(mpg) || mpg < minEfficiency || mpg > maxEfficiency) {
      errors.mpg = isElectric(values.fuel)
        ? `Enter miles per kWh (${minEfficiency}–${maxEfficiency}). It's on your car's screen, usually 3–4.`
        : `Enter your car's ${efficiencyName} (${minEfficiency}–${maxEfficiency}).`;
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
    full_name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
    first_name: values.firstName.trim(),
    last_name: values.lastName.trim(),
    nickname: values.nickname.trim() || null,
    year: values.year,
    major: values.major.trim() || null,
    bio: values.bio.trim() || null,
    ride_tags: values.rideTags,
    // The older quiet/talk setting, kept in step for anything that still reads it.
    chat_preference: values.rideTags.includes('quiet') ? ('quiet' as const) : ('talk' as const),
  };
}

export function toCarRow(userId: string, values: ProfileFormValues) {
  return {
    owner_id: userId,
    make: values.make.trim(),
    model: values.model.trim(),
    color: values.color.trim(),
    plate: values.plate.trim().toUpperCase(),
    model_year: Number(values.modelYear),
    fuel: values.fuel,
    mpg: Number(values.mpg),
    seats: passengerCount(values.seatLayout),
    seat_layout: values.seatLayout,
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
