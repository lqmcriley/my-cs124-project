// Remembers which color theme you picked (on this phone) and shares it with
// every screen. useTheme() reads from here.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

import { ThemeId, Themes } from '@/constants/theme';

const STORAGE_KEY = 'hitch-illini-theme';

type ThemeChoice = { themeId: ThemeId; setThemeId: (id: ThemeId) => void };

const ThemeChoiceContext = createContext<ThemeChoice>({ themeId: 'classic', setThemeId: () => {} });

export function ThemeChoiceProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>('classic');

  // Load the saved choice once when the app opens.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in Themes) setThemeIdState(saved as ThemeId);
      })
      .catch(() => {});
  }, []);

  function setThemeId(id: ThemeId) {
    setThemeIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }

  return <ThemeChoiceContext.Provider value={{ themeId, setThemeId }}>{children}</ThemeChoiceContext.Provider>;
}

export function useThemeChoice(): ThemeChoice {
  return useContext(ThemeChoiceContext);
}
