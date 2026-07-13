import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

// Record keyed by course code
const favoriteCoursesAtom = atomWithStorage<Record<string, boolean>>('favoriteCourses', {});

export function useFavoriteCourses() {
  const [favorites, setFavorites] = useAtom(favoriteCoursesAtom);

  const isFavorite = (code: string) => {
    return !!favorites[code];
  };

  const toggleFavorite = (code: string) => {
    setFavorites(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const clearFavorites = () => setFavorites({});

  const favoriteCodes = Object.keys(favorites).filter((k) => favorites[k]);

  return {
    favorites,
    isFavorite,
    toggleFavorite,
    clearFavorites,
    favoriteCodes,
  };
}

