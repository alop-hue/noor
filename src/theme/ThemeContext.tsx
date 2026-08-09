import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { themes, type ThemeColors, type ThemeMode } from './tokens';

export type ThemePreference = 'system' | 'light' | 'dark' | 'amoled';

interface ThemeContextValue {
  preference: ThemePreference;
  mode: ThemeMode;
  colors: ThemeColors;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'system',
  mode: 'light',
  colors: themes.light,
  setPreference: () => {},
});

export function ThemeProvider({ preference, setPreference, children }: { preference: ThemePreference; setPreference: (p: ThemePreference) => void; children: ReactNode }) {
  const system = useColorScheme();
  const mode: ThemeMode =
    preference === 'system' ? (system === 'dark' ? 'dark' : 'light') : preference === 'amoled' ? 'amoled' : preference;
  const colors = themes[mode];
  const value = useMemo(
    () => ({ preference, mode, colors, setPreference }),
    [preference, mode, colors, setPreference],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
