import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

interface AppSettings {
  completedDisciplines: string[];
  isOnboarded: boolean;
}

interface AppContextType {
  completedDisciplines: string[];
  toggleCompletedDiscipline: (code: string) => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Atoms with storage (persisted in localStorage)
const completedDisciplinesAtom = atomWithStorage<string[]>('completedDisciplines', []);
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');
const onboardedAtom = atomWithStorage<boolean>('isOnboarded', false);

// Derived write atoms for actions
const toggleCompletedDisciplineAtom = atom(null, (get, set, code: string) => {
  const prev = get(completedDisciplinesAtom);
  const next = prev.includes(code)
    ? prev.filter((c) => c !== code)
    : [...prev, code];
  set(completedDisciplinesAtom, next);
});

const toggleThemeAtom = atom(null, (get, set) => {
  const current = get(themeAtom);
  set(themeAtom, current === 'light' ? 'dark' : 'light');
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme] = useAtom(themeAtom);

  // Sync DOM class with theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const completedDisciplines = useAtomValue(completedDisciplinesAtom);
  const setCompletedDisciplines = useSetAtom(completedDisciplinesAtom);
  const toggleCompletedDiscipline = useSetAtom(toggleCompletedDisciplineAtom);

  const toggleTheme = useSetAtom(toggleThemeAtom);

  const isOnboarded = useAtomValue(onboardedAtom);
  const setIsOnboarded = useSetAtom(onboardedAtom);

  const exportSettings = (): string => {
    const settings: AppSettings = {
      completedDisciplines,
      isOnboarded,
    };
    return JSON.stringify(settings, null, 2);
  };

  const importSettings = (json: string): boolean => {
    try {
      const settings = JSON.parse(json) as Partial<AppSettings & { selectedCourse?: string | null }>;
      if (Array.isArray(settings.completedDisciplines))
        setCompletedDisciplines(settings.completedDisciplines);
      if (settings.isOnboarded !== undefined) setIsOnboarded(settings.isOnboarded);
      // Legacy support: if a previous export had selectedCourse, migrate it to localStorage
      if (settings.selectedCourse) {
        try {
          localStorage.setItem('selectedPrograms', JSON.stringify([settings.selectedCourse]));
        } catch {}
      }
      return true;
    } catch {
      return false;
    }
  };

  return (
    <AppContext.Provider
      value={{
        completedDisciplines,
        toggleCompletedDiscipline,
        theme,
        toggleTheme,
        isOnboarded,
        setIsOnboarded,
        exportSettings,
        importSettings,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
