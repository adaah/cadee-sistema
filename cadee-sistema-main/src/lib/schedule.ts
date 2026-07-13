import { liftN } from 'ramda';

export function getSpplitedCode(code: string): string[] {
  if (!code || typeof code !== 'string') return [];
  const match = code.toUpperCase().match(/^([2-7]+)([MTN]+)([1-9]+)$/);
  if (!match) return [code];

  const [, days, shifts, slots] = match;
  const daysArr = days.split('');
  const shiftsArr = shifts.split('');
  const slotsArr = slots.split('');

  // Functional cartesian using Ramda: lift a ternary combiner over 3 arrays
  const cartesian = liftN(3)((d: string, s: string, t: string) => `${d}${s}${t}`);
  return cartesian(daysArr, shiftsArr, slotsArr) as string[];
}
