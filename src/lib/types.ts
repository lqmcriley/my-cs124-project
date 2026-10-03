// TypeScript shapes for rows in our database tables.
// Keep these in sync with supabase/migrations/.

import { CLASS_YEARS } from './config';

export type ClassYear = (typeof CLASS_YEARS)[number];
export type ChatPreference = 'quiet' | 'talk';

export type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  year: ClassYear | null;
  major: string | null;
  bio: string | null;
  chat_preference: ChatPreference;
};

export type Car = {
  id: string;
  owner_id: string;
  make: string;
  model: string;
  color: string;
  plate: string;
  mpg: number;
  seats: number;
};
