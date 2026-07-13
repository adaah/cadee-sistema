import { useCallback, useMemo, useState } from 'react';

type Rule<T> = (item: T) => boolean;

type UseFilterOptions<T> = {
  // Identifier for the "all" option (defaults to 'all')
  allId?: string;
  // Map of filter id -> predicate function
  rules?: Record<string, Rule<T>>;
};

export function useFilter<T = any>(options: UseFilterOptions<T> = {}) {
  const { allId = 'all', rules = {} } = options;

  // We represent active filters as a Set, excluding the `allId`.
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isAll = selected.size === 0;

  const isActive = useCallback(
    (id: string) => (id === allId ? isAll : selected.has(id)),
    [allId, isAll, selected]
  );

  const isOnly = useCallback(
    (id: string) => selected.size === 1 && selected.has(id),
    [selected]
  );

  const toggle = useCallback(
    (id: string) => {
      setSelected((prev) => {
        if (id === allId) {
          // Selecting "all" clears other selections
          return new Set();
        }
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [allId]
  );

  const predicate: Rule<T> = useCallback(
    (item: T) => {
      if (isAll) return true;
      for (const id of selected) {
        const rule = rules[id];
        if (rule && !rule(item)) return false;
      }
      return true;
    },
    [isAll, selected, rules]
  );

  const apply = useCallback(
    (items: T[]) => items.filter((i) => predicate(i)),
    [predicate]
  );

  const activeIds = useMemo(() => Array.from(selected), [selected]);

  return {
    // state/helpers
    selected,
    activeIds,
    isAll,
    isActive,
    isOnly,
    toggle,
    // filtering
    predicate,
    apply,
  } as const;
}

