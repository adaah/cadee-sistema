import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useAtom, useAtomValue } from 'jotai';

export type Mode = 'simplified' | 'full';

const modeAtom = atomWithStorage<Mode>('mode', 'simplified');

export function useMode() {
  const [mode, setMode] = useAtom(modeAtom);
  const isSimplified = mode === 'simplified';
  const isFull = mode === 'full';

  // Sincronizar com experienceMode do onboarding (localStorage)
  const syncWithExperienceMode = () => {
    const expMode = localStorage.getItem('experienceMode');
    if (expMode === 'simplificada' && mode !== 'simplified') {
      setMode('simplified');
    } else if (expMode === 'completa' && mode !== 'full') {
      setMode('full');
    }
  };

  // Ao inicializar, garantir sincronia
  if (typeof window !== 'undefined') {
    syncWithExperienceMode();
  }

  return {
    mode,
    setMode: (newMode: Mode) => {
      setMode(newMode);
      // Atualizar experienceMode para manter sincronia
      localStorage.setItem('experienceMode', newMode === 'simplified' ? 'simplificada' : 'completa');
    },
    isSimplified,
    isFull,
  };
}
