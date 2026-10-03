// Keeps track of who is signed in, plus their profile and car.
// Any screen can read this with: const { session, profile, car } = useAuth();

import type { Session } from '@supabase/supabase-js';
import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Car, Profile } from '@/lib/types';

type AuthState = {
  session: Session | null;
  profile: Profile | null; // null until the user finishes profile setup
  car: Car | null; // null if the user hasn't added a car
  loading: boolean; // true until we know who's signed in and have loaded their profile
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

// Load a user's profile and car from the database. Either can be null.
async function fetchProfileAndCar(userId: string): Promise<{ profile: Profile | null; car: Car | null }> {
  const [profileResult, carResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('cars').select('*').eq('owner_id', userId).maybeSingle(),
  ]);
  if (profileResult.error) console.warn('Could not load profile', profileResult.error.message);
  if (carResult.error) console.warn('Could not load car', carResult.error.message);
  return { profile: profileResult.data, car: carResult.data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [car, setCar] = useState<Car | null>(null);
  // Which user's profile we've finished loading. Lets us tell
  // "no profile yet" apart from "profile still loading".
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);

  const userId = session?.user.id ?? null;

  // Reload after saving the profile form.
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    const result = await fetchProfileAndCar(userId);
    setProfile(result.profile);
    setCar(result.car);
  }, [userId]);

  // Listen for sign-in and sign-out. This also fires once at startup with any saved session.
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setSessionChecked(true);
      if (!newSession) {
        setProfile(null);
        setCar(null);
        setLoadedUserId(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Whenever a different user signs in, load their profile.
  useEffect(() => {
    if (!userId) return;
    let stale = false; // set if the user changes before loading finishes
    fetchProfileAndCar(userId).then((result) => {
      if (stale) return;
      setProfile(result.profile);
      setCar(result.car);
      setLoadedUserId(userId);
    });
    return () => {
      stale = true;
    };
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const loading = !sessionChecked || (userId !== null && loadedUserId !== userId);

  return (
    <AuthContext.Provider value={{ session, profile, car, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
