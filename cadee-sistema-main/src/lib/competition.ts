export type CompetitionLevel = 'baixa' | 'média' | 'alta' | 'crítica';

function fromRatio(ratio: number) {
  let level: CompetitionLevel = 'baixa';
  if (!isFinite(ratio)) level = 'crítica';
  else if (ratio <= 0.5) level = 'baixa';
  else if (ratio <= 1.0) level = 'média';
  else if (ratio <= 1.5) level = 'alta';
  else level = 'crítica';

  const label = level.charAt(0).toUpperCase() + level.slice(1);
  const colorClass =
    level === 'baixa'
      ? 'bg-success text-success-foreground'
      : level === 'média'
      ? 'bg-warning text-warning-foreground'
      : 'bg-destructive text-destructive-foreground';
  return { level, label, colorClass } as const;
}

export function getCompetitionLevel(
  seatsCount: number | undefined,
  requested: number | undefined,
  rerequested: number | undefined,
) {
  const totalSeats = Math.max(0, Number(seatsCount || 0));
  const r1 = Math.max(0, Number(requested || 0));
  const r2 = Math.max(0, Number(rerequested || 0));
  const totalReq = r1 + r2;
  const ratio = totalSeats > 0 ? totalReq / totalSeats : (totalReq > 0 ? Infinity : 0);
  const base = fromRatio(ratio);
  return { ...base, ratio, totalReq, r1, r2 } as const;
}

export function getPhase1Level(seatsCount: number | undefined, requested: number | undefined) {
  const totalSeats = Math.max(0, Number(seatsCount || 0));
  const r1 = Math.max(0, Number(requested || 0));
  const ratio = totalSeats > 0 ? r1 / totalSeats : (r1 > 0 ? Infinity : 0);
  const base = fromRatio(ratio);
  return { ...base, ratio, requested: r1, seats: totalSeats } as const;
}

export function getPhase2Level(
  seatsCount: number | undefined,
  seatsAccepted: number | undefined,
  rerequested: number | undefined,
) {
  const totalSeats = Math.max(0, Number(seatsCount || 0));
  const accepted = Math.max(0, Number(seatsAccepted || 0));
  const remaining = Math.max(0, totalSeats - accepted);
  const r2 = Math.max(0, Number(rerequested || 0));
  const ratio = remaining > 0 ? r2 / remaining : (r2 > 0 ? Infinity : 0);
  const base = fromRatio(ratio);
  return { ...base, ratio, rerequested: r2, seatsRemaining: remaining } as const;
}

