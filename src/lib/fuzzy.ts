import Fuse from 'fuse.js';

export type FuzzyKey<T> = Fuse.FuseOptionKey<T>;

const defaultOptions = {
  shouldSort: true,
  includeScore: false,
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
  distance: 100,
} as const;

export function fuzzyFilter<T>(
  items: T[] | undefined | null,
  query: string,
  keys: FuzzyKey<T>[],
  options?: Partial<Fuse.IFuseOptions<T>>
): T[] {
  const list = items || [];
  const q = (query || '').trim();
  if (q.length === 0) return list;

  const fuse = new Fuse(list, { ...defaultOptions, keys, ...options });
  return fuse.search(q).map((r) => r.item);
}

