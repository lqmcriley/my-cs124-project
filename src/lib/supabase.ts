// The one Supabase client the whole app shares.
// Import it anywhere with: import { supabase } from '@/lib/supabase';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import { LargeSecureStore } from './secure-storage';

// These come from your .env file. Expo only exposes variables that start
// with EXPO_PUBLIC_, and only these two are safe to ship inside an app.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase keys. Copy .env.example to .env, fill in your keys, then restart `npx expo start`.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Keep the login fresh only while the app is open on screen, as Supabase recommends.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
