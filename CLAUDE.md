# Halfsies — notes for Claude

Halfsies is a carpool app for UIUC students. Drivers post trips they're already taking, and riders book a seat and split the gas cost. It is **cost-sharing only**, so drivers never profit. Full requirements: `SPEC.md`. Out of scope: `ROADMAP.md`. Account and key setup: `SETUP.md`. Expo-specific agent rules: `AGENTS.md` (read it: always check the versioned Expo docs, and use `npx expo install`).

The owner is a beginner. Keep code simple, explain changes in plain language, and build one phase at a time (see `SPEC.md` → Build phases). Stop after each phase so the owner can test it.

**Status:** Phase 1 (setup, login, profile) done. Next: Phase 2 (trips).

## Stack

- **Expo SDK 57 (React Native 0.86) + TypeScript**, with **Expo Router** (file-based screens in `src/app/`). Testing is done in **Expo Go**, so only use libraries Expo Go includes.
- **Supabase**: email one-time-code auth (`@illinois.edu` only), Postgres with Row Level Security on every table, Storage for photos, and Realtime for chat (Phase 4).
- **Maps** (Phase 2): `react-native-maps`, plus Google **Places API (New)** and **Routes API**. Routes replaces the legacy Directions API, which new Google projects can't enable.
- **Payments**: no card processing. A "Pay with Venmo" deep link, and the driver marks riders as paid.

## Folder structure

```
src/
  app/                      Screens (each file is a route)
    _layout.tsx             Root: AuthProvider + Stack.Protected guards (sign-in / profile-setup / tabs)
    sign-in.tsx             Welcome + email + 6-digit code
    profile-setup.tsx       First-time profile (uses ProfileForm)
    edit-profile.tsx        Modal, same ProfileForm
    (tabs)/_layout.tsx      Bottom tabs
    (tabs)/index.tsx        Home / Find a ride (placeholder until Phase 2)
    (tabs)/profile.tsx      Your profile, car, sign out
  components/
    ui.tsx                  Screen, Heading, Body, Label, Button, TextField, Chip, Card, ErrorText
    profile-form.tsx        Profile + car form
    avatar.tsx, logo.tsx
  constants/theme.ts        Light/dark colors, spacing, radius, TapTarget
  hooks/use-theme.ts        Current color palette
  lib/
    config.ts               ⭐ Tweakable constants: DEFAULT_GAS_PRICE, IRS_MILEAGE_RATE, email domain, limits
    supabase.ts             Supabase client (reads EXPO_PUBLIC_* from .env)
    secure-storage.ts       Encrypted session storage (SecureStore key + AsyncStorage)
    email.ts                @illinois.edu check
    profile-form.ts         Form validation + conversion to DB rows (pure, tested)
    profile-api.ts          Save profile/car, upload avatar
    types.ts                Row types; keep in sync with migrations
    __tests__/              Jest unit tests for the pure lib files
  providers/auth-provider.tsx   session, profile, car, loading, refreshProfile, signOut
supabase/migrations/        SQL, one file per phase; run in filename order
```

## Rules to never break

- The `@illinois.edu` check lives in **both** `lib/email.ts` and a database trigger on `auth.users`.
- Every table has RLS enabled with policies. Users write only their own rows. Never use the secret/service-role key in the app.
- Price per share = (miles ÷ MPG × gas price) ÷ people in the car (driver included). Partial riders pay in proportion to their miles. Cap: rider miles × IRS rate ÷ people. Constants come from `lib/config.ts`. Put the pricing math in a pure `lib/pricing.ts` with unit tests.
- Secrets go in `.env` (gitignored). Only `EXPO_PUBLIC_*` vars reach the app.
- Colors: orange `#FF6B35` primary, navy `#13294B` text and headers, navy text on orange buttons (for contrast). Always support dark mode via `useTheme()`. Tap targets are ≥ 44pt.

## How to run

```bash
npm install
cp .env.example .env        # fill in Supabase (+ Google from Phase 2) keys — see SETUP.md
npx expo start              # or --tunnel on campus Wi-Fi; scan the QR with Expo Go / Camera
```

Checks to run before calling a phase done:

```bash
npx tsc --noEmit            # type-check
npx expo lint               # lint
npm test                    # unit tests
```

Database: paste each new file from `supabase/migrations/` into the Supabase SQL Editor (see SETUP.md 2c). To test SQL locally, the Homebrew `postgresql@17` package is installed. Spin up a throwaway cluster, stub the `auth`/`storage` schemas and roles, then run the migration (set `LC_ALL=en_US.UTF-8` and use TCP on 127.0.0.1, because long folder paths break Postgres's Unix socket).
