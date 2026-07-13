import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
<<<<<<< HEAD
import type { DisciplineStatus, SemesterOutcome } from '@/lib/semester';
import { emptySemesterOutcome } from '@/lib/semester';
=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59

interface AppSettings {
  completedDisciplines: string[];
  isOnboarded: boolean;
}

interface AppContextType {
  completedDisciplines: string[];
  toggleCompletedDiscipline: (code: string) => void;
<<<<<<< HEAD
  disciplineStatuses: Record<string, DisciplineStatus>;
  getDisciplineStatus: (code: string) => DisciplineStatus | null;
  setDisciplineStatus: (code: string, status: DisciplineStatus, term?: string) => void;
  clearDisciplineStatus: (code: string, term?: string) => void;
  semesterOutcomes: Record<string, SemesterOutcome>;
=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOnboarded: boolean;
  setIsOnboarded: (value: boolean) => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

<<<<<<< HEAD
const completedDisciplinesAtom = atomWithStorage<string[]>('completedDisciplines', []);
const disciplineStatusesAtom = atomWithStorage<Record<string, DisciplineStatus>>('disciplineStatuses', {});
const semesterOutcomesAtom = atomWithStorage<Record<string, SemesterOutcome>>('semesterOutcomes', {});
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');
const onboardedAtom = atomWithStorage<boolean>('isOnboarded', false);

=======
// Atoms with storage (persisted in localStorage)
const completedDisciplinesAtom = atomWithStorage<string[]>('completedDisciplines', []);
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light');
const onboardedAtom = atomWithStorage<boolean>('isOnboarded', false);

// Derived write atoms for actions
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
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

<<<<<<< HEAD
function removeFromOutcome(outcome: SemesterOutcome, code: string): SemesterOutcome {
  return {
    approved: outcome.approved.filter((c) => c !== code),
    failed: outcome.failed.filter((c) => c !== code),
    dropped: outcome.dropped.filter((c) => c !== code),
  };
}

function addToOutcomeList(outcome: SemesterOutcome, status: DisciplineStatus, code: string): SemesterOutcome {
  const cleaned = removeFromOutcome(outcome, code);
  if (status === 'approved') return { ...cleaned, approved: [...cleaned.approved, code] };
  if (status === 'failed') return { ...cleaned, failed: [...cleaned.failed, code] };
  return { ...cleaned, dropped: [...cleaned.dropped, code] };
}

const setDisciplineStatusAtom = atom(
  null,
  (get, set, code: string, status: DisciplineStatus, term?: string) => {
    const statuses = { ...get(disciplineStatusesAtom), [code]: status };
    set(disciplineStatusesAtom, statuses);

    const completed = get(completedDisciplinesAtom);
    if (status === 'approved') {
      if (!completed.includes(code)) {
        set(completedDisciplinesAtom, [...completed, code]);
      }
    } else {
      set(completedDisciplinesAtom, completed.filter((c) => c !== code));
    }

    if (term) {
      const outcomes = { ...get(semesterOutcomesAtom) };
      const current = outcomes[term] || emptySemesterOutcome();
      outcomes[term] = addToOutcomeList(current, status, code);
      set(semesterOutcomesAtom, outcomes);
    }
  }
);

const clearDisciplineStatusAtom = atom(null, (get, set, code: string, term?: string) => {
  const statuses = { ...get(disciplineStatusesAtom) };
  delete statuses[code];
  set(disciplineStatusesAtom, statuses);

  const completed = get(completedDisciplinesAtom);
  set(completedDisciplinesAtom, completed.filter((c) => c !== code));

  if (term) {
    const outcomes = { ...get(semesterOutcomesAtom) };
    if (outcomes[term]) {
      outcomes[term] = removeFromOutcome(outcomes[term], code);
      set(semesterOutcomesAtom, outcomes);
    }
  }
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme] = useAtom(themeAtom);

=======
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme] = useAtom(themeAtom);

  // Sync DOM class with theme
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const completedDisciplines = useAtomValue(completedDisciplinesAtom);
  const setCompletedDisciplines = useSetAtom(completedDisciplinesAtom);
  const toggleCompletedDiscipline = useSetAtom(toggleCompletedDisciplineAtom);
<<<<<<< HEAD
  const disciplineStatuses = useAtomValue(disciplineStatusesAtom);
  const semesterOutcomes = useAtomValue(semesterOutcomesAtom);
  const setDisciplineStatus = useSetAtom(setDisciplineStatusAtom);
  const clearDisciplineStatus = useSetAtom(clearDisciplineStatusAtom);
  const toggleTheme = useSetAtom(toggleThemeAtom);
  const isOnboarded = useAtomValue(onboardedAtom);
  const setIsOnboarded = useSetAtom(onboardedAtom);

  const getDisciplineStatus = (code: string): DisciplineStatus | null =>
    disciplineStatuses[code] ?? null;

=======

  const toggleTheme = useSetAtom(toggleThemeAtom);

  const isOnboarded = useAtomValue(onboardedAtom);
  const setIsOnboarded = useSetAtom(onboardedAtom);

>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
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
<<<<<<< HEAD
=======
      // Legacy support: if a previous export had selectedCourse, migrate it to localStorage
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
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
<<<<<<< HEAD
        disciplineStatuses,
        getDisciplineStatus,
        setDisciplineStatus,
        clearDisciplineStatus,
        semesterOutcomes,
=======
>>>>>>> 6cf8892a564b1bf37153af61a5515e91e5c07d59
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
